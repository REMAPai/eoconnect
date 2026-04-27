-- ============================================================
-- EOconnect Initial Schema
-- ============================================================

-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "unaccent";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  full_name   text not null,
  avatar_url  text,
  eo_chapter  text,
  eo_membership_email text,
  role        text not null default 'member'
                   check (role in ('member', 'chapter_admin', 'super_admin')),
  status      text not null default 'active'
                   check (status in ('pending', 'active', 'suspended')),
  created_at  timestamptz default now()
);
alter table public.profiles enable row level security;

create policy "Authenticated users can view active profiles"
  on public.profiles for select
  using (auth.uid() is not null);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, eo_membership_email, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    new.email,
    case when current_setting('app.require_admin_approval', true) = 'true'
         then 'pending' else 'active' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- CATEGORIES
-- ============================================================
create table public.categories (
  id          uuid default uuid_generate_v4() primary key,
  name        text not null unique,
  slug        text not null unique,
  parent_id   uuid references public.categories(id),
  icon        text,
  sort_order  int default 0,
  active      boolean default true,
  created_at  timestamptz default now()
);
alter table public.categories enable row level security;

create policy "Anyone authenticated can read categories"
  on public.categories for select
  using (auth.uid() is not null);

create policy "Admins can manage categories"
  on public.categories for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('chapter_admin', 'super_admin')
    )
  );

-- ============================================================
-- BUSINESSES
-- ============================================================
create table public.businesses (
  id              uuid default uuid_generate_v4() primary key,
  owner_id        uuid references public.profiles(id) on delete cascade not null,
  name            text not null,
  tagline         text,
  description     text,
  website         text,
  founded_year    int,
  team_size       text check (team_size in ('1-10','11-50','51-200','201-500','500+')),
  city            text,
  country         text,
  logo_url        text,
  cover_url       text,
  portfolio_urls  text[] default '{}',
  phone           text,
  email           text,
  social_links    jsonb default '{}',
  status          text not null default 'draft'
                       check (status in ('draft','published','paused')),
  category_ids    uuid[] default '{}',
  tags            text[] default '{}',
  search_vector   tsvector,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
alter table public.businesses enable row level security;

create index businesses_search_idx on public.businesses using gin(search_vector);
create index businesses_owner_idx on public.businesses(owner_id);
create index businesses_status_idx on public.businesses(status);

create policy "Published businesses visible to all members"
  on public.businesses for select
  using (
    auth.uid() is not null and (
      status = 'published' or owner_id = auth.uid() or
      exists (select 1 from public.profiles where id = auth.uid() and role in ('chapter_admin','super_admin'))
    )
  );

create policy "Owners can insert own business"
  on public.businesses for insert
  with check (auth.uid() = owner_id);

create policy "Owners and admins can update"
  on public.businesses for update
  using (
    auth.uid() = owner_id or
    exists (select 1 from public.profiles where id = auth.uid() and role in ('chapter_admin','super_admin'))
  );

-- Auto-update search_vector
create or replace function public.update_business_search_vector()
returns trigger language plpgsql as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.tagline, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.description, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(array_to_string(new.tags, ' '), '')), 'B');
  new.updated_at := now();
  return new;
end;
$$;

create trigger update_business_search
  before insert or update on public.businesses
  for each row execute procedure public.update_business_search_vector();

-- ============================================================
-- SERVICES
-- ============================================================
create table public.services (
  id            uuid default uuid_generate_v4() primary key,
  business_id   uuid references public.businesses(id) on delete cascade not null,
  title         text not null,
  description   text,
  pricing_model text check (pricing_model in ('fixed','hourly','project','contact')),
  price_from    numeric(12,2),
  price_to      numeric(12,2),
  status        text default 'published' check (status in ('draft','published')),
  created_at    timestamptz default now()
);
alter table public.services enable row level security;

create policy "Services readable by members if business is published"
  on public.services for select
  using (
    auth.uid() is not null and
    exists (
      select 1 from public.businesses b
      where b.id = business_id and (
        b.status = 'published' or b.owner_id = auth.uid()
      )
    )
  );

create policy "Business owner can manage services"
  on public.services for all
  using (
    exists (select 1 from public.businesses where id = business_id and owner_id = auth.uid())
  );

-- ============================================================
-- LISTING ANALYTICS
-- ============================================================
create table public.listing_analytics (
  id                  uuid default uuid_generate_v4() primary key,
  business_id         uuid references public.businesses(id) on delete cascade not null,
  date                date not null default current_date,
  views               int default 0,
  search_appearances  int default 0,
  contact_clicks      int default 0,
  unique (business_id, date)
);
alter table public.listing_analytics enable row level security;

create policy "Owners can read own analytics"
  on public.listing_analytics for select
  using (
    exists (select 1 from public.businesses where id = business_id and owner_id = auth.uid())
    or exists (select 1 from public.profiles where id = auth.uid() and role in ('chapter_admin','super_admin'))
  );

-- Upsert helper for incrementing analytics
create or replace function public.increment_listing_stat(
  p_business_id uuid, p_stat text
) returns void language plpgsql security definer as $$
begin
  insert into public.listing_analytics (business_id, date)
  values (p_business_id, current_date)
  on conflict (business_id, date) do nothing;

  if p_stat = 'views' then
    update public.listing_analytics set views = views + 1
    where business_id = p_business_id and date = current_date;
  elsif p_stat = 'search_appearances' then
    update public.listing_analytics set search_appearances = search_appearances + 1
    where business_id = p_business_id and date = current_date;
  elsif p_stat = 'contact_clicks' then
    update public.listing_analytics set contact_clicks = contact_clicks + 1
    where business_id = p_business_id and date = current_date;
  end if;
end;
$$;

-- ============================================================
-- REVIEWS
-- ============================================================
create table public.reviews (
  id          uuid default uuid_generate_v4() primary key,
  business_id uuid references public.businesses(id) on delete cascade not null,
  reviewer_id uuid references public.profiles(id) on delete cascade not null,
  rating      int not null check (rating between 1 and 5),
  body        text check (char_length(body) between 20 and 500),
  owner_reply text,
  flagged     boolean default false,
  created_at  timestamptz default now(),
  unique (business_id, reviewer_id)
);
alter table public.reviews enable row level security;

create policy "Reviews visible to all members"
  on public.reviews for select using (auth.uid() is not null);

create policy "Members can insert own reviews (not own business)"
  on public.reviews for insert
  with check (
    auth.uid() = reviewer_id and
    not exists (select 1 from public.businesses where id = business_id and owner_id = auth.uid())
  );

create policy "Reviewers can update own review"
  on public.reviews for update
  using (auth.uid() = reviewer_id);

create policy "Business owner can add reply"
  on public.reviews for update
  using (
    exists (select 1 from public.businesses where id = business_id and owner_id = auth.uid())
  );

-- ============================================================
-- CONVERSATIONS + MESSAGES
-- ============================================================
create table public.conversations (
  id              uuid default uuid_generate_v4() primary key,
  participant_ids uuid[] not null,
  listing_id      uuid references public.businesses(id) on delete set null,
  last_message_at timestamptz default now(),
  created_at      timestamptz default now()
);
alter table public.conversations enable row level security;

create policy "Participants can read conversations"
  on public.conversations for select
  using (auth.uid() = any(participant_ids));

create policy "Members can create conversations"
  on public.conversations for insert
  with check (auth.uid() = any(participant_ids));

create table public.messages (
  id              uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id       uuid references public.profiles(id) on delete cascade not null,
  body            text not null,
  read_at         timestamptz,
  created_at      timestamptz default now()
);
alter table public.messages enable row level security;

create policy "Participants can read messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations
      where id = conversation_id and auth.uid() = any(participant_ids)
    )
  );

create policy "Participants can send messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.conversations
      where id = conversation_id and auth.uid() = any(participant_ids)
    )
  );

-- Update last_message_at on new message
create or replace function public.update_conversation_timestamp()
returns trigger language plpgsql as $$
begin
  update public.conversations set last_message_at = now() where id = new.conversation_id;
  return new;
end;
$$;

create trigger on_new_message
  after insert on public.messages
  for each row execute procedure public.update_conversation_timestamp();

-- ============================================================
-- AD CAMPAIGNS
-- ============================================================
create table public.ad_campaigns (
  id                      uuid default uuid_generate_v4() primary key,
  business_id             uuid references public.businesses(id) on delete cascade not null,
  goal                    text check (goal in ('more_views','sponsored_search')),
  format                  text check (format in ('banner','sponsored_listing')),
  target_category_ids     uuid[] default '{}',
  target_keywords         text[] default '{}',
  budget_total            numeric(10,2),
  budget_daily            numeric(10,2),
  spend_to_date           numeric(10,2) default 0,
  start_date              date,
  end_date                date,
  status                  text default 'draft'
                               check (status in ('draft','pending_review','active','paused','completed','rejected')),
  creative_url            text,
  stripe_payment_intent_id text,
  impressions             int default 0,
  clicks                  int default 0,
  created_at              timestamptz default now()
);
alter table public.ad_campaigns enable row level security;

create policy "Business owner can manage own campaigns"
  on public.ad_campaigns for all
  using (
    exists (select 1 from public.businesses where id = business_id and owner_id = auth.uid())
  );

create policy "Admins can read all campaigns"
  on public.ad_campaigns for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('chapter_admin','super_admin'))
  );

create policy "Admins can update campaign status"
  on public.ad_campaigns for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('chapter_admin','super_admin'))
  );

-- Enable Realtime for messages and conversations
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
