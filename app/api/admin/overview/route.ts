import { NextResponse } from 'next/server';
import { getAdminContext } from '@/lib/admin-portal';

export async function GET() {
  const { supabase, user, isAdmin } = await getAdminContext();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!isAdmin) return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
  const [users, patients, doctors, facilities, agents, appointments, testOrders, collections, reports] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('patients').select('id', { count: 'exact', head: true }),
    supabase.from('doctors').select('id', { count: 'exact', head: true }),
    supabase.from('healthcare_facilities').select('id', { count: 'exact', head: true }),
    supabase.from('collection_agents').select('id', { count: 'exact', head: true }),
    supabase.from('appointments').select('id', { count: 'exact', head: true }),
    supabase.from('test_orders').select('id', { count: 'exact', head: true }),
    supabase.from('collection_requests').select('id', { count: 'exact', head: true }).in('status', ['REQUESTED', 'ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'COLLECTED', 'IN_TRANSIT']),
    supabase.from('medical_reports').select('id', { count: 'exact', head: true }),
  ]);
  const failed = [users, patients, doctors, facilities, agents, appointments, testOrders, collections, reports].some((result) => result.error);
  if (failed) return NextResponse.json({ error: 'Could not load platform metrics' }, { status: 500 });
  return NextResponse.json({ metrics: { users: users.count ?? 0, patients: patients.count ?? 0, doctors: doctors.count ?? 0, facilities: facilities.count ?? 0, agents: agents.count ?? 0, appointments: appointments.count ?? 0, testOrders: testOrders.count ?? 0, pendingCollections: collections.count ?? 0, reports: reports.count ?? 0 } });
}
