-- ============================================================
-- 007_allow_multiple_businesses.sql
-- Drop the unique-on-owner_id constraint so a member can list
-- multiple businesses (MM-12 — "Add Another Business").
--
-- The owner_id column still has a btree index (businesses_owner_idx
-- from migration 001) so queries by owner stay fast.
-- ============================================================

alter table public.businesses
  drop constraint if exists businesses_owner_unique;
