'use strict';
// npm run smoke: a pass/fail check of the running app, no browser needed.
// Starts the server on a free port with a throwaway data folder, then checks that every page,
// stylesheet, script and ES module the browser would load is served, the notice is on every
// page, optional keys say "key not set", and one dose call logs a dose only after a yes.
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'caretaker-smoke-'));
for (const k of ['SARVAM_API_KEY', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM', 'LLM_API_KEY', 'PUBLIC_URL']) delete process.env[k];
const { createApp } = require('../server/app');
const store = require('../server/store');

let failed = 0;
const pass = (m) => console.log(`PASS  ${m}`);
const fail = (m) => { failed++; console.log(`FAIL  ${m}`); };

(async () => {
  store.load();
  const server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = async (p) => { const r = await fetch(base + p); return { status: r.status, text: await r.text(), type: r.headers.get('content-type') || '' }; };
  const post = async (p, body = {}) => (await fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json();

  try {
    const h = await get('/healthz');
    h.status === 200 && h.text.includes('"ok":true') ? pass('/healthz is ok') : fail('/healthz');

    // Pages, and the notice on each one
    for (const page of ['/', '/terms.html', '/privacy.html', '/disclaimer.html', '/voice-data.html']) {
      const r = await get(page);
      if (r.status !== 200) { fail(`${page} returned ${r.status}`); continue; }
      r.text.includes('Sample data. Not medical advice.') ? pass(`${page} has the notice`) : fail(`${page} is missing "Sample data. Not medical advice."`);
    }

    // Every stylesheet, script, font and favicon the main page loads
    const index = (await get('/')).text;
    const assets = [...index.matchAll(/(?:href|src)="(\/[^"#?]+\.(?:css|js|svg))"/g)].map((m) => m[1]);
    const seen = new Set();
    for (const a of assets) {
      const r = await get(a);
      seen.add(a);
      r.status === 200 ? null : fail(`${a} returned ${r.status}`);
      if (a.endsWith('.css')) for (const m of r.text.matchAll(/url\("?(\.\.\/fonts\/[^")]+)"?\)/g)) {
        const f = '/' + path.posix.normalize(path.posix.join('css', m[1]));
        if (seen.has(f)) continue; seen.add(f);
        const fr = await get(f); if (fr.status !== 200) fail(`font ${f} returned ${fr.status}`);
      }
    }
    pass(`${seen.size} stylesheets, scripts, fonts and icons served`);

    // Every ES module reachable from app.js (a missing import breaks the whole page)
    const queue = ['/js/app.js'];
    const mods = new Set();
    while (queue.length) {
      const m = queue.shift();
      if (mods.has(m)) continue;
      mods.add(m);
      const r = await get(m);
      if (r.status !== 200) { fail(`module ${m} returned ${r.status}`); continue; }
      for (const im of r.text.matchAll(/(?:import|from)\s*['"](\.{1,2}\/[^'"]+)['"]/g)) queue.push(path.posix.normalize(path.posix.join(path.posix.dirname(m), im[1])));
    }
    failed ? null : pass(`${mods.size} browser modules load`);

    // Config: languages present, keys off
    const cfg = JSON.parse((await get('/api/config')).text);
    cfg.langs.length >= 4 ? pass(`${cfg.langs.length} languages configured`) : fail('fewer than 4 languages');
    Object.values(cfg.keys).every((v) => v === false) ? pass('starts with no keys') : fail('a key is set in the smoke run');
    const tts = await fetch(base + '/api/tts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'hi', lang: 'te' }) });
    tts.status === 503 && (await tts.json()).error.includes('key not set') ? pass('keyed feature says "key not set"') : fail('keyed feature without a key');

    // One dose call: nothing is logged until the yes
    const patients = JSON.parse((await get('/api/patients')).text);
    const lakshmi = patients.find((p) => p.name.startsWith('Lakshmi'));
    const before = JSON.parse((await get('/api/measures')).text).taken;
    const repBefore = JSON.parse((await get(`/api/report/${lakshmi.id}`)).text);
    const confirmedBefore = repBefore.todaySummary ? repBefore.todaySummary.confirmed : 0;
    let call = await post('/api/slots/next', { patientId: lakshmi.id });
    call = await post(`/api/calls/${call.id}/answer`);
    call = await post(`/api/calls/${call.id}/reply`, { text: 'వేసుకున్నాను' });
    const mid = JSON.parse((await get('/api/measures')).text).taken;
    call = await post(`/api/calls/${call.id}/reply`, { text: 'అవును' });
    const after = JSON.parse((await get('/api/measures')).text);
    mid === before && after.taken === before + 1 && after.logsWithoutYes === 0 && call.outcome === 'taken'
      ? pass('a dose call logs only after the spoken yes')
      : fail(`dose call: before ${before}, before yes ${mid}, after ${after.taken}, outcome ${call.outcome}`);

    const repAfter = JSON.parse((await get(`/api/report/${lakshmi.id}`)).text);
    repAfter.todaySummary && repAfter.todaySummary.confirmed === confirmedBefore + 1
      ? pass('report todaySummary.confirmed increased by 1')
      : fail('report todaySummary.confirmed did not increase by 1');

    const callsList = JSON.parse((await get(`/api/calls?patientId=${lakshmi.id}&limit=1`)).text);
    callsList[0] && 'stage' in callsList[0] && 'outcome' in callsList[0] && 'pendingTaken' in callsList[0]
      ? pass('GET /api/calls returns stage, outcome and pendingTaken')
      : fail('GET /api/calls missing stage, outcome or pendingTaken');
  } catch (err) {
    fail(`smoke run crashed: ${err.message}`);
  } finally {
    server.close();
  }
  console.log(failed ? `\n${failed} smoke check(s) failed` : '\nsmoke: all checks passed');
  process.exit(failed ? 1 : 0);
})();
