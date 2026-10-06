'use client';

import { useEffect, useState } from 'react';
import { Bell, CheckCheck, Circle } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type NotificationItem = { id: string; notification_type: string; title: string; body: string; resource_type: string | null; resource_id: string | null; read_at: string | null; created_at: string };

const typeLabels: Record<string, string> = { APPOINTMENT_BOOKED: 'Appointment', APPOINTMENT_CONFIRMED: 'Appointment', APPOINTMENT_CANCELLED: 'Appointment', TEST_BOOKED: 'Diagnostic test', COLLECTION_ASSIGNED: 'Home collection', SAMPLE_COLLECTED: 'Sample collection', SAMPLE_DELIVERED: 'Laboratory', REPORT_READY: 'Medical report', FOLLOW_UP_REMINDER: 'Follow-up' };

export default function PatientNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadNotifications() {
    setLoading(true); setError(null);
    const response = await fetch('/api/notifications');
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) setError(payload.error ?? 'Could not load notifications.');
    else { setNotifications(payload.notifications ?? []); setUnreadCount(payload.unreadCount ?? 0); }
    setLoading(false);
  }

  useEffect(() => { void loadNotifications(); }, []);

  async function markRead(id: string) {
    const response = await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
    if (response.ok) { setNotifications((current) => current.map((notification) => notification.id === id ? { ...notification, read_at: new Date().toISOString() } : notification)); setUnreadCount((count) => Math.max(0, count - 1)); }
  }

  async function markAllRead() {
    const response = await fetch('/api/notifications', { method: 'POST' });
    if (response.ok) { setNotifications((current) => current.map((notification) => ({ ...notification, read_at: notification.read_at ?? new Date().toISOString() }))); setUnreadCount(0); }
  }

  return <AppShell><div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-[#0d766c]">Updates</p><h1 className="text-3xl font-bold tracking-[-.04em] sm:text-4xl">Notifications</h1><p className="mt-3 text-sm leading-6 text-[#718988]">Important updates about your appointments, tests, collection requests, reports, and follow-ups.</p></div><Button variant="outline" onClick={() => void markAllRead()} disabled={unreadCount === 0}><CheckCheck size={16} />Mark all read</Button></div>{loading ? <Card className="p-8 text-sm text-[#718988]">Loading notifications…</Card> : error ? <Card className="border-[#f2d4d4] bg-[#fff8f8] p-8 text-sm text-[#a84e58]">{error}</Card> : notifications.length === 0 ? <Card className="border-dashed p-10 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f7f2] text-[#0d766c]"><Bell size={22} /></div><h2 className="mt-5 text-lg font-bold">You’re all caught up</h2><p className="mt-2 text-sm text-[#718988]">New care updates will appear here.</p></Card> : <Card className="divide-y divide-[#e8f0ef] p-0">{notifications.map((notification) => <div key={notification.id} className={`flex gap-4 p-5 ${notification.read_at ? 'bg-white' : 'bg-[#f6fcfa]'}`}><div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e8f7f2] text-[#0d766c]"><Bell size={17} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-bold uppercase tracking-[.14em] text-[#7c9796]">{typeLabels[notification.notification_type] ?? 'Care update'}</span>{!notification.read_at && <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[.12em] text-[#0d766c]"><Circle size={7} fill="currentColor" />Unread</span>}</div><h2 className="mt-1 font-bold">{notification.title}</h2><p className="mt-1 text-sm leading-6 text-[#718988]">{notification.body}</p><time className="mt-2 block text-xs text-[#9aafad]" dateTime={notification.created_at}>{new Date(notification.created_at).toLocaleString()}</time></div>{!notification.read_at && <Button variant="ghost" size="sm" onClick={() => void markRead(notification.id)}>Mark read</Button>}</div>)}</Card>}</AppShell>;
}
