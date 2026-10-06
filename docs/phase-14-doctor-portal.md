# Phase 14 — Doctor Portal

Phase 14 replaces the doctor placeholder with an approved-doctor workspace. It uses the existing Supabase Auth, RLS, consent, consultation, prescription, test-order, and private-report modules.

## Routes

The portal includes `/doctor`, `/doctor/appointments`, `/doctor/patients`, `/doctor/consultations`, `/doctor/prescriptions`, `/doctor/test-orders`, `/doctor/reports`, and `/doctor/profile`.

The dashboard shows today’s appointments, assigned appointments, consent-authorized patient count, consultations awaiting completion, and assigned test orders. Appointment and test-order pages use doctor-owned records. The patient page is additionally protected by a new RLS policy requiring a valid active patient–doctor consent. Consultations, prescriptions, reports, and timeline access continue to use the Phase 11 consent policies.

## Clinical operations

The consultation page submits only to the existing `create_consultation` RPC through an authenticated server route. The RPC validates doctor ownership, completed appointment status, required symptoms, and active consent. The prescription page submits to `create_prescription`, which validates the consultation doctor, active consent, item count, and required medicine fields. The test-order page submits to `create_test_order`; the database validates the doctor and diagnostic catalog relationships.

Report viewing uses a doctor-specific metadata route backed by medical-report RLS and the existing short-lived signed-download endpoint. Profile updates are restricted to professional editable fields; license number and approval status are not client-editable.

## APIs

The server routes are `/api/doctor/consultations`, `/api/doctor/prescriptions`, `/api/doctor/test-orders`, `/api/doctor/reports`, and `/api/doctor/profile`. Every route requires Supabase Auth. Client-supplied patient, appointment, consultation, and report IDs are validated as UUIDs and then authorized again by Supabase RLS or a protected RPC.

## Deferred work

Doctor search, patient-friendly names, consent requests, facility/test selection UX, appointment booking, live notifications for doctor actions, and richer patient detail views are deferred to their appropriate portal and integration phases. The current forms use UUIDs where no approved directory-selection workflow exists yet; they do not invent names or records.
