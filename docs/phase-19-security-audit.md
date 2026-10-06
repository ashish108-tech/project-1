# Phase 19 — Security Audit

## Scope

This audit reviewed Supabase Auth and SSR session handling, environment-variable exposure, API authorization, RLS and Storage policies, IDOR/BOLA boundaries, security-definer RPC privileges, medical-report downloads, input validation, and client-facing error messages.

## Remediations applied

- Added migration `phase_19_security_audit` to revoke anonymous execution from security-sensitive SECURITY DEFINER RPCs and helper functions.
- Kept only the `authenticated` execution grants required by server routes and authenticated RLS policies.
- Revoked anonymous access to `match_medical_knowledge`; RAG retrieval is now authenticated-only.
- Added active record-consent enforcement to the doctor test-order select policy.
- Added active record-consent enforcement inside the security-definer consultation, prescription, and doctor test-order creation RPCs. This prevents a doctor from creating new clinical records after consent is revoked, even though SECURITY DEFINER functions bypass table RLS during their insert.
- Preserved private medical-report Storage configuration and consent-aware report metadata/storage policies.
- Replaced direct database error-message responses in protected APIs with stable client-safe messages. Authorization failures remain distinguishable as HTTP 403 without exposing SQL details.

## Verified controls

- All healthcare tables in the live Supabase project have RLS enabled, including users, patients, doctors, appointments, consultations, AI records, RAG records, prescriptions, tests, home collection records, medical reports, timeline, consents, and notifications.
- The `medical-reports` bucket is private, limited to 10 MB, and restricted to PDF/PNG/JPEG/WebP MIME types.
- Live policy inspection confirms doctor test-order access requires both the authenticated approved doctor identity and active patient consent.
- Live privilege inspection confirms sensitive SECURITY DEFINER functions report `anon_execute = false` and `authenticated_execute = true`.
- Anonymous RPC smoke tests for `create_test_order`, `update_collection_status`, and `sync_health_timeline_event` returned HTTP 401 permission-denied responses.
- Anonymous REST reads for protected healthcare tables returned empty RLS-filtered results rather than data.
- Unauthenticated application API probes returned HTTP 401 for admin, doctor, agent, patient, and report-download routes.
- No service-role key is referenced by frontend code; Supabase browser/server clients use only the publishable key.

## Validation commands

```bash
npx tsc --noEmit
npm run build
```

Both completed successfully on 2026-10-03.

## Remaining operational testing

A full two-user authenticated test with seeded patient/doctor accounts should be run in the project environment before production deployment: grant consent, verify the doctor can access only the consented patient, revoke consent, verify clinical reads and writes are denied, and verify a different patient's records remain inaccessible. The database policy and RPC checks above provide the live server-side control verification without creating or modifying clinical test data.

## Phase 20 handoff

Phase 20 should add the full authenticated end-to-end journey and negative-path tests, including expired sessions, failed AI requests, file-upload failures, cancelled appointments/collections, and cross-role patient/doctor/agent access.
