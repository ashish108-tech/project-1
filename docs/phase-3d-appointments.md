# Phase 3D — Appointment System

The active `public.appointments` table connects a patient, doctor, optional healthcare facility, and doctor availability row. The previous zero-row incompatible table was preserved as `public.appointments_legacy` after explicit approval.

## Scheduling

Appointment statuses are `scheduled`, `confirmed`, `completed`, `cancelled`, and `no_show`. Appointment types are `IN_PERSON` and `ONLINE`. In-person appointments require a facility; the selected facility must be approved and linked to the doctor.

Booking is performed through the `book_appointment` security-definer RPC. It derives the patient from `auth.uid()`, requires an approved doctor, validates the selected availability weekday/time window, rejects past or cross-day slots, and catches exclusion conflicts. A PostgreSQL GiST exclusion constraint prevents overlapping non-cancelled appointments for the same doctor.

## Access

Patients can read their own appointments and cancel scheduled or confirmed appointments through `cancel_my_appointment`. Doctors can read and update appointments assigned to them, subject to status-transition triggers. Admins can read and manage all appointments. Appointment ownership, relationships, and slot fields are immutable to non-admin users.
