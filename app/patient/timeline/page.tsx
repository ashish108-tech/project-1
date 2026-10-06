import { CalendarDays, ClipboardCheck, FileText, HeartPulse, Pill, Stethoscope } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Card } from '@/components/ui/card';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { HealthTimelineEventType, HealthTimelineRecord } from '@/types/database';

const eventMeta: Record<HealthTimelineEventType, { label: string; icon: typeof HeartPulse; color: string }> = {
  AI_ASSESSMENT: { label: 'AI symptom assessment', icon: HeartPulse, color: 'bg-[#e8f7f2] text-[#0d766c]' },
  CONSULTATION: { label: 'Doctor consultation', icon: Stethoscope, color: 'bg-[#eef2ff] text-[#5865b8]' },
  DIAGNOSTIC_TEST: { label: 'Diagnostic test', icon: ClipboardCheck, color: 'bg-[#fff5e7] text-[#c47643]' },
  MEDICAL_REPORT: { label: 'Medical report', icon: FileText, color: 'bg-[#f4ecff] text-[#8a5ab7]' },
  PRESCRIPTION: { label: 'Prescription', icon: Pill, color: 'bg-[#fff0f1] text-[#c75e6b]' },
  FOLLOW_UP: { label: 'Follow-up', icon: CalendarDays, color: 'bg-[#eaf5ff] text-[#3478a8]' },
};

export default async function PatientTimelinePage() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from('health_timeline').select('id, event_type, title, summary, event_at').order('event_at', { ascending: false });
  const events = (data ?? []) as HealthTimelineRecord[];

  return (
    <AppShell>
      <div className="mb-8 max-w-3xl">
        <p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-[#0d766c]">Patient records</p>
        <h1 className="text-3xl font-bold tracking-[-.04em] sm:text-4xl">Health timeline</h1>
        <p className="mt-3 text-sm leading-6 text-[#718988]">A chronological view of your care activity. Timeline entries reference the original record; they do not duplicate clinical data.</p>
      </div>

      {error ? (
        <Card className="max-w-3xl border-[#f2d4d4] bg-[#fff8f8] p-6"><p className="font-semibold text-[#a84e58]">Timeline unavailable</p><p className="mt-2 text-sm text-[#8d696d]">We could not load your timeline. Please try again later.</p></Card>
      ) : events.length === 0 ? (
        <Card className="max-w-3xl border-dashed p-10 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f7f2] text-[#0d766c]"><CalendarDays size={22} /></div><h2 className="mt-5 text-lg font-bold">No timeline events yet</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#718988]">Your consultations, assessments, tests, reports, and prescriptions will appear here as they are recorded.</p></Card>
      ) : (
        <div className="relative max-w-3xl space-y-4 before:absolute before:bottom-6 before:left-6 before:top-6 before:w-px before:bg-[#dce9e8]">
          {events.map((event) => {
            const meta = eventMeta[event.event_type];
            const Icon = meta.icon;
            return <Card key={event.id} className="relative ml-0 flex gap-4 p-5 pl-4 sm:pl-5"><div className={`relative z-[1] flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${meta.color}`}><Icon size={19} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[10px] font-bold uppercase tracking-[.14em] text-[#7c9796]">{meta.label}</span><time className="text-xs font-medium text-[#9aafad]" dateTime={event.event_at}>{new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(event.event_at))}</time></div><h2 className="mt-2 font-bold text-[#153238]">{event.title}</h2>{event.summary && <p className="mt-1 text-sm leading-6 text-[#718988]">{event.summary}</p>}</div></Card>;
          })}
        </div>
      )}
    </AppShell>
  );
}
