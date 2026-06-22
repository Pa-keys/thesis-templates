# MEDISENS UI Foundation Design

## Objective

Bring the existing MEDISENS interface up to consistent healthcare UI/UX standards without changing its established color palette, workflows, routing, Supabase integration, roles, or Vite multi-page architecture.

## Visual Direction

Keep the current blue, teal, emerald, amber, slate, and white palette. Improve quality through hierarchy, spacing, typography, contrast, consistent surfaces, and predictable interaction states rather than introducing a new visual identity.

The interface should remain familiar to RHU staff: a persistent desktop sidebar, mobile drawer, compact top bar, readable clinical forms, clear queues, and restrained motion.

## Shared Foundation

### Tokens

Standardize semantic colors, spacing, radii, shadows, focus rings, typography, surfaces, and disabled states in `src/styles/dashboard.css`. Existing palette values remain recognizable; tokens replace inconsistent one-off styling where shared components are involved.

### Icons

Create a small dependency-free SVG icon component with a fixed outline style. Navigation consumes semantic icon names instead of emoji glyphs. Icons are decorative when adjacent to visible labels and expose accessible labels when used alone.

### Sidebar

Update `Sidebar` to provide:

- Consistent SVG navigation icons.
- A recognizable MEDISENS clinical cross mark using the existing blue/amber status behavior.
- Clear active, hover, focus-visible, and disabled states.
- Minimum 44px navigation targets.
- Accessible mobile backdrop and logout dialog.
- Existing navigation callbacks, role labels, responsive drawer, and logout behavior unchanged.

### Shared States

Update NetworkBadge, LoadingState, EmptyState, and StatusBadge for consistent borders, type scale, semantic color, ARIA behavior, and motion reduction. Existing APIs remain backward-compatible where practical.

## Representative Dashboard Validation

Use the shared-component consumers as the validation surface rather than redesigning every workflow in one pass. Navigation changes automatically propagate to BHW, Nurse, Doctor, Admin, Laboratory, Pharmacist, Midwife, follow-up, and patient details screens. Laboratory shared loading/empty states validate the state system.

## Accessibility

- Visible focus rings on all interactive shared controls.
- At least 44px pointer targets for sidebar and modal actions.
- Dialog semantics and labels for logout confirmation.
- `aria-current="page"` for active navigation.
- Status indicators include text, not color alone.
- Loading state uses `role="status"` and screen-reader text.
- Reduced-motion media query disables nonessential animation.
- Body and control text maintain readable contrast on existing surfaces.

## Responsive Behavior

- Desktop sidebar remains fixed at the current width.
- Mobile drawer stays within 85vw and closes via backdrop, navigation, or close button.
- Shared states fit narrow containers without horizontal overflow.
- Typography and spacing use a consistent 4/8px rhythm.

## Non-Goals

- No palette replacement or theme redesign.
- No business-logic changes.
- No route, role, auth, Supabase, schema, or patient-account changes.
- No broad rewrite of clinical forms or dashboards in this foundation phase.
- No new icon or UI dependency.

## Verification

- Run `npm.cmd run build`.
- Run `git diff --check`.
- Search active navigation definitions for structural emoji usage after migration.
- Inspect sidebar at desktop and mobile widths.
- Inspect focus, active, offline, loading, empty, and logout dialog states.
- Confirm every Vite role page still builds.

## Acceptance Criteria

- Existing palette and workflows are visibly preserved.
- Shared navigation uses one consistent SVG icon family.
- Sidebar controls are keyboard accessible and mobile-safe.
- Shared states have semantic ARIA behavior and consistent visual hierarchy.
- No native alert, confirm, or prompt is introduced.
- All role entry pages build successfully.
