# Phase 3C — Doctors and Healthcare Facilities

This module creates `doctors`, `healthcare_facilities`, `doctor_facilities`, and `doctor_availability` in the connected healthcare Supabase project.

## Relationships

- Each doctor belongs to one `public.users` record.
- Doctors and facilities are linked through the composite-key `doctor_facilities` table.
- Availability rows belong to one doctor.

## Controlled values

Doctor approval is `PENDING`, `APPROVED`, `SUSPENDED`, or `REJECTED`. Facility types are `HOSPITAL`, `CLINIC`, `LABORATORY`, and `HEALTH_CENTER`. Availability validates weekday values from 0 to 6 and requires `start_time < end_time`.

## Access model

Anonymous users have no access. Authenticated patients can view only approved doctors, approved facilities, and active availability. Doctors can read/update their own profile and manage their own availability, but cannot change ownership or approval status. Admins can manage all four modules. Doctor-facility assignments are admin-managed. No facility-staff membership is created in this phase, so facility-user access remains intentionally unavailable rather than broad.
