'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Bell, BriefcaseMedical, CalendarDays, ClipboardCheck, ClipboardList, ClipboardPen, FileText, HeartPulse, LayoutDashboard, LogIn, Menu, Pill, ShieldCheck, Stethoscope, UserRound, Users, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { LanguageSwitcher, useLocale } from '@/components/i18n/locale-provider';
import { localize } from '@/lib/i18n';
import { authText } from '@/lib/auth-i18n';

type NavItem = { label: string; href: string; icon: typeof LayoutDashboard };

const navItems: NavItem[] = [
  { label: 'Overview', href: '/', icon: LayoutDashboard },
  { label: 'Patient area', href: '/patient', icon: HeartPulse },
  { label: 'Appointments', href: '/patient/appointments', icon: CalendarDays },
  { label: 'Test orders', href: '/patient/tests', icon: ClipboardCheck },
  { label: 'Reports', href: '/patient/reports', icon: FileText },
  { label: 'Health timeline', href: '/patient/timeline', icon: Activity },
  { label: 'Record consent', href: '/patient/consents', icon: ShieldCheck },
  { label: 'Notifications', href: '/patient/notifications', icon: Bell },
  { label: 'Profile', href: '/patient/profile', icon: UserRound },
  { label: 'Doctor area', href: '/doctor', icon: Stethoscope },
  { label: 'Doctor appointments', href: '/doctor/appointments', icon: CalendarDays },
  { label: 'Doctor patients', href: '/doctor/patients', icon: Users },
  { label: 'Consultations', href: '/doctor/consultations', icon: ClipboardPen },
  { label: 'Prescriptions', href: '/doctor/prescriptions', icon: Pill },
  { label: 'Doctor test orders', href: '/doctor/test-orders', icon: ClipboardCheck },
  { label: 'Doctor reports', href: '/doctor/reports', icon: FileText },
  { label: 'Doctor profile', href: '/doctor/profile', icon: UserRound },
  { label: 'Agent area', href: '/agent', icon: ClipboardList },
  { label: 'Agent requests', href: '/agent/requests', icon: ClipboardCheck },
  { label: 'Agent profile', href: '/agent/profile', icon: UserRound },
  { label: 'Admin area', href: '/admin', icon: ShieldCheck },
  { label: 'Admin users', href: '/admin/users', icon: Users },
  { label: 'Admin patients', href: '/admin/patients', icon: Users },
  { label: 'Admin doctors', href: '/admin/doctors', icon: Stethoscope },
  { label: 'Admin facilities', href: '/admin/facilities', icon: BriefcaseMedical },
  { label: 'Admin tests', href: '/admin/tests', icon: ClipboardCheck },
  { label: 'Admin agents', href: '/admin/agents', icon: ClipboardList },
  { label: 'Admin appointments', href: '/admin/appointments', icon: CalendarDays },
  { label: 'Admin reports', href: '/admin/reports', icon: FileText },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { locale } = useLocale();
  const auth = authText(locale);

  return (
    <div className="min-h-screen bg-[#f7fbfa] text-[#153238]">
      {mobileOpen && <button aria-label={localize(locale, 'Close navigation')} className="fixed inset-0 z-20 bg-[#153238]/20 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={cn('fixed inset-y-0 left-0 z-30 flex w-[272px] -translate-x-full flex-col overflow-hidden border-r border-[#dce9e8] bg-white px-5 py-6 transition-transform duration-200 lg:translate-x-0', mobileOpen && 'translate-x-0')}>
        <div className="mb-10 flex items-center justify-between px-2">
          <Link href="/" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
            <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#dff5ed] text-[#0d766c]"><Activity size={22} strokeWidth={2.5} /></span>
            <span><span className="block text-[15px] font-bold tracking-[-.03em]">HealthConnect</span><span className="block text-[10px] font-semibold uppercase tracking-[.18em] text-[#7c9796]">AI care network</span></span>
          </Link>
          <button className="rounded-lg p-2 text-[#6d8588] hover:bg-[#f2f8f6] lg:hidden" onClick={() => setMobileOpen(false)} aria-label={localize(locale, 'Close navigation')}><X size={18} /></button>
        </div>
        <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-[#9aafad]">{localize(locale, 'Application areas')}</div>
        <nav aria-label="Primary navigation" className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pr-1">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = href === '/' || href === '/patient' ? pathname === href : pathname.startsWith(href);
            return <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={cn('flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors', active ? 'bg-[#e8f7f2] text-[#0d766c]' : 'text-[#718988] hover:bg-[#f4f9f7]')}><Icon size={18} strokeWidth={active ? 2.4 : 1.8} /><span>{localize(locale, label)}</span></Link>;
          })}
        </nav>
        <div className="mt-auto rounded-2xl bg-[#fff5e7] p-4"><div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#ed8a64]"><BriefcaseMedical size={18} /></div><div className="text-xs font-bold text-[#604f3d]">{localize(locale, 'Field operations')}</div><p className="mt-1 text-[11px] leading-4 text-[#907a64]">{localize(locale, 'Assigned collection access is minimum-necessary.')}</p></div>
      </aside>
      <div className="lg:pl-[272px]">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-[#e1ecea]/80 bg-[#f7fbfa]/90 px-4 backdrop-blur sm:px-8 lg:px-12"><button className="rounded-xl p-2 text-[#6d8588] hover:bg-white lg:hidden" onClick={() => setMobileOpen(true)} aria-label={localize(locale, 'Open navigation')}><Menu size={21} /></button><div className="hidden text-xs font-semibold text-[#91a6a4] sm:block">{localize(locale, 'Secure care coordination workspace')}</div><div className="flex items-center gap-3 text-xs font-semibold text-[#6d8588]"><LanguageSwitcher /><span className="hidden items-center gap-2 sm:flex"><FileText size={15} />{localize(locale, 'Phase 18')}</span><Link href="/auth/login" className="inline-flex items-center gap-1.5 rounded-lg border border-[#dce9e8] bg-white px-2.5 py-1.5 text-[#0d766c] hover:bg-[#f0f8f5]"><LogIn size={14} />{auth.signIn}</Link><Link href="/auth/register" className="hidden rounded-lg bg-[#0d766c] px-2.5 py-1.5 text-white hover:bg-[#095b55] sm:inline-flex">{auth.register}</Link></div></header>
        <main className="mx-auto w-full max-w-[1180px] px-4 py-8 sm:px-8 lg:px-12 lg:py-12">{children}</main>
      </div>
    </div>
  );
}

export function RoleBadge({ label }: { label: string }) { return <span className="rounded-full bg-[#e8f7f2] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-[#0d766c]">{label}</span>; }
export function UserAvatar() { return <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#153238] text-xs font-bold text-white"><UserRound size={15} /></span>; }
