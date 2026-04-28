-- ============================================================
-- 006_vector_search.sql
-- Replace LLM rerank with pgvector embeddings for fast semantic search.
--
-- text-embedding-3-small returns 1536-d vectors; we store them per
-- business and run cosine-distance similarity at query time.
-- ============================================================

create extension if not exists vector;

-- 1. Embedding columns
alter table public.businesses
  add column if not exists embedding vector(1536),
  add column if not exists embedding_text text,           -- canonical text the embedding was computed from (for debugging)
  add column if not exists embedding_updated_at timestamptz;

-- 2. HNSW index for fast nearest-neighbor lookup
create index if not exists businesses_embedding_idx
  on public.businesses
  using hnsw (embedding vector_cosine_ops);

-- 3. Similarity search RPC.
--    Returns business ids ordered by relevance to the query embedding.
--    Caller hydrates full rows + applies any extra filters.
create or replace function public.search_businesses_by_embedding(
  query_embedding vector(1536),
  match_count int default 30,
  min_similarity float default 0.20
)
returns table (
  id uuid,
  similarity float
)
language sql stable
security definer
set search_path = public
as $$
  select
    b.id,
    1 - (b.embedding <=> query_embedding) as similarity
  from public.businesses b
  where b.status = 'published'
    and b.embedding is not null
    and (1 - (b.embedding <=> query_embedding)) >= min_similarity
  order by b.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.search_businesses_by_embedding to authenticated, anon;

-- 4. Convenience RPC: list businesses missing embeddings (for batch backfill)
create or replace function public.businesses_missing_embeddings(batch_size int default 50)
returns table (
  id uuid,
  name text,
  tagline text,
  description text,
  tags text[]
)
language sql stable
security definer
set search_path = public
as $$
  select b.id, b.name, b.tagline, b.description, b.tags
  from public.businesses b
  where b.status = 'published' and b.embedding is null
  limit batch_size;
$$;

grant execute on function public.businesses_missing_embeddings to authenticated;
