-- ============================================================
-- 008_chapters_and_locations.sql
-- Replace free-text eo_chapter with structured region/country/city
-- + chapter_admin scope fields + canonical eo_chapters reference table.
-- ============================================================

-- 1. Reference table of EO chapters (canonical list, seeded separately).
create table if not exists public.eo_chapters (
  id          bigserial primary key,
  name        text not null unique,
  region      text not null,
  country     text,
  city        text,
  virtual     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists eo_chapters_region_idx  on public.eo_chapters (region);
create index if not exists eo_chapters_country_idx on public.eo_chapters (country);
create index if not exists eo_chapters_city_idx    on public.eo_chapters (city);

alter table public.eo_chapters enable row level security;

drop policy if exists "eo_chapters_read_all" on public.eo_chapters;
create policy "eo_chapters_read_all" on public.eo_chapters
  for select using (true);

-- 2. Add structured location columns to profiles.
alter table public.profiles
  add column if not exists region text,
  add column if not exists chapter_country text,
  add column if not exists chapter_city text,
  -- chapter_admin scope: country (required) + optional city.
  -- Null on non-admin profiles.
  add column if not exists admin_scope_country text,
  add column if not exists admin_scope_city text;

-- Constrain region to the 11 EO regions when set.
alter table public.profiles
  drop constraint if exists profiles_region_check;
alter table public.profiles
  add constraint profiles_region_check check (
    region is null or region in (
      'Asia Pacific',
      'Canada',
      'Europe',
      'Japan',
      'Latin America/Caribbean',
      'MEPA',
      'North Asia',
      'South Asia',
      'United States - Central',
      'United States - East',
      'United States - West'
    )
  );

create index if not exists profiles_chapter_country_idx on public.profiles (chapter_country);
create index if not exists profiles_chapter_city_idx    on public.profiles (chapter_city);
create index if not exists profiles_region_idx          on public.profiles (region);

-- 3. Businesses don't get EO-chapter tagging (chapter is a property of the
--    owner, not the business). Add an ISO-2 country_code to make city pickers
--    consistent across the app — city/country text columns already exist.
alter table public.businesses
  add column if not exists country_code text;

create index if not exists businesses_country_code_idx on public.businesses (country_code);
create index if not exists businesses_city_idx         on public.businesses (city);

-- 4. Update handle_new_user trigger to mirror new columns when present in OAuth metadata.
--    (Pulls region/country/city/admin_scope from raw_user_meta_data if a future provider supplies them.)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, full_name, avatar_url, eo_chapter, eo_membership_email,
    region, chapter_country, chapter_city
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'eo_chapter',
    new.email,
    new.raw_user_meta_data->>'region',
    new.raw_user_meta_data->>'chapter_country',
    new.raw_user_meta_data->>'chapter_city'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
