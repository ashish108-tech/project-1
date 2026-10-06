import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { data, error } = await supabase.from('record_consents').select('id, patient_id, doctor_id, status, granted_at, revoked_at, expires_at, created_at, updated_at').order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Could not load consent records' }, { status: 500 });
  return NextResponse.json({ consents: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const body = await request.json().catch(() => null) as { doctorId?: unknown; expiresAt?: unknown } | null;
  const doctorId = typeof body?.doctorId === 'string' ? body.doctorId.trim() : '';
  const expiresAt = body?.expiresAt === null || body?.expiresAt === undefined || body.expiresAt === '' ? null : typeof body.expiresAt === 'string' ? body.expiresAt : undefined;
  if (!/^[0-9a-f-]{36}$/i.test(doctorId)) return NextResponse.json({ error: 'A valid doctor ID is required' }, { status: 400 });
  if (expiresAt === undefined || (expiresAt && Number.isNaN(Date.parse(expiresAt)))) return NextResponse.json({ error: 'expiresAt must be a valid ISO timestamp or null' }, { status: 400 });

  const { data, error } = await supabase.rpc('grant_record_consent', { p_doctor_id: doctorId, p_expires_at: expiresAt });
  if (error) return NextResponse.json({ error: error.code === '42501' ? 'Access denied' : 'The operation could not be completed' }, { status: error.code === '42501' ? 403 : 400 });
  return NextResponse.json({ consent: data }, { status: 201 });
}
