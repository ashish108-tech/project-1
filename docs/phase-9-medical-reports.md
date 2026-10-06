# Phase 9 — Medical Reports

This phase adds `public.medical_reports` and the private Supabase Storage bucket `medical-reports`. Report metadata is linked to a test order, patient, healthcare facility, and uploading user. The bucket is private, limited to PDF and common image formats, and capped at 10 MB per file.

## Upload workflow

`POST /api/reports/upload` accepts multipart form data containing `file`, `testOrderId`, `reportTitle`, and an optional `reportType`. The route uses the authenticated Supabase SSR client, validates the administrator role, validates MIME type and size, verifies the test order, generates a controlled non-user-supplied storage path, uploads the file, and then writes metadata. If metadata insertion fails, it removes the uploaded object.

Facility staff upload access is deliberately denied until the project has a secure authenticated facility-user relationship. Administrators are the only uploaders in this phase; this avoids granting one facility access to another facility's patient records.

## Download workflow

`GET /api/reports/[id]/download` first reads report metadata through database RLS. Patients can access their own reports, and approved doctors can access reports linked to their own test orders. Administrators can access all reports. The route then creates a 60-second signed URL through Supabase Storage. No public URL is generated and no Storage secret is exposed to browser code.

## Security

The database validates that report patient and facility IDs match the referenced test order. Report relationships, uploader, and storage path are immutable. Metadata RLS and `storage.objects` RLS both enforce access. Collection agents have no report policy. Unsupported MIME types, empty files, files over 10 MB, invalid report types, malformed report IDs, and unauthenticated requests are rejected.

Health timelines, consent-based sharing, OCR, report interpretation, notifications, and facility-user administration are outside Phase 9.
