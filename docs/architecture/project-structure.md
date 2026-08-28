# Project structure

QuizTime is organised **domain/feature-first**. Technical role (component,
hook, data access) is a secondary axis _inside_ each feature, never the
top-level grouping.

```
app/                      # Next.js routing + composition ONLY
  layout.tsx
  page.tsx                # landing page
  api/generate-question/  # thin HTTP adapter -> ai-question-generation
  host/**/page.tsx        # thin wrappers: render a feature route
  play/[roomCode]/page.tsx

features/                 # one folder per product domain
  ai-question-generation/
  host-dashboard/
  leaderboard/
  live-room/
  media/
  player-experience/
  quiz-authoring/
  realtime/
  scoring/
  session-results/

integrations/             # external systems, no domain logic
  supabase/               # client, storage, (realtime infra lives in features/realtime)

shared/                   # cross-cutting, depends on nothing in features/
  domain/types.ts         # the shared game model (ubiquitous language)
  ui/                     # presentational primitives (Button, TimerBar, ...)
  hooks/                  # useReducedMotion, ...
  utils/                  # cn, ...
  hostIdentity.ts         # persistent host id (localStorage)

supabase/migrations/      # SQL schema
docs/                     # this folder
scripts/check-boundaries.mjs
```

## Anatomy of a feature

A feature owns everything it needs and exposes a single public API:

```
features/<name>/
  index.ts        # PUBLIC API — the only thing outsiders may import
  routes/         # page-level components (rendered by app/ wrappers)
  components/      # feature-private UI
  hooks/           # feature-private hooks
  application/     # orchestration / use-cases (where present)
  data/            # repositories (Supabase access for this domain)
  domain/          # pure types + logic
  __tests__/
```

Not every feature has every folder — they exist when there is something to
put in them, not for symmetry.

## The one rule

> `app/**` routes and any cross-feature import may only reach a feature
> through its `index.ts` public API. A feature's internals
> (`components/`, `data/`, `domain/`, `routes/`, …) are private to it.

This is enforced by `npm run lint:boundaries`
(`scripts/check-boundaries.mjs`). See
[boundaries.md](./boundaries.md) for the full ruleset.

## Dependency direction

```
app  ──▶  features  ──▶  shared
                │  └────▶ integrations
                └──▶ (other features, via their public API only)
shared and integrations never import features.
```

The shared domain model (`shared/domain/types.ts`) is a dependency-free
kernel so the feature graph stays acyclic — see
[ADR 0001](../adrs/0001-domain-first-structure.md).
