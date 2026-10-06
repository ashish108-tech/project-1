import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Invalid consent ID' }, { status: 400 });

  const { data, error } = await supabase.rpc('revoke_record_consent', { p_consent_id: id });
  if (error) return NextResponse.json({ error: error.code === '42501' ? 'Access denied' : 'The operation could not be completed' }, { status: error.code === '42501' ? 403 : 400 });
  return NextResponse.json({ consent: data });
}
