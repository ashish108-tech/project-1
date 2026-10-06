create extension if not exists vector;

create table public.medical_knowledge_sources (
  id uuid primary key default gen_random_uuid(), title text not null, source text not null, is_approved boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint medical_knowledge_sources_title_nonempty check (length(trim(title)) > 0), constraint medical_knowledge_sources_source_nonempty check (length(trim(source)) > 0)
);
create table public.medical_knowledge_chunks (
  id uuid primary key default gen_random_uuid(), source_id uuid not null references public.medical_knowledge_sources(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0), content text not null check (length(trim(content)) > 0), embedding vector(1536) not null,
  created_at timestamptz not null default now(), unique (source_id, chunk_index)
);
create index medical_knowledge_sources_approved_idx on public.medical_knowledge_sources (is_approved, created_at desc);
create index medical_knowledge_chunks_source_idx on public.medical_knowledge_chunks (source_id, chunk_index);
create index medical_knowledge_chunks_embedding_idx on public.medical_knowledge_chunks using hnsw (embedding vector_cosine_ops);
alter table public.medical_knowledge_sources enable row level security;
alter table public.medical_knowledge_chunks enable row level security;

create or replace function public.set_medical_knowledge_source_updated_at() returns trigger language plpgsql security invoker set search_path = public as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists medical_knowledge_sources_set_updated_at on public.medical_knowledge_sources;
create trigger medical_knowledge_sources_set_updated_at before update on public.medical_knowledge_sources for each row execute function public.set_medical_knowledge_source_updated_at();
create policy medical_knowledge_sources_select_approved on public.medical_knowledge_sources for select to authenticated using (is_approved = true or public.is_admin());
create policy medical_knowledge_sources_insert_admin on public.medical_knowledge_sources for insert to authenticated with check (public.is_admin());
create policy medical_knowledge_sources_update_admin on public.medical_knowledge_sources for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy medical_knowledge_sources_delete_admin on public.medical_knowledge_sources for delete to authenticated using (public.is_admin());
create policy medical_knowledge_chunks_select_approved on public.medical_knowledge_chunks for select to authenticated using (exists (select 1 from public.medical_knowledge_sources s where s.id = source_id and (s.is_approved = true or public.is_admin())));
create policy medical_knowledge_chunks_insert_admin on public.medical_knowledge_chunks for insert to authenticated with check (public.is_admin());
create policy medical_knowledge_chunks_update_admin on public.medical_knowledge_chunks for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy medical_knowledge_chunks_delete_admin on public.medical_knowledge_chunks for delete to authenticated using (public.is_admin());

create or replace function public.match_medical_knowledge(query_embedding vector(1536), match_threshold double precision, match_count integer)
returns table (title text, source text, content text, similarity double precision)
language sql stable security invoker set search_path = public as $$
  select s.title, s.source, c.content, (1 - (c.embedding <=> query_embedding))::double precision as similarity
  from public.medical_knowledge_chunks c join public.medical_knowledge_sources s on s.id = c.source_id
  where s.is_approved = true and (1 - (c.embedding <=> query_embedding)) >= match_threshold
  order by c.embedding <=> query_embedding limit least(greatest(match_count, 1), 20);
$$;
revoke all on function public.match_medical_knowledge(vector(1536), double precision, integer) from public;
grant execute on function public.match_medical_knowledge(vector(1536), double precision, integer) to authenticated;
