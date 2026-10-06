alter table public.appointments rename to appointments_legacy;
create extension if not exists btree_gist;
create type public.appointment_status as enum ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');
create type public.appointment_type as enum ('IN_PERSON', 'ONLINE');

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete restrict,
  doctor_id uuid not null references public.doctors(id) on delete restrict,
  healthcare_facility_id uuid references public.healthcare_facilities(id) on delete restrict,
  appointment_type public.appointment_type not null,
  status public.appointment_status not null default 'scheduled',
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  availability_id uuid not null references public.doctor_availability(id) on delete restrict,
  reason text,
  notes text,
  slot tstzrange generated always as (tstzrange(scheduled_start, scheduled_end, '[)'::text)) stored,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint appointments_valid_window check (scheduled_start < scheduled_end),
  constraint appointments_same_calendar_day check ((scheduled_start at time zone 'UTC')::date = (scheduled_end at time zone 'UTC')::date),
  constraint appointments_in_person_facility check (appointment_type <> 'IN_PERSON'::public.appointment_type or healthcare_facility_id is not null)
);

create index appointments_v2_patient_id_idx on public.appointments (patient_id);
create index appointments_v2_doctor_start_idx on public.appointments (doctor_id, scheduled_start);
create index appointments_v2_facility_id_idx on public.appointments (healthcare_facility_id) where healthcare_facility_id is not null;
create index appointments_v2_availability_id_idx on public.appointments (availability_id);
create index appointments_v2_status_idx on public.appointments (status);
create index appointments_v2_type_idx on public.appointments (appointment_type);
create index appointments_v2_created_at_idx on public.appointments (created_at desc);
create index appointments_v2_slot_gist_idx on public.appointments using gist (slot);
alter table public.appointments enable row level security;
alter table public.appointments add constraint appointments_v2_no_doctor_double_booking exclude using gist (doctor_id with =, slot with &&) where (status <> 'cancelled'::public.appointment_status);

create or replace function public.owns_patient_profile(p_patient_id uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.patients where id = p_patient_id and user_id = auth.uid()); $$;
revoke all on function public.owns_patient_profile(uuid) from public;
grant execute on function public.owns_patient_profile(uuid) to authenticated;

create or replace function public.set_appointments_updated_at() returns trigger language plpgsql security invoker set search_path = public as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists appointments_set_updated_at on public.appointments;
create trigger appointments_set_updated_at before update on public.appointments for each row execute function public.set_appointments_updated_at();

create or replace function public.validate_appointment_update() returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if old.patient_id is distinct from new.patient_id or old.doctor_id is distinct from new.doctor_id or old.healthcare_facility_id is distinct from new.healthcare_facility_id or old.availability_id is distinct from new.availability_id or old.appointment_type is distinct from new.appointment_type or old.scheduled_start is distinct from new.scheduled_start or old.scheduled_end is distinct from new.scheduled_end then
    if not public.is_admin() then raise exception using errcode = '42501', message = 'Appointment ownership and slot fields are immutable'; end if;
  end if;
  if old.status = 'cancelled'::public.appointment_status then raise exception using errcode = '42501', message = 'Cancelled appointments cannot be reopened'; end if;
  if old.status = 'scheduled'::public.appointment_status and new.status not in ('scheduled'::public.appointment_status, 'confirmed'::public.appointment_status, 'cancelled'::public.appointment_status) then raise exception using errcode = '22023', message = 'Invalid appointment status transition'; end if;
  if old.status = 'confirmed'::public.appointment_status and new.status not in ('confirmed'::public.appointment_status, 'completed'::public.appointment_status, 'cancelled'::public.appointment_status, 'no_show'::public.appointment_status) then raise exception using errcode = '22023', message = 'Invalid appointment status transition'; end if;
  return new;
end;
$$;
drop trigger if exists appointments_validate_update on public.appointments;
create trigger appointments_validate_update before update on public.appointments for each row execute function public.validate_appointment_update();

create or replace function public.book_appointment(p_doctor_id uuid, p_healthcare_facility_id uuid, p_availability_id uuid, p_appointment_type public.appointment_type, p_scheduled_start timestamptz, p_scheduled_end timestamptz, p_reason text default null) returns public.appointments language plpgsql security definer set search_path = public as $$
declare v_patient_id uuid; v_appointment public.appointments; v_start_time time; v_end_time time; v_day smallint;
begin
  select id into v_patient_id from public.patients where user_id = auth.uid();
  if v_patient_id is null then raise exception using errcode = '42501', message = 'Authenticated user is not a patient'; end if;
  if p_scheduled_start <= now() then raise exception using errcode = '22023', message = 'Appointment must be in the future'; end if;
  if p_scheduled_end <= p_scheduled_start then raise exception using errcode = '22023', message = 'Invalid appointment time window'; end if;
  v_start_time := (p_scheduled_start at time zone 'UTC')::time; v_end_time := (p_scheduled_end at time zone 'UTC')::time; v_day := extract(dow from (p_scheduled_start at time zone 'UTC'))::smallint;
  if (p_scheduled_end at time zone 'UTC')::date <> (p_scheduled_start at time zone 'UTC')::date then raise exception using errcode = '22023', message = 'Appointment must remain within one UTC calendar day'; end if;
  if not exists (select 1 from public.doctors where id = p_doctor_id and approval_status = 'APPROVED'::public.doctor_approval_status) then raise exception using errcode = '22023', message = 'Doctor is not approved'; end if;
  if not exists (select 1 from public.doctor_availability where id = p_availability_id and doctor_id = p_doctor_id and is_active and day_of_week = v_day and start_time <= v_start_time and end_time >= v_end_time) then raise exception using errcode = '22023', message = 'Appointment is outside doctor availability'; end if;
  if p_appointment_type = 'IN_PERSON'::public.appointment_type and p_healthcare_facility_id is null then raise exception using errcode = '22023', message = 'In-person appointments require a facility'; end if;
  if p_healthcare_facility_id is not null and not exists (select 1 from public.doctor_facilities df join public.healthcare_facilities f on f.id = df.facility_id where df.doctor_id = p_doctor_id and df.facility_id = p_healthcare_facility_id and f.is_approved) then raise exception using errcode = '22023', message = 'Doctor is not linked to the selected facility'; end if;
  insert into public.appointments (patient_id, doctor_id, healthcare_facility_id, appointment_type, scheduled_start, scheduled_end, availability_id, reason) values (v_patient_id, p_doctor_id, p_healthcare_facility_id, p_appointment_type, p_scheduled_start, p_scheduled_end, p_availability_id, p_reason) returning * into v_appointment;
  return v_appointment;
exception when exclusion_violation then raise exception using errcode = '23P01', message = 'Doctor is already booked for this time';
end;
$$;
revoke all on function public.book_appointment(uuid, uuid, uuid, public.appointment_type, timestamptz, timestamptz, text) from public;
grant execute on function public.book_appointment(uuid, uuid, uuid, public.appointment_type, timestamptz, timestamptz, text) to authenticated;

create or replace function public.cancel_my_appointment(p_appointment_id uuid) returns public.appointments language plpgsql security definer set search_path = public as $$ declare v_appointment public.appointments; begin update public.appointments set status = 'cancelled'::public.appointment_status, updated_at = now() where id = p_appointment_id and public.owns_patient_profile(patient_id) and status in ('scheduled'::public.appointment_status, 'confirmed'::public.appointment_status) returning * into v_appointment; if v_appointment.id is null then raise exception using errcode = '42501', message = 'Appointment cannot be cancelled'; end if; return v_appointment; end; $$;
revoke all on function public.cancel_my_appointment(uuid) from public;
grant execute on function public.cancel_my_appointment(uuid) to authenticated;

create policy appointments_select_patient on public.appointments for select to authenticated using (public.owns_patient_profile(patient_id));
create policy appointments_select_doctor on public.appointments for select to authenticated using (public.owns_doctor_profile(doctor_id));
create policy appointments_select_admin on public.appointments for select to authenticated using (public.is_admin());
create policy appointments_update_doctor on public.appointments for update to authenticated using (public.owns_doctor_profile(doctor_id)) with check (public.owns_doctor_profile(doctor_id));
create policy appointments_update_admin on public.appointments for update to authenticated using (public.is_admin()) with check (public.is_admin());
