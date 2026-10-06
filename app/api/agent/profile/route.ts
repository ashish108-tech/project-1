import { NextResponse } from 'next/server';
import { getAgentContext } from '@/lib/agent-portal';

const fields = 'id, user_id, service_area, is_available, is_verified, created_at, updated_at';

export async function GET() {
  const { user, agent } = await getAgentContext();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!agent) return NextResponse.json({ error: 'Collection-agent profile not found' }, { status: 404 });
  return NextResponse.json({ profile: agent });
}

export async function PATCH(request: Request) {
  const { supabase, user, agent } = await getAgentContext();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!agent) return NextResponse.json({ error: 'Collection-agent profile not found' }, { status: 404 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const updates: Record<string, unknown> = {};
  if (typeof body?.serviceArea === 'string' && body.serviceArea.trim().length <= 160) updates.service_area = body.serviceArea.trim() || null;
  if (typeof body?.isAvailable === 'boolean') updates.is_available = body.isAvailable;
  if (!Object.keys(updates).length) return NextResponse.json({ error: 'No valid profile fields supplied' }, { status: 400 });
  const { data, error } = await supabase.from('collection_agents').update(updates).eq('id', agent.id).select(fields).single();
  if (error) return NextResponse.json({ error: 'Could not update profile' }, { status: 400 });
  return NextResponse.json({ profile: data });
}
