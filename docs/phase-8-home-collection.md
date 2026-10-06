# Phase 8 — Home Sample Collection

This phase adds `collection_agents`, `collection_requests`, and `samples` for home collection tied to an existing diagnostic test order.

## Workflow

A patient requests collection for one of their active test orders. An administrator assigns a verified and available collection agent. The assigned agent progresses the request through:

```text
REQUESTED → ASSIGNED → ACCEPTED → ON_THE_WAY → COLLECTED → IN_TRANSIT → DELIVERED
```

Cancellation is available from non-terminal stages. `DELIVERED` and `CANCELLED` are terminal. The database trigger rejects invalid transitions.

When the agent marks a request `COLLECTED`, a sample is created atomically with the sample type and collection timestamp. `IN_TRANSIT` and `DELIVERED` update the sample lifecycle and delivery timestamp. Every request status has a dedicated audit timestamp.

## Authorization and privacy

Patients can request collection only for their own active test orders and can read only their own requests and samples. Agents can read only requests assigned to their agent identity and the corresponding sample records. Agents can progress only their assigned requests. Administrators can assign agents and manage the workflow.

Collection-agent identity must reference a `COLLECTION_AGENT` user. Agents cannot self-verify or change their linked user identity; only administrators can change verification. Agents can update their own availability and service-area metadata.

The collection request contains only the address and contact details required for the visit. No unrelated patient records, prescriptions, reports, or other test orders are exposed through the collection policies.

The current schema does not yet provide a secure authenticated facility-user mapping. Facility-side request access is therefore not granted by assumption and should be added only after that identity model exists. Live GPS tracking, reports, notifications, and facility-user administration are outside Phase 8.
