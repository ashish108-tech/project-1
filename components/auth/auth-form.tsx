'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';
import { Activity, ArrowRight, CheckCircle2, LoaderCircle, ShieldCheck } from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import { useLocale } from '@/components/i18n/locale-provider';
import { authText } from '@/lib/auth-i18n';
import { Button } from '@/components/ui/button';

export type AuthMode = 'login' | 'register';

type AuthFormProps = { mode: AuthMode; redirectTo?: string };

function safeRedirect(value: string | undefined) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/patient';
}

export function AuthForm({ mode, redirectTo }: AuthFormProps) {
  const router = useRouter();
  const { locale } = useLocale();
  const copy = useMemo(() => authText(locale), [locale]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setError(copy.invalidEmail);
      return;
    }
    if (password.length < 8) {
      setError(copy.passwordLength);
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      setError(copy.passwordMismatch);
      return;
    }

    setLoading(true);
    const supabase = createBrowserSupabaseClient();
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
      : await supabase.auth.signUp({ email: normalizedEmail, password });
    setLoading(false);

    if (result.error) {
      setError(result.error.message || copy.genericError);
      return;
    }
    if (mode === 'register' && !result.data.session) {
      setSuccess(copy.confirmationSent);
      return;
    }
    router.replace(safeRedirect(redirectTo));
    router.refresh();
  }

  const loginHref = redirectTo ? `/auth/login?next=${encodeURIComponent(redirectTo)}` : '/auth/login';
  const registerHref = redirectTo ? `/auth/register?next=${encodeURIComponent(redirectTo)}` : '/auth/register';

  return (
    <main className="min-h-screen bg-[#f7fbfa] px-4 py-8 text-[#153238] sm:px-6 lg:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1fr_460px]">
        <section className="hidden rounded-[2rem] bg-[#153238] p-10 text-white shadow-[0_24px_70px_rgba(21,50,56,.18)] lg:block">
          <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#dff5ed] text-[#0d766c]"><Activity size={23} /></span><div><p className="font-bold">HealthConnect AI</p><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#9cc9c0]">{copy.careNetwork}</p></div></div>
          <div className="mt-24 max-w-md"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#83c7b9]">{copy.secureAccess}</p><h1 className="mt-4 text-5xl font-bold leading-[1.05] tracking-[-.055em]">{copy.heroTitle}</h1><p className="mt-5 text-sm leading-7 text-[#b7d0cb]">{copy.heroDescription}</p></div>
          <div className="mt-16 space-y-4 text-sm text-[#d2e3df]"><div className="flex items-center gap-3"><ShieldCheck size={17} className="text-[#83c7b9]" />{copy.rlsProtected}</div><div className="flex items-center gap-3"><CheckCircle2 size={17} className="text-[#83c7b9]" />{copy.humanCentered}</div></div>
        </section>

        <section className="mx-auto w-full max-w-[460px]">
          <div className="mb-6 flex items-center gap-3 lg:hidden"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#dff5ed] text-[#0d766c]"><Activity size={23} /></span><div><p className="font-bold">HealthConnect AI</p><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#7c9796]">{copy.careNetwork}</p></div></div>
          <div className="rounded-[1.75rem] border border-[#e0ecea] bg-white p-6 shadow-[0_18px_60px_rgba(21,50,56,.08)] sm:p-9">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#0d766c]">{copy.secureAccess}</p>
            <h1 className="mt-3 text-3xl font-bold tracking-[-.045em]">{mode === 'login' ? copy.loginTitle : copy.registerTitle}</h1>
            <p className="mt-3 text-sm leading-6 text-[#718988]">{mode === 'login' ? copy.loginDescription : copy.registerDescription}</p>
            <form className="mt-7 space-y-4" onSubmit={submit} noValidate>
              <label className="block text-xs font-bold text-[#506a6a]">{copy.email}<input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-[#dce9e8] bg-[#fbfdfc] px-3 py-3 text-sm font-normal outline-none transition focus:border-[#0d766c] focus:ring-2 focus:ring-[#bce6da]" /></label>
              <label className="block text-xs font-bold text-[#506a6a]">{copy.password}<input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-[#dce9e8] bg-[#fbfdfc] px-3 py-3 text-sm font-normal outline-none transition focus:border-[#0d766c] focus:ring-2 focus:ring-[#bce6da]" /></label>
              {mode === 'register' && <label className="block text-xs font-bold text-[#506a6a]">{copy.confirmPassword}<input autoComplete="new-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-[#dce9e8] bg-[#fbfdfc] px-3 py-3 text-sm font-normal outline-none transition focus:border-[#0d766c] focus:ring-2 focus:ring-[#bce6da]" /></label>}
              {error && <p className="rounded-xl border border-[#f0d1c6] bg-[#fff7f3] px-3 py-3 text-sm leading-5 text-[#a35742]" role="alert">{error}</p>}
              {success && <p className="rounded-xl border border-[#c7e8d9] bg-[#f1faf5] px-3 py-3 text-sm leading-5 text-[#0d766c]" role="status">{success}</p>}
              <Button type="submit" className="w-full" disabled={loading}>{loading && <LoaderCircle size={16} className="animate-spin" />}{mode === 'login' ? copy.signIn : copy.createAccount}<ArrowRight size={16} /></Button>
            </form>
            <p className="mt-6 text-center text-sm text-[#718988]">{mode === 'login' ? copy.noAccount : copy.haveAccount}{' '}<Link className="font-bold text-[#0d766c] hover:underline" href={mode === 'login' ? registerHref : loginHref}>{mode === 'login' ? copy.register : copy.signIn}</Link></p>
            <Link href="/" className="mt-5 block text-center text-xs font-semibold text-[#8ba19f] hover:text-[#0d766c]">{copy.backHome}</Link>
          </div>
          <p className="mt-5 text-center text-[11px] leading-5 text-[#8ba19f]">{copy.safetyNote}</p>
        </section>
      </div>
    </main>
  );
}
