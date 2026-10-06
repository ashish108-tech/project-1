create type public.user_role as enum ('PATIENT', 'DOCTOR', 'COLLECTION_AGENT', 'ADMIN');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  phone text,
  role public.user_role not null default 'PATIENT',
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index users_email_ci_unique_idx on public.users (lower(email)) where email is not null;
create index users_phone_idx on public.users (phone) where phone is not null;
create index users_role_idx on public.users (role);
create index users_is_verified_idx on public.users (is_verified);
create index users_created_at_idx on public.users (created_at desc);

alter table public.users enable row level security;

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users where id = auth.uid() and role = 'ADMIN'::public.user_role);
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.set_users_updated_at() returns trigger language plpgsql security invoker set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at before update on public.users for each row execute function public.set_users_updated_at();

create or replace function public.prevent_self_role_change() returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if old.role is distinct from new.role and auth.uid() = old.id then
    raise exception using errcode = '42501', message = 'Users cannot change their own role';
  end if;
  return new;
end;
$$;
drop trigger if exists users_prevent_self_role_change on public.users;
create trigger users_prevent_self_role_change before update on public.users for each row execute function public.prevent_self_role_change();

create or replace function public.handle_new_auth_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, phone, is_verified)
  values (new.id, new.email, new.phone, new.email_confirmed_at is not null or new.phone_confirmed_at is not null);
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_public_users on auth.users;
create trigger on_auth_user_created_public_users after insert on auth.users for each row execute function public.handle_new_auth_user();

create policy users_select_self on public.users for select to authenticated using (auth.uid() = id);
create policy users_select_admin on public.users for select to authenticated using (public.is_admin());
create policy users_insert_self_patient on public.users for insert to authenticated with check (auth.uid() = id and role = 'PATIENT'::public.user_role);
create policy users_insert_admin on public.users for insert to authenticated with check (public.is_admin());
create policy users_update_self on public.users for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy users_update_admin on public.users for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy users_delete_admin on public.users for delete to authenticated using (public.is_admin());
