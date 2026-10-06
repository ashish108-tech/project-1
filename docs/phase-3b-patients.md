# Phase 3B — Patients Table

`public.patients` stores the patient profile associated with exactly one `public.users` row. The `user_id` unique constraint prevents duplicate patient profiles for one application user.

## Fields

The table stores date of birth, gender, address, city, state, emergency contact details, a JSON profile-info object, and audit timestamps. It does not store credentials or passwords.

## Authorization

RLS is enabled. Patients can read and update only the row owned by their authenticated user. Admins can manage patient records through the protected `public.is_admin()` helper. Patients cannot change the ownership key; a database trigger rejects ownership changes unless the actor is an admin.

Anonymous users have no policies. Indexes cover city, state, date of birth, and creation time for bounded administrative and profile lookups.
