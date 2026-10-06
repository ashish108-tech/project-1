'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { localeCookie, type Locale, type TranslationKey, t } from '@/lib/i18n';

type LocaleContextValue = { locale: Locale; setLocale: (locale: Locale) => void; t: (key: TranslationKey) => string };
const LocaleContext = createContext<LocaleContextValue | null>(null);
function readCookie() { return document.cookie.split('; ').find((part) => part.startsWith(`${localeCookie}=`))?.split('=')[1] as Locale | undefined; }
export function LocaleProvider({ children }: { children: React.ReactNode }) { const [locale, setLocaleState] = useState<Locale>('en'); useEffect(() => { const saved = window.localStorage.getItem(localeCookie) as Locale | null; const cookie = readCookie(); const next = cookie === 'hi' || saved === 'hi' ? 'hi' : 'en'; setLocaleState(next); document.documentElement.lang = next; }, []); function setLocale(next: Locale) { setLocaleState(next); document.cookie = `${localeCookie}=${next}; path=/; max-age=31536000; samesite=lax`; window.localStorage.setItem(localeCookie, next); document.documentElement.lang = next; } const value = useMemo(() => ({ locale, setLocale, t: (key: TranslationKey) => t(locale, key) }), [locale]); return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>; }
export function useLocale() { const context = useContext(LocaleContext); if (!context) throw new Error('useLocale must be used inside LocaleProvider'); return context; }
export function LanguageSwitcher() { const { locale, setLocale, t: translate } = useLocale(); return <label className="flex items-center gap-2 text-xs font-semibold text-[#6d8588]"><span className="hidden sm:inline">{translate('language.label')}</span><select aria-label={translate('language.label')} value={locale} onChange={(event) => setLocale(event.target.value as Locale)} className="rounded-lg border border-[#dce9e8] bg-white px-2 py-1.5 text-xs font-semibold text-[#506a6a]"><option value="en">{translate('language.english')}</option><option value="hi">{translate('language.hindi')}</option></select></label>; }
