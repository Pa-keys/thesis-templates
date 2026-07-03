# MEDISENS — Rural Health Unit EMR System

## Senior Developer Implementation Plan for Codex / Agentic Development

> **For Codex / agentic workers:** Read this entire file before making any code changes.
>
> REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` for broad repository audits, multi-module refactors, and role workflow verification. Use `superpowers:executing-plans` when implementing the checklist tasks in this file.
>
> This document is the single source of truth for MEDISENS development. Follow the phases in order. Do not skip tasks unless the user explicitly says so. Use checkbox syntax (`- [ ]`) to track progress.

---

# 0. How To Use This File

This file is not a normal README.

This is a **Codex-readable project guide and implementation plan**. It should help Codex understand:

- what MEDISENS is,
- how the current repository is structured,
- which features already exist,
- which areas must be hardened,
- what not to break,
- and how to continue development task-by-task.

When starting a new Codex session, use prompts like:

```txt
Read PLAN.md and inspect the current repository before making changes. Then continue the next incomplete task.
```

```txt
Read PLAN.md and implement Phase 1 Task 1.1 only.
```

```txt
Read PLAN.md, audit the current role-based routing, and report issues before modifying files.
```

```txt
Read PLAN.md and improve the MEDISENS UI without changing the system workflow.
```

---

# 1. Project Overview

## What is MEDISENS?

**MEDISENS** is a capstone system for a Rural Health Unit (RHU). It is designed as an Electronic Medical Record (EMR) and workflow management system for healthcare staff.

The system supports patient registration, consent collection, triage, initial consultation, doctor consultation, laboratory requests/results, pharmacy dispensing, reports, and role-based access.

MEDISENS is not a generic clinic website. It is a workflow-driven RHU system.

---

# 2. Main Problem MEDISENS Solves

Many Rural Health Units still rely on manual or semi-manual workflows:

- paper patient records,
- handwritten consultation notes,
- fragmented patient history,
- slow patient queues,
- difficult follow-up tracking,
- manual pharmacy prescription handling,
- delayed laboratory result updates,
- inconsistent reporting,
- and role confusion between RHU staff.

MEDISENS solves this by creating a digital workflow from patient entry to service completion.

The intended flow is:

```txt
Patient Registration
        ↓
Patient Consent
        ↓
Nurse Initial Consultation / Vitals
        ↓
Doctor Consultation
        ↓
Laboratory Request / Results, if needed
        ↓
E-Prescription
        ↓
Pharmacy Dispensing
        ↓
Follow-up / Reporting
```

---

# 3. Target Users and Roles

MEDISENS uses role-based access.

The currently known roles are:

1. **Admin**
   - Manages users and role access.
   - Oversees the system.

2. **BHW**
   - Handles patient registration and/or community-level records.
   - May support census-related workflows.

3. **Nurse**
   - Views consented patients.
   - Performs initial consultation and vital signs recording.
   - Sends patients forward to the doctor workflow.

4. **Doctor**
   - Views the queue from initial consultation.
   - Performs diagnosis and consultation.
   - Creates laboratory requests.
   - Creates e-prescriptions.
   - Reviews follow-ups and analytics.

5. **Laboratory**
   - Receives laboratory requests.
   - Inputs lab findings.
   - Marks lab requests as completed.

6. **Pharmacist**
   - Views pending prescriptions.
   - Dispenses available medications.
   - Prints unavailable medication slips.
   - Marks prescriptions as dispensed.

7. **Midwife**
   - Manages maternity-related and/or census workflows.
   - Handles patient consent.
   - Generates reports.

Important:

- Preserve the exact role behavior already implemented.
- Do not rename database role strings unless the schema is also intentionally migrated.
- Be careful with current role spelling in code. Some role strings may be inconsistent, such as `labaratory` and `midwives`. Treat those as current implementation details until explicitly fixed.

---

# 4. Current Repository Context

Repository:

```txt
https://github.com/Pa-keys/thesis-templates/tree/ivan
```

Current observed project type:

```txt
Vite + React + TypeScript multi-page app
```

This is **not** a Next.js project.

Do not refactor it into Next.js.

Do not convert it into React Router SPA unless explicitly instructed.

---

# 5. Current Tech Stack

Based on the repository, the current stack is:

## Frontend

- Vite
- React 19
- TypeScript
- Tailwind utility classes
- Static HTML entry pages under `/pages`

## Backend / Database

- Supabase
- Supabase Auth
- Supabase PostgreSQL
- Supabase Realtime subscriptions

## Reports / Documents

- `jspdf`
- `html2canvas`

## Charts

- `chart.js`

## Signatures

- `react-signature-canvas`

## Environment Variables

Use:

```txt
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Never hardcode Supabase keys.

---

# 6. Current App Architecture

## Multi-Page Vite Setup

The app uses separate HTML entry points per role/module.

The root `index.html` redirects to:

```txt
/pages/login.html
```

The Vite build uses multiple HTML inputs such as:

```txt
pages/login.html
pages/templates.html
pages/details.html
pages/doctor.html
pages/nurse.html
pages/bhw.html
pages/pharmacist.html
pages/laboratory.html
pages/admin.html
```

Important audit note:

- `pages/midwife.html` exists and loads `../scripts/midwife.tsx`.
- The Vite config must be checked because `midwife.html` may not currently be included in the build inputs.
- If missing, add it carefully without changing the rest of the Vite structure.

---

# 7. Recommended Repository Map

The current repository should remain close to this structure:

```txt
/
├── index.html
├── package.json
├── vite.config.ts
├── pages/
│   ├── login.html
│   ├── admin.html
│   ├── bhw.html
│   ├── doctor.html
│   ├── nurse.html
│   ├── pharmacist.html
│   ├── laboratory.html
│   ├── midwife.html
│   ├── templates.html
│   └── details.html
├── scripts/
│   ├── admin.tsx
│   ├── bhw.tsx
│   ├── doctor.tsx
│   ├── nurse.tsx
│   ├── pharmacist.tsx
│   ├── laboratory.tsx
│   ├── midwife.tsx
│   ├── consultation.tsx
│   ├── initial_consultation.tsx
│   ├── records.tsx
│   ├── templates.tsx
│   ├── sidebar.tsx
│   ├── patient_consent.tsx
│   ├── components/
│   │   ├── Toast.tsx
│   │   └── PatientDetailModal.tsx
│   └── midwife/
│       ├── dashboard.tsx
│       ├── patientRecords.tsx
│       ├── censusEntry.tsx
│       ├── reportGenerator.tsx
│       └── useMidwifeData.ts
├── shared/
│   ├── supabase.ts
│   └── auth.ts
├── css/
│   ├── dashboard.css
│   └── template.css
├── supabase/
│   └── functions/
└── PLAN.md
```

If the actual repo differs, inspect before changing. Do not invent files that are not needed.

---

# 8. Core System Workflow

## 8.1 Authentication and Role Routing

Current auth logic should:

1. Read the active Supabase session.
2. Fetch the user profile from `profiles`.
3. Compare the user role with the expected role.
4. Redirect users to the correct dashboard if they access the wrong page.
5. Redirect unauthenticated users back to login.

Expected role route map:

```txt
doctor      → doctor.html
nurse       → nurse.html
BHW         → bhw.html
pharmacist  → pharmacist.html
labaratory  → laboratory.html
admin       → admin.html
midwives    → midwife.html
```

Important:

- Verify if `labaratory` is an intentional database role typo.
- Verify if `midwives` is the correct database role string.
- Do not change these strings unless also updating the database and all dependent code.

---

## 8.2 Patient Registration and Consent

Expected flow:

1. BHW or Midwife registers patient details.
2. Patient record is stored in `patients`.
3. Consent is captured and stored in `patient_consent`.
4. Nurse dashboard listens for consented patients.
5. Consented patients become eligible for initial consultation.

Requirements:

- Patient demographics must remain complete and readable.
- Consent must be linked to the correct patient.
- Signature capture must work on desktop and mobile.
- Consent status must update without manual refresh when possible.

---

## 8.3 Nurse Initial Consultation

Expected flow:

1. Nurse sees consented patients.
2. Nurse selects patient.
3. Nurse records initial consultation data:
   - consultation date,
   - consultation time,
   - mode of transaction,
   - mode of transfer,
   - chief complaints,
   - initial diagnosis,
   - vitals.
4. System inserts into:
   - `initial_consultation`
   - `vital_sign`
5. Doctor dashboard receives the patient in the queue.

Important:

- If inserting vital signs fails after creating `initial_consultation`, rollback or clean up the partial insert.
- BMI and nutritional status should be computed consistently.
- Do not allow saving without a selected patient.

---

## 8.4 Doctor Consultation

Expected flow:

1. Doctor sees patients who completed nurse initial consultation.
2. Doctor opens patient consultation.
3. Doctor reviews patient details and initial consultation.
4. Doctor records diagnosis and remarks.
5. Doctor may create:
   - lab request,
   - e-prescription,
   - follow-up schedule.
6. Completed consultations should not repeatedly appear in the active queue for the same day unless intended.

Doctor dashboard should also support:

- morbidity analytics,
- trends,
- follow-up list,
- patient records,
- templates.

---

## 8.5 Laboratory Workflow

Expected flow:

1. Doctor creates a `lab_request`.
2. Laboratory dashboard receives request.
3. Lab user enters findings.
4. System inserts or updates `lab_result`.
5. System updates `lab_request.status` to `Completed`.
6. Doctor can see or be notified that results are available.

Requirements:

- Do not duplicate lab results unnecessarily.
- Completed lab requests should display correctly.
- The lab module should support pending/completed filtering.
- Results should be linked by `labrequest_id`, `patient_id`, and `consultation_id` when available.

---

## 8.6 Pharmacy Workflow

Expected flow:

1. Doctor creates e-prescription.
2. Prescription appears in pharmacist queue with `Pending` status.
3. Pharmacist reviews medications.
4. Pharmacist checks which medications are available.
5. If some are unavailable, pharmacist can print an unavailable medication slip.
6. Pharmacist marks prescription as `Dispensed`.
7. System updates:
   - `prescription.status = 'Dispensed'`
   - `prescription.dispensed_at = current timestamp`

Important current issue:

- Some code may still use native `alert()` in the pharmacy unavailable-print flow.
- Replace native alerts with the shared toast system.

---

## 8.7 Midwife / Census / FHSIS Reporting

Expected flow:

1. Midwife accesses patient and census modules.
2. Census data is entered into the appropriate table.
3. Reports are generated from stored records.
4. Report generation uses `html2canvas` and `jspdf`.
5. PDF output should not cut off tables.

Requirements:

- Keep generated reports readable.
- Add loading states during PDF generation.
- Prevent duplicate report generation while rendering.
- Check build configuration for midwife module.

---

## 8.8 Follow-Up Reminders

Expected future flow:

1. Doctor creates follow-up schedule.
2. Follow-up data is saved.
3. Edge function or scheduled process checks tomorrow’s follow-ups.
4. Notification provider sends SMS/email/reminder.
5. If provider is not configured, use mock logging first.

Do not implement real SMS/email provider integration unless credentials and provider choice are confirmed.

---

# 9. Data Model Reference

This is an inferred reference based on current code. Always verify against the actual Supabase schema before making database changes.

## `profiles`

Likely fields:

- `id`
- `full_name`
- `role`
- `email`
- `status`

## `patients`

Likely fields:

- `id`
- `firstName`
- `middleName`
- `lastName`
- `suffix`
- `age`
- `sex`
- `birthday`
- `birthPlace`
- `bloodType`
- `nationality`
- `religion`
- `civilStatus`
- `contactNumber`
- `address`
- `educationalAttain`
- `employmentStatus`
- `philhealthStatus`
- `philhealthNo`
- `category`
- `categoryOthers`
- `relativeName`
- `relativeRelation`
- `relativeAddress`
- `created_at`

## `patient_consent`

Likely fields:

- `consent_id`
- `patient_id`
- `signature_url` or signature data
- `consent_status`
- `created_at`

## `initial_consultation`

Likely fields:

- `initialconsultation_id`
- `patient_id`
- `consultation_date`
- `consultation_time`
- `mode_of_transaction`
- `referred_by`
- `mode_of_transfer`
- `chief_complaint`
- `diagnosis`

## `vital_sign`

Likely fields:

- `patient_id`
- `bp`
- `heart_rate`
- `respiratory_rate`
- `temperature`
- `o2_saturation`
- `weight`
- `height`
- `muac`
- `nutritional_status`
- `bmi`
- `visual_acuity_left`
- `visual_acuity_right`
- `general_survey`

## `consultation`

Likely fields:

- `consultation_id`
- `patient_id`
- `initialconsultation_id`
- `consultation_date`
- `diagnosis`
- `remarks`
- `doctor_id`
- `doctor_name`

## `lab_request`

Likely fields:

- `labrequest_id`
- `consultation_id`
- `patient_id`
- `request_date`
- `lab_no`
- `chief_complaint`
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
- `others`
- `requested_by`
- `status`

## `lab_result`

Likely fields:

- `labresult_id`
- `labrequest_id`
- `patient_id`
- `consultation_id`
- `date_performed`
- `findings`
- `performed_by`
- `status`

## `prescription`

Likely fields:

- `prescription_id`
- `consultation_id`
- `patient_id`
- `prescription_date`
- `rx_content`
- `doctor_name`
- `license_no`
- `ptr_no`
- `status`
- `dispensed_at`
- `signature_url`

## `follow_up`

Likely fields:

- `followup_id`
- `patient_id`
- `visit_date`
- `follow_up_status`

## `fhsis_logs`

Likely fields:

- `id`
- `category`
- `report_month`
- relevant census/reporting fields

Important:

- Do not rename columns without confirming database schema.
- Do not drop tables.
- Do not make destructive schema changes unless explicitly instructed.

---

# 10. UI/UX Direction

MEDISENS should feel:

- clinical,
- clean,
- calm,
- trustworthy,
- responsive,
- readable,
- and efficient for busy RHU staff.

Preferred visual language:

- Slate
- Blue
- Teal
- Emerald
- White
- Light gray backgrounds
- Soft borders
- Rounded cards
- Sticky topbars
- Sidebar navigation
- Clear status badges

Avoid:

- overly playful design,
- dark cyberpunk themes,
- loud gradients,
- tiny text,
- cluttered cards,
- inconsistent button styles,
- native browser alerts,
- layouts that break on small screens.

---

# 11. Component Rules

## Shared Components

Move repeated UI into shared components when safe.

Recommended shared components:

```txt
scripts/components/Toast.tsx
scripts/components/PatientDetailModal.tsx
scripts/components/StatusBadge.tsx
scripts/components/EmptyState.tsx
scripts/components/LoadingState.tsx
scripts/components/NetworkBadge.tsx
scripts/components/ConfirmModal.tsx
```

Only create new shared components when two or more modules need the same UI.

## Sidebar

The sidebar is a core shared component.

Rules:

- Do not duplicate sidebar logic inside every dashboard.
- Preserve mobile hamburger behavior.
- Preserve `activePage` highlighting.
- Preserve logout behavior.
- Keep online/offline status visible.

## Toasts

Use the shared toast system for:

- success messages,
- validation errors,
- network errors,
- failed Supabase operations,
- blocked offline actions.

Do not use:

```ts
alert()
prompt()
confirm()
```

unless specifically approved.

## Modals

Use custom modals for:

- confirmation,
- details,
- patient previews,
- prescription review,
- lab request details,
- consent forms.

Modals should:

- be responsive,
- have close buttons,
- support scrollable content,
- avoid overflowing on mobile.

---

# 12. TypeScript Rules

Current code may contain `any` in several modules. Do not blindly rewrite everything at once.

Rules:

- Add proper interfaces when modifying a module.
- Keep existing behavior stable.
- Avoid large risky refactors.
- Use incremental typing.
- Use explicit types for Supabase rows when practical.
- Do not introduce complex generic abstractions unless needed.

Recommended future types location:

```txt
scripts/types/
├── database.ts
├── patient.ts
├── consultation.ts
├── prescription.ts
├── laboratory.ts
└── user.ts
```

---

# 13. Realtime Rules

Supabase Realtime is central to MEDISENS.

Rules:

- Always call `supabase.removeChannel(channel)` in `useEffect` cleanup.
- Avoid duplicate subscriptions when components rerender.
- Do not create channels inside functions that run repeatedly without cleanup.
- Use stable callbacks where needed.
- Keep channel names readable:
  - `nurse-realtime`
  - `doctor-realtime`
  - `pharmacist-realtime`
  - `lab-realtime`
  - `midwife-realtime`

Realtime should support:

- consent → nurse queue,
- initial consultation → doctor queue,
- doctor prescription → pharmacist queue,
- doctor lab request → laboratory queue,
- lab result completed → doctor notification,
- patient record changes → relevant dashboards.

---

# 14. Offline / Network Rules

MEDISENS is used in an RHU setting, so unstable internet must be expected.

Current behavior should include:

- online/offline badge,
- toast when save actions fail,
- disabled or guarded actions when offline.

Rules:

- Do not silently fail when offline.
- Do not pretend a record was saved if Supabase write failed.
- If offline sync is not fully implemented yet, block critical writes and show a clear message.
- If offline sync is requested later, implement a safe local queue with conflict handling.

---

# 15. Security and Privacy Rules

MEDISENS handles health-related data.

Rules:

- Do not log sensitive patient data unnecessarily.
- Do not expose Supabase service role keys.
- Do not hardcode credentials.
- Do not store secrets in frontend code.
- Do not add public debug pages that expose patient data.
- Do not bypass role checks.
- Do not allow users to access dashboards outside their role.
- Do not use fake authentication shortcuts in production code.

For demos, mock data is allowed only if clearly separated from real patient data.

---

# 16. Build and Verification Commands

Use the scripts available in `package.json`.

Currently available:

```bash
npm run dev
npm run build
npm run preview
```

If lint/typecheck scripts are added later, also run:

```bash
npm run lint
npm run typecheck
```

Before marking a task complete:

- run the relevant build command,
- manually test the affected role page,
- verify the browser console,
- verify Supabase writes,
- verify realtime behavior if applicable.

---

# 17. Phase Roadmap

## Phase 0 — Repository Audit and Grounding

Goal:

Understand the actual repo before writing code. This prevents Codex from hallucinating a different architecture.

Tasks:

- [ ] Inspect `package.json`.
- [ ] Inspect `vite.config.ts`.
- [ ] Inspect `index.html`.
- [ ] Inspect all files in `/pages`.
- [ ] Inspect all dashboard entry files in `/scripts`.
- [ ] Inspect `/shared/supabase.ts`.
- [ ] Inspect `/shared/auth.ts`.
- [ ] Inspect `scripts/sidebar.tsx`.
- [ ] Inspect existing shared components.
- [ ] Inspect midwife submodules.
- [ ] Inspect Supabase functions if present.
- [ ] Create a short audit note listing:
  - current stack,
  - current pages,
  - current roles,
  - missing build entries,
  - risky duplicate logic,
  - native alerts,
  - `any` usage hotspots,
  - realtime subscription hotspots.

Acceptance criteria:

- Codex understands this is a Vite multi-page React app.
- No code changes are made before the audit.
- All assumptions are marked as `TODO:` if not verified.

---

## Phase 1 — Build Configuration and Routing Hardening

Goal:

Ensure all role pages are correctly included in the build and routing is consistent.

Files to inspect:

- `vite.config.ts`
- `index.html`
- `pages/*.html`
- `shared/auth.ts`

Files likely to modify:

- `vite.config.ts`
- `shared/auth.ts`
- possibly role page HTML files

Tasks:

- [ ] Verify every page in `/pages` that loads a script is included in `vite.config.ts`.
- [ ] Add `midwife: 'pages/midwife.html'` to Vite build inputs if missing.
- [ ] Verify `index.html` redirect target is correct.
- [ ] Verify every role dashboard page loads the correct script.
- [ ] Audit `ROLE_DASHBOARD` in `shared/auth.ts`.
- [ ] Confirm whether `labaratory` is the real database role value.
- [ ] Confirm whether `midwives` is the real database role value.
- [ ] If role strings are typos but already stored in Supabase, do not rename yet. Add TODO comments instead.
- [ ] Ensure unauthorized users redirect to the correct dashboard or login.
- [ ] Ensure unauthenticated users redirect to `/pages/login.html` consistently.

Acceptance criteria:

- `npm run build` includes all intended role pages.
- Midwife page works in production build if it exists.
- Wrong-role access is blocked.
- Unauthenticated access is blocked.
- No role route is broken.

Verification:

```bash
npm run build
npm run preview
```

Manual checks:

- [ ] Login page loads.
- [ ] Doctor page route exists.
- [ ] Nurse page route exists.
- [ ] BHW page route exists.
- [ ] Pharmacist page route exists.
- [ ] Laboratory page route exists.
- [ ] Admin page route exists.
- [ ] Midwife page route exists if part of the system.

---

## Phase 2 — Shared UI Foundation

Goal:

Standardize repeated dashboard UI without changing workflows.

Files to inspect:

- `scripts/sidebar.tsx`
- `scripts/components/Toast.tsx`
- all dashboard files:
  - `admin.tsx`
  - `bhw.tsx`
  - `doctor.tsx`
  - `nurse.tsx`
  - `pharmacist.tsx`
  - `laboratory.tsx`
  - `midwife.tsx`

Files likely to create:

- `scripts/components/NetworkBadge.tsx`
- `scripts/components/EmptyState.tsx`
- `scripts/components/LoadingState.tsx`
- `scripts/components/ConfirmModal.tsx`

Tasks:

- [ ] Audit repeated online/offline badge code.
- [ ] Create `NetworkBadge` if repeated across multiple dashboards.
- [ ] Audit repeated empty queue states.
- [ ] Create `EmptyState` if repeated.
- [ ] Audit repeated loading states.
- [ ] Create `LoadingState` if repeated.
- [ ] Replace native `alert()` usages with `useToast` or a custom confirm modal.
- [ ] Keep sidebar behavior intact.
- [ ] Ensure mobile sidebar works across all dashboards.
- [ ] Ensure dashboard header spacing is consistent.
- [ ] Ensure all root dashboards include the toast component if they perform write operations.

Acceptance criteria:

- UI is more consistent.
- No workflow is changed.
- Mobile sidebar still works.
- Toasts appear consistently.
- Native alerts are removed where safe.

Verification:

```bash
npm run build
```

Manual checks:

- [ ] Open every role dashboard.
- [ ] Toggle mobile sidebar viewport.
- [ ] Trigger at least one toast per module with a safe action.
- [ ] Confirm online/offline badge style is consistent.

---

## Phase 3 — Authentication and Role Access Audit

Goal:

Make role-based access reliable across all dashboards.

Files to inspect:

- `shared/auth.ts`
- `scripts/login.tsx` or relevant login script
- all role dashboard entry files

Tasks:

- [ ] Verify each dashboard calls `requireRole()` or equivalent role validation.
- [ ] Add missing role checks to dashboards that only check session but not role.
- [ ] Ensure `requireRole()` returns `userId`, `role`, and `fullName`.
- [ ] Ensure dashboards use `fullName` from `requireRole()` where possible instead of duplicating profile fetch logic.
- [ ] Normalize login redirect behavior.
- [ ] Add clear TODO if role string typos require database migration later.
- [ ] Ensure logout always signs out from Supabase and redirects to login.
- [ ] Avoid exposing dashboards to users with the wrong role.

Acceptance criteria:

- Each role page validates the correct role.
- Users cannot access other dashboards manually by URL.
- Logout works across dashboards.
- Existing route architecture remains unchanged.

Manual role checks:

- [ ] Admin cannot access doctor dashboard unless role allows.
- [ ] Doctor cannot access pharmacist dashboard.
- [ ] Nurse cannot access admin dashboard.
- [ ] Laboratory cannot access doctor dashboard.
- [ ] Unauthenticated user is sent to login.

---

## Phase 4 — Patient Registration and Consent Hardening

Goal:

Make patient registration and consent reliable before downstream workflow starts.

Files to inspect:

- `scripts/bhw.tsx`
- `scripts/midwife.tsx`
- `scripts/patient_consent.tsx`
- `scripts/records.tsx`
- `scripts/components/PatientDetailModal.tsx`

Tasks:

- [ ] Audit patient registration form validation.
- [ ] Ensure required fields have clear validation.
- [ ] Ensure PhilHealth fields are handled consistently.
- [ ] Ensure category/categoryOthers logic is clear.
- [ ] Ensure emergency contact fields are saved correctly.
- [ ] Verify patient consent links to the correct patient.
- [ ] Verify signature capture works on desktop and mobile.
- [ ] Ensure consent save has loading and error states.
- [ ] Ensure duplicate consent is prevented or handled gracefully.
- [ ] Ensure patient detail modal clearly displays consent status.
- [ ] Ensure successful consent triggers nurse queue through realtime or reload.

Acceptance criteria:

- A newly registered patient can proceed to consent.
- Consent is saved correctly.
- Nurse can see the patient after consent.
- No duplicate consent confusion.
- UI clearly communicates pending vs signed consent.

---

## Phase 5 — Nurse Initial Consultation Hardening

Goal:

Make the triage workflow safe, typed, and reliable.

Files to inspect:

- `scripts/nurse.tsx`
- `scripts/initial_consultation.tsx`
- `scripts/components/PatientDetailModal.tsx`

Tasks:

- [ ] Ensure nurse dashboard shows only consented patients.
- [ ] Ensure patient search works by name.
- [ ] Ensure selecting a patient opens initial consultation correctly.
- [ ] Ensure vitals validation is clear.
- [ ] Ensure BP format validation is preserved.
- [ ] Ensure numeric fields cannot save invalid values.
- [ ] Ensure BMI calculation is correct.
- [ ] Ensure nutritional status calculation is correct.
- [ ] Ensure save inserts `initial_consultation`.
- [ ] Ensure save inserts `vital_sign`.
- [ ] Ensure partial insert rollback remains safe.
- [ ] Ensure save button has loading state.
- [ ] Ensure success toast appears.
- [ ] Ensure failed save toast appears.
- [ ] Ensure doctor queue updates after successful save.

Acceptance criteria:

- Nurse can select a consented patient.
- Nurse can save initial consultation.
- Doctor receives the patient in queue.
- Failed vital save does not leave broken data.
- No page refresh is required unless intentionally redirected.

---

## Phase 6 — Doctor Dashboard and Consultation Hardening

Goal:

Make the doctor workflow reliable from queue to diagnosis, prescriptions, lab requests, and follow-ups.

Files to inspect:

- `scripts/doctor.tsx`
- `scripts/consultation.tsx`
- `scripts/records.tsx`
- `scripts/templates.tsx`

Tasks:

- [ ] Audit doctor queue loading logic.
- [ ] Ensure patients already consulted today do not remain in active queue unless intended.
- [ ] Ensure doctor can open a patient from the queue.
- [ ] Ensure doctor can view initial consultation and vitals.
- [ ] Ensure consultation save creates/updates the correct table.
- [ ] Ensure diagnosis is required where appropriate.
- [ ] Ensure prescription creation is linked to consultation and patient.
- [ ] Ensure lab request creation is linked to consultation and patient.
- [ ] Ensure follow-up scheduling saves correctly.
- [ ] Ensure morbidity analytics aggregate completed consultation diagnoses correctly.
- [ ] Ensure Chart.js instances are destroyed on cleanup to prevent memory leaks.
- [ ] Add realtime listener for completed lab results if missing.
- [ ] Show toast when a requested lab result is completed.

Acceptance criteria:

- Doctor queue accurately reflects patients ready for consultation.
- Doctor can complete consultation.
- Prescription appears in pharmacist queue.
- Lab request appears in laboratory queue.
- Follow-up appears in follow-up list.
- Analytics render without duplicate chart bugs.
- Completed lab result notification works.

---

## Phase 7 — Laboratory Workflow Hardening

Goal:

Finalize the laboratory request/result loop.

Files to inspect:

- `scripts/laboratory.tsx`
- `scripts/doctor.tsx`
- `scripts/consultation.tsx`

Tasks:

- [ ] Ensure lab dashboard requires laboratory role.
- [ ] Ensure lab request list loads all relevant requests.
- [ ] Ensure pending/completed filter works.
- [ ] Ensure search works by patient name, lab number, or chief complaint.
- [ ] Ensure clicking request opens details drawer/modal.
- [ ] Ensure existing lab result loads if present.
- [ ] Ensure submitting result inserts `lab_result` if none exists.
- [ ] Ensure submitting result updates latest `lab_result` if one exists.
- [ ] Ensure `lab_request.status` becomes `Completed`.
- [ ] Ensure completed request is visibly marked.
- [ ] Ensure completed result fields become read-only if intended.
- [ ] Ensure doctor can view or receive notification for completed result.
- [ ] Ensure realtime subscription listens to both inserts and updates if needed.

Acceptance criteria:

- Lab user can complete pending lab request.
- Lab result is linked to request, patient, and consultation.
- Request status updates to completed.
- Doctor workflow can see result completion.
- No duplicate result is created from repeated clicks.

---

## Phase 8 — Pharmacy Workflow Hardening

Goal:

Finalize prescription dispensing and unavailable medication slip behavior.

Files to inspect:

- `scripts/pharmacist.tsx`
- `scripts/doctor.tsx`
- `scripts/consultation.tsx`

Tasks:

- [ ] Ensure pharmacist dashboard requires pharmacist role.
- [ ] Ensure only `Pending` prescriptions appear.
- [ ] Ensure prescription queue updates through realtime.
- [ ] Remove background polling if realtime is sufficient, or keep it only as fallback.
- [ ] Ensure medication JSON parsing is guarded with try/catch.
- [ ] Ensure malformed `rx_content` does not crash the UI.
- [ ] Replace native `alert()` for unavailable print with toast.
- [ ] Ensure unavailable slip prints only unchecked medications.
- [ ] Ensure long patient names, addresses, and medication names do not overflow print layout.
- [ ] Ensure print iframe is removed after printing.
- [ ] Ensure `handleDispense` updates status to `Dispensed`.
- [ ] Ensure `dispensed_at` timestamp is saved.
- [ ] Ensure modal closes and queue updates after dispense.
- [ ] Prevent duplicate dispense clicks with loading state.

Acceptance criteria:

- Pending prescriptions appear.
- Unavailable medication slip prints correctly.
- Dispense action updates the database.
- Dispensed prescriptions disappear from pending queue.
- No native alert remains.
- UI does not crash with malformed prescription content.

---

## Phase 9 — Midwife and FHSIS Reporting

Goal:

Stabilize midwife dashboard, census entry, consent handling, and report generation.

Files to inspect:

- `pages/midwife.html`
- `scripts/midwife.tsx`
- `scripts/midwife/dashboard.tsx`
- `scripts/midwife/patientRecords.tsx`
- `scripts/midwife/censusEntry.tsx`
- `scripts/midwife/reportGenerator.tsx`
- `scripts/midwife/useMidwifeData.ts`
- `vite.config.ts`

Tasks:

- [ ] Ensure `midwife.html` is included in Vite build.
- [ ] Ensure midwife dashboard requires correct role.
- [ ] Verify all midwife navigation items work.
- [ ] Verify patient records load correctly.
- [ ] Verify consent flow works from midwife patient modal.
- [ ] Verify census entry saves to the correct table.
- [ ] Verify report data loads from the correct table.
- [ ] Add loading state while generating report.
- [ ] Disable generate button while rendering.
- [ ] Use `html2canvas` and `jspdf` safely.
- [ ] Ensure A4 pagination does not cut off tables.
- [ ] Ensure report output remains readable when table data is long.
- [ ] Add error toast if report generation fails.

Acceptance criteria:

- Midwife module builds.
- Census data can be entered.
- Reports can be generated.
- PDF does not cut off important data.
- UI remains responsive during generation.

---

## Phase 10 — Admin Module and User Management

Goal:

Ensure admin role can safely manage system users without breaking auth.

Files to inspect:

- `scripts/admin.tsx`
- `shared/auth.ts`
- Supabase `profiles` usage

Tasks:

- [ ] Audit admin dashboard access control.
- [ ] Verify admin-only access.
- [ ] Verify user list loads correctly.
- [ ] Verify role assignment options match actual role strings.
- [ ] Add clear labels for role strings if database values are awkward.
- [ ] Ensure user creation does not expose secrets.
- [ ] Ensure status changes are confirmed before saving.
- [ ] Ensure toasts appear on success/failure.
- [ ] Prevent accidental removal of the last admin if applicable.

Acceptance criteria:

- Admin page is protected.
- Admin can manage users as intended.
- Role values do not break routing.
- No sensitive credentials are exposed.

---

## Phase 11 — Data Types and Supabase Query Cleanup

Goal:

Reduce fragile `any` usage and make data handling more reliable.

Files likely to create:

```txt
scripts/types/database.ts
scripts/types/patient.ts
scripts/types/consultation.ts
scripts/types/laboratory.ts
scripts/types/prescription.ts
scripts/types/user.ts
```

Tasks:

- [ ] Create shared patient types.
- [ ] Create shared profile/user role types.
- [ ] Create prescription types.
- [ ] Create lab request/result types.
- [ ] Create consultation/vital sign types.
- [ ] Replace `any` only in files being actively modified.
- [ ] Do not mass-refactor the entire repo in one commit.
- [ ] Add safe parsers for JSON fields such as `rx_content`.
- [ ] Standardize date formatting helpers.

Acceptance criteria:

- Modified modules have stronger typing.
- No major behavior changes.
- Build still passes.
- Type improvements are incremental and safe.

---

## Phase 12 — Offline and Network Resilience

Goal:

Make MEDISENS safer under unstable RHU network conditions.

Files to inspect:

- all dashboard files
- existing network handling
- possible `useNetworkSync.ts` if present

Tasks:

- [ ] Audit every write action and check offline behavior.
- [ ] Block critical writes when offline unless offline sync exists.
- [ ] Show toast when user tries to save offline.
- [ ] Ensure online/offline event listeners are cleaned up.
- [ ] Create shared `useOnlineStatus` hook if repeated.
- [ ] Add TODO for real offline sync if not currently in scope.
- [ ] If offline sync is requested, design local queue first before implementation.

Acceptance criteria:

- No silent failed saves.
- Users know when they are offline.
- Critical actions are protected.
- Event listeners do not leak.

---

## Phase 13 — Reporting, Printing, and Document Output

Goal:

Standardize printable outputs and generated PDFs.

Files to inspect:

- `scripts/pharmacist.tsx`
- `scripts/midwife/reportGenerator.tsx`
- doctor prescription print logic if present

Tasks:

- [ ] Audit all print/PDF functions.
- [ ] Ensure print layouts have explicit page size.
- [ ] Ensure iframes are removed after printing.
- [ ] Ensure long text wraps or truncates safely.
- [ ] Ensure print buttons have disabled/loading states.
- [ ] Ensure generated report tables do not cut off.
- [ ] Avoid mixing app UI styles with print-only styles unless intentional.

Acceptance criteria:

- Pharmacy unavailable slip prints cleanly.
- Midwife reports export cleanly.
- Long text does not destroy layout.
- No orphan iframes remain.

---

## Phase 14 — Final UI/UX Polish

Goal:

Make the app look consistent, professional, and defense-ready.

Tasks:

- [ ] Standardize dashboard backgrounds.
- [ ] Standardize card borders and shadows.
- [ ] Standardize buttons.
- [ ] Standardize badges.
- [ ] Standardize empty states.
- [ ] Standardize modal spacing.
- [ ] Ensure every dashboard has consistent topbar behavior.
- [ ] Ensure mobile layouts do not overflow.
- [ ] Ensure tables are horizontally scrollable on mobile.
- [ ] Ensure important CTAs are visible.
- [ ] Ensure text contrast is readable.
- [ ] Ensure no accidental debug text remains.

Acceptance criteria:

- MEDISENS looks like one coherent system.
- Each role dashboard feels connected.
- Mobile/tablet layout is usable.
- UI is defense-ready.

---

## Phase 15 — Testing, Demo, and Deployment Readiness

Goal:

Prepare MEDISENS for capstone presentation, testing, and deployment.

Tasks:

- [ ] Run `npm run build`.
- [ ] Fix all build errors.
- [ ] Test login for each role.
- [ ] Test full patient workflow:
  - registration,
  - consent,
  - nurse triage,
  - doctor consultation,
  - lab request,
  - lab result,
  - prescription,
  - pharmacy dispense,
  - follow-up.
- [ ] Test offline badge behavior.
- [ ] Test realtime queues.
- [ ] Test report generation.
- [ ] Test print outputs.
- [ ] Create demo accounts if appropriate.
- [ ] Create a short demo script.
- [ ] Create troubleshooting notes for presentation day.

Acceptance criteria:

- Build succeeds.
- Core workflow works end-to-end.
- No major console errors.
- Demo can be completed without manual database edits.
- System is ready for capstone defense.

---

# 18. High-Risk Areas Codex Must Handle Carefully

## 18.1 Role String Mismatches

Known risk:

```txt
labaratory
midwives
```

These may be database role values. Do not “fix” spelling casually.

Correct process:

1. Audit current database/profile role values.
2. Audit all code references.
3. Add compatibility mapping if needed.
4. Only migrate role strings if explicitly instructed.

---

## 18.2 Vite Multi-Page Build

Do not remove or replace the multi-page setup.

Do not convert to React Router without instruction.

Correct process:

1. Add missing HTML inputs if needed.
2. Keep existing page entry points.
3. Keep redirects stable.
4. Test production build.

---

## 18.3 Supabase Schema

Do not drop or rename tables.

Do not assume schema fields.

Correct process:

1. Inspect current queries.
2. Infer schema carefully.
3. Add TODO if uncertain.
4. Ask user before destructive changes.

---

## 18.4 Native Alerts

Native alerts are not preferred.

Replace:

```ts
alert("message")
```

with:

```ts
showToast("message", true)
```

or a custom modal if confirmation is required.

---

## 18.5 Realtime Subscriptions

Realtime channels must be cleaned up.

Correct pattern:

```ts
useEffect(() => {
  const channel = supabase
    .channel('channel-name')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'table_name' }, () => {
      // reload data
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

---

# 19. Acceptance Criteria For The Entire System

MEDISENS is considered stable when:

- [ ] All role pages build correctly.
- [ ] Every dashboard is protected by role checks.
- [ ] Patient registration works.
- [ ] Consent capture works.
- [ ] Nurse initial consultation works.
- [ ] Doctor consultation works.
- [ ] Lab request/result loop works.
- [ ] Pharmacy dispensing works.
- [ ] Midwife module builds and works.
- [ ] Reports export correctly.
- [ ] Realtime queues update without manual refresh.
- [ ] Offline state is visible.
- [ ] No native alerts remain in main workflows.
- [ ] No Supabase keys are hardcoded.
- [ ] No TypeScript build errors exist.
- [ ] UI is consistent and defense-ready.

---

# 20. Suggested Commit Strategy

Use small commits per task.

Examples:

```bash
git add .
git commit -m "chore: audit medisens vite page entries"
```

```bash
git add .
git commit -m "fix: include midwife page in vite build"
```

```bash
git add .
git commit -m "refactor: standardize network badge across dashboards"
```

```bash
git add .
git commit -m "fix: replace pharmacy native alert with toast"
```

```bash
git add .
git commit -m "feat: notify doctor when lab result is completed"
```

---

# 21. Codex Prompt Examples

Use these prompts after this file is added to the repository.

```txt
Read PLAN.md and perform Phase 0 only. Do not modify files yet. Return an audit report.
```

```txt
Read PLAN.md and implement Phase 1 Task 1 only. Keep the Vite multi-page architecture intact.
```

```txt
Read PLAN.md and fix the midwife build entry if it is missing.
```

```txt
Read PLAN.md and replace native alerts with the existing Toast component where safe.
```

```txt
Read PLAN.md and harden the pharmacist workflow without changing the database schema.
```

```txt
Read PLAN.md and audit the full BHW → Nurse → Doctor workflow. Report issues first before editing.
```

```txt
Read PLAN.md and continue the next incomplete checklist task.
```

---

# 22. Final Warning

MEDISENS is a healthcare workflow system. Stability is more important than flashy changes.

Do not prioritize visual redesigns over correctness.

Do not change the architecture just because another framework seems cleaner.

Do not break role routing.

Do not break patient workflow continuity.

Do not make database-destructive changes.

Do not expose secrets.

Do not invent capstone features that are not supported by the current repository or user instructions.

---

# 23. Final Product Feeling

When MEDISENS is presented, it should feel like:

> “A complete, reliable, modern Rural Health Unit EMR system that helps healthcare workers move patients through registration, consent, triage, consultation, laboratory, pharmacy, and reporting without losing records or breaking the workflow.”

Every code change should support that goal.

---

I have provided an example of how a `README.md` or `PLAN.md` should look like, so use it as the reference style, act like a senior developer, and use the `superpowers` skills.
