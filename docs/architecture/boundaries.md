# Architectural boundaries

These rules are enforced by `npm run lint:boundaries`
(`scripts/check-boundaries.mjs`). CI / pre-merge should run it.

## Rules

1. **`shared/**`** must not import `@/features/*` or `@/integrations/*`.
   Shared code is the foundation everything else builds on; it cannot
   depend on the things that depend on it.

2. **`integrations/**`** must not import `@/features/*`. Integrations wrap
   external systems (Supabase) and are consumed by features, not the
   reverse.

3. **`app/**`** may import a feature only through its public API
   (`@/features/<x>`). Importing internals
   (`@/features/<x>/routes/...`, `/components/...`, etc.) is forbidden.
   App routes are thin wrappers that render a feature route.

4. **`features/A/**`** may import another feature `B` only through
   `@/features/B`. Reaching into `B`'s internals is forbidden. A feature
   may import its own internals freely (relative paths or
   `@/features/A/...`).

5. The removed legacy buckets **`@/lib/*`, `@/types/*`, `@/components/*`**
   must never reappear. Domain types live in `@/shared/domain/types` or a
   feature's `domain/`; UI lives in `shared/ui` or a feature's
   `components/`; data access lives in a feature's `data/`.

## Rationale

A feature's `index.ts` is a contract. As long as it is stable, the
feature's internals can be refactored freely without a repo-wide grep.
Conversely, if everything deep-imports everything, there are no seams and
no safe refactors — which is the state this structure replaced.

## Adding a new feature

1. Create `features/<name>/` with an `index.ts`.
2. Put route components in `routes/`, export them from `index.ts`.
3. Add a thin `app/.../page.tsx` that imports the route from
   `@/features/<name>` and renders it.
4. Run `npm run lint:boundaries`.
