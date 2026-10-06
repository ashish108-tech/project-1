import { createBrowserClient } from '@supabase/ssr';
import { getSupabasePublicEnv } from '@/lib/supabase/env';

export function createBrowserSupabaseClient() {
  const { url, publishableKey } = getSupabasePublicEnv();
  return createBrowserClient(url, publishableKey);
}
