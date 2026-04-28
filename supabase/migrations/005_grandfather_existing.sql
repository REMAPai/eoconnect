-- ============================================================
-- 005_grandfather_existing.sql
-- Stop the onboarding gate from harassing existing users.
-- Adds an onboarded_at flag and backfills it for everyone who
-- already has an account.
-- ============================================================

alter table public.profiles
  add column if not exists onboarded_at timestamptz;

-- Grandfather every existing profile. New signups will have null and
-- be guided through the onboarding flow as intended.
update public.profiles
  set onboarded_at = coalesce(onboarded_at, created_at, now());
