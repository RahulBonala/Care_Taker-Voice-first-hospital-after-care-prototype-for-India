---
name: intent-rules
description: Use when changing how Care Taker understands spoken replies, adding phrases from the Misheard list, or fixing a wrong intent.
---
Priority order (first match wins): unwell, wantPerson, someoneElse, stopped, notEaten, later, notTaken, taken, no, yes. Anything else is unclear.
1. Write the failing test first in `tests/intents.<lang>.test.js`.
2. Add the phrase to the right list in `server/lang/<lang>.json`. Negatives ("nahi li hai", "వేసుకోలేదు") must sit in notTaken so they win over taken.
3. Number words ("aadha ghanta", "అరగంట", "half an hour") map to minutes in the `numbers` block.
4. Never add a rule that can turn an uncertain reply into taken. Confidence under 0.5 or 8s silence is unclear.
5. Run `npm test`. All existing tests must still pass.
