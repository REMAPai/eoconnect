-- ============================================================
-- 004_admin_thumbnails.sql
-- Service thumbnails + admin override RLS for business/service edits
-- ============================================================

-- Service thumbnail
alter table public.services
  add column if not exists thumbnail_url text;

-- Allow chapter_admin / super_admin to update any business
drop policy if exists "Owner can update own business" on public.businesses;
drop policy if exists "Owner or admin can update business" on public.businesses;
create policy "Owner or admin can update business"
  on public.businesses for update
  using (
    auth.uid() = owner_id or
    exists (select 1 from public.profiles
              where id = auth.uid()
                and role in ('chapter_admin', 'super_admin'))
  );

-- Allow admin to manage any service (insert/update/delete)
drop policy if exists "Admins can manage all services" on public.services;
create policy "Admins can manage all services"
  on public.services for all
  using (
    exists (select 1 from public.profiles
              where id = auth.uid()
                and role in ('chapter_admin', 'super_admin'))
  );
