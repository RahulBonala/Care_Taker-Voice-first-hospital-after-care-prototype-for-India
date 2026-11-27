# Architectural and product decisions

Choices made during the build where the specification left room for interpretation. Each choice favours keeping `docker compose up` self-contained with zero keys, zero native build tools, and clear clinical boundaries.

## 1. Simulated clock driven by `Next slot`
- **Context:** Real meal slots sit hours apart (`09:00`, `13:30`, `20:30`, `22:00` IST), while judges and nurses testing the prototype need to step through calls, 10-minute ring retries, and 30-minute postpones in seconds.
- **Decision:** Store a single simulated IST clock (`db.clock`) in `data/db.json`, seeded at `08:55` on the current date. Pressing **Next slot** advances `db.clock` to that patient's next pending or postponed slot (when it is in the future) and starts ringing; declining advances `db.clock` by 10 minutes per retry. All five screens poll `/api/clock` every 2 seconds so every role sees the same time.

## 2. Atomic JSON file store instead of SQLite
- **Context:** Native addons such as `better-sqlite3` are disallowed and fail inside slim containers without build toolchains.
- **Decision:** `server/store.js` persists the entire state in `data/db.json` using write-to-temp-and-rename (`db.json.tmp` -> `db.json`), seeded automatically on first boot and mounted as a named Docker volume at `/app/data`.

## 3. Self-hosted Noto Sans copied at install and start
- **Context:** Indic scripts (Telugu, Devanagari, Tamil) render inconsistently across minimal OSes, and offline runs cannot depend on Google Fonts CDNs.
- **Decision:** Install `@fontsource/noto-sans`, `@fontsource/noto-sans-telugu`, `@fontsource/noto-sans-devanagari`, and `@fontsource/noto-sans-tamil` (weights 400, 500, 700) and copy the `.woff2` files into `public/fonts` via `scripts/copy-fonts.js` on `postinstall`, `npm start`, and `docker build`.

## 4. Audio fallback discovery without 404 console noise
- **Context:** Browsers on macOS/Linux often lack built-in `te-IN` or `ta-IN` `speechSynthesis` voices, and pre-recorded human `.mp3` clips are optional until a native speaker records them.
- **Decision:** `/api/config` inspects `public/audio/{lang}/*.mp3` at request time and tells the client which `lineId` clips exist on disk. When neither a browser voice nor `SARVAM_API_KEY` nor an `.mp3` clip is present, `public/js/voice.js` displays the native and English text on the phone screen for its natural reading duration without requesting missing files or logging 404 errors.

## 5. Typed reply and sample chips alongside browser speech recognition
- **Context:** `webkitSpeechRecognition` works in Google Chrome with a working microphone over `localhost` or `HTTPS`, whereas automated tests, non-Chrome browsers, or quiet review rooms may not have mic input.
- **Decision:** Keep Chrome voice input automatic during active call turns (never listening while Care Taker is speaking), and also expose a **Reply without a microphone** card with a text input and per-language sample chips that hit the exact same `/api/calls/:id/reply` state machine.

## 6. Read-back confirmation required for keypad `1` as well as spoken `"yes"`
- **Context:** Hard rule 4 states nothing is logged as `taken` without a spoken or pressed yes.
- **Decision:** Pressing `1` during the initial `ask` or `keypad` stage still triggers the `readback` prompt (`"You took your {slot} tablets at {time}. Is that right? Say yes or press 1."`) and logs the dose only when confirmed at `stage === 'confirm'`.

## 7. Seeded privacy states for Family view
- **Context:** The Family screen must only show records when `"Share with family"` is enabled, and reviewers need to see both the shared report and the locked state immediately.
- **Decision:** Seed `Lakshmi Devi` and `Meena` with `shareWithFamily: true` and `Arjun` with `shareWithFamily: false`, with a live checkbox on the Nurse board (`PATCH /api/patients/:id`) to toggle sharing at any time.

## 8. `optOut` flag classification
- **Context:** Saying `"stop calls"` or pressing `9` must cancel future slots and flag the care team, while the Nurse board sorts four flag categories (`Urgent`, `Stopped early`, `Not reachable`, `Missed`).
- **Decision:** Record `optOut` under `type: 'stoppedEarly'` with `intent: 'optOut'` and `reason: 'Asked to stop the calls'` so it surfaces immediately right below `Urgent` on the Nurse board without inventing a fifth status color token.

## 9. Non-root Docker image with Node `fetch` healthcheck
- **Context:** `node:20-slim` does not ship with `curl` or `wget`.
- **Decision:** Use Node's built-in `fetch` in `Dockerfile` `HEALTHCHECK` against `http://127.0.0.1:3000/healthz`, run the server as the unprivileged `node` user with `/app/data` pre-owned by `node:node`, and handle `SIGINT`/`SIGTERM` in `server/index.js` so `docker compose down` exits immediately.

## 10. Product website, 3-track tour, and dual-persona mobile prototype in plain ES modules
- **Context:** Judges, clinicians, and first-time visitors benefit from a clear landing page, an interactive product tour for both patients and doctors, and a mobile app walkthrough (onboarding, login, setup, and live tabs) without adding a frontend build step or external auth dependencies.
- **Decision:** Add `#home` (`public/js/screens/home.js`), `#tour` (`public/js/screens/tour.js`), and `#mobile` (`public/js/screens/mobile.js`) on the same token-only `ct-` design system while keeping all five role screens (`#desk`, `#nurse`, `#phone`, `#family`, `#doctor`) one click away in the top bar. Mobile sign-in uses clearly labelled sample codes (`4210` for patients, `1204` for clinicians) so zero SMS keys are needed.
