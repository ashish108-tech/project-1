create table public.prescriptions (
  id uuid primary key default gen_random_uuid(), consultation_id uuid not null unique references public.consultations(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict, doctor_id uuid not null references public.doctors(id) on delete restrict,
  notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.prescription_items (
  id uuid primary key default gen_random_uuid(), prescription_id uuid not null references public.prescriptions(id) on delete cascade,
  medicine_name text not null, dosage text not null, frequency text not null, duration text not null, instructions text,
  sort_order integer not null default 0 check (sort_order >= 0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint prescription_items_medicine_nonempty check (length(trim(medicine_name)) > 0), constraint prescription_items_dosage_nonempty check (length(trim(dosage)) > 0),
  constraint prescription_items_frequency_nonempty check (length(trim(frequency)) > 0), constraint prescription_items_duration_nonempty check (length(trim(duration)) > 0), unique (prescription_id, sort_order)
);
create index prescriptions_patient_created_idx on public.prescriptions (patient_id, created_at desc);
create index prescriptions_doctor_created_idx on public.prescriptions (doctor_id, created_at desc);
create index prescription_items_prescription_order_idx on public.prescription_items (prescription_id, sort_order);
alter table public.prescriptions enable row level security;
alter table public.prescription_items enable row level security;

create or replace function public.owns_prescription_patient(p_prescription_id uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.prescriptions p join public.patients pt on pt.id = p.patient_id where p.id = p_prescription_id and pt.user_id = auth.uid()); $$;
create or replace function public.owns_prescription_doctor(p_prescription_id uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.prescriptions p join public.doctors d on d.id = p.doctor_id where p.id = p_prescription_id and d.user_id = auth.uid()); $$;
create or replace function public.owns_prescription_item_patient(p_item_id uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.prescription_items i where i.id = p_item_id and public.owns_prescription_patient(i.prescription_id)); $$;
create or replace function public.owns_prescription_item_doctor(p_item_id uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.prescription_items i where i.id = p_item_id and public.owns_prescription_doctor(i.prescription_id)); $$;
revoke all on function public.owns_prescription_patient(uuid) from public;
revoke all on function public.owns_prescription_doctor(uuid) from public;
revoke all on function public.owns_prescription_item_patient(uuid) from public;
revoke all on function public.owns_prescription_item_doctor(uuid) from public;
grant execute on function public.owns_prescription_patient(uuid) to authenticated;
grant execute on function public.owns_prescription_doctor(uuid) to authenticated;
grant execute on function public.owns_prescription_item_patient(uuid) to authenticated;
grant execute on function public.owns_prescription_item_doctor(uuid) to authenticated;

create or replace function public.set_prescription_updated_at() returns trigger language plpgsql security invoker set search_path = public as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists prescriptions_set_updated_at on public.prescriptions;
create trigger prescriptions_set_updated_at before update on public.prescriptions for each row execute function public.set_prescription_updated_at();
drop trigger if exists prescription_items_set_updated_at on public.prescription_items;
create trigger prescription_items_set_updated_at before update on public.prescription_items for each row execute function public.set_prescription_updated_at();

create or replace function public.validate_prescription_relationship() returns trigger language plpgsql security invoker set search_path = public as $$
declare v_patient_id uuid; v_doctor_id uuid;
begin
  select c.patient_id, c.doctor_id into v_patient_id, v_doctor_id from public.consultations c where c.id = new.consultation_id;
  if v_patient_id is null or v_doctor_id is null then raise exception using errcode = '23503', message = 'Prescription consultation does not exist'; end if;
  if new.patient_id <> v_patient_id or new.doctor_id <> v_doctor_id then raise exception using errcode = '23514', message = 'Prescription participants must match the consultation'; end if;
  if tg_op = 'UPDATE' and (old.consultation_id <> new.consultation_id or old.patient_id <> new.patient_id or old.doctor_id <> new.doctor_id) then raise exception using errcode = '42501', message = 'Prescription relationships are immutable'; end if;
  return new;
end;
$$;
drop trigger if exists prescriptions_validate_relationship on public.prescriptions;
create trigger prescriptions_validate_relationship before insert or update on public.prescriptions for each row execute function public.validate_prescription_relationship();
create or replace function public.validate_prescription_item_relationship() returns trigger language plpgsql security invoker set search_path = public as $$ begin if tg_op = 'UPDATE' and old.prescription_id <> new.prescription_id then raise exception using errcode = '42501', message = 'Prescription item ownership is immutable'; end if; return new; end; $$;
drop trigger if exists prescription_items_validate_relationship on public.prescription_items;
create trigger prescription_items_validate_relationship before update on public.prescription_items for each row execute function public.validate_prescription_item_relationship();

create or replace function public.create_prescription(p_consultation_id uuid, p_notes text default null, p_items jsonb default '[]'::jsonb) returns public.prescriptions language plpgsql security definer set search_path = public as $$
declare v_consultation public.consultations; v_prescription public.prescriptions; v_item jsonb; v_index integer := 0; v_medicine text; v_dosage text; v_frequency text; v_duration text; v_instructions text;
begin
  if auth.uid() is null or not public.is_doctor() then raise exception using errcode = '42501', message = 'Only authenticated doctors can create prescriptions'; end if;
  select * into v_consultation from public.consultations where id = p_consultation_id;
  if v_consultation.id is null then raise exception using errcode = '22023', message = 'Consultation not found'; end if;
  if not public.owns_consultation_doctor(p_consultation_id) then raise exception using errcode = '42501', message = 'Only the consultation doctor can create a prescription'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then raise exception using errcode = '22023', message = 'A prescription must contain between 1 and 50 items'; end if;
  insert into public.prescriptions (consultation_id, patient_id, doctor_id, notes) values (v_consultation.id, v_consultation.patient_id, v_consultation.doctor_id, p_notes) returning * into v_prescription;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_medicine := nullif(trim(v_item->>'medicine_name'), ''); v_dosage := nullif(trim(v_item->>'dosage'), ''); v_frequency := nullif(trim(v_item->>'frequency'), ''); v_duration := nullif(trim(v_item->>'duration'), ''); v_instructions := nullif(trim(v_item->>'instructions'), '');
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
revoke all on function public.create_prescription(uuid, text, jsonb) from public;
grant execute on function public.create_prescription(uuid, text, jsonb) to authenticated;

create policy prescriptions_select_patient on public.prescriptions for select to authenticated using (public.owns_prescription_patient(id));
create policy prescriptions_select_doctor on public.prescriptions for select to authenticated using (public.owns_prescription_doctor(id));
create policy prescriptions_select_admin on public.prescriptions for select to authenticated using (public.is_admin());
create policy prescriptions_update_doctor on public.prescriptions for update to authenticated using (public.owns_prescription_doctor(id)) with check (public.owns_prescription_doctor(id));
create policy prescriptions_update_admin on public.prescriptions for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy prescriptions_delete_admin on public.prescriptions for delete to authenticated using (public.is_admin());
create policy prescriptions_insert_admin on public.prescriptions for insert to authenticated with check (public.is_admin());
create policy prescription_items_select_patient on public.prescription_items for select to authenticated using (public.owns_prescription_item_patient(id));
create policy prescription_items_select_doctor on public.prescription_items for select to authenticated using (public.owns_prescription_item_doctor(id));
create policy prescription_items_select_admin on public.prescription_items for select to authenticated using (public.is_admin());
create policy prescription_items_update_doctor on public.prescription_items for update to authenticated using (public.owns_prescription_item_doctor(id)) with check (public.owns_prescription_item_doctor(id));
create policy prescription_items_update_admin on public.prescription_items for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy prescription_items_delete_doctor on public.prescription_items for delete to authenticated using (public.owns_prescription_item_doctor(id));
create policy prescription_items_delete_admin on public.prescription_items for delete to authenticated using (public.is_admin());
create policy prescription_items_insert_admin on public.prescription_items for insert to authenticated with check (public.is_admin());
