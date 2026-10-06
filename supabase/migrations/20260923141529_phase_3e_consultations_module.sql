create table public.consultations (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  doctor_id uuid not null references public.doctors(id) on delete restrict,
  symptoms text not null,
  clinical_notes text,
  assessment text,
  advice text,
  follow_up_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index consultations_patient_id_idx on public.consultations (patient_id);
create index consultations_doctor_id_idx on public.consultations (doctor_id);
create index consultations_follow_up_date_idx on public.consultations (follow_up_date) where follow_up_date is not null;
create index consultations_created_at_idx on public.consultations (created_at desc);
alter table public.consultations enable row level security;

create or replace function public.set_consultations_updated_at() returns trigger language plpgsql security invoker set search_path = public as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists consultations_set_updated_at on public.consultations;
create trigger consultations_set_updated_at before update on public.consultations for each row execute function public.set_consultations_updated_at();

create or replace function public.validate_consultation_relationship() returns trigger language plpgsql security invoker set search_path = public as $$
declare v_patient_id uuid; v_doctor_id uuid; v_status public.appointment_status;
begin
  select patient_id, doctor_id, status into v_patient_id, v_doctor_id, v_status from public.appointments where id = new.appointment_id;
  if v_patient_id is null or v_doctor_id is null then raise exception using errcode = '23503', message = 'Consultation appointment does not exist'; end if;
  if new.patient_id <> v_patient_id or new.doctor_id <> v_doctor_id then raise exception using errcode = '23514', message = 'Consultation participants must match the appointment'; end if;
  if v_status <> 'completed'::public.appointment_status then raise exception using errcode = '22023', message = 'Consultation requires a completed appointment'; end if;
  if tg_op = 'UPDATE' and (old.appointment_id <> new.appointment_id or old.patient_id <> new.patient_id or old.doctor_id <> new.doctor_id) then raise exception using errcode = '42501', message = 'Consultation relationships are immutable'; end if;
  return new;
end;
$$;
drop trigger if exists consultations_validate_relationship on public.consultations;
create trigger consultations_validate_relationship before insert or update on public.consultations for each row execute function public.validate_consultation_relationship();

create or replace function public.owns_consultation_doctor(p_consultation_id uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.consultations c where c.id = p_consultation_id and exists (select 1 from public.doctors d where d.id = c.doctor_id and d.user_id = auth.uid())); $$;
create or replace function public.owns_consultation_patient(p_consultation_id uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.consultations c join public.appointments a on a.id = c.appointment_id where c.id = p_consultation_id and c.patient_id = a.patient_id and a.status = 'completed'::public.appointment_status and exists (select 1 from public.patients p where p.id = c.patient_id and p.user_id = auth.uid())); $$;
revoke all on function public.owns_consultation_doctor(uuid) from public;
revoke all on function public.owns_consultation_patient(uuid) from public;
grant execute on function public.owns_consultation_doctor(uuid) to authenticated;
grant execute on function public.owns_consultation_patient(uuid) to authenticated;

create or replace function public.create_consultation(p_appointment_id uuid, p_symptoms text, p_clinical_notes text default null, p_assessment text default null, p_advice text default null, p_follow_up_date date default null) returns public.consultations language plpgsql security definer set search_path = public as $$
declare v_appointment public.appointments; v_consultation public.consultations;
begin
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

create policy consultations_select_patient on public.consultations for select to authenticated using (public.owns_consultation_patient(id));
create policy consultations_select_doctor on public.consultations for select to authenticated using (public.owns_consultation_doctor(id));
create policy consultations_select_admin on public.consultations for select to authenticated using (public.is_admin());
create policy consultations_update_doctor on public.consultations for update to authenticated using (public.owns_consultation_doctor(id)) with check (public.owns_consultation_doctor(id));
create policy consultations_update_admin on public.consultations for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy consultations_delete_admin on public.consultations for delete to authenticated using (public.is_admin());
