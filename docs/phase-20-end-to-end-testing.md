# Phase 20 — End-to-End Testing

## Scope

Phase 20 covers the complete HealthConnect AI workflow and the security-critical negative paths:

`registration → login → AI assistant → healthcare search → doctor selection → appointment booking → consultation → test recommendation → test booking → home collection → agent acceptance → collection → lab processing → report upload → patient viewing → timeline → doctor follow-up`

It also covers urgent AI triage, cancellations, invalid input, failed services, private-file access, expired/unauthorized sessions, and cross-role isolation.

## Test assets

- `scripts/phase20-e2e.mjs` is an authenticated Supabase client harness. It accepts disposable fixture credentials through `E2E_PASSWORD`, `E2E_PATIENT_A_EMAIL`, `E2E_PATIENT_B_EMAIL`, `E2E_DOCTOR_EMAIL`, and optional user-ID overrides. It never contains production credentials.
- Run it with:

```bash
E2E_PASSWORD='your-disposable-test-password' npm run test:e2e:phase20
```

The project must provide real, confirmed Auth accounts and matching `public.users`, `patients`, and `doctors` records before running this client-level harness. Do not use production patient data.

## Executed live checks

The connected Supabase project was tested using the `authenticated` database role and disposable Phase 20 identities. Results:

| Check | Result |
|---|---|
| Patient A reads own profile | Passed: exactly one own profile visible |
| Patient B reads own profile | Passed: exactly one own profile visible |
| Patient A reads Patient B profile | Passed: zero rows |
| Patient B reads Patient A profile | Passed: zero rows |
| Patient A updates Patient B profile | Passed: no row changed |
| Patient B updates Patient A profile | Passed: no row changed |
| Doctor reads patients without consent | Passed: zero rows |
| Patient A grants doctor consent | Passed |
| Doctor reads consented Patient A | Passed: one row |
| Doctor reads unconsented Patient B | Passed: zero rows |
| Consent revocation removes doctor access | Passed: zero rows after revoke |
| Disposable Auth/profile fixtures cleanup | Passed: no `phase20.*` users remain |

The consent grant/revoke checks were executed in a transaction where appropriate; the final committed fixture consent was explicitly revoked. No clinical production records were left behind.

## Anonymous and negative-path smoke tests

Unauthenticated requests to the following routes all returned HTTP 401:

- `/api/admin/overview`
- `/api/ai/chat`
- `/api/reports/upload`
- `/api/reports/<id>/download`
- `/api/agent/requests/<id>` status mutation

This confirms authentication is enforced before malformed input or role-specific processing is reached. Anonymous RPC calls for test-order creation, collection status updates, and timeline synchronization returned permission-denied responses after the Phase 19 hardening.

## Full journey test matrix

The following cases are the required authenticated run before production deployment. The application routes and database controls are in place; disposable accounts and facility/test fixtures must be supplied in the target environment for the state-changing journey.

| ID | Scenario | Expected result |
|---|---|---|
| E2E-01 | Patient registration and email-confirmed login | Session is created; role is PATIENT |
| E2E-02 | Patient asks non-urgent AI question | Preliminary, limitation-aware response; no diagnosis/prescription |
| E2E-03 | Patient reports urgent symptoms | Emergency-oriented guidance and professional-care recommendation |
| E2E-04 | Patient searches approved facilities/doctors | Only approved, RLS-visible records are returned |
| E2E-05 | Patient books appointment | Valid slot accepted; duplicate slot rejected |
| E2E-06 | Patient cancels appointment | Status becomes CANCELLED; unauthorized patient cannot cancel it |
| E2E-07 | Doctor completes appointment and records consultation | Only assigned doctor and consented patient can access it |
| E2E-08 | Doctor recommends a diagnostic test | Consent and doctor ownership enforced by RPC |
| E2E-09 | Patient places test order | Order belongs only to the authenticated patient |
| E2E-10 | Patient requests home collection | Request links only to the patient’s order |
| E2E-11 | Agent accepts and progresses collection | Only assigned verified agent can use valid transitions |
| E2E-12 | Invalid collection transition | Rejected by API/RPC and status remains unchanged |
| E2E-13 | Facility/lab processes order and uploads report | Relevant facility can upload only for the matching order |
| E2E-14 | Patient views/downloads report | Short-lived signed URL works only for authorized patient |
| E2E-15 | Other patient requests report | Denied; no metadata or signed URL is returned |
| E2E-16 | Timeline synchronization | Event references existing record and is patient/consent scoped |
| E2E-17 | Doctor schedules follow-up | Only assigned doctor with active consent can create the workflow |
| E2E-18 | Expired/revoked session | API returns 401 and no protected data is returned |
| E2E-19 | Invalid/missing input | 400 response; no partial clinical record is created |
| E2E-20 | AI provider failure | Safe retry message; no unsafe clinical claim |
| E2E-21 | File upload failure/oversize/type mismatch | Rejected before storage; no orphan report record |
| E2E-22 | Cross-patient and cross-role access | RLS/API deny read, update, insert, and download attempts |

## Validation

```bash
npm run lint
npx tsc --noEmit
npm run build
```

`npm run lint` is mapped to strict TypeScript validation because Next.js 16 removed the legacy `next lint` command.

## Limitations and handoff

The connected project does not expose an Auth service-role/admin connector, and its Auth instance metadata is not available through the permitted database interface. Therefore, the full client-sign-in harness was not run against the SQL-created disposable accounts; the project returned `Invalid login credentials` despite valid bcrypt hashes. The live RLS tests above are the authoritative two-user access-control verification. To run the complete state-changing journey, provision confirmed disposable users through the Supabase Auth dashboard or an authorized Auth admin connector, then run `npm run test:e2e:phase20` and record the results here.
