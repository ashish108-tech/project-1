# Phase 13 — Patient Portal

Phase 13 replaces the patient-area placeholder with a responsive patient portal built on the existing Supabase backend. The portal uses the authenticated SSR client and existing RLS policies; it does not introduce a second data store or mock healthcare records.

## Routes

The portal now includes:

- `/patient` — dashboard with upcoming appointments, test orders, reports, timeline preview, and notifications.
- `/patient/ai-assistant` — existing safety-oriented AI assistant.
- `/patient/doctors` — approved doctors from `public.doctors`.
- `/patient/facilities` — approved facilities from `public.healthcare_facilities`.
- `/patient/appointments` — patient-owned appointments.
- `/patient/tests` — patient-owned diagnostic test orders.
- `/patient/collection` — patient-owned home collection requests.
- `/patient/reports` — patient-owned report metadata and short-lived signed downloads.
- `/patient/timeline` — chronological patient timeline.
- `/patient/profile` — editable patient profile and emergency contact details.
- `/patient/notifications` — notification center with unread and mark-read behavior.
- `/patient/consents` — patient-controlled record consent.

## Data and authorization

Each server page or API route authenticates with Supabase Auth and queries through the existing RLS-protected client. Patients are never addressed by a client-supplied patient ID for profile updates; the profile route derives ownership from `auth.uid()`. Report downloads continue to use the Phase 9 signed-URL route. Doctors, facilities, appointments, tests, reports, timeline, collection, notifications, and profile data remain protected by their existing table policies.

## UI behavior

Reusable patient portal components provide headers, metric cards, empty states, authentication states, error states, and date labels. Pages show real records when available and explain when a module has no records. The dashboard includes links into the AI assistant, doctor and facility directories, reports, tests, notifications, and timeline.

## Deferred work

Google Maps facility maps, distance calculations, directions, appointment booking forms, test ordering forms, Hindi translations, and the broader doctor/agent/admin portal remain in their planned phases. Facility coordinates are displayed only as stored metadata is not yet mapped; no external location API is called in Phase 13.
