# REV2 Global Emoji Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the remaining global structural/KPI emoji cleanup so only safe comments/content emojis remain in `src/`.

**Architecture:** This is a UI-only cleanup pass. Replace structural and KPI emoji glyphs with the existing shared `Icon` component while preserving labels, color classes, counts, spacing, layout, and behavior. Safe comments/content emojis are intentionally left untouched and documented during verification.

**Tech Stack:** Vite, React, TypeScript, Tailwind CSS, existing `src/components/shared/Icon.tsx`.

**Status:** Complete. Final verification passed with `npm.cmd run build`, `git diff --check`, and full `src/` emoji scan showing only approved safe comments/content emojis.

---

## Scope

Target remaining structural/KPI emoji usage in:

- `src/app/admin/index.tsx`
- `src/app/midwife/index.tsx`
- `src/app/consultation/index.tsx`
- Any other remaining structural/KPI emoji found by the full `src/` scan

Known safe comments/content to preserve unless reclassified:

- `src/hooks/useNetworkSync.ts` comment markers
- `src/app/doctor/index.tsx` realtime comment marker
- `src/app/initial-consultation/index.tsx` glassmorphism comment marker
- `src/app/consultation/index.tsx` realtime comment marker
- `src/features/midwife/useMidwifeData.ts` console error prefixes
- `src/features/midwife/patientRecords.tsx` implementation comment marker
- `src/app/patients/patient-consent.tsx` signature marker
- `src/app/patients/templates.tsx` "Outside Malvar / Type manually" option marker

## Rules

- No business logic changes.
- No auth, routing, Supabase, schema, or workflow changes.
- No dependency changes.
- Use only the existing shared `Icon` component.
- Preserve labels, colors, layout, counts, disabled/loading states, click handlers, data flow, and behavior.
- Do not touch safe comments/content emojis.

---

## Phase 1: Replace Remaining Structural/KPI Emojis

**Goal:** Remove all remaining structural UI and KPI emoji glyphs from active UI code.

**Files:**
- Modify: `src/app/admin/index.tsx`
- Modify: `src/app/midwife/index.tsx`
- Modify: `src/app/consultation/index.tsx`
- Modify if scan finds more structural/KPI glyphs: any additional `src/` file returned by the scan
- Use existing: `src/components/shared/Icon.tsx`

- [ ] **Step 1: Run the full emoji scan**

Run:

```bash
rg -n -P "\p{Extended_Pictographic}|[\x{2600}-\x{27BF}]" src -S
```

Expected structural/KPI targets from the latest scan:

```text
src/app/admin/index.tsx:402    User Management metric card
src/app/admin/index.tsx:409    Active Users metric card
src/app/admin/index.tsx:417    Roles metric card
src/app/midwife/index.tsx:60   Patient blood type metadata
src/app/midwife/index.tsx:61   Patient sex metadata
src/app/midwife/index.tsx:62   Patient age metadata
src/app/midwife/index.tsx:63   Patient address metadata
src/app/midwife/index.tsx:68   Consent signed status badge
src/app/midwife/index.tsx:70   Pending consent status badge
src/app/consultation/index.tsx:1175  Inline info/status icon
src/app/consultation/index.tsx:1250  Results synced status text
src/app/consultation/index.tsx:1278  Mark follow-up done button
src/app/consultation/index.tsx:1281  Follow-up completed status banner
```

- [ ] **Step 2: Replace Admin metric card emojis**

In `src/app/admin/index.tsx`, replace KPI card emoji glyphs with `Icon` while preserving wrapper classes and metric text.

Recommended mappings:

```text
User Management / Total Users -> users
Active Users / enabled count -> check
Roles / access roles -> lock or id-card
```

Only update imports and JSX icon rendering. Do not change user loading, create-user, update-user, delete-user, auth, or role logic.

- [ ] **Step 3: Replace Midwife patient details panel emojis**

In `src/app/midwife/index.tsx`, replace metadata/status glyphs in the patient details panel with `Icon`.

Recommended mappings:

```text
Blood type -> droplet
Sex/person -> user
Age -> calendar
Address -> map-pin
Consent signed -> check
Pending consent -> alert-triangle
```

Preserve patient fields, consent gating, Proceed to Patient Consent behavior, modal behavior, and current styling classes.

- [ ] **Step 4: Replace Consultation follow-up/status emojis**

In `src/app/consultation/index.tsx`, replace the remaining structural glyphs with `Icon`.

Recommended mappings:

```text
Info message -> alert-triangle or file-text, depending on context
Results synced -> check
Mark follow-up as done -> check
Follow-up completed -> check
```

Preserve follow-up save/complete logic, lab-result sync behavior, button disabled states, loading text, and status conditions.

- [ ] **Step 5: Handle any additional structural/KPI scan hits**

For any additional scan result that is not safe comments/content, replace the glyph with an appropriate existing `Icon`.

Use semantic icon names already supported by `src/components/shared/Icon.tsx`, such as:

```text
users, user, user-plus, clipboard, chart, flask, pill, file-text, search,
plus, check, save, printer, edit, trash, alert-triangle, lock, id-card,
stethoscope, clock, map-pin, droplet, calendar, building, baby,
heart-pulse, smile, shield-plus
```

If an icon name is missing, add only a minimal path to the existing shared `Icon` component. Do not add a new library.

- [ ] **Step 6: Confirm diff scope before verification**

Review:

```bash
git diff -- src/app/admin/index.tsx src/app/midwife/index.tsx src/app/consultation/index.tsx src/components/shared/Icon.tsx
```

Expected: only imports, shared icon paths if needed, JSX icon rendering, and layout-preserving class tweaks. No auth, routing, Supabase, schema, workflow, state, query, mutation, or dependency changes.

---

## Phase 2: Verify Global Cleanup

**Goal:** Prove the global cleanup is buildable, whitespace-clean, and complete.

**Files:**
- Review: all files modified in Phase 1
- Review: prior REV2 files only if touched by the current implementation
- Ignore: `dist/` as generated build output

- [ ] **Step 1: Run production build**

Run:

```bash
npm.cmd run build
```

Expected: Vite build completes with exit code 0.

- [ ] **Step 2: Run whitespace diff check**

Run:

```bash
git diff --check
```

Expected: no whitespace errors. LF/CRLF warnings are acceptable if there are no error lines.

- [ ] **Step 3: Scan all `src/` for remaining emojis**

Run:

```bash
rg -n -P "\p{Extended_Pictographic}|[\x{2600}-\x{27BF}]" src -S
```

Expected: only safe comments/content emojis remain.

- [ ] **Step 4: Classify every remaining scan hit**

For each remaining scan hit, record:

```text
file path
line number
safe comments/content reason
```

Any remaining structural UI icon or KPI icon is a verification failure and must be fixed before final status.

- [ ] **Step 5: Confirm no forbidden changes**

Review the final diff:

```bash
git diff -- src
```

Expected: no business logic, auth, routing, Supabase, schema, workflow, or dependency changes.

- [ ] **Step 6: Final summary**

Summarize:

```text
files changed
emojis replaced
intentionally kept emojis
verification command results
remaining risks/TODOs
final go/no-go status
```
