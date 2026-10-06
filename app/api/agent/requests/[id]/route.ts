import { NextResponse } from 'next/server';
import { getAgentContext } from '@/lib/agent-portal';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const statuses = new Set(['ACCEPTED', 'ON_THE_WAY', 'COLLECTED', 'IN_TRANSIT', 'DELIVERED']);
const fields = 'id, test_order_id, facility_id, collection_agent_id, scheduled_at, collection_address, collection_city, collection_state, contact_name, contact_phone, status, assigned_at, accepted_at, on_the_way_at, collected_at, in_transit_at, delivered_at, cancelled_at, created_at, updated_at';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { supabase, user, agent } = await getAgentContext();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!agent || !agent.is_verified) return NextResponse.json({ error: 'A verified collection-agent profile is required' }, { status: 403 });
  if (!uuid.test(id)) return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
  const { data: request, error } = await supabase.from('collection_requests').select(fields).eq('id', id).eq('collection_agent_id', agent.id).maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not load request' }, { status: 500 });
  if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  const [{ data: order, error: orderError }, { data: facility, error: facilityError }] = await Promise.all([
    supabase.from('test_orders').select('id, test_id, facility_id, scheduled_at, status').eq('id', request.test_order_id).maybeSingle(),
    supabase.from('healthcare_facilities').select('id, name, address, city, state, phone').eq('id', request.facility_id).maybeSingle(),
  ]);
  if (orderError || facilityError) return NextResponse.json({ error: 'Could not load request details' }, { status: 500 });
  let test = null;
  if (order?.test_id) {
    const result = await supabase.from('tests').select('id, name, category, preparation_instructions').eq('id', order.test_id).maybeSingle();
    if (result.error) return NextResponse.json({ error: 'Could not load test details' }, { status: 500 });
    test = result.data;
  }
  return NextResponse.json({ request: { ...request, order, test, facility } });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { supabase, user, agent } = await getAgentContext();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!agent || !agent.is_verified) return NextResponse.json({ error: 'A verified collection-agent profile is required' }, { status: 403 });
  if (!uuid.test(id)) return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const status = typeof body?.status === 'string' ? body.status : '';
  const sampleType = typeof body?.sampleType === 'string' ? body.sampleType.trim() : null;
  const notes = typeof body?.notes === 'string' ? body.notes.trim().slice(0, 500) : null;
  if (!statuses.has(status)) return NextResponse.json({ error: 'Invalid agent status transition' }, { status: 400 });
  if (status === 'COLLECTED' && !sampleType) return NextResponse.json({ error: 'Sample type is required when collecting a sample' }, { status: 400 });
  const { data, error } = await supabase.rpc('update_collection_status', { p_request_id: id, p_status: status, p_sample_type: sampleType, p_notes: notes });
  if (error) return NextResponse.json({ error: error.code === '42501' ? 'Access denied' : 'The operation could not be completed' }, { status: error.code === '42501' ? 403 : 400 });
  return NextResponse.json({ request: data });
}
