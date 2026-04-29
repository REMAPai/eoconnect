-- ============================================================
-- 010_profile_linkedin.sql
-- Add an optional LinkedIn URL to member profiles. Surfaced on
-- listing detail pages as a small icon next to the owner's name.
-- ============================================================

alter table public.profiles
  add column if not exists linkedin_url text;

-- Light validation: must look like a linkedin.com URL when set.
alter table public.profiles
  drop constraint if exists profiles_linkedin_url_check;
alter table public.profiles
  add constraint profiles_linkedin_url_check check (
    linkedin_url is null
    or linkedin_url ~ '^https?://([a-z0-9-]+\.)?linkedin\.com/'
  );
