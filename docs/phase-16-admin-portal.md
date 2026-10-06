# Phase 16 — Admin Portal

Phase 16 adds the operational admin workspace for HealthConnect AI. It uses the existing Supabase tables and their admin-only RLS policies; no unrestricted browser database access or service-role key is introduced.

## Routes

- `/admin` — live platform metrics and operational overview
- `/admin/users` — authenticated users and verification state
- `/admin/patients` — minimum-necessary patient profile coverage
- `/admin/doctors` — professional profiles with approve/suspend controls
- `/admin/facilities` — facility directory with approve/unapprove controls
- `/admin/tests` — diagnostic catalog with activate/deactivate controls
- `/admin/agents` — collection agents with verify/unverify controls
- `/admin/appointments` — read-only appointment operations
- `/admin/reports` — private medical-report metadata only

## Authorization

Every admin API calls Supabase Auth and the database `is_admin()` function before reading or changing records. The database RLS policies remain the final enforcement layer. The browser only calls allowlisted server routes under `/api/admin/*`; it never receives a service-role key and cannot choose an arbitrary table or update arbitrary columns.

Role changes are intentionally not exposed through the portal. Safe Phase 16 management actions are limited to user verification, doctor approval/suspension, facility approval, test activation, and collection-agent verification. All other resource pages are view-only.

## Metrics

The dashboard counts users, patients, doctors, facilities, agents, appointments, test orders, active collection requests, and medical reports using bounded server-side count queries.

## Medical privacy

The report page returns metadata only. Storage paths and signed-download operations remain behind the existing report authorization routes. Patient pages do not expose clinical records through admin list endpoints beyond the minimum fields needed for administrative oversight.

## Next module plan — Phase 17

Phase 17 will add Google Maps-backed healthcare location features using facilities already stored in Supabase: facility coordinates, map views, nearby approved facilities, distance, and directions. Google API credentials will remain environment variables and will not be exposed unnecessarily to the browser.
