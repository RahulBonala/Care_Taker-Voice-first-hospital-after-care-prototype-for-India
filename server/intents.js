'use strict';
// Rule-based understanding of short spoken replies. Per-language keyword lists live in lang/*.json.
// First match in PRIORITY wins. Anything that matches nothing, or is heard with low confidence, is unclear.
// There is deliberately no fallback that turns an uncertain reply into "taken".
const langs = require('./lang');

const PRIORITY = ['unwell', 'optOut', 'wantPerson', 'someoneElse', 'stopped', 'notEaten', 'later', 'notTaken', 'taken', 'no', 'yes'];
const MIN_CONFIDENCE = 0.5;
const DEFAULT_MINUTES = 30;

function normalize(s) {
  return String(s || '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[’'`]/g, '')
    .replace(/[.,!?;:"()[\]{}|/\\।॥-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const LATIN = /^[a-z0-9 ]+$/;
function contains(text, keyword) {
  const k = normalize(keyword);
  if (!k) return false;
  // Latin keywords match whole words. Indic keywords match inside words, because suffixes attach to the verb.
  if (LATIN.test(k)) return (' ' + text + ' ').includes(' ' + k + ' ');
  return text.includes(k);
}

function langsFor(code) {
  if (!code) return langs.codes().map(langs.get);
  const list = [langs.get(code)];
  if (code !== 'en') list.push(langs.get('en')); // people mix English into every language
  return list;
}

const MINUTE_UNIT = '(?:min|mins|minute|minutes|minat|minit|nimish\\S*|nimid\\S*|मिनट\\S*|నిమిష\\S*|நிமி\\S*)';
const HOUR_UNIT = '(?:hour|hours|hr|hrs|ghanta|ghante|ganta\\S*|gante\\S*|mani|घंट\\S*|గంట\\S*|மணி\\S*)';

function clamp(n) { return Math.min(90, Math.max(10, n)); }

// Minutes heard in a reply, clamped to 10..90. Returns null when no time is mentioned.
function extractMinutes(text, list) {
  let t = ' ' + normalize(text) + ' ';
  const numbers = {};
  for (const L of list) Object.assign(numbers, L.numbers || {});
  // Longest phrases first, so "aadha ghanta" wins over "ghanta".
  for (const word of Object.keys(numbers).sort((a, b) => b.length - a.length)) {
    const k = normalize(word);
    if (LATIN.test(k)) t = t.split(' ' + k + ' ').join(' ' + numbers[word] + ' ');
    else t = t.split(k).join(' ' + numbers[word] + ' ');
  }
  let m = t.match(new RegExp('(\\d{1,3})\\s*' + MINUTE_UNIT));
  if (m) return clamp(Number(m[1]));
  m = t.match(new RegExp('(\\d{1,2})\\s*' + HOUR_UNIT));
  if (m) return clamp(Number(m[1]) * 60);
  m = t.match(/(\d{1,3})/);
  if (m && Number(m[1]) >= 5 && Number(m[1]) <= 180) return clamp(Number(m[1]));
  return null;
}

function parse(text, opts = {}) {
  const { lang, confidence } = opts;
  const heard = normalize(text);
  const base = { text: String(text || ''), heard, confidence: typeof confidence === 'number' ? confidence : null };
  if (!heard) return { ...base, intent: 'unclear', reason: 'nothing heard' };
  if (typeof confidence === 'number' && confidence < MIN_CONFIDENCE) {
    return { ...base, intent: 'unclear', reason: 'low confidence' };
  }
  const list = langsFor(lang);
  for (const intent of PRIORITY) {
    for (const L of list) {
      const hit = (L.keywords[intent] || []).find((k) => contains(heard, k));
      if (hit) {
        const minutes = extractMinutes(text, list);
        const out = { ...base, intent, matched: hit, matchedLang: L.code };
        if (intent === 'later' || intent === 'notEaten') out.minutes = minutes || DEFAULT_MINUTES;
        else if (minutes) out.minutes = minutes;
        return out;
      }
    }
  }
  return { ...base, intent: 'unclear', reason: 'no rule matched' };
}

const LABELS = {
  unwell: 'Feels unwell', optOut: 'Stop calls', wantPerson: 'Wants a person', someoneElse: 'Someone else answered',
  stopped: 'Stopped the medicine', notEaten: 'Not eaten yet', later: 'Call later', notTaken: 'Not taken',
  taken: 'Taken', no: 'No', yes: 'Yes', unclear: 'Unclear',
};

module.exports = { parse, normalize, contains, extractMinutes, PRIORITY, LABELS, MIN_CONFIDENCE, DEFAULT_MINUTES };
