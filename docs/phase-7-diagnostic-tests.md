# Phase 7 — Diagnostic Test System

This phase creates `tests`, `facility_tests`, and `test_orders` in the connected Supabase project. Tests are catalog records; facility tests represent an approved facility's active offering, price, turnaround time, and instructions; test orders connect a patient, optional ordering doctor, facility, test, and facility offering.

## Ordering and validation

Patients place orders only for their own patient profile through `create_test_order`. Approved doctors can place orders for a patient while linking their own doctor profile. Administrators can create orders for controlled platform operations. The database validates that the selected facility offering is active, the test is active, the facility is approved, and the order's facility/test IDs match the offering. Patient ownership is explicitly rejected when the authenticated caller has no patient profile or targets another patient.

## Status workflow

The allowed progression is:

```text
REQUESTED → CONFIRMED → SCHEDULED → COLLECTING → PROCESSING → COMPLETED
```

Cancellation is allowed from each non-terminal status. `COMPLETED` and `CANCELLED` are terminal. `update_test_order_status` permits patient cancellation, doctor-owned order updates, and administrator updates; the database trigger rejects invalid transitions.

## Access model

Patients read only their own orders. Doctors read only orders linked to their doctor profile. Administrators have full management access. Active tests and approved facility offerings are visible only to authenticated users. Direct order inserts are disabled; creation uses the validated RPC.

The current schema has healthcare facilities but no user-to-facility identity mapping or facility-user role. Therefore, facility-specific order access is intentionally not guessed or broadened in this phase. Facility processing access should be added in the later facility-identity/security phase, before exposing orders to facility staff. This avoids allowing one facility user to see another facility's patient orders.

Home collection, collection agents, reports, payments, and notifications are not included in Phase 7.
