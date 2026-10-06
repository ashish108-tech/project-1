# Phase 3E — Doctor Consultation

`public.consultations` connects one completed appointment to its patient and doctor. The appointment relationship is unique, so one appointment cannot receive duplicate consultation records.

## Fields

Consultations store symptoms, clinical notes, assessment, advice, optional follow-up date, and audit timestamps. Prescriptions and diagnostic tests are intentionally not part of this phase.

## Creation and access

Doctors create consultations through the `create_consultation` security-definer RPC only for their own completed appointments. The database trigger verifies that patient and doctor IDs match the appointment and that the appointment status is `completed`. Doctors can update consultations for their own appointments. Patients can read only their own consultations for completed appointments. Admins can read, update, or delete consultations.

Consultation relationships are immutable. Patients have no write policy, and anonymous users have no access.
