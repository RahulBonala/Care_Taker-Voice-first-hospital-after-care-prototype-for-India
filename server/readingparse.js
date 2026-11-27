'use strict';
// Reads a spoken or typed reading: "BP 130 by 85", "pressure 140 over 90 pulse 72",
// "sugar 145 after food", "fasting sugar 110", "शुगर 150", "బీపీ 130 by 85". Rules only.
const BP = /(bp|b p|blood pressure|pressure|बीपी|బీపీ|பிபி)/;
const SUGAR = /(sugar|shugar|glucose|शुगर|షుగర్|சுகர்)/;
const PULSE = /(pulse|heart rate|heartbeat|नब्ज|నాడి)/;
const STEPS = /(steps|kadam|कदम|అడుగులు)/;
const OXY = /(oxygen|spo2|sp o2|saturation)/;

function parseReading(input) {
  const t = String(input || '').toLowerCase().replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  const pair = t.match(/(\d{2,3})\s*(?:\/|by|over|upon|par|बाय|బై)\s*(\d{2,3})/);
  const pulseM = t.match(new RegExp(PULSE.source + '\\D{0,12}(\\d{2,3})'));
  if (pair && (BP.test(t) || !SUGAR.test(t))) {
    const out = { type: 'bp', value: { sys: Number(pair[1]), dia: Number(pair[2]) } };
    if (pulseM) out.value.pulse = Number(pulseM[pulseM.length - 1]);
    return out;
  }
  const num = (re) => { const m = t.match(new RegExp(re.source + '\\D{0,16}(\\d{2,5})')); return m ? Number(m[m.length - 1]) : null; };
  if (SUGAR.test(t)) {
    const n = num(SUGAR) ?? (t.match(/(\d{2,3})/) ? Number(t.match(/(\d{2,3})/)[1]) : null);
    if (n === null) return null;
    const context = /(fasting|empty stomach|khali pet|before (food|breakfast|meal)|खाली पेट)/.test(t) ? 'fasting'
      : /(after (food|meal|lunch|dinner|breakfast)|khane ke baad|post meal|खाने के बाद)/.test(t) ? 'after meal' : null;
    return { type: 'glucose', value: context ? { mgdl: n, context } : { mgdl: n } };
  }
  if (OXY.test(t)) { const n = num(OXY); return n === null ? null : { type: 'spo2', value: { pct: n } }; }
  if (STEPS.test(t)) { const m = t.match(/(\d{3,6})/); return m ? { type: 'steps', value: { count: Number(m[1]) } } : null; }
  if (PULSE.test(t)) { const n = num(PULSE); return n === null ? null : { type: 'heartRate', value: { bpm: n } }; }
  return null;
}

module.exports = { parseReading };
