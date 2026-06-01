# MEDISENS Panel Revision Sprint Plan

> **For agentic workers:** Use `superpowers:executing-plans` when this plan is approved for implementation. Do not implement patient accounts in this sprint.

**Goal:** Address panel feedback for the medical staff system while preserving the current Vite multi-page React architecture, Supabase integration, role-based dashboards, and existing database schema.

**Scope Decision:** Patient accounts are ON HOLD. The priority is to finalize medical staff workflows for registration, consent, triage, consultation, laboratory, pharmacy, midwife/FHSIS, and patient history.

---

## Panel Feedback Covered By This Plan

- Itemize ailments, findings, treatments, tests, and prescriptions.
- Itemize multiple vaccines per patient.
- Provide a complete transaction/history view per patient.
- Improve usability issues:
  - birthday/date fields aligned left,
  - grey textbox readability,
  - disabled-field contrast,
  - clearer spacing and labels,
  - easier scanning in clinical forms.

## On Hold

### Patient Accounts

Patient accounts are deferred. They should be handled in a separate sprint because they require patient auth design, account-to-patient linking, privacy review, RLS policy updates, password recovery, and a patient-facing portal scope decision.

TODO later:
- Design patient account roles and permissions.
- Add secure patient profile linking.
- Add RLS policies for patient-visible records.
- Decide which records patients can view.
- Add patient account onboarding and recovery flow.

---

## Current Storage Audit

The current code already stores the relevant medical staff data, but it is spread across existing tables and sometimes stored as text or JSON.

### Ailments / Complaints

Current storage:
- `initial_consultation.chief_complaint`
- `consultation.chief_complaints`
- `follow_up.chief_complaint`

Current issue:
- Usually stored as combined text. Display is readable but not itemized.

Plan:
- Parse and display as itemized lists in history views.
- Keep existing write behavior unless schema migration is approved.

### Findings

Current storage:
- `consultation.assessment`
- `consultation.diagnosis`
- `lab_result.findings`

Current issue:
- Lab findings and clinical findings are text fields.

Plan:
- Display findings as itemized sections.
- Keep raw text fields as source of truth for now.

### Treatments

Current storage:
- `consultation.medication_treatment`
- `consultation.management_treatment`
- `consultation.plan`
- `follow_up.medication_treatment`

Current issue:
- Treatment is split across several text columns.

Plan:
- Combine these into an itemized "Treatment" display group in patient history.
- Do not rename columns.

### Tests

Current storage:
- `lab_request` boolean columns:
  - `is_cbc`
  - `is_cbc_platelet`
  - `is_hgb_hct`
  - `is_xray`
  - `is_ultrasound`
  - `is_rbs`
  - `is_fbs`
  - `is_uric_acid`
  - `is_cholesterol`
  - `is_urinalysis`
  - `is_fecalysis`
  - `is_sputum`
- `lab_request.others`

Current issue:
- Tests are already structurally stored as boolean flags, but display should be itemized consistently.

Plan:
- Add a shared lab-test label mapper.
- Display requested tests as itemized chips/list items.

### Prescriptions

Current storage:
- `prescription.rx_content` JSON string
- `prescription.status`
- `prescription.dispensed_at`

Current issue:
- Prescriptions are itemized inside JSON, but history views need safer parsing and better display.

Plan:
- Reuse `src/features/pharmacy/prescriptionParser.ts`.
- Display medication name, dosage, frequency, duration, and quantity as separate itemized rows.
- Malformed JSON must show a safe warning instead of crashing.

### Vaccines

Current storage:
- `fhsis_logs.data_fields.bcg_date`
- `fhsis_logs.data_fields` also stores child-care program data.

Current issue:
- Multiple vaccines per patient are not cleanly itemized.

Plan without schema change:
- Add UI support in the Midwife child logbook for multiple vaccine rows.
- Save rows into `fhsis_logs.data_fields.vaccine_records` as an array:

```json
[
  {
    "vaccine_name": "BCG",
    "dose_label": "Birth dose",
    "date_given": "2026-06-01",
    "remarks": "0 to 28 days old"
  }
]
```

Plan with future schema migration:
- See the migration plan below.

### Transaction / Patient History

Current storage sources:
- Registration: `patients`
- Consent: `patient_consent`
- Nurse initial consultation: `initial_consultation`, `vital_sign`
- Doctor consultation: `consultation`
- Lab requests: `lab_request`
- Lab results: `lab_result`
- Prescriptions / pharmacy: `prescription`
- Vaccines / FHSIS: `fhsis_logs`
- Follow-ups: `follow_up`

Current issue:
- Existing patient history mainly shows consultations and FHSIS logs, not one complete timeline.

Plan:
- Add a patient history service that safely queries these tables and composes a unified timeline.
- If a table or optional column is missing, fail softly and show available sections.
- Show loading, empty, and error states.

---

## Affected Files

### Planning

- Create/update: `REVISION.md`

### Shared Patient Itemization

- Create: `src/features/patients/itemization.ts`
  - `itemizeText()`
  - `itemizeLabTests()`
  - `itemizePrescription()`
  - `normalizeVaccineRecords()`

- Create: `src/features/patients/history.ts`
  - `fetchPatientTransactions(patientId)`
  - transaction typing for registration, consent, consultations, lab, pharmacy, vaccines, follow-ups

- Create: `src/types/history.ts`
  - shared transaction/item interfaces if the helper grows beyond one file

### Patient History UI

- Create: `src/components/patient/PatientTransactionHistory.tsx`
  - medical timeline cards
  - itemized groups for ailments, findings, treatments, tests, prescriptions, vaccines

- Update: `src/components/patient/PatientDetailModal.tsx`
  - add complete transaction/history tab or section
  - keep existing detail editing
  - preserve current consultation history display if useful

- Update: `src/app/patients/details.tsx`
  - replace narrow consultation-only history modal with unified transaction history
  - improve birthday/date input alignment

### Midwife Multiple Vaccines

- Update: `src/features/midwife/censusEntry.tsx`
  - replace single BCG-only input with repeatable vaccine rows for child logbook
  - keep `bcg_date` compatibility for reports
  - additionally save `vaccine_records` array in `data_fields`

- Update: `src/features/midwife/patientRecords.tsx`
  - display vaccine records from `data_fields.vaccine_records`
  - keep existing FHSIS log history

- Update: `src/features/midwife/reportGenerator.tsx`
  - preserve existing FHSIS BCG/report calculations
  - do not break report generation

### Usability Polish

- Update: `src/app/patients/templates.tsx`
  - align birthday/date inputs left
  - improve date field readability
  - improve grey textbox contrast

- Update: `src/app/initial-consultation/index.tsx`
  - improve date input alignment
  - improve disabled/read-only field contrast

- Update: `src/app/consultation/index.tsx`
  - improve grey panels/textboxes
  - itemize prescription and lab-test display where shown

- Update: `src/app/laboratory/index.tsx`
  - itemize lab findings display
  - keep existing result save logic

- Update: `src/app/pharmacist/index.tsx`
  - ensure parsed prescription rows remain itemized and malformed JSON stays safe

---

## Safe Migration Plan

No schema change should be applied until approved.

The frontend-only plan can work with current storage by itemizing existing text, booleans, and JSON fields.

If normalized storage is approved later, add new tables instead of renaming existing tables:

```sql
-- proposed only; do not apply without approval
create table patient_ailments (
  id bigint generated by default as identity primary key,
  patient_id bigint not null references patients(id),
  source_table text not null,
  source_id bigint,
  label text not null,
  notes text,
  recorded_at timestamptz default now()
);

create table patient_findings (
  id bigint generated by default as identity primary key,
  patient_id bigint not null references patients(id),
  source_table text not null,
  source_id bigint,
  finding_type text not null,
  description text not null,
  recorded_at timestamptz default now()
);

create table patient_treatments (
  id bigint generated by default as identity primary key,
  patient_id bigint not null references patients(id),
  consultation_id bigint,
  treatment_type text not null,
  description text not null,
  recorded_at timestamptz default now()
);

create table patient_vaccines (
  id bigint generated by default as identity primary key,
  patient_id bigint not null references patients(id),
  vaccine_name text not null,
  dose_label text,
  date_given date,
  remarks text,
  source_log_id bigint,
  recorded_at timestamptz default now()
);
```

Migration requirements if approved:
- Add RLS policies before exposing tables.
- Backfill from existing `initial_consultation`, `consultation`, `lab_result`, `prescription`, and `fhsis_logs`.
- Keep old columns for compatibility until all workflows are verified.
- Do not rename `labaratory`, `midwives`, or existing table names.

---

## TODOs

- TODO: Confirm whether `fhsis_logs.data_fields` accepts JSON arrays in the deployed Supabase schema.
- TODO: Confirm actual primary key types for patient-related tables before writing a migration.
- TODO: Confirm whether `follow_up` has all expected columns in production.
- TODO: Confirm if a dedicated immunization table already exists but is not referenced in the current frontend.
- TODO: Decide whether itemized text parsing should split by comma, semicolon, or newline only.
- TODO: Add tests or manual QA cases for malformed prescription JSON in patient history.
- TODO: Add role-based manual checks for BHW, Nurse, Doctor, Lab, Pharmacist, and Midwife after implementation.

---

## Implementation Order

1. Create itemization helpers.
   - Add text splitting, lab-test label mapping, prescription parsing wrapper, and vaccine normalization.

2. Create unified patient transaction service.
   - Query current tables.
   - Compose registration, consent, initial consultation, doctor consultation, lab request, lab result, prescription/pharmacy, vaccine, and follow-up events.
   - Sort newest-first.
   - Fail softly for optional data.

3. Create reusable transaction history UI.
   - Loading state.
   - Empty state.
   - Error-safe display.
   - Itemized sections for ailments, findings, treatment, tests, prescriptions, and vaccines.

4. Wire transaction history into patient detail views.
   - Update `PatientDetailModal`.
   - Update patient details page history modal.
   - Preserve existing patient profile editing and consultation displays.

5. Add multiple vaccine rows to Midwife child logbook.
   - Repeatable vaccine inputs.
   - Save to `data_fields.vaccine_records`.
   - Keep `bcg_date` compatibility.

6. Update Midwife patient/FHSIS history display.
   - Show vaccine records as separate items.
   - Preserve existing reports.

7. Apply usability fixes.
   - Birthday/date fields left aligned.
   - Grey textboxes adjusted for contrast.
   - Disabled fields readable.
   - Better spacing and labels in touched forms.

8. Run verification.
   - `npm run build`
   - Manual workflow checks for patient details, consultation, lab, pharmacy, midwife child vaccine entry, and patient history.
