# Phase 15 — Collection Agent Portal

Phase 15 implements the field-operations workspace for verified collection agents. It uses the existing Phase 8 collection tables and `update_collection_status` RPC rather than creating a second workflow.

## Routes

- `/agent/dashboard` is represented by `/agent` and shows visits today, active requests, total assignments, and availability.
- `/agent/requests` lists only requests assigned to the authenticated agent.
- `/agent/requests/[id]` shows the scheduled time, collection contact and address, test information, and delivery facility needed for the visit.
- `/agent/profile` allows the agent to update only service area and availability.

## Status workflow

The UI exposes only the next valid agent transition: `ASSIGNED → ACCEPTED → ON_THE_WAY → COLLECTED → IN_TRANSIT → DELIVERED`. The database trigger remains the authoritative transition guard. `COLLECTED` requires a non-empty sample type and creates the linked sample through the existing RPC. The RPC records transition timestamps and updates the linked sample state. Patients can still cancel through the existing patient workflow; agents cannot cancel or skip transitions.

## Privacy and authorization

Every API route requires Supabase Auth and a verified `collection_agents` profile. Request queries are constrained by `collection_agent_id`. RLS already protects requests and samples by the assigned agent. Phase 15 adds RLS policies on `test_orders`, `tests`, `facility_tests`, and `healthcare_facilities` so an agent can read only metadata reachable through their assigned collection request. No patient profile, medical report, consultation, prescription, diagnosis, or unrelated test is queried or exposed.

Profile updates use the agent self-update policy and never accept `user_id` or `is_verified`. Status mutations call the existing server-side RPC; client-provided IDs and status values are validated before the call, with authorization and transition checks repeated in the database.

## API surface

- `GET /api/agent/requests`
- `GET /api/agent/requests/[id]`
- `POST /api/agent/requests/[id]`
- `GET /api/agent/profile`
- `PATCH /api/agent/profile`

## Next module plan — Phase 16

Phase 16 will add the admin portal: secure server-side administration pages for platform metrics, users, patients, doctors, facilities, tests, agents, appointments, and reports. It will use admin-only database policies and server operations; the browser will not receive unrestricted database access. The Phase 16 validation will include representative admin/non-admin access checks and confirmation that medical report storage remains private.
