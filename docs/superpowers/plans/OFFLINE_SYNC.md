# Prompt 2 — Offline/Online Sync Plan Only

```txt
Inspect the current MEDISENS `src/` Supabase write flows, network handling, and role workflows.

Create a strict offline-online sync plan only. Do not implement yet.

Goal:
Support mobile users with unstable internet by caching user inputs/transactions locally when offline, then syncing to Supabase when online with duplicate validation and conflict prevention.

Use orange/amber indicators when offline and blue indicators when online.

Preserve all existing workflows, role access, Supabase integration, and Vite multi-page setup.

Return:
1. Current online/offline handling
2. Write actions that need offline support
3. Local cache/queue strategy
4. Sync strategy
5. Duplicate/conflict validation plan
6. UI status states
7. Risks
8. Acceptance criteria
9. Test steps
```
