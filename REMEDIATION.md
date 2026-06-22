5-Phase Codex Remediation Prompt Sequence
Phase 1 — Role Access, Routing, and Patient Details Security
Read PLAN.md, UPDATE.md, REVISION.md, and the strict audit report.

Implement Phase 1 only: fix role access and routing security.

Files to revise:
- src/app/patients/details.tsx
- src/lib/auth/* or equivalent auth utilities
- any role route mapping files used by dashboards

Required fixes:
1. Replace the weak patient details session/profile lookup with requireRole() or a strict multi-role equivalent.
2. Redirect unauthenticated users to login.
3. Redirect wrong-role users to the correct dashboard or deny access safely.
4. Fix the role bug: use preserved role string `midwives`, not `midwife`.
5. Stop building dashboard URLs from raw role strings.
6. Create/use a safe explicit role-to-dashboard map:
   - BHW → /pages/bhw.html
   - nurse → /pages/nurse.html
   - doctor → /pages/doctor.html
   - pharmacist → /pages/pharmacist.html
   - labaratory → /pages/laboratory.html
   - midwives → /pages/midwife.html
   - admin → /pages/admin.html
7. Preserve Vite multi-page setup and Supabase integration.
8. Do not change DB schema.
9. Use strict TypeScript types and robust error handling.

After changes, run npm run build.

Return:
- Files changed
- Access-control fixes made
- Role routing fixes made
- Remaining risks
- Manual test steps
- Build result


Phase 2 — Vaccine Data Integrity, Options, and Safe Mutations
Read PLAN.md, UPDATE.md, REVISION.md, and the strict audit report.

Implement Phase 2 only: fix vaccine architecture and data integrity.

Files to revise:
- src/features/patients/vaccineService.ts
- src/features/midwife/censusEntry.tsx
- src/components/patient/PatientDetailModal.tsx
- create src/features/vaccines/vaccineOptions.ts if missing
- create/update vaccine types if needed

Required fixes:
1. Create a reusable vaccine options source from REVISION.md.
2. Replace all free-text vaccine inputs with the shared vaccine option list plus Others/Specify.
3. Add complete vaccine fields:
   - vaccine_category
   - vaccine_name
   - other_vaccine_name
   - dose_label
   - date_given
   - next_due_date
   - administered_by
   - facility
   - lot_number
   - remarks
4. Stop unsafe index-based vaccine deletion.
5. Use stable vaccine IDs.
6. Add confirmation and/or undo before destructive vaccine removal.
7. Add offline guard for vaccine add/remove.
8. Add loading-disabled states for vaccine actions.
9. Stop silently returning [] on Supabase errors.
10. Do not allow vaccine errors to look like “no records.”
11. Avoid fragile read-modify-write if possible.
12. If normalized vaccine storage or RPC is required, create a safe SQL migration file or SQL instructions using create table if not exists. Do not make destructive DB changes.
13. Do not keep two confusing vaccine storage paths unless clearly documented and bridged safely.
14. Preserve existing FHSIS report compatibility.

After changes, run npm run build.

Return:
- Files changed
- Vaccine options file created/updated
- Vaccine fields supported
- Add/remove safety behavior
- Supabase/database changes or SQL needed
- Remaining risks
- Manual test steps
- Build result


Phase 3 — Patient History, Itemization, and Supabase Query Hardening
Read PLAN.md, UPDATE.md, REVISION.md, and the strict audit report.

Implement Phase 3 only: harden patient history and itemized medical records.

Files to revise:
- src/features/patients/history.ts
- src/features/patients/itemization.ts
- src/components/patient/PatientTransactionHistory.tsx
- src/components/patient/PatientDetailModal.tsx
- any related patient history types

Required fixes:
1. Replace select('*') with explicit column selects.
2. Add strict TypeScript result types for every queried table.
3. Stop silently swallowing Supabase errors in history loading.
4. If some tables fail, show a visible “Partial history loaded” warning with retry.
5. Do not allow missing records to look like “no history.”
6. Itemize ailments/complaints, findings, treatments, tests, prescriptions, vaccines, and follow-ups.
7. Use safe prescription parsing; malformed rx_content must not crash the UI.
8. Add complete loading, empty, error, partial-error, and retry states.
9. Keep history queries efficient and readable.
10. Preserve existing workflows and database schema.
11. Add robust error catching and user-facing feedback.

After changes, run npm run build.

Return:
- Files changed
- Queries hardened
- Itemization improvements
- Partial history behavior
- Error/retry behavior
- Remaining risks
- Manual test steps
- Build result


Phase 4 — Clinical UI/UX, Accessibility, and Component Quality
Read PLAN.md, UPDATE.md, REVISION.md, and the strict audit report.

Implement Phase 4 only: fix UI/UX, accessibility, and clinical polish.

Files to revise:
- src/components/feedback/Toast.tsx
- src/components/patient/PatientDetailModal.tsx
- src/components/patient/PatientTransactionHistory.tsx
- touched form components related to vaccine/history/patient details
- shared UI components if needed

Required fixes:
1. Add aria-live="polite" or equivalent accessible async feedback to Toast.
2. Replace focus:outline-none with visible focus-visible states.
3. Ensure toast remains above modals/backdrops and remains readable.
4. Replace emoji structural medical/workflow icons with a consistent clinical icon system or clean text/icon components.
5. Move vaccination UI out of the PhilHealth grid and into a clean medical-record subsection.
6. Improve hierarchy, spacing, labels, and disabled-field readability.
7. Improve placeholder text and form readability.
8. Remove corrupted/emoji-prefixed button/loading text where it reduces polish.
9. Ensure modal controls are keyboard accessible.
10. Ensure mobile responsiveness is not broken.
11. Keep MEDISENS premium, clinical, readable, and consistent.
12. Do not change workflow logic or DB schema.

After changes, run npm run build.

Return:
- Files changed
- Accessibility fixes
- UI/UX improvements
- Icon/polish changes
- Mobile/responsive notes
- Remaining risks
- Manual test steps
- Build result


Phase 5 — Admin Security, Report Code-Splitting, and Final Production Readiness
Read PLAN.md, UPDATE.md, REVISION.md, and the strict audit report.

Implement Phase 5 only: fix remaining production-grade concerns.

Files to revise:
- src/app/admin/index.tsx
- Supabase/admin user creation utilities
- Supabase Edge Function files if present/needed
- report generator imports/build structure
- any final shared security/types utilities

Required fixes:
1. Replace risky frontend-only admin user creation flow with a safer backend/Edge Function path if the project supports Supabase functions.
2. If Edge Function implementation cannot be fully completed, create a clear secure migration plan and remove unsafe password/session-restoration behavior from the UI where possible.
3. Do not expose service keys or secrets in frontend code.
4. Preserve existing admin role strings and user management UX.
5. Add robust error handling and toasts for admin user creation.
6. Add strict typing to admin user creation payloads/responses.
7. Add RLS/schema audit notes where code cannot enforce safety.
8. Code-split the large reportGenerator chunk using dynamic import where safe.
9. Do not break Midwife/FHSIS report generation.
10. Run a final repo-wide check for:
   - no native alert/confirm/prompt
   - no broad select('*') in patient history
   - no free-text vaccine dropdown replacement regression
   - no missing role guards on patient details
   - no emoji structural icons in medical workflow UI
   - no silent Supabase history failures
11. Do not make destructive DB changes.9

After changes, run:
- npm run build
- npm run preview if available

Return:
- Files changed
- Admin security fixes
- Edge Function or migration plan
- Report code-splitting result
- Final checklist status for every audit issue
- Remaining risks
- Manual test steps
- Build result
- Final readiness rating from 1 to 10


