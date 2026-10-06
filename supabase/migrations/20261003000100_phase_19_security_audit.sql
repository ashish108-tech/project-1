-- Phase 19 security audit remediations.
-- Keep security-sensitive RPCs unavailable to anonymous callers and require
-- active patient consent for doctor-created clinical records.

revoke all on function public.assign_collection_agent(uuid, uuid) from public, anon;
revoke all on function public.create_prescription(uuid, text, jsonb) from public, anon;
revoke all on function public.create_test_order(uuid, uuid, uuid, timestamptz, text) from public, anon;
revoke all on function public.current_doctor_id() from public, anon;
revoke all on function public.grant_record_consent(uuid, timestamptz) from public, anon;
revoke all on function public.has_valid_record_consent(uuid, uuid) from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_approved_doctor(uuid) from public, anon;
revoke all on function public.is_approved_facility(uuid) from public, anon;
revoke all on function public.is_doctor() from public, anon;
revoke all on function public.is_patient() from public, anon;
revoke all on function public.mark_all_notifications_read() from public, anon;
revoke all on function public.mark_notification_read(uuid) from public, anon;
revoke all on function public.owns_ai_conversation(uuid) from public, anon;
revoke all on function public.owns_ai_message(uuid) from public, anon;
revoke all on function public.owns_consultation_doctor(uuid) from public, anon;
revoke all on function public.owns_consultation_patient(uuid) from public, anon;
revoke all on function public.owns_doctor_profile(uuid) from public, anon;
revoke all on function public.owns_patient_profile(uuid) from public, anon;
revoke all on function public.owns_prescription_doctor(uuid) from public, anon;
revoke all on function public.owns_prescription_item_doctor(uuid) from public, anon;
revoke all on function public.owns_prescription_item_patient(uuid) from public, anon;
revoke all on function public.owns_prescription_patient(uuid) from public, anon;
revoke all on function public.owns_symptom_assessment(uuid) from public, anon;
revoke all on function public.request_home_collection(uuid, timestamptz, text, text, text, text, text) from public, anon;
revoke all on function public.revoke_record_consent(uuid) from public, anon;
revoke all on function public.sync_health_timeline_event(uuid, public.health_timeline_event_type, text, text, timestamptz, uuid, uuid, uuid, uuid, uuid, uuid) from public, anon;
revoke all on function public.update_collection_status(uuid, public.collection_request_status, text, text) from public, anon;
revoke all on function public.update_test_order_status(uuid, public.test_order_status) from public, anon;
revoke all on function public.match_medical_knowledge(vector, double precision, integer) from public, anon;

-- These functions are used by authenticated policies or authenticated APIs.
grant execute on function public.assign_collection_agent(uuid, uuid) to authenticated;
grant execute on function public.create_prescription(uuid, text, jsonb) to authenticated;
grant execute on function public.create_test_order(uuid, uuid, uuid, timestamptz, text) to authenticated;
grant execute on function public.current_doctor_id() to authenticated;
grant execute on function public.grant_record_consent(uuid, timestamptz) to authenticated;
grant execute on function public.has_valid_record_consent(uuid, uuid) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_approved_doctor(uuid) to authenticated;
grant execute on function public.is_approved_facility(uuid) to authenticated;
grant execute on function public.is_doctor() to authenticated;
grant execute on function public.is_patient() to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.owns_ai_conversation(uuid) to authenticated;
grant execute on function public.owns_ai_message(uuid) to authenticated;
grant execute on function public.owns_consultation_doctor(uuid) to authenticated;
grant execute on function public.owns_consultation_patient(uuid) to authenticated;
grant execute on function public.owns_doctor_profile(uuid) to authenticated;
grant execute on function public.owns_patient_profile(uuid) to authenticated;
grant execute on function public.owns_prescription_doctor(uuid) to authenticated;
grant execute on function public.owns_prescription_item_doctor(uuid) to authenticated;
grant execute on function public.owns_prescription_item_patient(uuid) to authenticated;
grant execute on function public.owns_prescription_patient(uuid) to authenticated;
grant execute on function public.owns_symptom_assessment(uuid) to authenticated;
grant execute on function public.request_home_collection(uuid, timestamptz, text, text, text, text, text) to authenticated;
grant execute on function public.revoke_record_consent(uuid) to authenticated;
grant execute on function public.sync_health_timeline_event(uuid, public.health_timeline_event_type, text, text, timestamptz, uuid, uuid, uuid, uuid, uuid, uuid) to authenticated;
grant execute on function public.update_collection_status(uuid, public.collection_request_status, text, text) to authenticated;
grant execute on function public.update_test_order_status(uuid, public.test_order_status) to authenticated;
grant execute on function public.match_medical_knowledge(vector, double precision, integer) to authenticated;

-- Doctor test orders are clinical records and require active consent for access.
drop policy if exists test_orders_select_doctor on public.test_orders;
create policy test_orders_select_doctor on public.test_orders
for select to authenticated
using (
  exists (
    select 1
    from public.doctors d
    where d.id = doctor_id
      and d.user_id = auth.uid()
      and d.approval_status = 'APPROVED'::public.doctor_approval_status
  )
  and public.has_valid_record_consent(patient_id, public.current_doctor_id())
);

create or replace function public.create_consultation(
  p_appointment_id uuid,
  p_symptoms text,
  p_clinical_notes text default null,
  p_assessment text default null,
  p_advice text default null,
  p_follow_up_date date default null
) returns public.consultations
language plpgsql security definer set search_path = public as $$
declare
  v_appointment public.appointments;
  v_consultation public.consultations;
begin
  if auth.uid() is null or not public.is_doctor() then
    raise exception using errcode = '42501', message = 'Only authenticated doctors can create consultations';
  end if;
  select * into v_appointment from public.appointments where id = p_appointment_id;
  if v_appointment.id is null then raise exception using errcode = '22023', message = 'Appointment not found'; end if;
  if not public.owns_doctor_profile(v_appointment.doctor_id) then raise exception using errcode = '42501', message = 'Only the assigned doctor can create a consultation'; end if;
  if v_appointment.status <> 'completed'::public.appointment_status then raise exception using errcode = '22023', message = 'Consultation requires a completed appointment'; end if;
  if not public.has_valid_record_consent(v_appointment.patient_id, v_appointment.doctor_id) then raise exception using errcode = '42501', message = 'Active patient consent is required'; end if;
  if length(trim(coalesce(p_symptoms, ''))) = 0 then raise exception using errcode = '22023', message = 'Symptoms are required'; end if;
  insert into public.consultations (appointment_id, patient_id, doctor_id, symptoms, clinical_notes, assessment, advice, follow_up_date)
  values (p_appointment_id, v_appointment.patient_id, v_appointment.doctor_id, p_symptoms, p_clinical_notes, p_assessment, p_advice, p_follow_up_date)
  returning * into v_consultation;
  return v_consultation;
end;
$$;
revoke all on function public.create_consultation(uuid, text, text, text, text, date) from public, anon;
grant execute on function public.create_consultation(uuid, text, text, text, text, date) to authenticated;

create or replace function public.create_prescription(
  p_consultation_id uuid,
  p_notes text default null,
  p_items jsonb default '[]'::jsonb
) returns public.prescriptions
language plpgsql security definer set search_path = public as $$
declare
  v_consultation public.consultations;
  v_prescription public.prescriptions;
  v_item jsonb;
  v_index integer := 0;
  v_medicine text;
  v_dosage text;
  v_frequency text;
  v_duration text;
  v_instructions text;
begin
  if auth.uid() is null or not public.is_doctor() then raise exception using errcode = '42501', message = 'Only authenticated doctors can create prescriptions'; end if;
  select * into v_consultation from public.consultations where id = p_consultation_id;
  if v_consultation.id is null then raise exception using errcode = '22023', message = 'Consultation not found'; end if;
  if not public.owns_consultation_doctor(p_consultation_id) then raise exception using errcode = '42501', message = 'Only the consultation doctor can create a prescription'; end if;
  if not public.has_valid_record_consent(v_consultation.patient_id, v_consultation.doctor_id) then raise exception using errcode = '42501', message = 'Active patient consent is required'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then raise exception using errcode = '22023', message = 'A prescription must contain between 1 and 50 items'; end if;
  insert into public.prescriptions (consultation_id, patient_id, doctor_id, notes) values (v_consultation.id, v_consultation.patient_id, v_consultation.doctor_id, p_notes) returning * into v_prescription;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_medicine := nullif(trim(v_item->>'medicine_name'), '');
    v_dosage := nullif(trim(v_item->>'dosage'), '');
    v_frequency := nullif(trim(v_item->>'frequency'), '');
    v_duration := nullif(trim(v_item->>'duration'), '');
    v_instructions := nullif(trim(v_item->>'instructions'), '');
    if v_medicine is null or v_dosage is null or v_frequency is null or v_duration is null then raise exception using errcode = '22023', message = 'Each prescription item requires medicine_name, dosage, frequency, and duration'; end if;
    insert into public.prescription_items (prescription_id, medicine_name, dosage, frequency, duration, instructions, sort_order) values (v_prescription.id, v_medicine, v_dosage, v_frequency, v_duration, v_instructions, v_index);
    v_index := v_index + 1;
  end loop;
  return v_prescription;
exception when others then
  if v_prescription.id is not null then delete from public.prescriptions where id = v_prescription.id; end if;
  raise;
end;
$$;
revoke all on function public.create_prescription(uuid, text, jsonb) from public, anon;
grant execute on function public.create_prescription(uuid, text, jsonb) to authenticated;

create or replace function public.create_test_order(
  p_patient_id uuid,
  p_facility_test_id uuid,
  p_doctor_id uuid default null,
  p_scheduled_at timestamptz default null,
  p_notes text default null
) returns public.test_orders
language plpgsql security definer set search_path = public as $$
declare
  v_order public.test_orders;
  v_facility_id uuid;
  v_test_id uuid;
  v_user_patient_id uuid;
begin
  if auth.uid() is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  select id into v_user_patient_id from public.patients where user_id = auth.uid();
  if not public.is_doctor() and not public.is_admin() then
    if v_user_patient_id is null or p_patient_id <> v_user_patient_id then raise exception using errcode = '42501', message = 'Patients may order tests only for themselves'; end if;
  end if;
  if public.is_doctor() then
    if p_doctor_id is null or not exists (select 1 from public.doctors d where d.id = p_doctor_id and d.user_id = auth.uid() and d.approval_status = 'APPROVED') then raise exception using errcode = '42501', message = 'Only the approved ordering doctor may place this order'; end if;
    if not public.has_valid_record_consent(p_patient_id, p_doctor_id) then raise exception using errcode = '42501', message = 'Active patient consent is required'; end if;
  elsif p_doctor_id is not null and not public.is_admin() then
    raise exception using errcode = '42501', message = 'Doctor linkage requires an approved authenticated doctor';
  end if;
  select ft.facility_id, ft.test_id into v_facility_id, v_test_id
  from public.facility_tests ft
  join public.healthcare_facilities f on f.id = ft.facility_id
  join public.tests t on t.id = ft.test_id
  where ft.id = p_facility_test_id and ft.is_active = true and f.is_approved = true and t.is_active = true;
  if v_facility_id is null then raise exception using errcode = '22023', message = 'The selected facility test offering is unavailable'; end if;
  insert into public.test_orders (patient_id, doctor_id, facility_id, test_id, facility_test_id, scheduled_at, notes)
  values (p_patient_id, p_doctor_id, v_facility_id, v_test_id, p_facility_test_id, p_scheduled_at, p_notes)
  returning * into v_order;
  return v_order;
end;
$$;
revoke all on function public.create_test_order(uuid, uuid, uuid, timestamptz, text) from public, anon;
grant execute on function public.create_test_order(uuid, uuid, uuid, timestamptz, text) to authenticated;

-- RPCs used by server routes should never be callable by anonymous REST clients.
revoke all on function public.update_test_order_status(uuid, public.test_order_status) from public, anon;
revoke all on function public.update_collection_status(uuid, public.collection_request_status, text, text) from public, anon;
revoke all on function public.sync_health_timeline_event(uuid, public.health_timeline_event_type, text, text, timestamptz, uuid, uuid, uuid, uuid, uuid, uuid) from public, anon;
