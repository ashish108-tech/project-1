import type { SupabaseClient } from '@supabase/supabase-js';
import type { AiProvider, RetrievedSource } from '@/services/ai/provider';

export type KnowledgeSourceInput = { title: string; source: string; content: string; isApproved: boolean };

export function chunkText(content: string, chunkSize = 1800, overlap = 250) {
  const normalized = content.replace(/\s+/g, ' ').trim();
  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    const end = Math.min(start + chunkSize, normalized.length);
    const chunk = normalized.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= normalized.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}

export async function ingestKnowledgeSource(supabase: SupabaseClient, provider: AiProvider, input: KnowledgeSourceInput) {
  const chunks = chunkText(input.content);
  const { data: source, error: sourceError } = await supabase.from('medical_knowledge_sources').insert({ title: input.title, source: input.source, is_approved: input.isApproved }).select('id').single();
  if (sourceError || !source) throw new Error('Could not create the knowledge source.');
  try {
    const rows = [];
    for (const [index, content] of chunks.entries()) rows.push({ source_id: source.id, chunk_index: index, content, embedding: await provider.generateEmbedding(content) });
    const { error } = await supabase.from('medical_knowledge_chunks').insert(rows);
    if (error) throw new Error('Could not store knowledge chunks.');
    return { id: source.id, chunkCount: rows.length };
  } catch (error) {
    await supabase.from('medical_knowledge_sources').delete().eq('id', source.id);
    throw error;
  }
}

export async function retrieveApprovedContext(supabase: SupabaseClient, provider: AiProvider, query: string, matchCount = 5): Promise<RetrievedSource[]> {
  const embedding = await provider.generateEmbedding(query);
  const { data, error } = await supabase.rpc('match_medical_knowledge', { query_embedding: embedding, match_threshold: 0.72, match_count: matchCount });
  if (error) throw new Error('Could not retrieve approved medical evidence.');
  return (data ?? []).map((row: { title: string; source: string; content: string }) => ({ title: row.title, source: row.source, content: row.content }));
}
