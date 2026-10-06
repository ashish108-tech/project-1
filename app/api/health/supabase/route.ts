import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from('care_locations').select('id').limit(1);
    if (error) return NextResponse.json({ ok: false, error: 'Supabase connection failed.' }, { status: 503 });
    return NextResponse.json({ ok: true, service: 'supabase' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 503 });
  }
}
