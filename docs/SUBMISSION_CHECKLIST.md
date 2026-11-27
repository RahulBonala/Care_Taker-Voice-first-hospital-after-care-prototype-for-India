# Round 2 submission checklist

Use this checklist before the final push on 28 November 2026 (IST) and during human testing on 29 November 2026.

## 1. Hard build & runtime rules
- [x] Node 20 + Express backend, plain HTML/CSS/JS in `public/`, no frontend bundler or build step.
- [x] Pure JavaScript npm packages only (`express` and `@fontsource/noto-sans*`). Zero native modules (`better-sqlite3`, `bcrypt`, `sharp`, `node-gyp`).
- [x] `docker-compose.yml` defines one service `app`, builds from `Dockerfile` (`node:20-slim`), maps `"3000:3000"`, uses optional `.env` (`required: false`), `restart: unless-stopped`, and a named volume on `/app/data`.
- [x] Fresh clone with no `.env` and no API keys serves the Care Taker app on `http://localhost:3000` and `{"ok":true}` on `GET /healthz`.
- [x] `.env.example` exists and lists every environment variable read in `server/` with safe placeholders.
- [x] Missing optional keys (`SARVAM_API_KEY`, `TWILIO_*`, `PUBLIC_URL`, `LLM_API_KEY`) show `"key not set"` while the core flow still works end to end.
- [x] No secrets committed anywhere in git history.
- [x] Seeded sample data created automatically in `data/db.json` on first start (`data/` git-ignored), with **Reset sample data** button on the Nurse board.
- [x] Own code is well above 300 lines (`npm run check` reports 4,000+ lines across `server/`, `public/js/`, `public/css/`, and `tests/`).

## 2. Safety, clinical boundary & understanding rules
- [x] Nothing is ever logged as `taken` without a spoken `"yes"` or pressed `1` at the read-back stage.
- [x] No medical advice anywhere in UI copy, voice lines, AI adapter prompts, or documentation.
- [x] Every HTML page (`index.html`, `terms.html`, `privacy.html`, `disclaimer.html`, `voice-data.html`) displays the banner `"Sample data. Not medical advice."` and links the legal pages in the footer.
- [x] Consent checkboxes (`calls` in chosen language + `stop calls` / key `9` notice) and recording nurse name required before verification.
- [x] `optOut` voice intent and key `9` stop future calls immediately and notify the care team.
- [x] Family screen only displays data when `shareWithFamily` is enabled on the patient record.
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

## 3. Design system & copy hygiene
- [x] All colors, spacing, radii, shadows, and font sizes come from `public/css/tokens.css` (no raw hex values, pixel font sizes, or inline `style=` outside `tokens.css`).
- [x] Self-hosted Noto Sans (`Latin`, `Telugu`, `Devanagari`, `Tamil`) copied into `public/fonts` for offline rendering.
- [x] Status pills always pair color + icon + text label.
- [x] Works at `360px` mobile width and `1280px` desktop width, keyboard accessible with visible focus rings and 48px minimum tap targets.
- [x] Zero em dash or en dash characters anywhere in code, UI text, voice lines, or docs (`npm run check` passes).
- [x] External statistics in `docs/PITCH_DECK.md` marked `[SOURCE NEEDED: ...]` with zero invented citations.

## 4. Human pre-submission items (29 November testing)
- [ ] Confirm the GitHub repository is set to **Public** and GitHub Actions CI is green on `main`.
- [ ] Deploy the live HTTPS link (for example via `render.yaml` on Render), confirm `https://<live-url>/healthz` returns `{"ok":true}`, test microphone access in Chrome over HTTPS, and paste the URL into `README.md`.
- [ ] Record the demo video following `docs/DEMO_SCRIPT.md`, confirm length is **3 minutes or less**, upload as **Public or Unlisted**, and paste the link into `README.md`.
- [ ] Export the pitch deck from `docs/PITCH_DECK.md` (after filling or removing any `[SOURCE NEEDED]` placeholders) as a **PDF of 10 MB or less and 30 pages or less**, and add the link to `README.md`.
- [ ] Have a friend run a fresh `git clone` + `docker compose up` on a clean machine with no `.env` file and complete one voice call in Chrome.
