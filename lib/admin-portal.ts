import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function getAdminContext() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, isAdmin: false, error: null };
  const { data: isAdmin, error } = await supabase.rpc('is_admin');
  return { supabase, user, isAdmin: Boolean(isAdmin), error };
}
