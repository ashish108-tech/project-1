# Role-Based Access Control Testing

## Scope

`npm run test:rbac` verifies role boundaries against the connected Supabase project for:

- `ADMIN` — platform oversight and user/profile review.
- `DOCTOR` — own doctor profile, consent-scoped patient visibility, and no administrative access.
- `COLLECTION_AGENT` — own agent profile and assigned collection requests only.

The harness also checks that clinical staff cannot change their own role and that doctors and collection agents cannot enumerate unrelated patient or collection data.

## Required disposable accounts

Create confirmed, non-production Supabase Auth accounts through the Supabase dashboard or an authorized Auth administrator. Their corresponding `public.users` records must have these roles:

| Environment variable | Required role |
|---|---|
| `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` | `ADMIN` |
| `E2E_DOCTOR_EMAIL` / `E2E_DOCTOR_PASSWORD` | `DOCTOR` |
| `E2E_AGENT_EMAIL` / `E2E_AGENT_PASSWORD` | `COLLECTION_AGENT` |

The doctor should have a `public.doctors` profile. The agent should have a `public.collection_agents` profile. Approval and verification should reflect the access state being tested. Do not use real patient credentials or production clinical records.

## Run locally

```bash
E2E_ADMIN_EMAIL='rbac-admin@example.test' \
E2E_ADMIN_PASSWORD='disposable-password' \
E2E_DOCTOR_EMAIL='rbac-doctor@example.test' \
E2E_DOCTOR_PASSWORD='disposable-password' \
E2E_AGENT_EMAIL='rbac-agent@example.test' \
E2E_AGENT_PASSWORD='disposable-password' \
npm run test:rbac
```

The script reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from `.env.local` or the process environment. Passwords are passed only through the process environment and are never printed or written to the repository.

## Expected checks

- Admin can list platform users and review doctor/agent profiles.
- Doctor and collection agent see only their own `public.users` row.
- Doctor profile access is self-owned; collection-agent profile access is self-owned.
- Doctor patient visibility remains consent/RLS scoped.
- Collection agents cannot enumerate patient profiles or unrelated collection requests.
- Doctors cannot enumerate collection requests.
- Doctor and collection-agent self-role changes are rejected by RLS/triggers.

## Safety and cleanup

The harness is read-mostly and does not create clinical records, assign agents, change consent, update statuses, or mutate role data. The attempted role changes must be rejected; no successful mutation is expected. Delete disposable Auth accounts and linked test profiles after the run through the authorized Supabase administration workflow.

## Validation

```bash
node --check scripts/rbac-smoke.mjs
npm run lint
npm run build
```

If credentials are not supplied, the runner intentionally exits before making any authenticated request. This prevents accidental testing with missing or guessed accounts.
