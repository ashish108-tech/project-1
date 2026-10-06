import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const BUCKET = 'medical-reports';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { id } = await context.params;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Invalid report ID' }, { status: 400 });

  const { data: report, error: reportError } = await supabase
    .from('medical_reports')
    .select('id, storage_path, original_filename, mime_type')
    .eq('id', id)
    .maybeSingle();
  if (reportError || !report) return NextResponse.json({ error: 'Report not found or access denied' }, { status: 404 });

  const { data: signed, error: signedError } = await supabase.storage.from(BUCKET).createSignedUrl(report.storage_path, 60);
  if (signedError || !signed?.signedUrl) return NextResponse.json({ error: 'Report download unavailable' }, { status: 502 });

  return NextResponse.json({ downloadUrl: signed.signedUrl, filename: report.original_filename, mimeType: report.mime_type, expiresIn: 60 });
}
