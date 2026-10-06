# Phase 6 — Prescription Module

`public.prescriptions` connects one prescription to one doctor consultation, patient, and doctor. A consultation can have at most one prescription. `public.prescription_items` stores medicine name, dosage, frequency, duration, instructions, and stable display order.

## Creation and validation

Doctors create prescriptions through the `create_prescription` security-definer RPC. The RPC requires an authenticated doctor, verifies that the doctor owns the consultation, requires at least one and no more than 50 items, validates required item fields, and inserts the header and items atomically. If any item fails, the prescription is removed and the transaction raises the validation error.

Prescription patient and doctor relationships must match the consultation and cannot be changed. Item ownership cannot be moved to another prescription. Database constraints reject empty medicine, dosage, frequency, and duration values.

## Access

Patients can read only their own prescriptions and items. Doctors can read and update prescriptions and items they own through their consultation relationship. Administrators can manage all prescription records. There is no direct doctor insert policy; creation is available only through the validated RPC. The AI assistant has no prescription insert capability and never creates prescriptions.

This phase does not include pharmacy ordering, medication fulfillment, payments, or automatic prescribing.
