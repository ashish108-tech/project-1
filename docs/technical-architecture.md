# HealthConnect AI — Technical Architecture

## 1. Problem statement

Rural, semi-urban, and urban communities often have fragmented access to healthcare navigation, appointment coordination, diagnostic testing, home sample collection, clinical records, and follow-up care. HealthConnect AI provides one secure coordination layer while preserving human clinical responsibility and minimum-necessary data access.

## 2. Objectives

1. Give patients a single place to navigate approved doctors, facilities, tests, appointments, collections, reports, notifications, and timelines.
2. Let doctors work with only patients who have granted active consent.
3. Limit collection agents to assigned requests and only the location/contact/test details required for collection.
4. Give administrators controlled operational oversight without unrestricted browser database access.
5. Provide safety-oriented AI triage and evidence-grounded preliminary information without autonomous diagnosis or prescribing.
6. Keep healthcare documents private and downloadable only through authorization and short-lived signed URLs.
7. Keep the schema, RLS policies, RPC contracts, TypeScript contracts, and UI workflows synchronized.

## 3. System architecture

```text
Browser
  │ HTTPS + Supabase Auth session cookies
  ▼
Next.js App Router on Vercel
  ├─ Server Components: portal reads through SSR Supabase client
  ├─ Route Handlers: validated API contracts and role gates
  ├─ proxy.ts: refreshes Supabase Auth claims/cookies
  └─ Client Components: responsive portal UI and locale switcher
       │ publishable key only; no service-role key
       ▼
Supabase
  ├─ Auth: identities and sessions
  ├─ PostgreSQL: schema, RLS, RPC authorization, pgvector
  └─ Storage: private medical-reports bucket and object policies
       │
       └─ OpenAI-compatible provider (server-side only)
          ├─ chat completions for grounded preliminary guidance
          └─ embeddings for approved medical knowledge retrieval
```

## 4. Frontend structure

- `app/`: route segments and pages for patient, doctor, agent, and admin areas.
- `app/api/`: server-only route handlers for sensitive mutations, signed downloads, AI, notifications, consent, and health checks.
- `components/layout/`: shared responsive shell and navigation.
- `components/dashboard/`: reusable role-specific headers, states, metrics, and cards.
- `components/i18n/`: English/Hindi locale provider and switcher.
- `components/location/`: facility directory, distance sorting, map links, and directions links.
- `components/ui/`: shadcn-style UI primitives.
- `lib/`: Supabase clients, portal context helpers, and localization utilities.
- `services/ai/`: provider abstraction, triage, chunking, ingestion, and RAG retrieval.
- `types/database.ts`: shared database and RPC contracts.
- `supabase/migrations/`: ordered, reproducible SQL migrations.
- `docs/`: phase documentation and operational runbooks.

## 5. Database and ER description

The central identity is `auth.users`, mirrored by `public.users` with a protected role enum: `PATIENT`, `DOCTOR`, `COLLECTION_AGENT`, or `ADMIN`.

- `users` → `patients`: one patient profile per user.
- `users` → `doctors`: one doctor profile per user; doctor approval is separate from identity.
- `users` → `collection_agents`: one field-agent profile per user; verification is separate from identity.
- `doctors` ↔ `healthcare_facilities`: many-to-many through `doctor_facilities`.
- `doctors` → `doctor_availability`: recurring availability windows.
- `patients` + `doctors` + optional facility/availability → `appointments`.
- `appointments` → `consultations`; consultations connect the patient and assigned doctor.
- `consultations` → `prescriptions` → `prescription_items`.
- `tests` ↔ `healthcare_facilities`: through `facility_tests` with price and availability.
- `test_orders` connect patient, optional ordering doctor, facility, test, and facility offering.
- `test_orders` → `collection_requests` → `samples`.
- `test_orders` → `medical_reports`; reports also identify patient, facility, uploader, and private Storage path.
- `patients` → `record_consents` ↔ `doctors`, with status, grant, revoke, and expiry timestamps.
- Existing clinical records are referenced by `health_timeline` events rather than duplicated where possible.
- `notifications` are recipient-scoped to the authenticated user.
- `ai_conversations` → `ai_messages` and `symptom_assessments`.
- `medical_knowledge_sources` → `medical_knowledge_chunks`, with pgvector embeddings.

## 6. Authentication and authorization

1. Supabase Auth owns passwords and sessions; the application never stores password hashes in `public` tables.
2. `lib/supabase/browser.ts` creates the browser client with only the publishable key.
3. `lib/supabase/server.ts` creates the SSR client and reads/writes cookies through Next.js headers.
4. `proxy.ts` refreshes claims on requests.
5. Server routes call `auth.getUser()` and then apply role/ownership checks.
6. PostgreSQL RLS remains the final data boundary. A UI link is never treated as authorization.
7. Sensitive multi-record operations use validated RPCs with `SECURITY DEFINER`, fixed `search_path`, explicit `auth.uid()` checks, and authenticated-only execute grants.
8. Record consent is checked in database policies and clinical creation RPCs. Revocation therefore blocks later access and clinical writes.

## 7. Privacy model

- Patients can access only their own records.
- Doctors can access only approved, consented patient records relevant to their clinical relationship.
- Collection agents can access only assigned collection requests and minimum-necessary details.
- Admin operations go through allowlisted server routes and database policies.
- Reports are never public. The application returns a signed URL for 60 seconds only after the report row is visible to the current user.
- AI prompts should contain only the minimum information required for the current request; users are warned not to share passwords or unrelated sensitive data.

## 8. AI and RAG architecture

### Triage

`services/ai/triage.ts` uses deterministic red-flag patterns for possible breathing, cardiac, stroke, severe bleeding, loss of consciousness, seizure, and immediate safety concerns. Urgent input receives emergency-oriented guidance; no provider call is required for that immediate safety response.

### Approved-source RAG

1. An administrator submits an approved medical source through `/api/admin/rag/ingest`.
2. The source is normalized and chunked with overlap.
3. Each chunk receives an embedding from the configured provider.
4. Source metadata and vectors are stored in Supabase pgvector.
5. A patient query is embedded and passed to the authenticated `match_medical_knowledge` RPC.
6. Only approved, retrieved evidence is passed to the model.
7. The provider is instructed to cite supplied evidence as `[Source N]`, avoid invented citations, disclose insufficient evidence, and provide preliminary information only.

### Provider abstraction

`services/ai/provider.ts` isolates chat and embedding calls from the API route. Provider keys are server-only, requests use timeouts, and provider failures return safe retry guidance rather than fabricated medical content.

## 9. Core workflows

### Patient

Sign in → complete profile → browse approved care network → grant optional doctor consent → book appointment → attend consultation → review tests, collections, reports, notifications, and timeline → revoke consent whenever needed.

### Doctor

Sign in as an approved doctor → view assigned/consented patients and appointments → record consultation after a completed appointment → create a prescription only as an authorized doctor → recommend tests → view consented reports → schedule follow-up.

### Collection agent

Sign in as a verified agent → view assigned requests → accept → travel → collect sample → mark in transit → deliver. Every status transition is validated by the database and timestamped.

### Admin

Sign in as an admin → inspect platform metrics and allowlisted resources → verify users/agents, approve doctors/facilities, activate tests, manage operational records, and ingest approved RAG sources. Admin routes never grant unrestricted browser SQL access.

## 10. Deployment architecture

GitHub is the source of truth. Vercel builds the Next.js application. Supabase remains the production Auth, PostgreSQL, pgvector, and Storage provider. Environment values are configured in Vercel and are never committed. See [Phase 21 deployment](phase-21-production-deployment.md).

## 11. Limitations

- Facility user identity and facility-specific report upload are not yet modeled; report upload is restricted to administrators until that identity boundary is implemented.
- Google Maps integration currently uses coordinates, links, distance sorting, and directions URLs rather than a full JavaScript Maps SDK.
- The client-level Phase 20 harness requires externally provisioned confirmed Auth test accounts; live database-level two-user RLS and consent checks were completed.
- Clinical, regulatory, retention, backup, support, and incident-response policies must be supplied by the deploying healthcare organization.
