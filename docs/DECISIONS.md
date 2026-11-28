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
- **Decision:** Install `@fontsource/noto-sans`, `@fontsource/noto-sans-telugu`, `@fontsource/noto-sans-devanagari`, and `@fontsource/noto-sans-tamil` (weights 400, 500, 700) and copy the `.woff2` files into `public/fonts` via `scripts/copy-assets.js` on `postinstall`, `npm start`, and `docker build`.

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

## 11. Navbar as a grid with one, two or three rows
- **Context:** Every label in the top bar must stay on one line (brand, product tabs, role screens, the clock with time and date, the Call button).
- **Decision:** The pill is a CSS grid: one row from 1360px, two rows (role screens below) from 900px, three rows on phones with the role screens as a swipe row. Labels use `white-space: nowrap`; nothing is hidden. Below 900px the bar scrolls away instead of staying pinned, so it does not cover a third of a phone screen. The scroll progress line and the rail fill use CSS scroll timelines instead of inline styles (rule 7); browsers without them show a static line.

## 12. Hero headline on one line
- **Context:** "Don't type, just speak. Don't miss, just answer." must never break inside a sentence.
- **Decision:** Both sentences share one line from 1100px. Below that each sentence keeps its own single line. The serif face (Newsreader) is self-hosted like Noto Sans so the headline looks the same offline.

## 13. Voice to report ribbon rebuilt
- **Context:** The landing page should show a reply turning into a report: words appear, then processing, then the clean report on the right, then the report in Care Taker.
- **Superseded on 28 Nov by the hero call (below).** `public/js/voice-ribbon.js` ran four example calls (Telugu, Hindi, Tamil, English and Hindi). Each word of the spoken reply appears along the left curve, the pill listens then processes, the report writes itself onto the dark band, and a Care Taker report card fills in. Each example follows the real rules (unwell outranks taken, nothing logged without a yes). Under 900px the same steps stack vertically. Under reduced motion the final state is shown with no animation, and a Pause button stops the loop.

## 14. Step 04 scroll animation and smooth scrolling
- **Context:** The numbered rows from step 04 of the earlier portfolio site were missing.
- **Decision:** `public/js/motion.js` adds the same system to every screen: blocks rise 24px over 0.4s, rows in a numbered index rise 18px over 0.35s, 60ms apart, starting when their top reaches 85% of the viewport. Lenis gives smooth wheel scrolling and is copied from `node_modules` into `public/vendor` by `scripts/copy-assets.js` (no CDN, works offline). Reduced motion turns all of it off.

## 15. Health devices
- **Context:** Patients may own blood pressure monitors, glucose meters, smartwatches (Apple Watch, Android watches) and smart rings. Their readings (steps, active and total calories, heart rate, sleep, oxygen, blood pressure, sugar) should sit next to the dose record and give useful feedback.
- **Decision:**
  - Blood pressure monitors, glucose meters and heart rate straps that use the standard Bluetooth health services (0x1810, 0x1808, 0x180D) pair for real in Chrome through Web Bluetooth (`public/js/ble.js`, decoders unit-tested).
  - Watches and rings do not share steps or sleep over standard Bluetooth. They reach a phone's health app (Apple Health or Health Connect), so a real link needs the Care Taker phone app. The prototype offers clearly labelled sample devices instead. Any watch, band or ring that writes to those health apps would work the same way.
  - Readings can also be said or typed ("BP 130 by 85", "sugar 145 after food", Hindi and Telugu words for BP and sugar are understood).
  - The doctor sets alert ranges per patient. A reading outside a range raises a "Reading to review" flag, sorted right after Urgent. One open flag per reading type is kept up to date instead of stacking duplicates.
  - Feedback is factual only (steps against the doctor's goal, averages, sleep, last readings against ranges). A test checks it never contains advice words. Out-of-range lines always say a nurse will look at it.

## 16. Sample data notice moved from the top strip to the footer and hero
- **Context:** The owner asked to remove the top "Sample data. Not medical advice." strip. The brief and CLAUDE.md rule 6 require the notice on every screen.
- **Decision:** The strip is gone. The exact sentence stays visible on every page in the footer, and under the home hero buttons. CLAUDE.md rule 6 now says where it lives. The check script still verifies the sentence on every HTML page.

## 17. Top bar: Features menu, no clock, no scroll line
- **Context:** The five role screens crowded the bar, and the owner asked for them under Features, without the clock or the line under the bar.
- **Decision:** Overview, Features (a menu with the five roles and Health devices, one line each), Tour, Mobile app, Devices, and Call. The menu opens on click and on hover, closes on Escape or an outside click, and returns focus. Under 900px the links fold into a Menu panel. The simulated clock now shows on the role screens, where it matters, above each page title.

## 18. Tagline
- **Context:** "Don't type, just speak. Don't miss, just answer." described voice input in general, not this product.
- **Decision:** "Just answer the call. Every dose, confirmed." The patient's only job is to answer; Care Taker's promise is that every dose is confirmed before it counts. Sub line: "In your language, by voice or keypad, on any phone."

## 19. Logo
- **Decision:** A phone outline with a heart inside, and two voice waves in marigold. Inline SVG so its colours come from the tokens. Used in the top bar, footer, legal pages and favicon.

## 20. Pinned scroll stories instead of a scroll library
- **Context:** The owner wanted sections that stay on screen while their steps advance with the scroll, like their portfolio. The portfolio's own page names GSAP scroll choreography, but its source could not be read from here.
- **Decision:** `public/js/story.js` pins a section with CSS sticky and moves one step per slice of scroll (the same pin-and-scrub idea as GSAP ScrollTrigger), on top of the portfolio's smooth scroll and reveal timings already in `motion.js`. No extra library. Under 900px, or with reduced motion, the steps stack and play as they scroll in. If the owner shares the portfolio source, the exact GSAP timings can be matched.

## 21. Ten Indian languages, detection and switching
- **Context:** Patients should not be limited to four languages; they should pick from a list or just speak.
- **Decision:** Added Kannada, Malayalam, Bengali, Marathi, Gujarati, Punjabi and Odia, each with every call line, reply keywords in native script and romanised form, number words, app wording and tests, all marked not yet reviewed by a native speaker. Detection uses a named language first, then the script, then romanised words; Devanagari is split between Hindi and Marathi by their keywords. English alone never moves a call away from an Indian language. Browser speech recognition needs a language set in advance, so without a Sarvam key "detect from voice" listens for the name of the language; with the key, Sarvam detects it from the audio.
- **Fonts:** Noto Sans Gujarati, Gurmukhi and Oriya were added to `--font-sans` in `tokens.css` so the new scripts render. This is the only change to the given token values.

## 22. The mobile app on a real phone
- **Decision:** Under 560px the mobile app prototype drops its phone bezel and fills the screen, with the tab bar pinned to the bottom, so on a phone it looks like the app itself rather than a phone inside a phone.

## 23. Footer signature: from a spoken reply to a check-in
- **Context:** The owner sketched the closing animation: words flow into the phone, the Care Taker wordmark turns into dots that become the phone's input, the heart becomes Recorded and a tick, the label becomes Check in, the phone moves across Check in, and the logo returns.
- **Decision:** Built as `public/js/signature.js` with CSS. A small timer sets `data-phase` and the CSS does the motion, following the motion rules in the design skill: transform and opacity first (clip-path for the letters the phone covers), strong ease-out for things that appear and ease-in-out for the phone's move, 40ms letter stagger, nothing from scale 0. It only runs while the footer is visible, and reduced motion keeps the static logo. Motion curves were added to `tokens.css` as `--ease-out` and `--ease-in-out`.

## 24. Working method: plan first, subagents, project agents, pass or fail
- **Context:** The owner asked for four habits on every task: plan mode first, subagents for parallel jobs, reusable agents saved in the repo, and a test that returns pass or fail so mistakes are fixed before they reach the owner.
- **Decision:** `.claude/settings.json` starts sessions in plan mode. Four agents live in `.claude/agents/` (ui-verifier, intent-tester, language-builder, submission-checker). `npm run smoke` starts the app and checks every page, asset and browser module, the notice, "key not set", and that a dose is logged only after a yes; it exits 1 on any failure. There is no CI pipeline (removed on request): the three commands are run locally before every push. CLAUDE.md lists the habits under "How to work".

