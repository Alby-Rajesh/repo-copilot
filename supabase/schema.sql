create extension if not exists vector;

create table if not exists repos (
  name text primary key,
  branch text not null,
  paths text[] not null,
  chunks int not null,
  indexed_at timestamptz not null default now()
);

create table if not exists code_chunks (
  id bigserial primary key,
  repo text not null references repos (name) on delete cascade,
  path text not null,
  start_line int not null,
  end_line int not null,
  content text not null,
  terms text not null,
  fts tsvector generated always as (to_tsvector('simple', path || ' ' || content || ' ' || terms)) stored,
  embedding vector(768) not null
);

create index if not exists code_chunks_repo_idx on code_chunks (repo);
create index if not exists code_chunks_fts_idx on code_chunks using gin (fts);
create index if not exists code_chunks_embedding_idx on code_chunks using hnsw (embedding vector_cosine_ops);

alter table repos enable row level security;
alter table code_chunks enable row level security;

create or replace function search_code(
  repo_name text,
  query_text text,
  query_embedding vector(768),
  match_count int default 5,
  rrf_k int default 50
)
returns table (
  id bigint,
  path text,
  start_line int,
  end_line int,
  content text,
  keyword_score float,
  semantic_score float,
  rrf_score float
)
language sql stable
as $$
  with keyword as (
    select c.id,
      ts_rank_cd(c.fts, q) as score,
      row_number() over (order by ts_rank_cd(c.fts, q) desc) as rank
    from code_chunks c, websearch_to_tsquery('simple', query_text) q
    where c.repo = repo_name and c.fts @@ q
    order by rank
    limit match_count * 2
  ),
  semantic as (
    select c.id,
      1 - (c.embedding <=> query_embedding) as score,
      row_number() over (order by c.embedding <=> query_embedding) as rank
    from code_chunks c
    where c.repo = repo_name
    order by rank
    limit match_count * 2
  )
  select c.id, c.path, c.start_line, c.end_line, c.content,
    coalesce(k.score, 0)::float, coalesce(s.score, 0)::float,
    (coalesce(1.0 / (rrf_k + k.rank), 0) + coalesce(1.0 / (rrf_k + s.rank), 0))::float
  from keyword k
  full outer join semantic s on k.id = s.id
  join code_chunks c on c.id = coalesce(k.id, s.id)
  order by 8 desc
  limit match_count;
$$;
