# Care Taker

Voice-first hospital after-care prototype for India (Scaler x Wispr Flow hackathon, Round 2, theme: Healthcare access). The hospital verifies a prescription, the patient gets a call at each dose time in their own language, answers by voice or keypad, and every dose is read back and confirmed before it is logged.

## Commands
- `docker compose up --build`  run the app at http://localhost:3000
- `npm test`                   intent and API tests (must pass before every commit)
- `npm run dev`                local run without Docker
- `npm run check`              lint, tests, line count, banned-character check
- `npm run smoke`              starts the app and checks pages, assets, modules, keys and one dose call (pass or fail)

## Hard rules (a submission fails if any break)
1. `docker compose up` on a fresh clone shows the main screen on port 3000. No default server page.
2. The app starts with no `.env` and no API keys. A feature that needs a key shows "key not set". Never commit real keys. `.env.example` lists every variable with placeholders.
3. No native npm modules (no better-sqlite3, bcrypt, sharp, node-gyp). Pure JS only.
4. Nothing is logged as "taken" without a spoken or pressed yes. Never guess "taken".
5. No medical advice anywhere in UI, voice lines or docs. Health questions go to the nurse.
6. Every screen shows "Sample data. Not medical advice." (in the footer of every page and under the home hero buttons; the top strip was removed on request).
7. Use only design tokens from `public/css/tokens.css`. No hex values, raw pixel font sizes or inline styles anywhere else.
8. No em dash or en dash characters anywhere in code, UI text, voice lines or docs. Use a comma, colon or full stop.
9. Works at 360px wide, keyboard accessible, WCAG AA contrast.
10. All code is written during the hackathon (27 to 30 Nov 2026). No copied starter templates.

## Structure
- `server/`         Express app, `intents.js`, `lang/*.json`, `store.js` (JSON file store), `adapters/` (optional keyed services)
- `public/`         HTML, `css/tokens.css`, `css/base.css`, `css/components.css`, `js/`, `audio/{lang}/`
- `data/db.json`    created and seeded on first start, git-ignored
- `docs/`           DESIGN, DECISIONS, DEMO_SCRIPT, PITCH_DECK, SUBMISSION_CHECKLIST, legal sources
- `tests/`          node:test files

## How to work (always)
1. **Plan first.** Sessions start in plan mode (`.claude/settings.json`). Write the plan, get it approved, then edit. A wrong turn is cheaper to catch in a plan than in code.
2. **Subagents for independent jobs.** Split work that does not depend on each other (for example a language file and a UI fix) across subagents so they run side by side.
3. **Use the project agents** in `.claude/agents/`: `ui-verifier` (browser check at 360, 768, 1024, 1280), `intent-tester` (reply understanding, test first), `language-builder` (add or fix a language), `submission-checker` (ready or not ready). Claude picks them automatically from their descriptions.
4. **Finish on pass or fail.** A task is done only when `npm test`, `npm run check` and `npm run smoke` all pass. If one fails, fix it and run again; do not hand failures back to the user.

## Conventions
- Commit messages: `feat:`, `fix:`, `style:`, `docs:`, `test:`, `chore:`. Small commits, push to main.
- Adding a language: use the `add-language` skill. Adding reply phrases: use the `intent-rules` skill. Any UI work: use the `design-system` skill. Before saying a phase is done: use the `submission-check` skill.
- UI copy: short, plain, second person, sentence case. Voice lines: under 15 words each.
