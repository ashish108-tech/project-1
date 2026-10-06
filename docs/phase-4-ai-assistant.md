# Phase 4 — AI Health Assistant

The AI assistant is a patient-authenticated, server-mediated conversation flow. It stores conversations, messages, and symptom assessments in Supabase. RLS limits every record to the owning patient.

## Request flow

1. The patient submits a message to `POST /api/ai/chat`.
2. The server validates the session, patient profile, message length, and conversation ownership.
3. A deterministic red-flag triage guard runs before any model call.
4. Urgent signals return immediate emergency-oriented guidance without waiting for a model.
5. Non-urgent messages are sent to the server-only OpenAI-compatible provider abstraction.
6. The assistant response and `urgent`/`non_urgent` symptom assessment are persisted.

## Safety boundaries

The assistant provides preliminary health information only. It does not diagnose, prescribe, replace clinicians, or present uncertain information as certain. It recommends emergency care for red-flag signals and includes limitations in the system instruction. User medical text is stored only in the patient's conversation records and is not exposed through the client without Supabase Auth and RLS.

## Provider configuration

Set `OPENAI_API_KEY` in the server environment. `OPENAI_API_BASE` is optional and defaults to the official OpenAI-compatible `/v1` endpoint. `OPENAI_MODEL` defaults to the catalog-verified `gpt-5-mini`. No AI key is sent to browser code.

If the provider is unavailable, the API returns a safe error and never fabricates a response. The message remains persisted so the patient can retry.
