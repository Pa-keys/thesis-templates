# MEDISENS Patient Record Archiving Roadmap

## Purpose

This roadmap defines a soft-archive system for inactive MEDISENS patient records. It is planning only and does not modify the current application code, database schema, Supabase logic, business logic, routes, role permissions, or approved Use Case Diagram behavior.

The goal is to keep active work queues fast and readable while preserving patient history, auditability, and clinical safety.

## Core Policy

- Archive inactive patient records after 5 years of no qualifying clinical activity.
- Use soft archive only.
- Do not delete patient records.
- Archived patients remain restorable by authorized roles.
- Archived patients remain available for audit, reporting, and clinical history review according to approved permissions.
- Any archive or restore action must be logged.

## Scope Guardrails

- Preserve all RHU workflows until implementation is approved.
- Preserve role-based access.
- Preserve Supabase/database/business logic until SQL migrations are reviewed.
- Do not claim official PhilHealth compliance without exact report requirements.
- Use SQL-first planning before implementation.

## Archive Eligibility Rules

A patient becomes archive-eligible only when all conditions are true:

- The patient record is not already archived.
- The patient has no qualifying activity for at least 5 years.
- No active follow-up is pending.
- No unresolved laboratory request is pending.
- No active consultation workflow is open.
- No pending consent workflow blocks administrative review.
- The patient is not manually marked as protected from archiving.

Qualifying activity should include, at minimum:

- patient registration or profile update
- patient consent update
- initial consultation
- doctor consultation
- follow-up visit
- laboratory request
- laboratory result
- prescription
- FHSIS log or vaccine-related entry
- archive restore event

## Required Fields And Table Changes

Schema changes required.

Recommended additions to `patients`:

- `archived_at timestamptz null`
- `archived_by uuid null`
- `archive_reason text null`
- `archive_status text not null default 'active'`
- `archive_eligible_at timestamptz null`
- `last_activity_at timestamptz null`
- `archive_reviewed_at timestamptz null`
- `archive_reviewed_by uuid null`
- `archive_protected boolean not null default false`
- `archive_protection_reason text null`

Recommended support table:

- `patient_archive_events`
  - `id`
  - `patient_id`
  - `event_type` such as `eligible`, `archived`, `restored`, `protection_added`, `protection_removed`
  - `performed_by`
  - `performed_by_role`
  - `reason`
  - `metadata`
  - `created_at`

Recommended indexes:

- `patients(archive_status)`
- `patients(archived_at)`
- `patients(last_activity_at)`
- `patients(archive_eligible_at)`
- composite index on `(archive_status, last_activity_at)`
- `patient_archive_events(patient_id, created_at)`

## SQL-First Activity Calculation

SQL changes required.

Create a SQL view or database function to calculate last patient activity from existing tables:

- `patients.created_at` and profile updates if tracked
- `patient_consent.created_at` or `consent_date`
- `initial_consultation.consultation_date`
- `consultation.created_at` or `consultation_date`
- `follow_up.visit_date`
- `lab_request.request_date`
- `lab_result.date_performed`
- `prescription.prescription_date` and `dispensed_at`
- `fhsis_logs.created_at`

Preferred pattern:

- create a SQL view for activity summary using aggregate `max()` dates
- review query performance
- add indexes before enabling large archive eligibility screens
- optionally materialize later only if performance requires it

## Admin And Doctor Review Workflow

Application changes required after SQL planning.

### Admin Workflow

- Admin opens an Archive Review queue.
- Queue shows archive-eligible patients only.
- Admin can filter by barangay/address, last activity date, age, sex, and archive reason.
- Admin can open patient chart/history in read-only review mode.
- Admin can mark records as protected when archiving is inappropriate.
- Admin can archive one patient or selected patients after confirmation.
- Every archive/protection action writes to Audit Log.

### Doctor Workflow

- Doctor can review archive-eligible patients when clinical judgment is needed.
- Doctor can mark a patient as protected from archiving with a clinical/admin reason.
- Doctor can recommend archive but should not silently remove records from clinical access.
- Doctor keeps access to restored or active patient charts according to approved permissions.

## Restore Workflow

Application and SQL changes required.

Restore should be available only to authorized roles, likely Admin and Doctor after approval.

Restore steps:

1. User opens Archived Patient Records.
2. User selects an archived patient.
3. System shows read-only patient summary and archive metadata.
4. User provides restore reason.
5. System clears archive status fields or sets `archive_status = 'active'`.
6. System logs restore action to `patient_archive_events`.
7. System logs restore action to `audit_logs`.
8. Patient appears again in active Patient Records and role workflows.

Restore must not create duplicate patients.

## Audit Log Integration

Use existing Audit Log patterns and add events for:

- archive eligibility calculated
- patient archived
- patient restored
- archive protection added
- archive protection removed
- archive review opened if required by policy
- failed archive or restore attempt
- unauthorized archive or restore attempt

Audit metadata should be safe and should not expose unnecessary clinical details.

## Patient Records Filtering

Application changes required.

Patient Records should support:

- Active patients by default.
- Archived patients only when an authorized user selects an archive filter.
- Filter states:
  - `Active`
  - `Archive Eligible`
  - `Archived`
  - `Protected`
- Clear visual status badges:
  - Active: neutral
  - Archive eligible: amber
  - Archived: slate
  - Protected: muted medical navy or slate

Archived records should not appear in active work queues unless restored or explicitly included by an archive filter.

## Reporting And Analytics Interaction

- Default operational reports should use active patients unless the report explicitly needs historical totals.
- Archive state should be available as a filter for Admin analytics.
- Do not alter report definitions until exact reporting requirements are provided.
- Do not claim PhilHealth compliance without official report specifications.

## Implementation Phases

### Phase 1: Data Activity Audit

- Inventory every table that counts as patient activity.
- Confirm date fields and patient relationships.
- Identify patients without activity dates.
- Define the official MEDISENS activity rule set.

### Phase 2: SQL Archive Model

Schema changes required.

- Add archive fields to `patients`.
- Create `patient_archive_events`.
- Create required indexes.
- Draft but do not enable automatic archive behavior yet.

### Phase 3: Last Activity SQL View Or Function

SQL changes required.

- Create patient activity summary view/function.
- Validate last activity results against sample patients.
- Confirm performance with realistic row counts.

### Phase 4: Archive Eligibility Queue

Application changes required.

- Add Admin archive review queue.
- Add filters and read-only patient chart review.
- Add protected-from-archive action.
- Preserve existing Patient Records behavior.

### Phase 5: Soft Archive And Restore Actions

Application and SQL changes required.

- Add archive action with confirmation.
- Add restore action with required reason.
- Add Audit Log and archive event writes.
- Ensure restored records re-enter normal workflows.

### Phase 6: Role-Based QA

- Test Admin archive, protection, and restore workflows.
- Test Doctor review workflow if approved.
- Test BHW, Nurse, Laboratory, Pharmacist, and Midwife visibility rules.
- Test archived patients are excluded from active queues by default.
- Test Audit Log entries for every archive and restore action.

### Phase 7: Optional Scheduled Eligibility Refresh

SQL or Edge Function changes required.

- Add scheduled refresh only after manual workflow is stable.
- Do not auto-archive without Admin/Doctor review unless explicitly approved.
