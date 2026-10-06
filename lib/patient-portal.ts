import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function getPatientContext() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, patient: null, error: null };
  const { data: patient, error } = await supabase.from('patients').select('id, user_id, date_of_birth, gender, address, city, state, emergency_contact_name, emergency_contact_phone, profile_info, created_at, updated_at').eq('user_id', user.id).maybeSingle();
  return { supabase, user, patient, error };
}
