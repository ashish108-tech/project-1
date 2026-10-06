import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const BUCKET = 'medical-reports';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);
const ALLOWED_REPORT_TYPES = new Set(['LAB_RESULT', 'IMAGING', 'DISCHARGE_SUMMARY', 'OTHER']);

function textValue(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function safeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 160) || 'report';
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { data: isAdmin, error: roleError } = await supabase.rpc('is_admin');
  if (roleError || !isAdmin) return NextResponse.json({ error: 'Only administrators can upload reports until facility identity is implemented' }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get('file');
  const testOrderId = textValue(formData.get('testOrderId'));
  const reportTitle = textValue(formData.get('reportTitle'));
  const reportType = textValue(formData.get('reportType')) || 'LAB_RESULT';

  if (!(file instanceof File)) return NextResponse.json({ error: 'A report file is required' }, { status: 400 });
  if (!testOrderId || !reportTitle) return NextResponse.json({ error: 'testOrderId and reportTitle are required' }, { status: 400 });
  if (!ALLOWED_REPORT_TYPES.has(reportType)) return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
  if (!ALLOWED_MIME_TYPES.has(file.type)) return NextResponse.json({ error: 'Unsupported report file type' }, { status: 400 });
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'Report file must be between 1 byte and 10 MB' }, { status: 400 });

  const { data: order, error: orderError } = await supabase
    .from('test_orders')
    .select('id, patient_id, facility_id')
    .eq('id', testOrderId)
    .maybeSingle();
  if (orderError || !order) return NextResponse.json({ error: 'Test order not found' }, { status: 404 });

  const storagePath = `${order.id}/${crypto.randomUUID()}-${safeFilename(file.name)}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: 'Report upload failed' }, { status: 502 });

  const { data: report, error: reportError } = await supabase.from('medical_reports').insert({
    test_order_id: order.id,
    patient_id: order.patient_id,
    facility_id: order.facility_id,
    uploaded_by: user.id,
    report_title: reportTitle,
    report_type: reportType,
    storage_path: storagePath,
    original_filename: file.name.slice(0, 255),
    mime_type: file.type,
    file_size: file.size,
  }).select('id, test_order_id, patient_id, facility_id, report_title, report_type, original_filename, mime_type, file_size, created_at').single();

  if (reportError || !report) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json({ error: 'Report metadata could not be saved' }, { status: 500 });
  }

  return NextResponse.json({ report }, { status: 201 });
}
