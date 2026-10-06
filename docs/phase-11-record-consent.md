# Phase 11 — Record Consent

Phase 11 adds patient-controlled doctor access through `public.record_consents`. Each patient–doctor pair has one consent row with `ACTIVE` or `REVOKED` status, grant time, optional expiry, revocation time, and audit timestamps.

## Lifecycle

Patients grant access through `grant_record_consent`, which accepts an approved doctor and an optional future expiry. Granting an already-existing pair reactivates it and clears the prior revocation timestamp. Patients revoke access through `revoke_record_consent`; revocation is idempotent and preserves the audit record. A consent is valid only while active, unrevoked, unexpired, and linked to an approved doctor.

## RLS integration

The `has_valid_record_consent` security-definer helper is used by doctor policies for consultations, prescription headers and items, medical reports, report Storage objects, and health timeline entries. Doctor consultation and prescription creation RPCs also require active consent. Patients can read their own consent history; approved doctors can see only their own active consent grants; administrators can manage consent records. Collection agents receive no consent or record access.

Appointments remain operational records and are not made contingent on consent in this phase. Consent governs access to clinical records and reports.

## API and UI

The server routes are:

- `GET /api/consents` — list consent records visible to the authenticated user.
- `POST /api/consents` — grant or reactivate consent for an approved doctor.
- `POST /api/consents/[id]/revoke` — revoke a patient-owned consent.

The patient page `/patient/consents` provides grant, expiry, list, and revoke controls. The current page accepts a doctor UUID because the full patient doctor-directory workflow is scheduled for Phase 13; it does not invent doctor identities or names.

## Deferred work

Consent notifications, consent request/approval workflows, granular record categories, doctor-directory selection, and consent-aware exports are deferred to later portal and notification phases.
