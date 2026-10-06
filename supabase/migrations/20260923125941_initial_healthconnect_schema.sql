create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'patient' check (role in ('patient','clinician','admin')),
  location_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(), patient_id uuid not null references public.profiles(id) on delete cascade,
  clinician_id uuid references public.profiles(id) on delete set null,
  appointment_type text not null check (appointment_type in ('video','clinic','home_visit')),
  scheduled_at timestamptz not null, status text not null default 'requested' check (status in ('requested','confirmed','completed','cancelled')), notes text, created_at timestamptz not null default now()
);

create table public.medical_documents (
  id uuid primary key default gen_random_uuid(), patient_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique, file_name text not null, mime_type text not null, file_size bigint not null check (file_size > 0),
  document_type text not null default 'other' check (document_type in ('lab_report','prescription','imaging','discharge_summary','other')), created_at timestamptz not null default now()
);

create table public.diagnostic_sessions (
  id uuid primary key default gen_random_uuid(), patient_id uuid not null references public.profiles(id) on delete cascade,
  symptoms text not null, ai_summary text, urgency text check (urgency in ('routine','soon','urgent','emergency')), disclaimer_acknowledged boolean not null default false, created_at timestamptz not null default now()
);

create table public.care_locations (
  id uuid primary key default gen_random_uuid(), name text not null,
  location_type text not null check (location_type in ('clinic','pharmacy','diagnostic_center','hospital')),
  address text not null, latitude numeric(9,6), longitude numeric(9,6), phone text, open_now boolean, created_at timestamptz not null default now()
);

create index appointments_patient_id_idx on public.appointments(patient_id);
create index appointments_scheduled_at_idx on public.appointments(scheduled_at);
create index medical_documents_patient_id_idx on public.medical_documents(patient_id);
create index diagnostic_sessions_patient_id_idx on public.diagnostic_sessions(patient_id);

alter table public.profiles enable row level security;
alter table public.appointments enable row level security;
alter table public.medical_documents enable row level security;
alter table public.diagnostic_sessions enable row level security;
alter table public.care_locations enable row level security;

create policy profiles_select_self on public.profiles for select using (auth.uid() = id);
create policy profiles_insert_self on public.profiles for insert with check (auth.uid() = id);
create policy profiles_update_self on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy appointments_patient_access on public.appointments for select using (auth.uid() = patient_id or auth.uid() = clinician_id);
create policy appointments_patient_insert on public.appointments for insert with check (auth.uid() = patient_id);
create policy appointments_patient_update on public.appointments for update using (auth.uid() = patient_id) with check (auth.uid() = patient_id);
create policy medical_documents_patient_access on public.medical_documents for select using (auth.uid() = patient_id);
create policy medical_documents_patient_insert on public.medical_documents for insert with check (auth.uid() = patient_id);
create policy medical_documents_patient_delete on public.medical_documents for delete using (auth.uid() = patient_id);
create policy diagnostic_sessions_patient_access on public.diagnostic_sessions for select using (auth.uid() = patient_id);
create policy diagnostic_sessions_patient_insert on public.diagnostic_sessions for insert with check (auth.uid() = patient_id);
create policy care_locations_public_read on public.care_locations for select using (true);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

insert into storage.buckets (id, name, public) values ('medical-documents', 'medical-documents', false) on conflict (id) do nothing;
create policy medical_documents_storage_select on storage.objects for select using (bucket_id = 'medical-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy medical_documents_storage_insert on storage.objects for insert with check (bucket_id = 'medical-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy medical_documents_storage_delete on storage.objects for delete using (bucket_id = 'medical-documents' and (storage.foldername(name))[1] = auth.uid()::text);
