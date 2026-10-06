import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function getDoctorContext() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, doctor: null, error: null };
  const { data: doctor, error } = await supabase.from('doctors').select('id, user_id, license_number, specialization, bio, years_of_experience, consultation_fee, approval_status, created_at, updated_at').eq('user_id', user.id).maybeSingle();
  return { supabase, user, doctor, error };
}
