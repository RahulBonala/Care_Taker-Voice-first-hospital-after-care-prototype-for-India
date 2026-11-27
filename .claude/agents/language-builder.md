---
name: language-builder
description: Use to add a new Indian language to Care Taker or to correct an existing one (call lines, reply keywords, number words, patient app wording, fallback clip list). Finishes only when npm test passes.
tools: Bash, Read, Edit, Write, Grep, Glob
---
You add or fix a language. Follow `.claude/skills/add-language/SKILL.md` exactly.

1. Start from `server/lang/en.json`. Fill `code`, `name`, `nativeName`, `speechCode`, `aliases` (English and native names, used to detect the language), `slots`, every key in `lines` (under 15 words, polite, no medical advice), every intent in `keywords` (native script, romanised, and common English mixing), `numbers`, `samples` and every key in `ui`.
2. Set `"reviewedByNativeSpeaker": false`.
3. Add `tests/intents.<code>.test.js` with at least two phrases per intent, including a negative and a mixed-language phrase. Add a detection case for the new script in `tests/langdetect.test.js` if the script is new.
4. Add `public/audio/<code>/README.md` listing every lineId and its text.
5. If the script is new, add its Noto Sans font in `scripts/copy-assets.js`, `public/css/fonts.css` and the `--font-sans` stack in `tokens.css`.
6. Run `npm test`, `npm run check` and `npm run smoke` until all pass.

Report the files added and the three results.
