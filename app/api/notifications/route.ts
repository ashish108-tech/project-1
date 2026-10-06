import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { data, error } = await supabase.from('notifications').select('id, notification_type, title, body, resource_type, resource_id, read_at, created_at').order('created_at', { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: 'Could not load notifications' }, { status: 500 });
  return NextResponse.json({ notifications: data ?? [], unreadCount: (data ?? []).filter((notification) => !notification.read_at).length });
}

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { data, error } = await supabase.rpc('mark_all_notifications_read');
  if (error) return NextResponse.json({ error: 'Could not mark notifications as read' }, { status: 500 });
  return NextResponse.json({ markedRead: data ?? 0 });
}
