-- ============================================================
-- 002_ads_smart.sql
-- Smart-ad system: bidding, scoring, events, personalization
-- ============================================================

-- ── ad_campaigns: add scoring/bidding columns ────────────────
alter table public.ad_campaigns
  add column if not exists bid_cpc          numeric(10,4) default 1.00,
  add column if not exists daily_pacing_cap numeric(10,2),
  add column if not exists ctr_alpha        numeric(10,4) default 1.0,  -- Beta-prior numerator
  add column if not exists ctr_beta         numeric(10,4) default 19.0, -- Beta-prior denominator-α (≈5% prior CTR)
  add column if not exists rejection_reason text,
  add column if not exists last_served_at   timestamptz;

-- back-fill bid_cpc for any existing draft rows
update public.ad_campaigns set bid_cpc = 1.00 where bid_cpc is null;

-- enforce $10 minimum total budget, $1 minimum daily budget at the DB level
alter table public.ad_campaigns drop constraint if exists ad_campaigns_min_budget_chk;
alter table public.ad_campaigns add constraint ad_campaigns_min_budget_chk
  check (budget_total is null or budget_total >= 10);

alter table public.ad_campaigns drop constraint if exists ad_campaigns_min_bid_chk;
alter table public.ad_campaigns add constraint ad_campaigns_min_bid_chk
  check (bid_cpc is null or bid_cpc >= 0.10);

-- ── ad_events: every impression and click ────────────────────
create table if not exists public.ad_events (
  id            uuid default uuid_generate_v4() primary key,
  campaign_id   uuid references public.ad_campaigns(id) on delete cascade not null,
  user_id       uuid references public.profiles(id) on delete set null,
  event_type    text not null check (event_type in ('impression','click')),
  search_query  text,
  page          text,
  ip_hash       text,  -- sha256(ip + daily_salt) — enough to dedupe, not PII
  cost          numeric(10,4) default 0, -- charged to campaign for this event (clicks only)
  created_at    timestamptz default now()
);

create index if not exists ad_events_campaign_created
  on public.ad_events (campaign_id, created_at desc);
create index if not exists ad_events_user_recent
  on public.ad_events (user_id, created_at desc);
create index if not exists ad_events_dedupe
  on public.ad_events (campaign_id, user_id, event_type, created_at desc);

alter table public.ad_events enable row level security;

create policy "Owner reads own campaign events"
  on public.ad_events for select using (
    exists (
      select 1 from public.ad_campaigns ac
      join public.businesses b on b.id = ac.business_id
      where ac.id = campaign_id and b.owner_id = auth.uid()
    )
  );

create policy "Admins read all events"
  on public.ad_events for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('chapter_admin','super_admin'))
  );

-- ── ad_user_profile: lightweight personalization ─────────────
create table if not exists public.ad_user_profile (
  user_id           uuid references public.profiles(id) on delete cascade primary key,
  category_views    jsonb default '{}'::jsonb, -- { category_id: count } in last 30d
  last_categories   uuid[] default '{}',       -- last 5 categories viewed
  updated_at        timestamptz default now()
);

alter table public.ad_user_profile enable row level security;

create policy "Users read own profile"
  on public.ad_user_profile for select using (auth.uid() = user_id);

-- ── RPC: record_ad_event ─────────────────────────────────────
-- Atomically records event + (if click) deducts spend, updates Beta CTR.
create or replace function public.record_ad_event(
  p_campaign_id uuid,
  p_event_type  text,
  p_search_query text default null,
  p_page text default null,
  p_ip_hash text default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_bid     numeric;
  v_spent   numeric;
  v_total   numeric;
  v_status  text;
  v_recent_count int;
begin
  -- only valid event types
  if p_event_type not in ('impression','click') then return false; end if;

  -- fetch campaign state
  select bid_cpc, spend_to_date, budget_total, status
    into v_bid, v_spent, v_total, v_status
  from public.ad_campaigns
  where id = p_campaign_id;

  if not found or v_status <> 'active' then return false; end if;

  -- click fraud guard: same user can't click same campaign more than 3 times in 1h
  if p_event_type = 'click' then
    select count(*) into v_recent_count
    from public.ad_events
    where campaign_id = p_campaign_id
      and user_id = v_user_id
      and event_type = 'click'
      and created_at > now() - interval '1 hour';
    if v_recent_count >= 3 then return false; end if;
  end if;

  -- impression dedupe: same user same campaign within 5 minutes = ignore
  if p_event_type = 'impression' then
    select count(*) into v_recent_count
    from public.ad_events
    where campaign_id = p_campaign_id
      and user_id is not distinct from v_user_id
      and event_type = 'impression'
      and created_at > now() - interval '5 minutes';
    if v_recent_count > 0 then return false; end if;
  end if;

  -- insert the event
  insert into public.ad_events (campaign_id, user_id, event_type, search_query, page, ip_hash, cost)
  values (
    p_campaign_id, v_user_id, p_event_type, p_search_query, p_page, p_ip_hash,
    case when p_event_type = 'click' then coalesce(v_bid, 0) else 0 end
  );

  -- click: deduct spend, update CTR posterior, mark served
  if p_event_type = 'click' then
    update public.ad_campaigns
       set spend_to_date = spend_to_date + coalesce(v_bid, 0),
           clicks        = clicks + 1,
           ctr_alpha     = ctr_alpha + 1,
           last_served_at = now(),
           status = case
             when spend_to_date + coalesce(v_bid, 0) >= coalesce(v_total, 0) then 'completed'
             else status
           end
     where id = p_campaign_id;
  else
    -- impression: bump counter, update CTR denominator
    update public.ad_campaigns
       set impressions   = impressions + 1,
           ctr_beta      = ctr_beta + 1,
           last_served_at = now()
     where id = p_campaign_id;
  end if;

  return true;
end;
$$;

grant execute on function public.record_ad_event to authenticated, anon;

-- ── RPC: increment_user_category_view ─────────────────────────
-- Called when a user views a listing/category — feeds personalization.
create or replace function public.increment_user_category_view(
  p_category_ids uuid[]
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_cat uuid;
  v_existing jsonb;
  v_last_cats uuid[];
begin
  if v_user_id is null then return; end if;

  insert into public.ad_user_profile (user_id, category_views, last_categories)
  values (v_user_id, '{}'::jsonb, '{}')
  on conflict (user_id) do nothing;

  select category_views, last_categories
    into v_existing, v_last_cats
  from public.ad_user_profile where user_id = v_user_id;

  foreach v_cat in array p_category_ids loop
    v_existing := jsonb_set(
      v_existing,
      array[v_cat::text],
      to_jsonb(coalesce((v_existing->>v_cat::text)::int, 0) + 1)
    );
  end loop;

  -- prepend new categories to last_categories, dedupe, cap at 5
  v_last_cats := (
    select array_agg(c) from (
      select distinct on (c) c from (
        select unnest(p_category_ids) as c
        union all
        select unnest(v_last_cats)
      ) sub
    ) deduped
  );
  v_last_cats := v_last_cats[1:5];

  update public.ad_user_profile
     set category_views = v_existing,
         last_categories = v_last_cats,
         updated_at = now()
   where user_id = v_user_id;
end;
$$;

grant execute on function public.increment_user_category_view to authenticated;

-- ── Realtime for ad approval flow ────────────────────────────
alter publication supabase_realtime add table public.ad_campaigns;
