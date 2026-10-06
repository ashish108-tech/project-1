import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function getAgentContext() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, agent: null, error: null };
  const { data: agent, error } = await supabase
    .from('collection_agents')
    .select('id, user_id, service_area, is_available, is_verified, created_at, updated_at')
    .eq('user_id', user.id)
    .maybeSingle();
  return { supabase, user, agent, error };
}
