# ADR 0001 — Domain-first structure with a shared domain kernel

Status: accepted · Date: 2026-05-25

## Context

The app had grown into technical-bucket layout (`app/`, `components/`,
`lib/`, `types/`) where two route files (`host/[roomCode]` ~1450 lines,
`play/[roomCode]` ~1050 lines) owned data access, realtime, scoring
orchestration, and UI; `lib/` and `types/quiz.ts` were catch-all drawers.
A structure audit recommended reorganising by product domain.

## Decision

Reorganise into `features/<domain>/` (each with an `index.ts` public API),
`integrations/` for external systems, and `shared/` for cross-cutting code.
`app/**` becomes routing/composition only — thin wrappers that render a
feature route. Enforce the seams with `scripts/check-boundaries.mjs`.

### Deviation from the audit: a shared domain kernel

The audit proposed putting the core game entities (`Room`, `Question`,
`Player`, `LeaderboardEntry`, …) inside `features/live-room/domain`. Doing
so would create **circular feature dependencies**: `live-room ↔ realtime`
(realtime payloads reference `Question`) and `live-room ↔ leaderboard`
(`suspense` operates on `LeaderboardEntry`). The audit itself flagged
circular-import risk.

Instead, the entities/enums/`LeaderboardEntry` that all five features speak
are a **shared, dependency-free kernel** at `shared/domain/types.ts`. This
keeps the feature graph acyclic. `suspense` (leaderboard-position logic)
was placed in `features/leaderboard/domain` rather than `live-room`, for
the same reason. Realtime payloads and authoring form DTOs remain
feature-owned.

## Consequences

- Pros: clear ownership, a contract per feature, acyclic dependencies,
  enforceable boundaries, `tsc` + `next build` + tests all green.
- Cost: more folders; some genuinely cross-cutting logic (timer UI,
  leaderboard suspense) required deliberate placement.
- Deferred: the two large route components were _relocated_ into their
  features (so `app/` is thin) but their internal realtime/effect/scoring
  orchestration was **not** decomposed into hooks/application/repositories,
  because that gameplay can't be runtime-verified without a live Supabase
  project + browser. That decomposition is the highest-value remaining
  follow-up.
