# Scoring contract

Pure functions in [`features/scoring/domain/scoring.ts`](../../features/scoring/domain/scoring.ts),
covered by `features/scoring/__tests__/scoring.test.ts`.

## Base

- 1000 points per question (`points_base`, configurable per question).
- Wrong answer → 0 points.

## Time decay with a 1-second reading grace

`READING_GRACE_MS = 1000`. The first second after a question appears is
free (players need time to read), so decay is shifted:

```
adjustedRemaining = min(timeRemaining + 1000, timeLimit)
points            = round(pointsBase * adjustedRemaining / timeLimit)
```

Worked example (15s limit): answering with 7.5s left scores
`round(1000 * (7500+1000)/15000) = 567`, **not** 500. Answering within the
first second still scores the full 1000.

> This grace window is intentional. Tests assert `567`; do not "fix" them
> back to `500` — that would silently delete the grace behaviour.

## Modifiers

| Question kind | Rule |
|---|---|
| Joker round | `2×` multiplier applied **after** time decay |
| `slider` | `round(pointsBase * proximity * timeRatio)` where `proximity = max(0, 1 - distance/range)`. Note: slider uses the **raw** `timeRemaining/timeLimit` ratio (no grace). |
| `type_in` | case-insensitive trimmed exact match → time-decay points; otherwise 0 (host may override) |
| `multiple_choice` / `true_false` / `image_question` | case-insensitive trimmed match → time-decay points (+joker) |
