# Round 2 submission checklist

Use this checklist before the final push on 29 November 2026 (IST) and before the 30 November 2026 code freeze.

## 1. Hard build & runtime rules
- [x] Node 20 + Express backend, plain HTML/CSS/JS in `public/`, no frontend bundler or build step.
- [x] Pure JavaScript npm packages only (`express`, `@fontsource/*`, `lenis`). Zero native modules (`better-sqlite3`, `bcrypt`, `sharp`, `node-gyp`).
- [x] `docker-compose.yml` defines one service `app`, builds from `Dockerfile` (`node:20-slim`), maps `"3000:3000"`, passes optional env vars with `${VAR:-}` defaults (compatible with all Docker Compose versions, without `required: false`), sets `restart: unless-stopped`, and mounts a named volume on `/app/data`.
- [x] `vercel.json` pins serverless execution to Mumbai (`"regions": ["bom1"]`) so Indian API requests avoid cross-continent round-trips.
- [x] Fresh clone with no `.env` and no API keys serves the Care Taker app on `http://localhost:3000` and `{"ok":true}` on `GET /healthz`.
- [x] `.env.example` exists and lists every environment variable read in `server/` with safe placeholders.
- [x] Missing optional keys (`SARVAM_API_KEY`, `TWILIO_*`, `PUBLIC_URL`, `LLM_API_KEY`) show `"key not set"` while the core flow still works end to end.
- [x] No secrets committed anywhere in git history.
- [x] Seeded sample data created automatically in `data/db.json` on first start (`data/` git-ignored), with **Reset sample data** button on the Nurse board.
- [x] Own code is well above 300 lines (`npm run check` reports 14,000+ lines across `server/`, `public/js/`, `public/css/`, and `tests/`).

## 2. Safety, clinical boundary & understanding rules
- [x] Nothing is ever logged as `taken` without a spoken `"yes"` or pressed `1` at the read-back stage (verified by deterministic unit tests and a 300-call seeded fuzz test).
- [x] Read-back confirmation chip (`ct-dose-chip`) visibly transitions from `Waiting for your yes` (or `Waiting for key 1`) to `Taken` with a drawn checkmark and soft confirm chime only after confirmation across `#phone`, `#mobile`, `#tour`, and `#home`.
- [x] No medical advice anywhere in UI copy, voice lines, AI adapter prompts, or documentation.
- [x] Every HTML page (`index.html`, `terms.html`, `privacy.html`, `disclaimer.html`, `voice-data.html`) displays `"Sample data. Not medical advice."` and links the legal pages in the footer.
- [x] Consent checkboxes (`calls` in chosen language + `stop calls` / key `9` notice) and recording nurse name required before verification.
- [x] `optOut` voice intent and key `9` stop future calls immediately and notify the care team.
- [x] Family screen only displays data when `shareWithFamily` is enabled on the patient record, shows `todaySummary` at the top (`confirmed` of `due` today with IST timestamp), and explains when sharing is off that a nurse can enable it with the patient's consent.
- [x] Nurse board open flags display waiting duration (`Waiting X min` / `Waiting X h`) and a one-tap `tel:` call button before `Called back`.
- [x] Doctor course completion rows sort by clinical need (stopped early first, then lowest confirmed share) and display the patient's latest spoken quote inline.
- [x] All 9 original acceptance phrases pass in `npm test`:
  - [x] `"వేసుకున్నాను"` (`te`) -> `taken`
  - [x] `"le li"` (`hi`) -> `taken`
  - [x] `"nahi li hai"` (`hi`) -> `notTaken`
  - [x] `"వేసుకోలేదు"` (`te`) -> `notTaken`
  - [x] `"haan le li, lekin chakkar aa raha hai"` (`hi`) -> `unwell`
  - [x] `"tabiyat theek nahi"` (`hi`) -> `unwell`
  - [x] `"20 minutes tarvata call cheyandi"` (`te`) -> `later` (`20` min)
  - [x] `"aadha ghanta"` (`hi`) -> `later` (`30` min)
  - [x] `"I feel fine, I have stopped"` (`en`) -> `stopped`
- [x] Confidence `< 0.5` and 8-second silence evaluate to `unclear` (never `taken`) and log to the Misheard list.

## 3. Design system, performance, accessibility & copy hygiene
- [x] All colors, spacing, radii, shadows, motion durations (`--dur-1`, `--dur-2`, `--dur-3`, `--stagger`), and font sizes come from `public/css/tokens.css` (no raw hex values, pixel font sizes, or inline `style=` outside `tokens.css`).
- [x] Self-hosted Noto Sans and Newsreader copied into `public/fonts` with above-the-fold Latin `.woff2` preloads in `public/index.html` and `unicode-range` descriptors on Indic `@font-face` rules.
- [x] Synchronous `ct-skeleton` loading placeholders (`aria-busy="true"`) and `ct-error-box` retry states on `#nurse`, `#family`, `#doctor`, `#desk`, and `#devices`, with parallelized API fetches.
- [x] Clean `@media print` stylesheet (`public/css/print.css`) and **Print or save this week** buttons on `#family` and `#doctor`.
- [x] Status pills always pair color + icon + text label.
- [x] Works at `360px` mobile width and `1280px` desktop width with zero horizontal overflow, keyboard accessible with visible focus rings, `h1` focus on route changes, and 48px minimum tap targets (`npm run ui-check` passes all 8 browser groups).
- [x] Zero em dash or en dash characters anywhere in code, UI text, voice lines, or docs (`npm run check` passes).
- [x] External statistics in `docs/PITCH_DECK.md` cite verified primary sources (WHO, MoSPI NSS 75th Round, Census of India 2011, Sarvam AI) on a Sources slide with zero `[SOURCE NEEDED]` placeholders remaining.

## 4. Human pre-submission items (Rahul before 30 November deadline)
- [ ] Merge `round2-polish` into `main` after review, tag `round2-submission`, and confirm the GitHub repository is **Public**.
- [ ] Deploy the live HTTPS link (Vercel with `vercel.json` in `bom1` or Render via `render.yaml`), confirm `https://<live-url>/healthz` returns `{"ok":true}`, test microphone access in Chrome over HTTPS, and paste the URL into `[LIVE DEMO LINK PLACEHOLDER]` in `README.md`.
- [ ] Record the demo video following `docs/DEMO_SCRIPT.md` (under 2:50), upload as **Public or Unlisted**, and paste the link into `[VIDEO LINK PLACEHOLDER]` in `README.md`.
- [ ] Export the pitch deck from `docs/PITCH_DECK.md` as a **PDF of 10 MB or less and 30 pages or less**, upload or commit it, and paste the link into `[PITCH DECK LINK PLACEHOLDER]` in `README.md`.
- [ ] Run a fresh `git clone` + `docker compose up --build` on a clean machine with no `.env` file and complete one voice call in Chrome.
