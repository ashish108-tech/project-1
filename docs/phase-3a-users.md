# Phase 3A — Users Database

The `public.users` table is the application-level identity profile linked one-to-one to `auth.users`. Passwords are managed exclusively by Supabase Auth; this table contains no password hash.

## Roles

`PATIENT`, `DOCTOR`, `COLLECTION_AGENT`, and `ADMIN` are stored in the `public.user_role` enum. New Auth users receive `PATIENT` by default through the `on_auth_user_created_public_users` trigger.

## Authorization

RLS is enabled. Anonymous users have no policies. Authenticated users can read their own row and update permitted profile fields. A database trigger rejects any update that changes the caller's own role, even if a client sends a direct REST/PostgREST update. Admin policies use the `public.is_admin()` security-definer helper and are restricted to authenticated callers.

## Audit and indexes

`created_at` and `updated_at` are maintained on the row. Case-insensitive email uniqueness, phone, role, verification, and creation-time indexes support identity and administrative lookups.
