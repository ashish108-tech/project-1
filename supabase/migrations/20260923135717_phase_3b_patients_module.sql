create table public.patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  date_of_birth date,
  gender text,
  address text,
  city text,
  state text,
  emergency_contact_name text,
  emergency_contact_phone text,
  profile_info jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index patients_city_idx on public.patients (city) where city is not null;
create index patients_state_idx on public.patients (state) where state is not null;
create index patients_date_of_birth_idx on public.patients (date_of_birth) where date_of_birth is not null;
create index patients_created_at_idx on public.patients (created_at desc);

alter table public.patients enable row level security;

create or replace function public.set_patients_updated_at() returns trigger language plpgsql security invoker set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists patients_set_updated_at on public.patients;
create trigger patients_set_updated_at before update on public.patients for each row execute function public.set_patients_updated_at();

create or replace function public.prevent_patient_ownership_change() returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if old.user_id is distinct from new.user_id and not public.is_admin() then
    raise exception using errcode = '42501', message = 'Only an admin can change patient ownership';
  end if;
  return new;
end;
$$;
drop trigger if exists patients_prevent_ownership_change on public.patients;
create trigger patients_prevent_ownership_change before update on public.patients for each row execute function public.prevent_patient_ownership_change();

create policy patients_select_self on public.patients for select to authenticated using (exists (select 1 from public.users u where u.id = auth.uid() and u.id = patients.user_id));
create policy patients_select_admin on public.patients for select to authenticated using (public.is_admin());
create policy patients_insert_self on public.patients for insert to authenticated with check (auth.uid() = user_id and exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'PATIENT'::public.user_role));
create policy patients_insert_admin on public.patients for insert to authenticated with check (public.is_admin());
create policy patients_update_self on public.patients for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy patients_update_admin on public.patients for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy patients_delete_admin on public.patients for delete to authenticated using (public.is_admin());
