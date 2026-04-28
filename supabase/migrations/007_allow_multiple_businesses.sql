-- ============================================================
-- 007_allow_multiple_businesses.sql
-- Drop the unique-on-owner_id enforcement so a member can list
-- multiple businesses (MM-12 — "Add Another Business").
--
-- Postgres reports both UNIQUE CONSTRAINTs and UNIQUE INDEXes with
-- the wording "duplicate key value violates unique constraint <name>"
-- in errors — but each is dropped with a different DDL statement.
-- We try both so this migration is safe regardless of how the rule
-- was originally created.
-- ============================================================

-- 1. Drop the constraint version (no-op if absent)
alter table public.businesses
  drop constraint if exists businesses_owner_unique;

-- 2. Drop the index version (no-op if absent)
drop index if exists public.businesses_owner_unique;

-- 3. Make sure a non-unique index still exists for fast lookup by owner.
--    create index if not exists is idempotent — safe to re-run.
create index if not exists businesses_owner_idx
  on public.businesses(owner_id);
