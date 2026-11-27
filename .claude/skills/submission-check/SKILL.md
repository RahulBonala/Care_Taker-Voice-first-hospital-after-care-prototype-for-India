---
name: submission-check
description: Use before declaring any phase done and before the final submission. Runs every Round 2 rule against the repo.
---
Run each check and report pass or fail with evidence. Fix every fail, then rerun.
1. Fresh clone into a temp folder, `docker compose up --build -d`, wait for healthy, `curl -s localhost:3000` returns the Care Taker page (contains "Care Taker"), `curl localhost:3000/healthz` returns ok. Then `docker compose down`.
2. No `.env` present during step 1. `.env.example` exists and lists every variable read in code (`grep -rn "process.env" server`).
3. No secrets: `git grep -nE "(sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|AC[a-f0-9]{32})"` returns nothing.
4. `npm test` passes. All acceptance phrases from the original prompt pass.
5. Own code is 300+ lines: count lines in server, public/js, public/css and tests, excluding node_modules, data and audio.
6. No em or en dash characters: `grep -rnP "[\x{2013}\x{2014}]" --exclude-dir=node_modules .` returns nothing.
7. Banner present on every HTML page. Terms, Privacy and Disclaimer pages reachable from the footer.
8. README has: what it is, theme, quick start, Chrome + microphone note, env vars table, demo steps, live link placeholder, video link placeholder, license.
9. Repo is public (ask the human to confirm).
