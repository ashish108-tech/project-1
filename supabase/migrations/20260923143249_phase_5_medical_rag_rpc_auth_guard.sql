create or replace function public.match_medical_knowledge(query_embedding vector(1536), match_threshold double precision, match_count integer)
returns table (title text, source text, content text, similarity double precision)
language plpgsql stable security invoker set search_path = public as $$
begin
  if auth.uid() is null then raise exception using errcode = '42501', message = 'Authentication required for medical evidence retrieval'; end if;
  return query select s.title, s.source, c.content, (1 - (c.embedding <=> query_embedding))::double precision as similarity
  from public.medical_knowledge_chunks c join public.medical_knowledge_sources s on s.id = c.source_id
  where s.is_approved = true and (1 - (c.embedding <=> query_embedding)) >= match_threshold
  order by c.embedding <=> query_embedding limit least(greatest(match_count, 1), 20);
end;
$$;
revoke all on function public.match_medical_knowledge(vector(1536), double precision, integer) from public;
grant execute on function public.match_medical_knowledge(vector(1536), double precision, integer) to authenticated;
