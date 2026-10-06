import { NextResponse } from 'next/server';
import { getAdminContext } from '@/lib/admin-portal';

const resources = new Set(['users', 'patients', 'doctors', 'facilities', 'tests', 'agents', 'appointments', 'reports']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fields: Record<string, string> = {
  users: 'id, email, phone, role, is_verified, created_at',
  patients: 'id, user_id, city, state, date_of_birth, gender, created_at',
  doctors: 'id, user_id, license_number, specialization, approval_status, years_of_experience, created_at',
  facilities: 'id, name, facility_type, city, state, latitude, longitude, is_approved, created_at',
  tests: 'id, name, category, is_active, created_at',
  agents: 'id, user_id, service_area, is_available, is_verified, created_at',
  appointments: 'id, patient_id, doctor_id, healthcare_facility_id, status, appointment_type, scheduled_start, scheduled_end, created_at',
  reports: 'id, test_order_id, patient_id, facility_id, report_title, report_type, mime_type, file_size, created_at',
};

export async function GET(_request: Request, context: { params: Promise<{ resource: string }> }) {
  const { resource } = await context.params;
  const { supabase, user, isAdmin } = await getAdminContext();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!isAdmin) return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
  if (!resources.has(resource)) return NextResponse.json({ error: 'Unknown admin resource' }, { status: 404 });
  let result;
  if (resource === 'users') result = await supabase.from('users').select(fields.users).order('created_at', { ascending: false }).limit(100);
  else if (resource === 'patients') result = await supabase.from('patients').select(fields.patients).order('created_at', { ascending: false }).limit(100);
  else if (resource === 'doctors') result = await supabase.from('doctors').select(fields.doctors).order('created_at', { ascending: false }).limit(100);
  else if (resource === 'facilities') result = await supabase.from('healthcare_facilities').select(fields.facilities).order('created_at', { ascending: false }).limit(100);
  else if (resource === 'tests') result = await supabase.from('tests').select(fields.tests).order('created_at', { ascending: false }).limit(100);
  else if (resource === 'agents') result = await supabase.from('collection_agents').select(fields.agents).order('created_at', { ascending: false }).limit(100);
  else if (resource === 'appointments') result = await supabase.from('appointments').select(fields.appointments).order('scheduled_start', { ascending: false }).limit(100);
  else result = await supabase.from('medical_reports').select(fields.reports).order('created_at', { ascending: false }).limit(100);
  if (result.error) return NextResponse.json({ error: 'Could not load admin records' }, { status: 500 });
  return NextResponse.json({ rows: result.data ?? [] });
}

export async function PATCH(request: Request, context: { params: Promise<{ resource: string }> }) {
  const { resource } = await context.params;
  const { supabase, user, isAdmin } = await getAdminContext();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!isAdmin) return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
  if (!resources.has(resource)) return NextResponse.json({ error: 'Unknown admin resource' }, { status: 404 });
  const body = await request.json().catch(() => null) as { id?: unknown; action?: unknown } | null;
  const id = typeof body?.id === 'string' ? body.id : '';
  const action = typeof body?.action === 'string' ? body.action : '';
  if (!uuid.test(id)) return NextResponse.json({ error: 'A valid record ID is required' }, { status: 400 });
  const allowed: Record<string, Record<string, Record<string, unknown>>> = {
    users: { verify: { is_verified: true }, unverify: { is_verified: false } },
    doctors: { approve: { approval_status: 'APPROVED' }, suspend: { approval_status: 'SUSPENDED' } },
    facilities: { approve: { is_approved: true }, unapprove: { is_approved: false } },
    tests: { activate: { is_active: true }, deactivate: { is_active: false } },
    agents: { verify: { is_verified: true }, unverify: { is_verified: false } },
  };
  const update = allowed[resource]?.[action];
  if (!update) return NextResponse.json({ error: 'Unsupported admin action' }, { status: 400 });
  let result;
  if (resource === 'users') result = await supabase.from('users').update(update).eq('id', id).select(fields.users).maybeSingle();
  else if (resource === 'doctors') result = await supabase.from('doctors').update(update).eq('id', id).select(fields.doctors).maybeSingle();
  else if (resource === 'facilities') result = await supabase.from('healthcare_facilities').update(update).eq('id', id).select(fields.facilities).maybeSingle();
  else if (resource === 'tests') result = await supabase.from('tests').update(update).eq('id', id).select(fields.tests).maybeSingle();
  else result = await supabase.from('collection_agents').update(update).eq('id', id).select(fields.agents).maybeSingle();
  if (result.error) return NextResponse.json({ error: 'Could not save admin change' }, { status: 400 });
  if (!result.data) return NextResponse.json({ error: 'Record not found' }, { status: 404 });
  return NextResponse.json({ row: result.data });
}
