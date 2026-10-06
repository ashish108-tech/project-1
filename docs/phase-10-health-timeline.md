# Phase 10 — Health Timeline

This phase creates `public.health_timeline`, a chronological index of existing healthcare records. Timeline entries reference the authoritative AI assessment, consultation, test order, report, prescription, or follow-up consultation instead of copying clinical data.

## Event types and integrity

Supported event types are `AI_ASSESSMENT`, `CONSULTATION`, `DIAGNOSTIC_TEST`, `MEDICAL_REPORT`, `PRESCRIPTION`, and `FOLLOW_UP`. Each event must contain exactly one source reference, and a database trigger verifies that the source exists and belongs to the timeline patient. Partial unique indexes ensure that one source record produces at most one timeline event.

## Synchronization

`sync_health_timeline_event` is an authenticated, idempotent RPC. Administrators can synchronize any patient timeline; patients can synchronize only their own timeline. Repeating the same source event updates its display title, summary, and event time rather than creating a duplicate. Direct patient inserts are not allowed.

## Access

Patients read only their own timeline. Approved doctors see only entries tied to their own consultation, test order, prescription, or report authorization path. Collection agents have no timeline access. Administrators can manage the table. Broader doctor history sharing remains intentionally deferred to the consent phase.

## Patient view

`/patient/timeline` is a server-rendered, responsive chronological view using live Supabase data. It provides loading through the application shell, an error state, an empty state, event-type labels, timestamps, and summaries without exposing source clinical fields in the timeline index.

Consent sharing, notifications, advanced filtering, and the complete patient portal are outside Phase 10.
