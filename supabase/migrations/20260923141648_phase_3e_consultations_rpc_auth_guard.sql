create or replace function public.create_consultation(p_appointment_id uuid, p_symptoms text, p_clinical_notes text default null, p_assessment text default null, p_advice text default null, p_follow_up_date date default null) returns public.consultations language plpgsql security definer set search_path = public as $$
declare v_appointment public.appointments; v_consultation public.consultations;
begin
  if auth.uid() is null or not public.is_doctor() then raise exception using errcode = '42501', message = 'Only authenticated doctors can create consultations'; end if;
  select * into v_appointment from public.appointments where id = p_appointment_id;
  if v_appointment.id is null then raise exception using errcode = '22023', message = 'Appointment not found'; end if;
  if not public.owns_doctor_profile(v_appointment.doctor_id) then raise exception using errcode = '42501', message = 'Only the assigned doctor can create a consultation'; end if;
  if v_appointment.status <> 'completed'::public.appointment_status then raise exception using errcode = '22023', message = 'Consultation requires a completed appointment'; end if;
  if length(trim(coalesce(p_symptoms, ''))) = 0 then raise exception using errcode = '22023', message = 'Symptoms are required'; end if;
  insert into public.consultations (appointment_id, patient_id, doctor_id, symptoms, clinical_notes, assessment, advice, follow_up_date) values (p_appointment_id, v_appointment.patient_id, v_appointment.doctor_id, p_symptoms, p_clinical_notes, p_assessment, p_advice, p_follow_up_date) returning * into v_consultation;
  return v_consultation;
end;
$$;
revoke all on function public.create_consultation(uuid, text, text, text, text, date) from public;
grant execute on function public.create_consultation(uuid, text, text, text, text, date) to authenticated;
