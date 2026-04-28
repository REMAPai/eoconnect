-- ============================================================
-- 003_onboarding.sql
-- Onboarding fields + OAuth profile auto-create
-- ============================================================

-- 1. New profile fields
alter table public.profiles
  add column if not exists eo_membership_type text
    check (eo_membership_type in ('current_member', 'alumni', 'accelerator')),
  add column if not exists country text;

-- 2. Auto-create profile row whenever a user signs up (email or OAuth).
--    Pulls full_name + avatar_url from auth metadata when present.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, eo_chapter, eo_membership_email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'eo_chapter',
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Backfill: anyone in auth.users without a profile gets one
insert into public.profiles (id, full_name, avatar_url, eo_membership_email)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  u.raw_user_meta_data->>'avatar_url',
  u.email
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
