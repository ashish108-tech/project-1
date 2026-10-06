'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Bot, LoaderCircle, Send, ShieldAlert, UserRound } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLocale } from '@/components/i18n/locale-provider';
import { localize } from '@/lib/i18n';

type ChatMessage = { role: 'user' | 'assistant'; content: string };
type Assessment = { classification: 'urgent' | 'non_urgent'; recommended_next_step: string };

export default function AiAssistantPage() {
  const { locale } = useLocale();
  const l = (text: string) => localize(locale, text);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [conversationId, setConversationId] = useState<string>();
  const [assessment, setAssessment] = useState<Assessment>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || loading) return;
    setError(''); setLoading(true); setMessages((current) => [...current, { role: 'user', content: trimmed }]); setMessage('');
    try {
      const response = await fetch('/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId, message: trimmed }) });
      const payload = await response.json() as { conversationId?: string; message?: ChatMessage; assessment?: Assessment; error?: string };
      if (!response.ok || !payload.message || !payload.conversationId) throw new Error(payload.error || 'The assistant could not respond.');
      setConversationId(payload.conversationId); setMessages((current) => [...current, payload.message!]); setAssessment(payload.assessment);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'The assistant could not respond.'); }
    finally { setLoading(false); }
  }

  return <AppShell><div className="mx-auto max-w-4xl fade-up"><Link href="/patient" className="mb-6 inline-flex items-center gap-2 text-xs font-bold text-[#6d8588] hover:text-[#0d766c]"><ArrowLeft size={15} /> {l('Back to patient area')}</Link><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#e8f7f2] px-3 py-1.5 text-[11px] font-bold text-[#0d766c]"><Bot size={13} /> {l('HEALTH ASSISTANT')}</div><h1 className="text-3xl font-bold tracking-[-.05em] sm:text-4xl">{l('Talk through a health concern.')}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#6d8588]">{l('Share what you are experiencing for preliminary information and safety-oriented next steps. This is not a diagnosis and does not replace a qualified clinician.')}</p></div></div><div className="mt-8 grid gap-5 lg:grid-cols-[1fr_280px]"><Card className="flex min-h-[540px] flex-col overflow-hidden"><div className="flex items-center gap-3 border-b border-[#e5efed] px-5 py-4"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#dff5ed] text-[#0d766c]"><Bot size={18} /></span><div><div className="text-sm font-bold">HealthConnect AI</div><div className="text-[11px] text-[#7c9796]">{l('Preliminary information only')}</div></div></div><div className="flex-1 space-y-4 overflow-y-auto p-5">{messages.length === 0 && <div className="flex min-h-[350px] flex-col items-center justify-center text-center"><Bot className="mb-4 text-[#8ab2ad]" size={32} /><h2 className="text-sm font-bold">{l('What would you like to understand?')}</h2><p className="mt-2 max-w-sm text-xs leading-5 text-[#78908e]">{l('Describe your symptoms, how long they have been present, and anything that makes them better or worse. Avoid sharing passwords or unrelated personal information.')}</p></div>}{messages.map((item, index) => <div key={`${item.role}-${index}`} className={`flex gap-3 ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`flex max-w-[85%] gap-2 ${item.role === 'user' ? 'flex-row-reverse' : ''}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${item.role === 'user' ? 'bg-[#153238] text-white' : 'bg-[#dff5ed] text-[#0d766c]'}`}>{item.role === 'user' ? <UserRound size={13} /> : <Bot size={14} />}</span><div className={`rounded-2xl px-4 py-3 text-sm leading-6 ${item.role === 'user' ? 'rounded-tr-sm bg-[#153238] text-white' : 'rounded-tl-sm bg-[#f1f7f5] text-[#38575a]'}`}>{item.content}</div></div></div>)}{loading && <div className="flex items-center gap-2 text-xs font-semibold text-[#78908e]"><LoaderCircle className="animate-spin" size={15} /> {l('Reviewing your message safely…')}</div>}{error && <div className="rounded-xl border border-[#f0d1c6] bg-[#fff7f3] p-3 text-xs leading-5 text-[#a35742]" role="alert">{error}</div>}</div><form onSubmit={submit} className="border-t border-[#e5efed] p-4"><div className="flex items-end gap-2 rounded-2xl border border-[#cfe2df] bg-[#fbfdfc] p-2 focus-within:border-[#0d766c]"><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder={l('Describe your concern…')} rows={2} maxLength={4000} disabled={loading} className="min-h-12 flex-1 resize-none bg-transparent px-2 py-1 text-sm outline-none placeholder:text-[#9aafad]" aria-label={l('Describe your health concern')} /><Button type="submit" className="h-9 w-9 px-0" disabled={loading || !message.trim()} aria-label={l('Send message')}><Send size={16} /></Button></div><div className="mt-2 flex justify-between text-[10px] text-[#9aafad]"><span>{l('Do not use this chat for emergencies.')}</span><span>{message.length}/4000</span></div></form></Card><div className="space-y-4"><Card className="bg-[#fff5e7] p-5"><div className="flex items-center gap-2 text-[#b86a48]"><ShieldAlert size={17} /><h2 className="text-xs font-bold uppercase tracking-[.12em]">{l('Safety first')}</h2></div><p className="mt-3 text-xs leading-5 text-[#806b58]">{l('For severe symptoms, call local emergency services or go to the nearest emergency department. The assistant cannot assess emergencies.')}</p></Card>{assessment && <Card className={`p-5 ${assessment.classification === 'urgent' ? 'border-[#f0c4b7] bg-[#fff7f3]' : 'bg-[#f1f7f5]'}`}><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em]">{assessment.classification === 'urgent' ? <AlertTriangle size={16} className="text-[#c45f43]" /> : <Bot size={16} className="text-[#0d766c]" />} {assessment.classification === 'urgent' ? l('Urgent next step') : l('Suggested next step')}</div><p className="mt-3 text-xs leading-5 text-[#5f7776]">{assessment.recommended_next_step}</p></Card>}</div></div></div></AppShell>;
}
