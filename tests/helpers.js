'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parse } = require('../server/intents');

// cases: [phrase, intent, minutes?]
function intentSuite(lang, cases) {
  test(`intents: ${lang}`, async (t) => {
    for (const [phrase, intent, minutes] of cases) {
      await t.test(`"${phrase}" is ${intent}${minutes ? ' ' + minutes : ''}`, () => {
        const r = parse(phrase, { lang });
        assert.equal(r.intent, intent, `got ${r.intent} (matched ${r.matched})`);
        if (minutes) assert.equal(r.minutes, minutes);
      });
    }
  });
}
module.exports = { intentSuite };
