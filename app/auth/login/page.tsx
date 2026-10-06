'use client';

import { useEffect, useState } from 'react';
import { AuthForm } from '@/components/auth/auth-form';

export default function LoginPage() {
  const [redirectTo, setRedirectTo] = useState<string | undefined>();
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('next');
    if (value && value.startsWith('/') && !value.startsWith('//')) setRedirectTo(value);
  }, []);
  return <AuthForm mode="login" redirectTo={redirectTo} />;
}
