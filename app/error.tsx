'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/ui/status-state';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) { useEffect(() => { console.error('HealthConnect application error', error); }, [error]); return <main className="min-h-screen bg-[#f7fbfa] p-6"><ErrorState title="We could not load this page" description="Please try again. If the problem continues, return to the overview." onAction={reset} /></main>; }
