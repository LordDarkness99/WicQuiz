# Wicaksana Quiz (WicQuiz)
 
**Adaptive Inclusive Assessment Platform for Students with Dyslexia**
 
> Theme: *Innovation for a Sustainable Future* — aligned with **SDG 4 (Quality Education)** and **SDG 10 (Reduced Inequalities)**.
 
---
 
## Table of Contents
 
1. [Overview](#1-overview)
2. [Key Features](#2-key-features)
3. [Impact & SDG Alignment](#3-impact--sdg-alignment)
4. [Installation Guide](#4-installation-guide)
5. [Technology Information](#5-technology-information)
6. [Technical Documentation](#6-technical-documentation)
7. [Accessibility Compliance](#7-accessibility-compliance)
8. [Contributing](#8-contributing)
9. [License](#9-license)
---
 
## 1. Overview
 
Digital quiz platforms such as Kahoot! and Quizizz are widely used in schools, but they rely heavily on **reading speed** and **strict time limits**. For students with dyslexia, who may struggle with letter recognition, reversed words, and fast reading, these platforms cause anxiety and end up measuring *reading ability* rather than *actual academic knowledge*.
 
**Wicaksana Quiz** bridges this gap by delivering an inclusive quiz experience built around assistive technology, so every student can demonstrate what they truly know.
 
## 2. Key Features
 
### Dyslexia Mode
 
| Feature | Description |
|---|---|
| **Text-to-Speech (TTS)** | Every question and answer option has a speaker button that reads the content aloud using the browser's **Web Speech API** — no extra app or download required. |
| **Synchronized Highlighting** | While audio plays, the text being spoken is highlighted **word by word**, helping users connect sound with letter shapes and acting as light reading therapy. |
| **Customizable Display** | Users tailor the interface to their needs (see below). |
| **Full Accessibility** | Complete keyboard navigation and voice commands (Speech-to-Text) for selecting answers, supporting users with motor impairments. |
 
### Customizable Display Options
 
1. **OpenDyslexic font** option (designed to reduce letter reversal).
2. Adjustable **letter-spacing** and **line-height**.
3. Eye-friendly background themes: **Cream**, **Pastel**, or **Dark Mode** to reduce glare.
4. Full **keyboard-only** operation and **voice command** answer selection.
## 3. Impact & SDG Alignment
 
- **SDG 4 – Quality Education:** Provides a fair assessment method for students with special needs.
- **SDG 10 – Reduced Inequalities:** Ensures dyslexic students are not left behind academically merely because of literacy barriers.
- By applying **WCAG** principles across the codebase, WicQuiz aims to become a model for inclusive computer-based testing in Indonesia and beyond.
- Accessibility features run on the client side, keeping the platform lightweight and affordable for schools with limited resources, including those in remote areas.
---
 
## 4. Installation Guide
 
### 4.1 Prerequisites
 
| Requirement | Version / Notes |
|---|---|
| [Node.js](https://nodejs.org/) | **v20 or later** (LTS recommended) |
| npm | Bundled with Node.js |
| [Git](https://git-scm.com/) | Any recent version |
| [Supabase](https://supabase.com/) project | Free tier is sufficient (for database/auth) |
| [Supabase CLI](https://supabase.com/docs/guides/cli) | *Optional* — for running migrations locally |
| Anthropic API key | *Optional* — only needed for AI-powered features |
| Modern browser | Chrome, Edge, or Safari recommended for best Web Speech API support |
 
### 4.2 Clone the Repository
 
```bash
git clone https://github.com/LordDarkness99/WicQuiz.git
cd WicQuiz
```
 
### 4.3 Install Dependencies
 
```bash
npm install
```
 
### 4.4 Configure Environment Variables
 
Create a `.env.local` file in the project root:
 
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
 
# Optional: server-side only (never expose to the client)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```
 
> ⚠️ **Note:** Variable names above follow standard Supabase / Anthropic SDK conventions. Please verify them against the code in `integrations/supabase` and `app/` and adjust if the project uses different names.
 
### 4.5 Set Up the Database
 
The repository includes a `supabase/` directory (migrations/configuration). Choose one option:
 
**Option A – Hosted Supabase project**
 
1. Create a project at [supabase.com](https://supabase.com/).
2. Apply the SQL files from `supabase/` (for example via the SQL Editor or `supabase db push`).
3. Copy the project URL and anon key into `.env.local`.
**Option B – Local Supabase**
 
```bash
npx supabase start
npx supabase db reset   # applies migrations
```
 
### 4.6 Run the Development Server
 
```bash
npm run dev
```
 
Open <http://localhost:3000> in your browser.
 
### 4.7 Build for Production
 
```bash
npm run build
npm run start
```
 
### 4.8 Available Scripts
 
| Script | Command | Purpose |
|---|---|---|
| Development | `npm run dev` | Start Next.js dev server |
| Build | `npm run build` | Create optimized production build |
| Start | `npm run start` | Serve the production build |
| Lint | `npm run lint` | Run ESLint |
| Boundary check | `npm run lint:boundaries` | Verify architectural module boundaries (`scripts/check-boundaries.mjs`) |
| Test | `npm run test` | Run Vitest test suite once |
| Test (watch) | `npm run test:watch` | Run Vitest in watch mode |
| Test (UI) | `npm run test:ui` | Open the Vitest UI |
 
### 4.9 Troubleshooting
 
| Problem | Solution |
|---|---|
| Text-to-Speech is silent | Ensure your OS has a voice installed for the selected language and that the browser supports `speechSynthesis`. |
| Voice commands don't work | Speech recognition requires a supported browser (Chrome/Edge) and microphone permission; on most browsers it needs HTTPS or `localhost`. |
| Supabase connection errors | Re-check `NEXT_PUBLIC_SUPABASE_URL` and the anon key; restart the dev server after editing `.env.local`. |
| `Module not found` errors | Delete `node_modules` and `package-lock.json`, then run `npm install` again. |
 
---
 
## 5. Technology Information
 
### 5.1 Tech Stack
 
| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) |
| **UI Library** | [React 19](https://react.dev/) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) via `@tailwindcss/postcss` |
| **Animation** | [Framer Motion](https://www.framer.com/motion/) |
| **Drag & Drop** | [dnd-kit](https://dndkit.com/) (`core`, `sortable`, `utilities`) |
| **Backend / Database / Auth** | [Supabase](https://supabase.com/) (`@supabase/supabase-js`, `@supabase/ssr`) |
| **AI Integration** | [Anthropic SDK](https://docs.anthropic.com/) (`@anthropic-ai/sdk`) |
| **QR Codes** | `qrcode.react` (join sessions by scanning) |
| **Notifications** | [Sonner](https://sonner.emilkowal.ski/) (toast messages) |
| **Testing** | [Vitest](https://vitest.dev/) + jsdom + V8 coverage |
| **Linting** | ESLint 9 + `eslint-config-next` |
| **CI/CD** | GitHub Actions (`.github/workflows`) |
 
### 5.2 Browser APIs Used for Accessibility
 
| API | Purpose |
|---|---|
| **Web Speech API – `SpeechSynthesis`** | Text-to-Speech reading of questions and options; `boundary` events drive word-by-word highlighting. |
| **Web Speech API – `SpeechRecognition`** | Speech-to-Text voice commands for choosing answers. |
| **CSS Custom Properties** | Runtime theming (font, spacing, colors) without page reloads. |
| **Keyboard / Focus APIs** | Full mouse-free navigation with visible focus indicators. |
 
### 5.3 Why This Stack?
 
- **Client-side accessibility features** — TTS, highlighting, theming, and keyboard/voice control run in the browser, so they are free, lightweight, and don't depend on fast internet or paid speech services.
- **Zero-cost deployment path** — Next.js can be self-hosted or deployed on free tiers, and Supabase offers a generous free plan, keeping the platform affordable for remote schools.
- **Type safety & testability** — TypeScript and Vitest help keep the accessibility logic reliable.
---
 
## 6. Technical Documentation
 
### 6.1 Repository Structure
 
```
WicQuiz/
├── .github/workflows/     # CI pipelines (GitHub Actions)
├── app/                   # Next.js App Router: routes, layouts, pages
├── features/              # Feature modules (e.g., quiz, accessibility)
├── shared/                # Reusable components, hooks, utilities, types
├── integrations/supabase/ # Supabase client setup & data-access helpers
├── supabase/              # Database migrations / Supabase configuration
├── public/                # Static assets (fonts, images, icons)
├── scripts/               # Tooling scripts (e.g., check-boundaries.mjs)
├── docs/                  # Additional project documentation
├── AGENTS.md / CLAUDE.md  # AI-assistant/contributor guidelines
├── next.config.ts         # Next.js configuration
├── tsconfig.json          # TypeScript configuration
├── postcss.config.mjs     # PostCSS / Tailwind configuration
├── eslint.config.mjs      # ESLint configuration
├── vitest.config.ts       # Test configuration
└── package.json
```
 
> 📌 The directory descriptions above are inferred from folder names. Please refine them as the codebase evolves.
 
### 6.2 Architecture
 
WicQuiz follows a **feature-based modular architecture**:
 
```
┌───────────────────────────────────────────────────────┐
│                      Browser (Client)                 │
│                                                       │
│  ┌─────────────┐   ┌────────────────────────────────┐ │
│  │  Next.js UI │──▶│ Accessibility Layer            │ │
│  │  (React 19) │   │  • TTS + word highlighting     │ │
│  │             │   │  • Speech-to-Text commands     │ │
│  │             │   │  • Display preferences (CSS)   │ │
│  │             │   │  • Keyboard navigation         │ │
│  └──────┬──────┘   └────────────────────────────────┘ │
└─────────┼─────────────────────────────────────────────┘
          │ HTTPS
┌─────────▼───────────┐        ┌──────────────────────┐
│  Next.js Server     │───────▶│  Supabase            │
│  (Route Handlers /  │        │  (Postgres, Auth,    │
│   Server Actions)   │        │   Realtime)          │
└─────────┬───────────┘        └──────────────────────┘
          │ (optional)
┌─────────▼───────────┐
│  Anthropic API      │
│  (AI features)      │
└─────────────────────┘
```
 
**Module boundaries** are enforced by `npm run lint:boundaries`, which runs `scripts/check-boundaries.mjs` to prevent improper cross-module imports (e.g., features importing from each other's internals). Run it before opening a pull request.
 
### 6.3 Dyslexia Mode – Implementation Notes
 
#### Text-to-Speech with Synchronized Highlighting
 
```ts
// Simplified illustration of the approach
function speakWithHighlight(
  text: string,
  onWord: (charIndex: number, charLength: number) => void,
  onEnd: () => void,
  lang = "en-US"
) {
  if (!("speechSynthesis" in window)) return;
 
  window.speechSynthesis.cancel(); // stop any ongoing speech
 
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
 
  utterance.onboundary = (event) => {
    if (event.name === "word") {
      onWord(event.charIndex, event.charLength ?? 0);
    }
  };
  utterance.onend = onEnd;
 
  window.speechSynthesis.speak(utterance);
}
```
 
- The `boundary` event reports the character index of each spoken word; the UI splits the text into word spans and toggles a highlight class on the active one.
- Some voices/browsers do not emit `boundary` events reliably — the UI should degrade gracefully (audio still plays, highlighting is skipped).
#### Voice Commands (Speech-to-Text)
 
```ts
const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
 
const recognition = new SpeechRecognition();
recognition.lang = "en-US";
recognition.onresult = (e: any) => {
  const transcript = e.results[0][0].transcript.toLowerCase();
  // Map phrases such as "option A", "answer B", "next" to quiz actions
};
recognition.start();
```
 
#### Display Preferences
 
Preferences are applied through CSS custom properties on the root element so they take effect instantly across the whole app:
 
```css
:root {
  --font-family: system-ui, sans-serif;
  --letter-spacing: 0em;
  --line-height: 1.5;
  --bg: #ffffff;
  --fg: #111111;
}
 
[data-theme="cream"]  { --bg: #faf3e0; --fg: #2b2b2b; }
[data-theme="pastel"] { --bg: #e8f0fe; --fg: #2b2b2b; }
[data-theme="dark"]   { --bg: #1e1e1e; --fg: #eaeaea; }
 
[data-font="opendyslexic"] { --font-family: "OpenDyslexic", sans-serif; }
 
body {
  font-family: var(--font-family);
  letter-spacing: var(--letter-spacing);
  line-height: var(--line-height);
  background: var(--bg);
  color: var(--fg);
}
```
 
| Setting | Options | Applied Via |
|---|---|---|
| Font | Default / OpenDyslexic | `data-font` attribute |
| Letter spacing | Adjustable slider | `--letter-spacing` |
| Line spacing | Adjustable slider | `--line-height` |
| Theme | Cream / Pastel / Dark | `data-theme` attribute |
 
User preferences should be persisted (e.g., `localStorage` or the user profile in Supabase) so they carry over between sessions.
 
#### Keyboard Navigation
 
| Key | Action |
|---|---|
| `Tab` / `Shift + Tab` | Move between interactive elements |
| `Enter` / `Space` | Activate focused button / select answer |
| `1`–`4` *(or `A`–`D`)* | Quick-select answer option *(if enabled)* |
| `Esc` | Stop speech / close dialogs |
 
> Shortcut keys are illustrative — align them with the actual implementation.
 
### 6.4 Data Layer (Supabase)
 
- **Client setup:** `integrations/supabase/` contains browser and server client helpers built on `@supabase/ssr` for cookie-based session handling in Next.js.
- **Schema & migrations:** managed in `supabase/`.
- **Security:** enable **Row Level Security (RLS)** on every table and never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.
### 6.5 Testing
 
```bash
npm run test           # single run (CI-friendly)
npm run test:watch     # watch mode during development
npm run test:ui        # interactive UI
npx vitest run --coverage   # coverage report (V8)
```
 
Tests use **Vitest** with the **jsdom** environment. Since the Web Speech API is not available in jsdom, mock `window.speechSynthesis` and `SpeechSynthesisUtterance` in tests.
 
### 6.6 Continuous Integration
 
GitHub Actions workflows in `.github/workflows/` should run, at minimum: install → lint → boundary check → tests → build.
 
### 6.7 Deployment
 
| Option | Notes |
|---|---|
| **Vercel** | Easiest for Next.js; set environment variables in project settings. |
| **Self-hosted (Node)** | `npm run build && npm run start` behind a reverse proxy (Nginx/Caddy). |
| **Docker** | Wrap the Node build in a container for school servers. |
 
Always serve over **HTTPS** in production — required for microphone access (speech recognition) in most browsers.
 
### 6.8 Browser Compatibility
 
| Feature | Chrome | Edge | Safari | Firefox |
|---|:---:|:---:|:---:|:---:|
| Text-to-Speech | ✅ | ✅ | ✅ | ✅ |
| Word highlighting (`boundary`) | ✅ | ✅ | ⚠️ Partial | ⚠️ Partial |
| Speech recognition | ✅ | ✅ | ⚠️ Partial | ❌ |
| Keyboard navigation | ✅ | ✅ | ✅ | ✅ |
 
*Support varies by version, OS, and installed voices — test on target devices.*
 
---
 
## 7. Accessibility Compliance
 
WicQuiz is designed around **WCAG 2.2** principles (POUR):
 
- **Perceivable** — adjustable typography, color themes with sufficient contrast, audio alternatives for text.
- **Operable** — full keyboard access, visible focus states, no strict time pressure, voice input.
- **Understandable** — clear, consistent layouts and plain-language instructions.
- **Robust** — semantic HTML and ARIA attributes for screen-reader compatibility.
---
 
## 8. Contributing
 
1. Fork the repository and create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes, following the guidelines in `AGENTS.md`.
3. Run `npm run lint && npm run lint:boundaries && npm run test`.
4. Commit and push, then open a Pull Request describing your change.
