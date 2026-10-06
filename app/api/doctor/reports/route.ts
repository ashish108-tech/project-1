import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() { const supabase = await createServerSupabaseClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 }); const { data, error } = await supabase.from('medical_reports').select('id, test_order_id, patient_id, report_title, report_type, original_filename, mime_type, file_size, created_at').order('created_at', { ascending: false }).limit(100); if (error) return NextResponse.json({ error: 'Could not load reports' }, { status: 500 }); return NextResponse.json({ reports: data ?? [] }); }
