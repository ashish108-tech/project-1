'use client';

import { FormEvent, useEffect, useState } from 'react';
import { KeyRound, ShieldCheck, ShieldOff } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { RecordConsentRecord } from '@/types/database';

export default function PatientConsentsPage() {
  const [consents, setConsents] = useState<RecordConsentRecord[]>([]);
  const [doctorId, setDoctorId] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadConsents() {
    setLoading(true);
    const response = await fetch('/api/consents');
    const payload = await response.json().catch(() => ({}));
    if (response.ok) setConsents(payload.consents ?? []);
    else setMessage(payload.error ?? 'Could not load consent records.');
    setLoading(false);
  }

  useEffect(() => { void loadConsents(); }, []);

  async function grantConsent(event: FormEvent) {
    event.preventDefault(); setSubmitting(true); setMessage(null);
    const response = await fetch('/api/consents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ doctorId, expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(payload.error ?? 'Could not grant consent.');
    else { setMessage('Consent granted.'); setDoctorId(''); setExpiresAt(''); await loadConsents(); }
    setSubmitting(false);
  }

  async function revokeConsent(id: string) {
    setMessage(null);
    const response = await fetch(`/api/consents/${id}/revoke`, { method: 'POST' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(payload.error ?? 'Could not revoke consent.');
    else { setMessage('Consent revoked.'); await loadConsents(); }
  }

  return <AppShell><div className="mb-8 max-w-3xl"><p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-[#0d766c]">Privacy controls</p><h1 className="text-3xl font-bold tracking-[-.04em] sm:text-4xl">Record consent</h1><p className="mt-3 text-sm leading-6 text-[#718988]">Choose which approved doctor can access your permitted healthcare records. You can revoke access at any time.</p></div><div className="grid gap-5 lg:grid-cols-[1fr_1.15fr]"><Card className="p-6"><div className="mb-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f7f2] text-[#0d766c]"><KeyRound size={19} /></span><div><h2 className="font-bold">Grant access</h2><p className="text-xs text-[#8ba19f]">Use the doctor ID from the doctor directory.</p></div></div><form className="space-y-4" onSubmit={grantConsent}><label className="block text-xs font-bold text-[#506a6a]">Doctor ID<input value={doctorId} onChange={(event) => setDoctorId(event.target.value)} className="mt-2 w-full rounded-xl border border-[#dce9e8] bg-[#fbfdfc] px-3 py-3 text-sm outline-none ring-[#bce6da] focus:ring-2" placeholder="UUID" required /></label><label className="block text-xs font-bold text-[#506a6a]">Optional expiry<input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="mt-2 w-full rounded-xl border border-[#dce9e8] bg-[#fbfdfc] px-3 py-3 text-sm outline-none ring-[#bce6da] focus:ring-2" /></label><Button type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Grant consent'}</Button></form></Card><Card className="p-6"><div className="mb-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef2ff] text-[#5865b8]"><ShieldCheck size={19} /></span><div><h2 className="font-bold">Your consent history</h2><p className="text-xs text-[#8ba19f]">Expired and revoked grants remain auditable.</p></div></div>{message && <p className="mb-4 rounded-xl bg-[#f2f8f6] px-3 py-2 text-sm text-[#0d766c]">{message}</p>}{loading ? <p className="text-sm text-[#718988]">Loading consent records…</p> : consents.length === 0 ? <p className="text-sm leading-6 text-[#718988]">No consent grants yet.</p> : <div className="space-y-3">{consents.map((consent) => { const active = consent.status === 'ACTIVE' && (!consent.expires_at || new Date(consent.expires_at) > new Date()); return <div key={consent.id} className="flex items-start justify-between gap-3 rounded-xl border border-[#e3eeec] p-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">Doctor {consent.doctor_id}</p><p className="mt-1 text-xs text-[#8ba19f]">{active ? 'Active' : consent.status === 'REVOKED' ? 'Revoked' : 'Expired'} · Granted {new Date(consent.granted_at).toLocaleDateString()}</p>{consent.expires_at && <p className="mt-1 text-xs text-[#8ba19f]">Expires {new Date(consent.expires_at).toLocaleString()}</p>}</div>{active && <Button variant="outline" size="sm" onClick={() => void revokeConsent(consent.id)}><ShieldOff size={14} />Revoke</Button>}</div>; })}</div>}</Card></div></AppShell>;
}
