# Realtime contract

Host, display, and player clients coordinate through Supabase Realtime.
**These names and payload shapes are a runtime contract across three
clients — do not rename casually.** The canonical definitions live in
[`features/realtime/contracts.ts`](../../features/realtime/contracts.ts)
(`REALTIME_EVENTS` + payload types).

## Channels

| Channel | Purpose | Defined in |
|---|---|---|
| `room:<roomCode>` | Broadcast game events between host/display/players | `useRoomChannel` |
| `players:<roomId>` | Postgres `INSERT` on `qt_players` (joins) | `usePlayersSubscription` |
| `answers:<questionId>` | Postgres `INSERT` on `qt_answers` (submissions) | `useAnswersSubscription` |

## Broadcast events (`room:<roomCode>`)

| Event | Direction | Payload |
|---|---|---|
| `game_state_change` | Host → all | `GameStatePayload { state, current_question_index? }` |
| `question_reveal` | Host → all | `QuestionRevealPayload { question, question_number, total_questions }` |
| `timer_tick` | Host → all | `TimerTickPayload { time_remaining, time_limit }` |
| `answer_revealed` | Host → all | `AnswerRevealPayload { questionId, correctAnswer, playerResults, nextImageUrl? }` |
| `leaderboard_update` | Host → all | `LeaderboardUpdatePayload { leaderboard: LeaderboardEntry[] }` |
| `suspense_mode` | Host → all | enables late-game suspense UI |
| `final_reveal_start` | Host → all | triggers the final winner reveal |

`question_reveal` deliberately omits the correct answer until
`answer_revealed`.

## Postgres-change subscriptions

- New players: `INSERT` on `qt_players` filtered by `room_id`.
- Submitted answers: `INSERT` on `qt_answers` filtered by `question_id`.
  `useAnswersSubscription` also back-fills answers submitted _before_ the
  subscription attaches, so the host never misses an early answer.

## Late-join catch-up

`qt_rooms.current_question_index` and `current_quiz_id` (migration
`004_room_game_state.sql`) let a client that joins mid-game resync to the
current question. Any room-lifecycle change must preserve them.
