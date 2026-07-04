# MEDISENS Update Log

## 2026-07-04 Archive Review Doctor Visibility & Filter Button Fix

### Files changed
- `src/features/admin/ArchiveReviewPage.tsx`
- `src/app/doctor/index.tsx`
- `src/styles/dashboard.css` (filter button fix from prior session, confirmed)

### Doctor visibility behavior
- Archive Review tab is now visible in the Doctor sidebar navigation.
- Doctor users can browse all four filter views: Candidates, Active, Archived, Protected.
- Doctor users can search by patient name, address, or record number.
- The last column shows a plain-text status label (Active / Archived / Protected) instead of action buttons.
- The table subtitle explicitly states: "Read-only view. Archive and restore actions are restricted to the Administrator role."
- No action modal is rendered for Doctor users — the `!readOnly && selectedPatient && action` guard prevents it entirely.

### Admin vs Doctor permissions
| Capability | Admin | Doctor |
|---|---|---|
| See Archive Review tab | ✅ | ✅ |
| Filter Candidates / Active / Archived / Protected | ✅ | ✅ |
| Search patient records | ✅ | ✅ |
| Archive a patient record | ✅ | ❌ (button hidden) |
| Restore a patient record | ✅ | ❌ (button hidden) |
| Archive action modal | ✅ | ❌ (suppressed) |

### Edge Function security
Unchanged. `archive-patient-record` Edge Function still enforces `role = admin` server-side. Even if a Doctor somehow reached the action, the server would reject it.

### Filter button UI fix (confirmed from prior session)
- Replaced undefined `var(--slate-700)` with `var(--focus-color)` (#334155) in `dashboard.css`.
- All filter button states (default, hover, focus-visible, active/selected, disabled) now show readable labels.

### Build result
- `npm run build` passed. ✓ built in 3.14s



### Root cause
- The Archive Review filter buttons used a CSS class `.clinical-filter-button`.
- The active, focus, and text styles in `src/styles/dashboard.css` referenced an undefined CSS variable `var(--slate-700)`.
- Because `var(--slate-700)` was undefined, the browser evaluated it as invalid/transparent. When a button was selected, it applied `color: #FFFFFF` on a transparent/white background, making the text invisible.

### UI fix applied
- Replaced the undefined `var(--slate-700)` with `var(--focus-color)` (a predefined slate/charcoal `#334155` from the clinical neutral palette) across `.clinical-filter-button`, `.clinical-count-badge`, `.clinical-link-action`, and `.clinical-filter-note`.
- Added proper `:disabled` state styling for `.clinical-filter-button` so disabled buttons reduce opacity but remain readable.

### Files changed
- `src/styles/dashboard.css`

### Build result
- `npm run build` passed.

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
