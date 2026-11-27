'use strict';
// Optional: suggest an intent for a misheard reply so a nurse can add a keyword.
// The model may only pick from the fixed intent list. It never logs a dose and never writes advice.
const { has, KeyNotSet } = require('./keys');
const { PRIORITY } = require('../intents');

async function suggestIntent(text, langName) {
  if (!has('LLM_API_KEY')) throw new KeyNotSet('LLM_API_KEY');
  const allowed = [...PRIORITY, 'unclear'];
  const res = await fetch(process.env.LLM_API_URL || 'https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': process.env.LLM_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.LLM_MODEL || 'claude-haiku-5-5',
      max_tokens: 20,
      system: `You label short replies a patient gave on a medicine reminder call. Reply with exactly one word from this list: ${allowed.join(', ')}. If unsure, reply unclear.`,
      messages: [{ role: 'user', content: `Language: ${langName}. Reply: "${text}"` }],
    }),
  });
  if (!res.ok) throw new Error(`LLM request failed with ${res.status}`);
  const json = await res.json();
  const word = String((json.content && json.content[0] && json.content[0].text) || '').trim().split(/\s+/)[0];
  return allowed.includes(word) ? word : 'unclear';
}

module.exports = { suggestIntent };
