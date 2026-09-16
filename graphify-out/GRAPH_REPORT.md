# Graph Report - .  (2026-09-16)

## Corpus Check
- 154 files · ~73,798 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 569 nodes · 1011 edges · 41 communities (34 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.84)
- Token cost: 1,500 input · 850 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Landing & Authentication Flow|Landing & Authentication Flow]]
- [[_COMMUNITY_Player Waiting & Realtime Sync|Player Waiting & Realtime Sync]]
- [[_COMMUNITY_Project Dependencies & Libraries|Project Dependencies & Libraries]]
- [[_COMMUNITY_AI Question Generator UI|AI Question Generator UI]]
- [[_COMMUNITY_Answer Input & Feedback UI|Answer Input & Feedback UI]]
- [[_COMMUNITY_Session Stats & User Profiles|Session Stats & User Profiles]]
- [[_COMMUNITY_Media Uploads & Audio Player|Media Uploads & Audio Player]]
- [[_COMMUNITY_Live Room Database Access|Live Room Database Access]]
- [[_COMMUNITY_Layout & Accessibility Theming|Layout & Accessibility Theming]]
- [[_COMMUNITY_TypeScript Configuration|TypeScript Configuration]]
- [[_COMMUNITY_Scoring Engine & Modifiers|Scoring Engine & Modifiers]]
- [[_COMMUNITY_Realtime Channels & Hooks|Realtime Channels & Hooks]]
- [[_COMMUNITY_End Game Podium & Confetti|End Game Podium & Confetti]]
- [[_COMMUNITY_Room & Quiz Initialization|Room & Quiz Initialization]]
- [[_COMMUNITY_Quiz Template Management|Quiz Template Management]]
- [[_COMMUNITY_Host Display & Question Presentation|Host Display & Question Presentation]]
- [[_COMMUNITY_Leaderboard Ranking & Suspense|Leaderboard Ranking & Suspense]]
- [[_COMMUNITY_Leaderboard Domain & Route|Leaderboard Domain & Route]]
- [[_COMMUNITY_Host History & User Session|Host History & User Session]]
- [[_COMMUNITY_Question Bank & Quiz Editing|Question Bank & Quiz Editing]]
- [[_COMMUNITY_UI Skeletons & Loading States|UI Skeletons & Loading States]]
- [[_COMMUNITY_AI Question Generation Backend|AI Question Generation Backend]]
- [[_COMMUNITY_Host Dashboard & Identity|Host Dashboard & Identity]]
- [[_COMMUNITY_Question Display Animation|Question Display Animation]]
- [[_COMMUNITY_Auth Middleware & Session Protection|Auth Middleware & Session Protection]]
- [[_COMMUNITY_Architectural Boundary Linter|Architectural Boundary Linter]]
- [[_COMMUNITY_Stitch UI Screen Mockups|Stitch UI Screen Mockups]]
- [[_COMMUNITY_Architecture Governance & CI|Architecture Governance & CI]]
- [[_COMMUNITY_Database Schema & Security Policies|Database Schema & Security Policies]]
- [[_COMMUNITY_Database Diagnosis Tool|Database Diagnosis Tool]]
- [[_COMMUNITY_Secondary DB Diagnostics|Secondary DB Diagnostics]]
- [[_COMMUNITY_Feature Architecture Patterns|Feature Architecture Patterns]]
- [[_COMMUNITY_ESLint Configuration|ESLint Configuration]]
- [[_COMMUNITY_Next.js Build Configuration|Next.js Build Configuration]]
- [[_COMMUNITY_PostCSS Style Configuration|PostCSS Style Configuration]]
- [[_COMMUNITY_Accessibility Settings Hook|Accessibility Settings Hook]]
- [[_COMMUNITY_NgodingPakeAI Sync Specification|NgodingPakeAI Sync Specification]]
- [[_COMMUNITY_AI Agent Rules & Protocol|AI Agent Rules & Protocol]]

## God Nodes (most connected - your core abstractions)
1. `LeaderboardEntry` - 24 edges
2. `Question` - 16 edges
3. `compilerOptions` - 16 edges
4. `useReducedMotion()` - 15 edges
5. `supabase` - 14 edges
6. `QuestionFormData` - 12 edges
7. `QuestionType` - 11 edges
8. `parseQuestionsCsv()` - 10 edges
9. `scripts` - 9 edges
10. `Player` - 9 edges

## Surprising Connections (you probably didn't know these)
- `FinalRevealProps` --references--> `LeaderboardEntry`  [EXTRACTED]
  features/leaderboard/components/FinalReveal.tsx → shared/domain/types.ts
- `HorseRaceProps` --references--> `LeaderboardEntry`  [EXTRACTED]
  features/leaderboard/components/HorseRace.tsx → shared/domain/types.ts
- `EndGame()` --calls--> `useReducedMotion()`  [EXTRACTED]
  features/live-room/components/EndGame.tsx → shared/hooks/useReducedMotion.ts
- `QuestionDisplayProps` --references--> `Question`  [EXTRACTED]
  features/live-room/components/QuestionDisplay.tsx → shared/domain/types.ts
- `AnswerButtonsProps` --references--> `Question`  [EXTRACTED]
  features/player-experience/components/AnswerButtons.tsx → shared/domain/types.ts

## Import Cycles
- 1-file cycle: `features/quiz-authoring/domain/types.ts -> features/quiz-authoring/domain/types.ts`

## Hyperedges (group relationships)
- **Live Quiz Gameplay & Realtime Event Loop** — contracts_realtime_events_room_channel, contracts_realtime_events_postgres_changes, contracts_scoring_scoring_contract, stitch_refs_screen3_question_screen, stitch_refs_screen4_answer_reveal, stitch_refs_screen5_leaderboard_podium [INFERRED 0.85]
- **Architecture Governance & Enforcement** — adrs_0001_domain_first_structure_adr_0001, architecture_boundaries_architectural_boundaries, architecture_boundaries_lint_boundaries, workflows_ci_ci_pipeline [EXTRACTED 0.95]

## Communities (41 total, 7 thin omitted)

### Community 0 - "Landing & Authentication Flow"
Cohesion: 0.07
Nodes (39): FEATURES, STEPS, AuthCard(), AuthCardProps, ForgotPasswordForm(), LoginForm(), LoginFormProps, RegisterForm() (+31 more)

### Community 1 - "Player Waiting & Realtime Sync"
Cohesion: 0.06
Nodes (38): waitingMessages, WaitingScreenProps, Late-Join Catch-up Synchronization, Postgres Realtime Subscriptions (players, answers), Realtime Broadcast & Subscription Contract, Room Broadcast Channel (room:<roomCode>), fetchPlayerAnswer(), fetchPlayerInRoom() (+30 more)

### Community 2 - "Project Dependencies & Libraries"
Cohesion: 0.05
Nodes (40): dependencies, @anthropic-ai/sdk, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, framer-motion, next, qrcode.react (+32 more)

### Community 3 - "AI Question Generator UI"
Cohesion: 0.08
Nodes (25): GET(), AIGenerateButtonProps, GeneratedQuestion, AnswerCount, AnswerDistributionProps, optionLabels, CSVImportButtonProps, questionTypeIcons (+17 more)

### Community 4 - "Answer Input & Feedback UI"
Cohesion: 0.08
Nodes (23): AnswerButtons(), AnswerButtonsProps, buttonStyles, shakeAnimation, AnswerReveal(), AnswerRevealProps, FinalReveal(), FinalRevealProps (+15 more)

### Community 5 - "Session Stats & User Profiles"
Cohesion: 0.12
Nodes (12): buildQuestionStat(), computeAvgTimeMap(), computeCorrectCountMap(), getProfile(), Profile, ProfileUpdateInput, updateProfile(), getSessionResult() (+4 more)

### Community 6 - "Media Uploads & Audio Player"
Cohesion: 0.12
Nodes (15): AudioPlayer(), AudioPlayerProps, formatTime(), AudioUploadProps, ImageUploadProps, answerColors, answerLabels, QuestionEditor() (+7 more)

### Community 7 - "Live Room Database Access"
Cohesion: 0.17
Nodes (18): deleteAnswersForQuestions(), deleteRoomPlayers(), fetchAnswerCorrectness(), fetchAnswerScore(), fetchCorrectAnswerTimes(), fetchQuestionAnswerStats(), fetchQuestionIdsByQuiz(), fetchQuestionsByQuiz() (+10 more)

### Community 8 - "Layout & Accessibility Theming"
Cohesion: 0.13
Nodes (16): atkinsonHyperlegible, metadata, plusJakarta, AccessibilityContext, AccessibilityContextValue, AccessibilitySettings, BgTheme, DEFAULT_SETTINGS (+8 more)

### Community 9 - "TypeScript Configuration"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 10 - "Scoring Engine & Modifiers"
Cohesion: 0.22
Nodes (11): AnswerScoreUpdate, scoreAnswers(), ScoredAnswers, Joker Round 2x Multiplier, 1-Second Reading Grace Mechanism, Scoring Contract Specification, applyJokerMultiplier(), calculateSliderPoints() (+3 more)

### Community 11 - "Realtime Channels & Hooks"
Cohesion: 0.18
Nodes (12): countQuizQuestions(), fetchAnswerValues(), fetchQuestionById(), useAnswersSubscription(), usePlayersSubscription(), useRoomChannel(), useTimer(), AnswerDistribution (+4 more)

### Community 12 - "End Game Podium & Confetti"
Cohesion: 0.15
Nodes (11): Confetti(), EndGame(), podiumAccents, podiumBadges, podiumHeights, podiumOrder, useLoopingConfetti(), COLORS (+3 more)

### Community 13 - "Room & Quiz Initialization"
Cohesion: 0.17
Nodes (4): createQuiz(), createRoom(), insertRoomQuestions(), generateRoomCode()

### Community 14 - "Quiz Template Management"
Cohesion: 0.24
Nodes (10): ActiveRoomInfo, createDraftTemplate(), deleteQuizTemplate(), duplicateQuizTemplate(), getActiveRoomsForHost(), getAuthUserId(), getQuizTemplates(), incrementQuestionBankUsage() (+2 more)

### Community 15 - "Host Display & Question Presentation"
Cohesion: 0.27
Nodes (7): AnswerDistItem, DisplayViewProps, Answer, GameState, Question, Room, RoomStatus

### Community 16 - "Leaderboard Ranking & Suspense"
Cohesion: 0.22
Nodes (6): EndGameProps, medals, RankedListProps, rowVariants, SuspenseModalProps, LeaderboardEntry

### Community 17 - "Leaderboard Domain & Route"
Cohesion: 0.25
Nodes (7): fetchRoomByCode(), fetchRoomPlayersByScore(), fetchRoomStatus(), rankLeaderboard(), Player, LeaderboardPage(), ViewMode

### Community 18 - "Host History & User Session"
Cohesion: 0.20
Nodes (3): getCurrentUser(), QuizTemplate, Tab

### Community 19 - "Question Bank & Quiz Editing"
Cohesion: 0.22
Nodes (7): deleteBankQuestions(), insertBankQuestions(), markTemplateAsRun(), QuestionBankItem, updateTemplateQuestions(), createEmptyQuestion(), EditQuizPage()

### Community 20 - "UI Skeletons & Loading States"
Cohesion: 0.24
Nodes (6): LeaderboardSkeleton(), QuizCardSkeleton(), Skeleton(), SkeletonProps, StatCardSkeleton(), cn()

### Community 21 - "AI Question Generation Backend"
Cohesion: 0.28
Nodes (6): POST(), AiQuestionType, client, generateQuestion(), GenerateQuestionOutcome, VALID_QUESTION_TYPES

### Community 22 - "Host Dashboard & Identity"
Cohesion: 0.33
Nodes (4): clearHostId(), getHostId(), hasHostId(), setHostId()

### Community 23 - "Question Display Animation"
Cohesion: 0.29
Nodes (5): optionColors, optionLabels, QuestionDisplayProps, AnimatedContainer(), AnimatedContainerProps

### Community 24 - "Auth Middleware & Session Protection"
Cohesion: 0.36
Nodes (6): AUTH_PAGES, config, middleware(), PROTECTED_PREFIXES, sanitizeReturnTo(), updateSession()

### Community 25 - "Architectural Boundary Linter"
Cohesion: 0.25
Nodes (4): files, ROOT, SCAN_DIRS, violations

### Community 26 - "Stitch UI Screen Mockups"
Cohesion: 0.33
Nodes (6): Stitch UI Mockup: Host Quiz Builder, Stitch UI Mockup: Room Lobby & QR Display, Stitch UI Mockup: Question Active Screen, Stitch UI Mockup: Answer Reveal & Stats, Stitch UI Mockup: Mid-game Leaderboard, Stitch UI Mockup: Final Winner Podium

### Community 27 - "Architecture Governance & CI"
Cohesion: 0.40
Nodes (5): ADR 0001: Domain-First Structure with Shared Kernel, Shared Domain Kernel Pattern, Architectural Boundaries & Seams, Boundary Enforcement (lint:boundaries), GitHub Actions CI Pipeline

### Community 28 - "Database Schema & Security Policies"
Cohesion: 0.40
Nodes (5): Persistence & Repository Contract, Supabase qt_* Schema Tables, Supabase Storage Buckets (quiz-images, quiz-audio), Database Row Level Security Policies, Database & Production Guide (WicQuiz)

### Community 30 - "Database Diagnosis Tool"
Cohesion: 0.50
Nodes (4): anonClient, run(), serviceClient, test()

### Community 31 - "Secondary DB Diagnostics"
Cohesion: 0.50
Nodes (4): anon, run(), svc, test()

## Knowledge Gaps
- **164 isolated node(s):** `plusJakarta`, `atkinsonHyperlegible`, `metadata`, `STEPS`, `FEATURES` (+159 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LeaderboardEntry` connect `Leaderboard Ranking & Suspense` to `Player Waiting & Realtime Sync`, `Answer Input & Feedback UI`, `Session Stats & User Profiles`, `Live Room Database Access`, `Realtime Channels & Hooks`, `End Game Podium & Confetti`, `Host Display & Question Presentation`, `Leaderboard Domain & Route`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `supabase` connect `Player Waiting & Realtime Sync` to `Landing & Authentication Flow`, `Session Stats & User Profiles`, `Media Uploads & Audio Player`, `Live Room Database Access`, `Realtime Channels & Hooks`, `Quiz Template Management`, `Leaderboard Domain & Route`, `Question Bank & Quiz Editing`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `Question` connect `Host Display & Question Presentation` to `Player Waiting & Realtime Sync`, `Answer Input & Feedback UI`, `Live Room Database Access`, `Scoring Engine & Modifiers`, `Realtime Channels & Hooks`, `Question Display Animation`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `plusJakarta`, `atkinsonHyperlegible`, `metadata` to the rest of the system?**
  _164 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Landing & Authentication Flow` be split into smaller, more focused modules?**
  _Cohesion score 0.0701484895033282 - nodes in this community are weakly interconnected._
- **Should `Player Waiting & Realtime Sync` be split into smaller, more focused modules?**
  _Cohesion score 0.05568627450980392 - nodes in this community are weakly interconnected._
- **Should `Project Dependencies & Libraries` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._