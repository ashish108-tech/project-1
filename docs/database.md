# Database Setup and Data Model

## Supabase project

HealthConnect AI uses the existing Supabase project `healthcare` with project reference `rvtueepnwzicdmnhwwys`. Supabase PostgreSQL is the only application database.

## Migration workflow

Migrations are ordered SQL files under `supabase/migrations/`. Apply them in filename order through the connected Supabase migration tool. The applied inventory includes all modules through:

- Phase 17 healthcare location
- Phase 19 security audit and RLS hardening

Phase 18 is UI localization and does not add a migration. Phase 20 is test documentation/harness and does not add a migration.

Do not edit the remote schema manually without adding a corresponding migration. Do not delete migration history to roll back a production change; use forward-compatible corrective migrations.

## Module tables

| Module | Tables / objects |
|---|---|
| Identity | `auth.users`, `public.users`, `user_role` |
| Patient | `patients` |
| Care network | `doctors`, `healthcare_facilities`, `doctor_facilities`, `doctor_availability` |
| Appointments | `appointments`, appointment enums/functions/triggers |
| Clinical | `consultations`, `prescriptions`, `prescription_items` |
| AI | `ai_conversations`, `ai_messages`, `symptom_assessments` |
| RAG | `medical_knowledge_sources`, `medical_knowledge_chunks`, pgvector match RPC |
| Diagnostics | `tests`, `facility_tests`, `test_orders` |
| Collection | `collection_agents`, `collection_requests`, `samples` |
| Reports | `medical_reports`, private `medical-reports` Storage bucket |
| Timeline | `health_timeline` |
| Consent | `record_consents` |
| Notifications | `notifications` |
| Legacy location | `care_locations`, retained for the health probe and foundation compatibility |

## RLS requirements

Every healthcare-related table must have RLS enabled. Policies are role- and ownership-scoped:

- patient rows use the authenticated user-to-patient relationship;
- doctors use approved identity, assignment, and active consent;
- collection agents use verified identity and assigned request;
- admins use `is_admin()` through protected operations;
- anonymous users receive no healthcare rows;
- sensitive RPCs have authenticated-only execute grants.

Validate RLS with two patient identities and one doctor identity. At minimum, test own-profile access, cross-patient read/update denial, doctor access before/after consent, and consent revocation.

## Storage

Bucket: `medical-reports`.

- Private bucket; no public URL access.
- Allowed types: PDF, PNG, JPEG, WebP.
- Maximum file size: 10 MB.
- Application sanitizes filenames and uses unique storage paths.
- Database metadata and Storage object access are both policy-protected.
- Downloads use a 60-second signed URL after an authorized metadata lookup.

## Operational checks

```sql
-- Run through the approved Supabase SQL interface, not from an untrusted browser.
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```

Also verify the `phase_19_security_audit` migration is applied and inspect function privileges so anonymous execution is false for sensitive RPCs.
