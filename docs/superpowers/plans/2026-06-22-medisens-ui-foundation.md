# MEDISENS UI Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize MEDISENS shared UI foundations while preserving the current palette, workflows, and architecture.

**Architecture:** Add a dependency-free SVG icon primitive, migrate shared navigation to semantic icon names, and improve existing shared state components without changing their consumers' business behavior. Extend the current dashboard stylesheet with semantic tokens and accessibility rules.

**Tech Stack:** Vite, React 19, TypeScript, Tailwind utility classes, CSS.

---

### Task 1: Semantic Design Tokens

**Files:**
- Modify: `src/styles/dashboard.css`

- [x] Add semantic surface, text, focus, disabled, spacing, radius, and motion tokens based on the existing palette.
- [x] Add global focus-visible, reduced-motion, disabled-control, and selection rules.
- [x] Keep existing palette variables and layout rules compatible.

### Task 2: SVG Icon Primitive

**Files:**
- Create: `src/components/shared/Icon.tsx`

- [x] Define the `IconName` union for navigation and shared status meanings.
- [x] Implement fixed-stroke inline SVG paths without dependencies.
- [x] Support decorative and labelled accessible modes.

### Task 3: Accessible Sidebar

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: navigation definitions under `src/app/**/*.tsx`

- [x] Change navigation icon values from emoji/abbreviations to semantic `IconName` values.
- [x] Render icons with the shared SVG component.
- [x] Add `aria-current`, visible focus, 44px targets, labelled mobile backdrop/close control, and dialog semantics.
- [x] Preserve callbacks, role labels, offline coloring, responsive drawer, and logout behavior.

### Task 4: Shared UI States

**Files:**
- Modify: `src/components/shared/NetworkBadge.tsx`
- Modify: `src/components/shared/LoadingState.tsx`
- Modify: `src/components/shared/EmptyState.tsx`
- Modify: `src/components/shared/StatusBadge.tsx`

- [x] Standardize borders, type, spacing, and semantic tones using the existing palette.
- [x] Add status, live-region, and accessible loading semantics.
- [x] Keep existing component props backward compatible.

### Task 5: Verification

**Files:**
- Verify all changed files.

- [x] Run `npm.cmd run build` and confirm all Vite role entries build.
- [x] Run `git diff --check`.
- [x] Search active navigation definitions for structural emoji icons.
- [x] Inspect desktop/mobile sidebar structure and shared state semantics from the rendered/static output.
- [x] Confirm no business logic, routes, auth, Supabase, schema, or patient-account code changed.
