create type public.ai_message_role as enum ('user', 'assistant', 'system');
create type public.symptom_classification as enum ('urgent', 'non_urgent');

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(), patient_id uuid not null references public.patients(id) on delete cascade,
  title text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.ai_messages (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade, role public.ai_message_role not null,
  content text not null, created_at timestamptz not null default now()
);
create table public.symptom_assessments (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade, classification public.symptom_classification not null,
  red_flags text[] not null default '{}'::text[], recommended_next_step text not null, created_at timestamptz not null default now()
);

create index ai_conversations_patient_updated_idx on public.ai_conversations (patient_id, updated_at desc);
create index ai_messages_conversation_created_idx on public.ai_messages (conversation_id, created_at);
create index ai_messages_patient_created_idx on public.ai_messages (patient_id, created_at desc);
create index symptom_assessments_patient_created_idx on public.symptom_assessments (patient_id, created_at desc);
create index symptom_assessments_conversation_idx on public.symptom_assessments (conversation_id, created_at desc);
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.symptom_assessments enable row level security;

create or replace function public.owns_ai_conversation(p_conversation_id uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.ai_conversations c join public.patients p on p.id = c.patient_id where c.id = p_conversation_id and p.user_id = auth.uid()); $$;
create or replace function public.owns_ai_message(p_message_id uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.ai_messages m join public.patients p on p.id = m.patient_id where m.id = p_message_id and p.user_id = auth.uid()); $$;
create or replace function public.owns_symptom_assessment(p_assessment_id uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.symptom_assessments s join public.patients p on p.id = s.patient_id where s.id = p_assessment_id and p.user_id = auth.uid()); $$;
revoke all on function public.owns_ai_conversation(uuid) from public;
revoke all on function public.owns_ai_message(uuid) from public;
revoke all on function public.owns_symptom_assessment(uuid) from public;
grant execute on function public.owns_ai_conversation(uuid) to authenticated;
grant execute on function public.owns_ai_message(uuid) to authenticated;
grant execute on function public.owns_symptom_assessment(uuid) to authenticated;

create or replace function public.set_ai_conversation_updated_at() returns trigger language plpgsql security invoker set search_path = public as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists ai_conversations_set_updated_at on public.ai_conversations;
create trigger ai_conversations_set_updated_at before update on public.ai_conversations for each row execute function public.set_ai_conversation_updated_at();

create policy ai_conversations_select_own on public.ai_conversations for select to authenticated using (public.owns_ai_conversation(id));
create policy ai_conversations_insert_own on public.ai_conversations for insert to authenticated with check (exists (select 1 from public.patients p where p.id = patient_id and p.user_id = auth.uid()));
create policy ai_conversations_update_own on public.ai_conversations for update to authenticated using (public.owns_ai_conversation(id)) with check (public.owns_ai_conversation(id));
create policy ai_conversations_delete_own on public.ai_conversations for delete to authenticated using (public.owns_ai_conversation(id));
create policy ai_messages_select_own on public.ai_messages for select to authenticated using (public.owns_ai_message(id));
create policy ai_messages_insert_own on public.ai_messages for insert to authenticated with check (exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.patient_id = ai_messages.patient_id and public.owns_ai_conversation(c.id)));
create policy symptom_assessments_select_own on public.symptom_assessments for select to authenticated using (public.owns_symptom_assessment(id));
create policy symptom_assessments_insert_own on public.symptom_assessments for insert to authenticated with check (exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.patient_id = symptom_assessments.patient_id and public.owns_ai_conversation(c.id)));
