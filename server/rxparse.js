'use strict';
// Fills the prescription form from a dictated sentence, by rules only.
// "Paracetamol 650, after breakfast and dinner, 5 days" -> Paracetamol, 650 mg, breakfast + dinner, 5 days.
const WORD_NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, fourteen: 14, fifteen: 15, twenty: 20, thirty: 30, sixty: 60, ninety: 90 };
const ORDER = ['breakfast', 'lunch', 'dinner', 'night'];

function parseRx(input) {
  let t = String(input || '').toLowerCase().replace(/[,;.]/g, ' ').replace(/\s+/g, ' ').trim();
  t = t.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fourteen|fifteen|twenty|thirty|sixty|ninety)\b/g, (w) => WORD_NUM[w]);
  // Speech engines sometimes join the number to the unit, as in "650mg".
  t = t.replace(/(\d)(mg|mcg|ml|g|iu)\b/g, '$1 $2');

  let days = null;
  let m = t.match(/(\d+)\s*(?:days?|din|dino)\b/);
  if (m) days = Number(m[1]);
  else if ((m = t.match(/(\d+)\s*weeks?\b/))) days = Number(m[1]) * 7;
  else if (/\ba week\b/.test(t)) days = 7;
  else if ((m = t.match(/(\d+)\s*months?\b/))) days = Number(m[1]) * 30;

  const slots = new Set();
  if (/\b(breakfast|morning)\b/.test(t)) slots.add('breakfast');
  if (/\b(lunch|afternoon)\b/.test(t)) slots.add('lunch');
  if (/\b(dinner|evening|supper)\b/.test(t)) slots.add('dinner');
  if (/\b(night|bedtime|nightly|hs)\b/.test(t)) slots.add('night');
  if (!slots.size) {
    if (/\b(each|every|all) meals?\b|\bthrice\b|\b3 times\b|\btds\b|\btid\b/.test(t)) ['breakfast', 'lunch', 'dinner'].forEach((s) => slots.add(s));
    else if (/\btwice\b|\b2 times\b|\bbd\b|\bbid\b/.test(t)) ['breakfast', 'dinner'].forEach((s) => slots.add(s));
    else if (/\bonce\b|\bdaily\b|\bod\b/.test(t)) slots.add('breakfast');
  }

  // The dose is the first number that is not a day, week or month count.
  let medicine = null;
  let dose = null;
  const re = /(\d+(?:\.\d+)?)(?![\d.])\s*(mg|mcg|ml|g|iu)?\b/g;
  let hit;
  while ((hit = re.exec(t))) {
    const after = t.slice(hit.index + hit[0].length).trimStart();
    if (/^(days?|weeks?|months?|din|times)\b/.test(after)) continue;
    dose = `${hit[1]} ${hit[2] || 'mg'}`;
    medicine = t.slice(0, hit.index).trim();
    break;
  }
  if (!medicine) {
    const cut = t.search(/\b(after|before|at|for|twice|once|thrice|daily|every|each|in the)\b|\d/);
    medicine = (cut > 0 ? t.slice(0, cut) : t).trim();
  }
  medicine = medicine.replace(/\b(tablet|tab|capsule|cap|syrup)\b/g, '').replace(/\s+/g, ' ').trim();
  medicine = medicine ? medicine.replace(/\b\w/g, (c) => c.toUpperCase()) : null;

  return {
    medicine,
    dose,
    slots: ORDER.filter((s) => slots.has(s)),
    days,
    relation: /\bbefore\b/.test(t) ? 'before' : 'after',
  };
}

module.exports = { parseRx };
