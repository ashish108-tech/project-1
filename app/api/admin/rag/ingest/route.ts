import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAiProvider } from '@/services/ai/provider';
import { ingestKnowledgeSource } from '@/services/ai/rag';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RequestBody = { title?: unknown; source?: unknown; content?: unknown; isApproved?: unknown };

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    const { data: isAdmin, error: roleError } = await supabase.rpc('is_admin');
    if (roleError || !isAdmin) return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 });
    const body = await request.json() as RequestBody;
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const source = typeof body.source === 'string' ? body.source.trim() : '';
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    if (!title || title.length > 240 || !source || source.length > 500 || !content || content.length > 200000) return NextResponse.json({ error: 'Title, source, and content are required within the allowed limits.' }, { status: 400 });
    const result = await ingestKnowledgeSource(supabase, createAiProvider(), { title, source, content, isApproved: body.isApproved === true });
    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'The source could not be ingested. Verify the provider configuration and try again.' }, { status: 502 });
  }
}
