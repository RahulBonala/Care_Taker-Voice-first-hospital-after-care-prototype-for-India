---
name: add-language
description: Use when adding or fixing an Indian language in Care Taker (call lines, reply keywords, speech code, audio fallback).
---
1. Copy `server/lang/en.json` to `server/lang/<code>.json`. Fill: `code`, `speechCode` (for example te-IN), `name` in English and native script, every call line, keyword lists for every intent in native script AND romanised AND common English mixing.
2. Keep each voice line under 15 words, polite, no medical advice.
3. Add at least 2 test phrases per intent to `tests/intents.<code>.test.js`, including one negative ("not taken") and one mixed-language phrase.
4. Add `public/audio/<code>/README.md` listing each lineId so a human can record the fallback clips.
5. Mark the file `"reviewedByNativeSpeaker": false` until a person checks it. The UI shows "Language under review" for unreviewed languages.
6. Run `npm test`. No code change outside the new files should be needed. If one is, fix the config loader instead.
