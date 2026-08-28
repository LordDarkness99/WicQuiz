# Data model & persistence contract

All persistence runs through Supabase. Table, bucket, and storage-key names
below are runtime contracts; the schema lives in `supabase/migrations/`.

## Tables (`qt_` prefix)

| Table | Owned by (data layer) | Notes |
|---|---|---|
| `qt_rooms` | live-room | `current_question_index`, `current_quiz_id` drive late-join |
| `qt_quizzes` | live-room | quiz instance attached to a room |
| `qt_questions` | live-room | questions for a running room |
| `qt_players` | live-room / player | realtime `INSERT` watched for joins |
| `qt_answers` | live-room / player | realtime `INSERT` watched for submissions |
| `qt_question_bank` | quiz-authoring | reusable authored questions |
| `qt_quiz_templates` | quiz-authoring | saved quizzes; `times_run`, `last_run_at`, `is_draft` |
| `qt_session_results` | session-results | final leaderboard + per-question stats |

Every table is now reached through a feature repository — no route
component touches `supabase` for data:

- `features/quiz-authoring/data/quizTemplateRepository.ts` — templates + bank
- `features/session-results/data/sessionResultsRepository.ts` — session results
- `features/live-room/data/liveRoomRepository.ts` — rooms, quizzes, questions,
  players, answers (incl. room/quiz/question creation, exported via the
  live-room public API for the authoring + dashboard launch flows)
- `features/player-experience/data/playerRepository.ts` — player join,
  reconnect, answer submission, final score

Route components import `supabase` directly **only** for realtime channel
setup (`DisplayRoute`, `LeaderboardRoute`, `PlayerRoomRoute`).

## Storage buckets

| Bucket | Used by | Helper |
|---|---|---|
| `quiz-images` | image questions | `integrations/supabase/storage.ts#uploadQuizImage` |
| `quiz-audio` | audio questions | `integrations/supabase/storage.ts#uploadQuizAudio` |

## Browser storage

| Key | Where | Notes |
|---|---|---|
| `qt_host_id` | `shared/hostIdentity.ts` | persistent host identity |
| `quiztime_host_id` | `shared/hostIdentity.ts` | **legacy** key, migrated to `qt_host_id` — do not drop the migration |

## Clients

- Browser (anon) client: lazy singleton in
  `integrations/supabase/client.ts` (throws only when first used without
  `NEXT_PUBLIC_SUPABASE_*`).
- Service-role client: `createServiceClient()` for server routes.

## Verification note

The repository extraction is behavior-preserving (each function reproduces
its original query 1:1) and is guarded by `tsc` + `next build` + boundary
checks. The realtime *gameplay* itself still cannot be exercised here
without a live Supabase project + browser, so the remaining follow-up is
decomposing the route components' realtime/effect orchestration (not their
data access, which is now done).
