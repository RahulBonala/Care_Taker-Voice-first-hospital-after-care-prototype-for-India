'use strict';
// Which language is this reply in? Three signals, strongest first:
//   1. the patient names a language ("Tamil", "తెలుగు లో మాట్లాడండి"),
//   2. the script the words are written in (Telugu, Tamil, Bengali ... Devanagari is Hindi or Marathi),
//   3. romanised words that match one language's reply keywords ("vesukunnanu" is Telugu).
// English mixed into an Indian language is normal, so English alone never switches a call away.
const langs = require('./lang');
const { normalize, contains } = require('./intents');

const SCRIPTS = [
  ['te', /[ఀ-౿]/g], ['ta', /[஀-௿]/g], ['kn', /[ಀ-೿]/g], ['ml', /[ഀ-ൿ]/g],
  ['bn', /[ঀ-৿]/g], ['gu', /[઀-૿]/g], ['pa', /[਀-੿]/g], ['or', /[଀-୿]/g],
  ['deva', /[ऀ-ॿ]/g],
];

function keywordScore(text, L) {
  let score = 0;
  for (const list of Object.values(L.keywords || {})) {
    for (const k of list) {
      const nk = normalize(k);
      // Very short words (na, ha, ji) are shared by many languages, so they do not count.
      if (nk.replace(/\s/g, '').length < 4) continue;
      if (contains(text, k)) score += nk.includes(' ') ? 2 : 1;
    }
  }
  return score;
}

function detect(input, { current } = {}) {
  const raw = String(input || '');
  const text = normalize(raw);
  if (!text) return null;
  const all = langs.codes().map(langs.get);

  for (const L of all) {
    if ((L.aliases || []).some((a) => contains(text, a))) return { lang: L.code, by: 'name', confidence: 0.95 };
  }

  let best = null;
  for (const [code, re] of SCRIPTS) {
    const n = (raw.match(re) || []).length;
    if (n >= 2 && (!best || n > best.n)) best = { code, n };
  }
  if (best) {
    if (best.code !== 'deva') return { lang: best.code, by: 'script', confidence: 0.9 };
    const hi = keywordScore(text, langs.get('hi'));
    const mr = keywordScore(text, langs.get('mr'));
    const lang = mr > hi ? 'mr' : hi > mr ? 'hi' : (current === 'mr' ? 'mr' : 'hi');
    return { lang, by: 'script', confidence: mr === hi ? 0.7 : 0.85 };
  }

  const enScore = keywordScore(text, langs.get('en'));
  const scores = all.filter((L) => L.code !== 'en').map((L) => ({ lang: L.code, s: keywordScore(text, L) })).sort((a, b) => b.s - a.s);
  const [top, second] = scores;
  if (top && top.s > 0 && top.s > (second ? second.s : 0)) {
    if (current && keywordScore(text, langs.get(current)) >= top.s) return { lang: current, by: 'words', confidence: 0.6 };
    if (enScore >= top.s) return { lang: 'en', by: 'words', confidence: 0.6 };
    return { lang: top.lang, by: 'words', confidence: Math.min(0.9, 0.55 + 0.1 * (top.s - (second ? second.s : 0))) };
  }
  if (enScore > 0) return { lang: 'en', by: 'words', confidence: 0.6 };
  return null;
}

// Should a call in `current` move to the detected language?
function shouldSwitch(d, current) {
  if (!d || d.lang === current) return false;
  if (d.by === 'name') return true;
  if (d.lang === 'en') return false; // English words inside an Indian language are normal
  return d.confidence >= 0.6;
}

module.exports = { detect, shouldSwitch };
