import { NextResponse } from 'next/server';
import { getAgentContext } from '@/lib/agent-portal';

const requestFields = 'id, test_order_id, facility_id, collection_agent_id, scheduled_at, collection_address, collection_city, collection_state, contact_name, contact_phone, status, assigned_at, accepted_at, on_the_way_at, collected_at, in_transit_at, delivered_at, cancelled_at, created_at, updated_at';

export async function GET() {
  const { supabase, user, agent } = await getAgentContext();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!agent || !agent.is_verified) return NextResponse.json({ error: 'A verified collection-agent profile is required' }, { status: 403 });
  const { data: requests, error } = await supabase.from('collection_requests').select(requestFields).eq('collection_agent_id', agent.id).order('scheduled_at', { ascending: true }).limit(100);
  if (error) return NextResponse.json({ error: 'Could not load assigned requests' }, { status: 500 });
  const orderIds = [...new Set((requests ?? []).map((request) => request.test_order_id))];
  const { data: orders, error: ordersError } = orderIds.length ? await supabase.from('test_orders').select('id, test_id, facility_id, scheduled_at, status').in('id', orderIds) : { data: [], error: null };
  if (ordersError) return NextResponse.json({ error: 'Could not load assigned test information' }, { status: 500 });
  const testIds = [...new Set((orders ?? []).map((order) => order.test_id))];
  const facilityIds = [...new Set((orders ?? []).map((order) => order.facility_id))];
  const [{ data: tests, error: testsError }, { data: facilities, error: facilitiesError }] = await Promise.all([
    testIds.length ? supabase.from('tests').select('id, name, category, preparation_instructions').in('id', testIds) : Promise.resolve({ data: [], error: null }),
    facilityIds.length ? supabase.from('healthcare_facilities').select('id, name, address, city, state, phone').in('id', facilityIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (testsError || facilitiesError) return NextResponse.json({ error: 'Could not load assigned location or test information' }, { status: 500 });
  const orderMap = new Map((orders ?? []).map((order) => [order.id, { ...order, test: (tests ?? []).find((test) => test.id === order.test_id) ?? null, facility: (facilities ?? []).find((facility) => facility.id === order.facility_id) ?? null }]));
  return NextResponse.json({ requests: (requests ?? []).map((request) => ({ ...request, order: orderMap.get(request.test_order_id) ?? null })) });
}
