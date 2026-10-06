create type public.doctor_approval_status as enum ('PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED');
create type public.facility_type as enum ('HOSPITAL', 'CLINIC', 'LABORATORY', 'HEALTH_CENTER');

create table public.doctors (
  id uuid primary key default gen_random_uuid(), user_id uuid not null unique references public.users(id) on delete cascade,
  license_number text not null unique, specialization text not null, bio text,
  years_of_experience integer check (years_of_experience is null or years_of_experience >= 0),
  consultation_fee numeric(12,2) check (consultation_fee is null or consultation_fee >= 0),
  approval_status public.doctor_approval_status not null default 'PENDING', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.healthcare_facilities (
  id uuid primary key default gen_random_uuid(), name text not null, facility_type public.facility_type not null,
  address text not null, city text, state text, postal_code text, phone text, email text,
  latitude numeric(9,6) check (latitude is null or latitude between -90 and 90), longitude numeric(9,6) check (longitude is null or longitude between -180 and 180),
  is_approved boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.doctor_facilities (
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  facility_id uuid not null references public.healthcare_facilities(id) on delete cascade,
  is_primary boolean not null default false, created_at timestamptz not null default now(), primary key (doctor_id, facility_id)
);

create table public.doctor_availability (
  id uuid primary key default gen_random_uuid(), doctor_id uuid not null references public.doctors(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), start_time time not null, end_time time not null,
  is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint doctor_availability_valid_window check (start_time < end_time)
);

create unique index doctors_license_number_ci_unique_idx on public.doctors (lower(license_number));
create index doctors_user_id_idx on public.doctors (user_id);
create index doctors_approval_status_idx on public.doctors (approval_status);
create index doctors_specialization_idx on public.doctors (specialization);
create index facilities_type_idx on public.healthcare_facilities (facility_type);
create index facilities_city_idx on public.healthcare_facilities (city) where city is not null;
create index facilities_state_idx on public.healthcare_facilities (state) where state is not null;
create index facilities_approved_idx on public.healthcare_facilities (is_approved);
create index doctor_facilities_facility_id_idx on public.doctor_facilities (facility_id);
create index availability_doctor_day_idx on public.doctor_availability (doctor_id, day_of_week);
create index availability_active_idx on public.doctor_availability (is_active);

alter table public.doctors enable row level security;
alter table public.healthcare_facilities enable row level security;
alter table public.doctor_facilities enable row level security;
alter table public.doctor_availability enable row level security;

create or replace function public.is_doctor() returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.users where id = auth.uid() and role = 'DOCTOR'::public.user_role); $$;
create or replace function public.is_patient() returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.users where id = auth.uid() and role = 'PATIENT'::public.user_role); $$;
create or replace function public.owns_doctor_profile(p_doctor_id uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.doctors where id = p_doctor_id and user_id = auth.uid()); $$;
create or replace function public.is_approved_doctor(p_doctor_id uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.doctors where id = p_doctor_id and approval_status = 'APPROVED'::public.doctor_approval_status); $$;
create or replace function public.is_approved_facility(p_facility_id uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.healthcare_facilities where id = p_facility_id and is_approved); $$;
revoke all on function public.is_doctor() from public;
revoke all on function public.is_patient() from public;
revoke all on function public.owns_doctor_profile(uuid) from public;
revoke all on function public.is_approved_doctor(uuid) from public;
revoke all on function public.is_approved_facility(uuid) from public;
grant execute on function public.is_doctor() to authenticated;
grant execute on function public.is_patient() to authenticated;
grant execute on function public.owns_doctor_profile(uuid) to authenticated;
grant execute on function public.is_approved_doctor(uuid) to authenticated;
grant execute on function public.is_approved_facility(uuid) to authenticated;

create or replace function public.set_doctor_updated_at() returns trigger language plpgsql security invoker set search_path = public as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists doctors_set_updated_at on public.doctors;
create trigger doctors_set_updated_at before update on public.doctors for each row execute function public.set_doctor_updated_at();
create or replace function public.set_facility_updated_at() returns trigger language plpgsql security invoker set search_path = public as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists facilities_set_updated_at on public.healthcare_facilities;
create trigger facilities_set_updated_at before update on public.healthcare_facilities for each row execute function public.set_facility_updated_at();
create or replace function public.set_availability_updated_at() returns trigger language plpgsql security invoker set search_path = public as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists availability_set_updated_at on public.doctor_availability;
create trigger availability_set_updated_at before update on public.doctor_availability for each row execute function public.set_availability_updated_at();

create or replace function public.prevent_doctor_protected_change() returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if (old.user_id is distinct from new.user_id or old.approval_status is distinct from new.approval_status) and auth.uid() = old.user_id and not public.is_admin() then
    raise exception using errcode = '42501', message = 'Only an admin can change doctor ownership or approval';
  end if;
  return new;
end;
$$;
drop trigger if exists doctors_prevent_protected_change on public.doctors;
create trigger doctors_prevent_protected_change before update on public.doctors for each row execute function public.prevent_doctor_protected_change();

create policy doctors_select_approved_patient on public.doctors for select to authenticated using (approval_status = 'APPROVED'::public.doctor_approval_status and public.is_patient());
create policy doctors_select_self on public.doctors for select to authenticated using (public.owns_doctor_profile(id));
create policy doctors_select_admin on public.doctors for select to authenticated using (public.is_admin());
create policy doctors_insert_admin on public.doctors for insert to authenticated with check (public.is_admin());
create policy doctors_update_self on public.doctors for update to authenticated using (public.owns_doctor_profile(id)) with check (public.owns_doctor_profile(id));
create policy doctors_update_admin on public.doctors for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy doctors_delete_admin on public.doctors for delete to authenticated using (public.is_admin());

create policy facilities_select_approved_patient on public.healthcare_facilities for select to authenticated using (is_approved and public.is_patient());
create policy facilities_select_linked_doctor on public.healthcare_facilities for select to authenticated using (exists (select 1 from public.doctor_facilities df where df.facility_id = id and public.owns_doctor_profile(df.doctor_id)));
create policy facilities_select_admin on public.healthcare_facilities for select to authenticated using (public.is_admin());
create policy facilities_insert_admin on public.healthcare_facilities for insert to authenticated with check (public.is_admin());
create policy facilities_update_admin on public.healthcare_facilities for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy facilities_delete_admin on public.healthcare_facilities for delete to authenticated using (public.is_admin());

create policy doctor_facilities_select_patient on public.doctor_facilities for select to authenticated using (public.is_patient() and public.is_approved_doctor(doctor_id) and public.is_approved_facility(facility_id));
create policy doctor_facilities_select_doctor on public.doctor_facilities for select to authenticated using (public.owns_doctor_profile(doctor_id));
create policy doctor_facilities_select_admin on public.doctor_facilities for select to authenticated using (public.is_admin());
create policy doctor_facilities_insert_admin on public.doctor_facilities for insert to authenticated with check (public.is_admin());
create policy doctor_facilities_update_admin on public.doctor_facilities for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy doctor_facilities_delete_admin on public.doctor_facilities for delete to authenticated using (public.is_admin());

create policy availability_select_patient on public.doctor_availability for select to authenticated using (public.is_patient() and is_active and public.is_approved_doctor(doctor_id));
create policy availability_select_doctor on public.doctor_availability for select to authenticated using (public.owns_doctor_profile(doctor_id));
create policy availability_select_admin on public.doctor_availability for select to authenticated using (public.is_admin());
create policy availability_insert_self on public.doctor_availability for insert to authenticated with check (public.owns_doctor_profile(doctor_id));
create policy availability_insert_admin on public.doctor_availability for insert to authenticated with check (public.is_admin());
create policy availability_update_self on public.doctor_availability for update to authenticated using (public.owns_doctor_profile(doctor_id)) with check (public.owns_doctor_profile(doctor_id));
create policy availability_update_admin on public.doctor_availability for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy availability_delete_self on public.doctor_availability for delete to authenticated using (public.owns_doctor_profile(doctor_id));
create policy availability_delete_admin on public.doctor_availability for delete to authenticated using (public.is_admin());
