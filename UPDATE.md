# MEDISENS Update Log

## 2026-07-04 Patient Soft Archiving Security Audit

### Security findings
- Archive and restore writes were frontend-driven before this pass. They now go through a dedicated Supabase Edge Function.
- Non-admin archive/restore attempts are blocked server-side by validating the caller session and `profiles.role = admin`.
- `patient_archive_events` writes are no longer performed from frontend code. The Edge Function inserts archive events after admin authorization.
- `audit_logs` continue to be written through the secure `create-audit-log` Edge Function. The audit allowlist now includes Patient Archive `archived` and `restored` events.
- Active patient lists and active workflow queues were tightened to exclude archived patients, including patient registry, role dashboards, consultation entry, doctor queues, pharmacist queue, and laboratory queue.
- Direct patient chart access remains role-authenticated. Archived charts are now read-only and keep transaction history access without allowing profile edits or consent actions.

### Edge Function added
- Added `archive-patient-record` for server-side archive and restore execution.
- The function validates session, admin role, archive eligibility, protected status, pending follow-ups, unresolved lab requests, and required reasons before writing.

### Files changed
- `supabase/functions/archive-patient-record/index.ts`
- `supabase/functions/create-audit-log/index.ts`
- `src/features/admin/ArchiveReviewPage.tsx`
- `src/app/admin/index.tsx`
- `src/app/doctor/index.tsx`
- `src/app/pharmacist/index.tsx`
- `src/app/laboratory/index.tsx`
- `src/app/consultation/index.tsx`
- `src/app/follow-up-visitation/index.tsx`
- `src/app/patients/details.tsx`

### Remaining risks
- Live Supabase RLS policies could not be verified from the local repository. `patients` archive fields and `patient_archive_events` should remain protected by restrictive RLS as defense in depth.
- `last_activity_at` is consumed for archive eligibility, but consistent instrumentation across every patient-linked write still needs a dedicated implementation pass.
- Live authenticated browser verification was not performed because valid test credentials were unavailable.

### Build result
- `npm.cmd run build` passed.
