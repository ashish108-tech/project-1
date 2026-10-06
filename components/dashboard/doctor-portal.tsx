'use client';

import { CircleAlert } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PatientHeader } from '@/components/dashboard/patient-portal';
import { useLocale } from '@/components/i18n/locale-provider';
import { localize } from '@/lib/i18n';

export function DoctorHeader(props: { eyebrow: string; title: string; description: string; action?: { label: string; href: string } }) { return <PatientHeader {...props} />; }
export function DoctorAuthState() { const { locale } = useLocale(); return <Card className="border-[#f2d4d4] bg-[#fff8f8] p-8"><div className="flex items-start gap-3"><CircleAlert className="mt-0.5 text-[#a84e58]" size={19} /><div><h2 className="font-bold">{localize(locale, 'Doctor sign-in required')}</h2><p className="mt-2 text-sm leading-6 text-[#8d696d]">{localize(locale, 'Sign in with an approved doctor account to access clinical workspace data.')}</p></div></div></Card>; }
export function DoctorErrorState({ message = 'We could not load this doctor workspace.' }: { message?: string }) { const { locale } = useLocale(); return <Card className="border-[#f2d4d4] bg-[#fff8f8] p-8"><div className="flex items-start gap-3"><CircleAlert className="mt-0.5 text-[#a84e58]" size={19} /><div><h2 className="font-bold">{localize(locale, 'Something went wrong')}</h2><p className="mt-2 text-sm leading-6 text-[#8d696d]">{localize(locale, message)}</p></div></div></Card>; }
export function DoctorEmptyState({ title, description }: { title: string; description: string }) { const { locale } = useLocale(); return <Card className="border-dashed p-8 text-center"><h2 className="font-bold">{localize(locale, title)}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#718988]">{localize(locale, description)}</p></Card>; }
