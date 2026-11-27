'use strict';
// Languages are plain config files in server/lang/*.json. Adding a language means adding a file.
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'lang');
const langs = {};
for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).sort()) {
  const data = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
  langs[data.code] = data;
}
const en = langs.en;

function get(code) { return langs[code] || en; }
function codes() { return Object.keys(langs); }

function fill(template, vars) {
  return template.replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined ? m : String(vars[k])));
}

// One call line in the patient's language, with the English version for the care team.
function line(code, lineId, vars = {}) {
  const L = get(code);
  const slotNative = vars.slot ? (L.slots[vars.slot] || en.slots[vars.slot]) : undefined;
  const slotEn = vars.slot ? en.slots[vars.slot] : undefined;
  const native = (L.lines && L.lines[lineId]) || en.lines[lineId];
  return {
    lineId,
    text: fill(native, { ...vars, slot: slotNative }),
    en: fill(en.lines[lineId], { ...vars, slot: slotEn }),
    lang: L.code,
  };
}

function publicInfo() {
  return codes().map((c) => {
    const L = langs[c];
    return { code: c, name: L.name, nativeName: L.nativeName, speechCode: L.speechCode,
      reviewed: !!L.reviewedByNativeSpeaker, samples: L.samples || [] };
  });
}

module.exports = { get, codes, line, fill, publicInfo, all: langs };
