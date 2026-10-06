import type { Metadata } from 'next';
import './globals.css';
import { LocaleProvider } from '@/components/i18n/locale-provider';

export const metadata: Metadata = {
  title: 'HealthConnect AI',
  description: 'Integrated healthcare and home diagnostic assistance for every community.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body><LocaleProvider>{children}</LocaleProvider></body></html>;
}
