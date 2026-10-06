# API Reference

All routes are relative to the deployed application origin. JSON responses use `{ "error": "..." }` for failures. Protected routes require a valid Supabase Auth session cookie. UUID inputs are validated server-side.

## Health

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | Public | Supabase connectivity probe; 200 healthy or 503 generic failure |
| GET | `/api/health/supabase` | Public | Same health implementation |

## Patient and consent

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET/PATCH | `/api/patient/profile` | Patient | Read/update own profile fields |
| GET | `/api/patient/reports` | Patient | List own report metadata |
| GET | `/api/consents` | Patient | List consent history visible to the patient |
| POST | `/api/consents` | Patient | Grant doctor consent; body `{ doctorId, expiresAt? }` |
| POST | `/api/consents/:id/revoke` | Patient | Revoke own consent |

## AI and RAG

### `POST /api/ai/chat`

Patient-only. Body:

```json
{
  "conversationId": "optional-uuid",
  "message": "symptoms or health question, maximum 4000 characters"
}
```

Returns `conversationId`, an assistant message, and a stored symptom assessment. Urgent patterns use deterministic triage. Non-urgent provider responses require approved RAG context when available. The route never creates prescriptions.

### `POST /api/admin/rag/ingest`

Admin-only, server-side provider call. Body:

```json
{
  "title": "Approved source title",
  "source": "Publisher or URL/provenance",
  "content": "Approved source content",
  "isApproved": true
}
```

Limits: title 240 characters, source 500 characters, content 200,000 characters. Content is chunked, embedded, and stored in pgvector.

## Doctor

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET/POST | `/api/doctor/consultations` | Authenticated doctor | List permitted consultations or create for a completed assigned appointment with consent |
| GET/POST | `/api/doctor/prescriptions` | Authenticated doctor | List or create a prescription for an owned consultation with consent |
| GET/POST | `/api/doctor/test-orders` | Authenticated approved doctor | List permitted test orders or recommend an available test with consent |
| GET | `/api/doctor/reports` | Authenticated doctor | List reports allowed by RLS/consent |
| GET/PATCH | `/api/doctor/profile` | Doctor | Read/update own professional fields |

Clinical POST operations are additionally enforced by database RPC authorization and cannot be made safe by UI hiding alone.

## Collection agent

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET/PATCH | `/api/agent/profile` | Verified/linked agent | Read/update own service area and availability |
| GET | `/api/agent/requests` | Verified agent | List only assigned collection requests |
| GET | `/api/agent/requests/:id` | Verified agent | Read one assigned request with minimum necessary details |
| POST | `/api/agent/requests/:id` | Verified agent | Progress `ACCEPTED → ON_THE_WAY → COLLECTED → IN_TRANSIT → DELIVERED`; sample type required at collection |

The database rejects invalid transitions and timestamps status changes.

## Admin

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/admin/overview` | Admin | Platform metrics and operational queues |
| GET | `/api/admin/:resource` | Admin | Allowlisted resource list; max 100 rows |
| PATCH | `/api/admin/:resource` | Admin | Allowlisted verification/approval/activation actions only |

Resources: `users`, `patients`, `doctors`, `facilities`, `tests`, `agents`, `appointments`, `reports`.

## Reports and notifications

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/reports/upload` | Admin currently | Upload validated report file for an existing test order; removes Storage object if metadata insert fails |
| GET | `/api/reports/:id/download` | Authorized user | Return a 60-second signed URL only when metadata RLS permits access |
| GET/POST | `/api/notifications` | Authenticated user | List recipient-scoped notifications or mark all read |
| POST | `/api/notifications/:id/read` | Authenticated user | Mark one own notification read |

## Error conventions

- `400`: malformed or invalid input.
- `401`: no valid Auth session.
- `403`: authenticated but not authorized.
- `404`: resource not found or intentionally hidden by access boundary.
- `500`: safe internal application failure.
- `502`: upstream AI/Storage operation failure.
- `503`: health/dependency failure.

Internal SQL errors, provider keys, signed URLs, and medical content are not written to client error messages or logs.
