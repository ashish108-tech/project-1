# Phase 12 — Notifications

Phase 12 adds in-app notifications backed by `public.notifications`. Notifications are addressed to a Supabase Auth user and include a typed event, title, body, optional source resource, deduplication key, read timestamp, and audit timestamps.

## Event coverage

Database triggers generate notifications for appointment booking, appointment confirmation, appointment cancellation, diagnostic test booking, collection-agent assignment, sample collection, sample delivery, report availability, and consultation follow-up scheduling. Trigger-based generation ensures that notifications are created even when the source operation is performed through a secure RPC rather than the browser.

Notifications use unique source-event deduplication keys. Repeated updates or retries do not create duplicate notifications. Notification content is immutable after creation; recipients can change only `read_at` through RLS or the read-state RPCs.

## Access and read state

RLS permits a user to read and update only notifications addressed to their own Auth user ID. There is no client insert policy. The server-side trigger helper is not executable by public callers. `mark_notification_read` and `mark_all_notifications_read` are authenticated RPCs and verify the recipient before updating read state.

## APIs and UI

- `GET /api/notifications` returns the authenticated recipient's latest notifications and unread count.
- `POST /api/notifications` marks all recipient notifications as read.
- `POST /api/notifications/[id]/read` marks one recipient notification as read.
- `/patient/notifications` provides the responsive in-app notification center with loading, error, empty, unread, mark-read, and mark-all-read states.

Email and SMS delivery are intentionally not implemented. Reminder scheduling beyond the follow-up event notification is deferred to a later automation phase.
