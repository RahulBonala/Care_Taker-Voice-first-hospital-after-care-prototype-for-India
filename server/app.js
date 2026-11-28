'use strict';
const fs = require('fs');
const path = require('path');
const express = require('express');
const store = require('./store');
const T = require('./time');
const M = require('./model');
const flow = require('./flow');
const lang = require('./lang');
const { parseRx } = require('./rxparse');
const { report, measures, courseStats } = require('./report');
const H = require('./health');
const { parseReading } = require('./readingparse');
const { detect: detectLang } = require('./langdetect');
const keys = require('./adapters/keys');
const sarvam = require('./adapters/sarvam');
const llm = require('./adapters/llm');
const twilio = require('./adapters/twilio');

const VALID_SLOTS = T.SLOT_ORDER;

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '200kb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'] }));

  const db = () => store.get();

  // Wraps a mutating handler: run, save, reply. Errors become 400 (or 503 for "key not set").
  const act = (fn) => async (req, res) => {
    try {
      const out = await fn(req, db());
      store.save();
      res.json(out);
    } catch (err) {
      const status = err.status || (err instanceof flow.FlowError || err instanceof H.HealthError || err.userError ? 400 : 500);
      if (status === 500) console.error(err);
      res.status(status).json({ error: err.message });
    }
  };
  const bad = (msg) => Object.assign(new Error(msg), { userError: true });

  app.get('/healthz', (req, res) => res.json({ ok: true }));

  // Which recorded fallback clips exist, so the browser only asks for files that are there.
  // Supports .mp4, .m4a, .mp3, .wav and .ogg voiceover files in public/audio/{code}/.
  const AUDIO_RE = /\.(mp4|m4a|mp3|wav|ogg)$/i;
  const audioClips = () => {
    const out = {};
    for (const code of lang.codes()) {
      const dir = path.join(__dirname, '..', 'public', 'audio', code);
      try {
        const files = fs.readdirSync(dir).filter((f) => AUDIO_RE.test(f)).sort();
        const ids = files.map((f) => f.replace(AUDIO_RE, ''));
        out[code] = [...new Set([...files, ...ids])];
      } catch {
        out[code] = [];
      }
    }
    return out;
  };
  app.get('/api/config', (req, res) => res.json({ keys: keys.status(), langs: lang.publicInfo(), audio: audioClips(), slots: VALID_SLOTS, slotTimes: T.SLOT_TIMES,
    maxRings: flow.MAX_RINGS, retryMinutes: flow.RETRY_MINUTES }));
  app.get('/api/clock', (req, res) => res.json({ clock: db().clock, date: T.dateOf(db().clock), time: T.timeOf(db().clock) }));

  // ---- patients and prescriptions
  function patientView(d, p) {
    const rxs = d.prescriptions.filter((r) => r.patientId === p.id);
    const next = flow.nextSlotFor(d, p.id);
    const rep = report(d, p.id);
    const latestQuote = rep && rep.quotes && rep.quotes[0] ? rep.quotes[0] : null;
    return { ...p, prescriptions: rxs.map((rx) => courseStats(d, rx)), nextDue: next ? next.due : null,
      openFlags: d.flags.filter((f) => f.patientId === p.id && f.status === 'open').length,
      activeCall: flow.activeCall(d, p.id) ? flow.activeCall(d, p.id).id : null,
      latestQuote };
  }
  app.get('/api/patients', (req, res) => res.json(db().patients.map((p) => patientView(db(), p))));
  app.get('/api/patients/:id', (req, res) => {
    const p = M.patient(db(), req.params.id);
    return p ? res.json(patientView(db(), p)) : res.status(404).json({ error: 'Patient not found' });
  });
  app.post('/api/patients', act((req, d) => {
    const b = req.body || {};
    const name = String(b.name || '').trim();
    if (!name) throw bad('Name is required');
    if (!lang.codes().includes(b.lang)) throw bad('Choose a language');
    const consent = b.consent || {};
    if (!consent.calls || !consent.stopInfo) throw bad('Both consent boxes must be ticked');
    const recordedBy = String(consent.recordedBy || '').trim();
    if (!recordedBy) throw bad('Enter the name of the nurse recording consent');
    const p = {
      id: M.nextId(d, 'pat'), name, age: Number(b.age) || null, lang: b.lang,
      phoneType: b.phoneType === 'smart' ? 'smart' : 'keypad', phone: String(b.phone || '').trim(),
      notes: String(b.notes || '').trim(), shareWithFamily: !!b.shareWithFamily,
      family: { name: String((b.family && b.family.name) || '').trim(), relation: String((b.family && b.family.relation) || '').trim(),
        phone: String((b.family && b.family.phone) || '').trim(), note: '' },
      consent: { calls: true, stopInfo: true, language: b.lang, recordedBy, at: d.clock },
      verified: false, callsStopped: false, createdAt: d.clock,
    };
    d.patients.push(p);
    return p;
  }));
  function syncPatientLanguage(d, p, newLang) {
    p.lang = newLang;
    p.langChangedAt = d.clock;
    if (p.consent) p.consent.language = newLang;
    const L = lang.get(newLang);
    const first = p.name.split(' ')[0];
    const takenSample = (L.samples && L.samples[0]) || (L.keywords && L.keywords.taken && L.keywords.taken[0]) || 'Yes, I took it';
    const yesSample = (L.keywords && L.keywords.yes && L.keywords.yes[0]) || 'Yes';

    for (const c of d.calls.filter((x) => x.patientId === p.id)) {
      c.lang = newLang;
      const s = M.slot(d, c.slotId);
      const rx = s ? M.rxOf(d, s.prescriptionId) : null;
      const baseTime = T.timeOf((c.pendingTaken && c.pendingTaken.at) || c.endedAt || c.startedAt || d.clock);
      const rebuildLine = (item) => {
        if (!item || !item.lineId) return;
        const timeMatch = item.en && /(\d\d:\d\d)/.exec(item.en);
        const minMatch = item.en && /(\d+)\s+minutes/.exec(item.en);
        const vars = {
          name: first,
          slot: s ? s.slot : 'breakfast',
          n: s ? s.day : 1,
          total: rx ? rx.days : 5,
          time: timeMatch ? timeMatch[1] : baseTime,
          minutes: minMatch ? Number(minMatch[1]) : 30,
        };
        const fresh = lang.line(newLang, item.lineId, vars);
        item.text = fresh.text;
        item.en = fresh.en;
        item.lang = fresh.lang;
      };
      if (Array.isArray(c.transcript)) {
        for (const t of c.transcript) {
          if (t.who === 'bot') rebuildLine(t);
          else if (t.who === 'patient' && t.via !== 'key' && t.via !== 'silence') {
            if (t.intent === 'taken') { t.text = takenSample; t.heard = takenSample; }
            else if (t.intent === 'yes') { t.text = yesSample; t.heard = yesSample; }
          }
        }
      }
      if (c.turn && Array.isArray(c.turn.say)) {
        for (const l of c.turn.say) rebuildLine(l);
      }
    }

    for (const l of d.doseLogs.filter((x) => x.patientId === p.id && x.via !== 'key')) {
      l.words = takenSample;
      l.confirmWords = yesSample;
    }
    for (const m of d.misheard.filter((x) => x.patientId === p.id)) {
      m.lang = newLang;
      if (newLang === 'en' && /[^\x00-\x7F]/.test(m.text || '')) m.text = 'uh... hello';
    }
  }

  app.patch('/api/patients/:id', act((req, d) => {
    const p = M.patient(d, req.params.id);
    if (!p) throw bad('Patient not found');
    if (typeof req.body.shareWithFamily === 'boolean') p.shareWithFamily = req.body.shareWithFamily;
    if (req.body.lang !== undefined) {
      if (!lang.codes().includes(req.body.lang)) throw bad('Unknown language');
      syncPatientLanguage(d, p, req.body.lang);
    }
    return p;
  }));

  app.get('/api/prescriptions', (req, res) => {
    const list = db().prescriptions.filter((r) => !req.query.patientId || r.patientId === req.query.patientId);
    res.json(list);
  });
  app.post('/api/prescriptions', act((req, d) => {
    const b = req.body || {};
    const p = M.patient(d, b.patientId);
    if (!p) throw bad('Patient not found');
    const medicine = String(b.medicine || '').trim();
    const slots = (Array.isArray(b.slots) ? b.slots : []).filter((s) => VALID_SLOTS.includes(s));
    const days = Math.round(Number(b.days));
    if (!medicine) throw bad('Medicine is required');
    if (!slots.length) throw bad('Choose at least one meal slot');
    if (!(days >= 1 && days <= 365)) throw bad('Days must be between 1 and 365');
    const rx = { id: M.nextId(d, 'rx'), patientId: p.id, medicine, dose: String(b.dose || '').trim(), slots, days,
      relation: b.relation === 'before' ? 'before' : 'after', startDate: T.dateOf(d.clock), verified: false, createdAt: d.clock };
    d.prescriptions.push(rx);
    return rx;
  }));
  // Which language is this text in? Used by "detect from voice" on the desk and in the patient app.
  app.post('/api/detect-language', (req, res) => {
    const r = detectLang((req.body || {}).text || '');
    res.json(r ? { ...r, name: lang.get(r.lang).name, nativeName: lang.get(r.lang).nativeName } : { lang: null });
  });
  app.post('/api/parse-rx', (req, res) => res.json(parseRx((req.body || {}).text)));

  // Only verified patients get slots.
  app.post('/api/verify/:id', act((req, d) => {
    const p = M.patient(d, req.params.id);
    if (!p) throw bad('Patient not found');
    if (!p.consent || !p.consent.calls || !p.consent.stopInfo) throw bad('Consent is not recorded for this patient');
    const rxs = d.prescriptions.filter((r) => r.patientId === p.id);
    if (!rxs.length) throw bad('Add a prescription before verifying');
    p.verified = true;
    p.verifiedAt = d.clock;
    p.verifiedBy = String((req.body && req.body.nurse) || 'Nurse on duty');
    for (const rx of rxs) {
      if (!rx.verified) {
        rx.verified = true;
        // A course verified after today's last slot time starts tomorrow.
        const lastToday = T.at(rx.startDate, T.SLOT_TIMES[rx.slots[rx.slots.length - 1]]);
        if (lastToday < d.clock && rx.startDate === T.dateOf(d.clock)) rx.startDate = T.addDays(rx.startDate, 1);
        M.generateSlots(d, rx);
        // Slots already in the past on the first day are not called.
        for (const s of d.slots) if (s.prescriptionId === rx.id && s.due < d.clock) s.status = 'cancelled';
      }
    }
    return patientView(d, p);
  }));

  // ---- slots and calls
  app.get('/api/slots', (req, res) => {
    let list = db().slots;
    if (req.query.patientId) list = list.filter((s) => s.patientId === req.query.patientId);
    if (req.query.date) list = list.filter((s) => s.date === req.query.date);
    res.json(list);
  });
  app.post('/api/slots/next', act((req, d) => flow.startNext(d, (req.body || {}).patientId)));

  app.get('/api/calls', (req, res) => {
    let list = db().calls;
    if (req.query.patientId) list = list.filter((c) => c.patientId === req.query.patientId);
    if (req.query.active) list = list.filter((c) => c.status !== 'ended');
    res.json([...list].reverse().slice(0, Number(req.query.limit) || 50));
  });
  const call = (d, id) => {
    const c = d.calls.find((x) => x.id === id);
    if (!c) throw bad('Call not found');
    return c;
  };
  app.post('/api/calls/:id/answer', act((req, d) => flow.answer(d, call(d, req.params.id))));
  app.post('/api/calls/:id/decline', act((req, d) => flow.decline(d, call(d, req.params.id), (req.body || {}).reason || 'Declined')));
  app.post('/api/calls/:id/reply', act((req, d) => {
    const b = req.body || {};
    return flow.reply(d, call(d, req.params.id), { text: String(b.text || ''), confidence: typeof b.confidence === 'number' ? b.confidence : undefined,
      silence: !!b.silence, via: b.via === 'typed' ? 'typed' : 'voice' });
  }));
  app.post('/api/calls/:id/key', act((req, d) => flow.key(d, call(d, req.params.id), (req.body || {}).key ?? null)));

  // ---- flags, misheard, reports
  app.get('/api/flags', (req, res) => {
    let list = db().flags;
    if (req.query.status) list = list.filter((f) => f.status === req.query.status);
    if (req.query.patientId) list = list.filter((f) => f.patientId === req.query.patientId);
    res.json(M.sortFlags(list).map((f) => ({ ...f, label: M.FLAG_LABELS[f.type], patientName: (M.patient(db(), f.patientId) || {}).name })));
  });
  app.post('/api/flags/:id/close', act((req, d) => {
    const f = d.flags.find((x) => x.id === req.params.id);
    if (!f) throw bad('Flag not found');
    f.status = 'closed';
    f.closedAt = d.clock;
    f.closedBy = String((req.body && req.body.nurse) || 'Nurse on duty');
    f.note = String((req.body && req.body.note) || 'Called back');
    return f;
  }));
  app.get('/api/misheard', (req, res) => res.json([...db().misheard].reverse().map((m) => ({ ...m, patientName: (M.patient(db(), m.patientId) || {}).name }))));
  app.post('/api/misheard/:id/suggest', act(async (req, d) => {
    const m = d.misheard.find((x) => x.id === req.params.id);
    if (!m) throw bad('Not found');
    m.suggestion = await llm.suggestIntent(m.text, lang.get(m.lang).name);
    return m;
  }));
  app.get('/api/report/:patientId', (req, res) => {
    const r = report(db(), req.params.patientId);
    if (!r) return res.status(404).json({ error: 'Patient not found' });
    if (req.query.view === 'family' && !r.patient.shareWithFamily) return res.status(403).json({ error: 'not shared', shared: false, patient: { id: r.patient.id, name: r.patient.name } });
    res.json(r);
  });
  app.get('/api/measures', (req, res) => res.json(measures(db())));

  // ---- optional keyed services
  app.post('/api/tts', act(async (req) => {
    const b = req.body || {};
    return sarvam.tts(String(b.text || ''), lang.get(b.lang).speechCode);
  }));
  app.post('/api/stt', express.raw({ type: () => true, limit: '5mb' }), act(async (req) => {
    // lang=auto asks Sarvam to detect the language as well as the words.
    const auto = req.query.lang === 'auto';
    const out = await sarvam.stt(req.body, req.headers['content-type'], auto ? 'unknown' : lang.get(req.query.lang).speechCode);
    if (out.languageCode) {
      const code = lang.codes().find((c) => lang.get(c).speechCode === out.languageCode);
      if (code) out.lang = code;
    }
    return out;
  }));
  app.post('/api/twilio/call/:patientId', act(async (req, d) => {
    const st = keys.status();
    if (!st.twilio) throw new keys.KeyNotSet('TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM');
    if (!st.twilioPublicUrl) throw new keys.KeyNotSet('PUBLIC_URL');
    const p = M.patient(d, req.params.patientId);
    if (!p) throw bad('Patient not found');
    const c = flow.startNext(d, p.id);
    c.via = 'twilio';
    await twilio.placeCall(p.phone, c.id);
    return c;
  }));
  const twimlReply = (res, c) => {
    store.save();
    res.type('text/xml').send(twilio.twiml(c, lang.get(M.patient(db(), c.patientId).lang)));
  };
  app.post('/api/twilio/voice', (req, res) => {
    try {
      const c = call(db(), req.query.callId);
      twimlReply(res, c.status === 'ringing' ? flow.answer(db(), c) : c);
    } catch (err) { res.status(400).type('text/xml').send('<Response><Hangup/></Response>'); }
  });
  app.post('/api/twilio/gather', (req, res) => {
    try {
      const c = call(db(), req.query.callId);
      const b = req.body || {};
      let out;
      if (b.Digits) out = flow.key(db(), c, b.Digits);
      else if (req.query.silence || !b.SpeechResult) out = c.stage === 'keypad' ? flow.key(db(), c, null) : flow.reply(db(), c, { silence: true });
      else out = flow.reply(db(), c, { text: b.SpeechResult, confidence: b.Confidence ? Number(b.Confidence) : undefined });
      twimlReply(res, out);
    } catch (err) { res.status(400).type('text/xml').send('<Response><Hangup/></Response>'); }
  });

  // ---- health devices and readings
  app.get('/api/devices/kinds', (req, res) => res.json(H.KINDS));
  app.get('/api/devices', (req, res) => res.json(db().devices.filter((d) => !req.query.patientId || d.patientId === req.query.patientId)));
  app.post('/api/devices', act((req, d) => H.addDevice(d, req.body || {})));
  app.delete('/api/devices/:id', act((req, d) => H.removeDevice(d, req.params.id)));
  app.post('/api/devices/:id/sync', act((req, d) => {
    const dev = d.devices.find((x) => x.id === req.params.id);
    if (!dev) throw bad('Device not found');
    return H.syncSample(d, dev);
  }));
  app.get('/api/readings', (req, res) => {
    let list = db().readings;
    if (req.query.patientId) list = list.filter((r) => r.patientId === req.query.patientId);
    if (req.query.type) list = list.filter((r) => r.type === req.query.type);
    res.json([...list].sort((a, b) => b.at.localeCompare(a.at)).slice(0, Number(req.query.limit) || 200));
  });
  app.post('/api/readings', act((req, d) => {
    const b = req.body || {};
    let { type, value } = b;
    if (b.text) {
      const parsed = parseReading(b.text);
      if (!parsed) throw bad('Could not read that. Try "BP 130 by 85" or "sugar 145 after food".');
      ({ type, value } = parsed);
    }
    const source = ['bluetooth', 'voice', 'typed'].includes(b.source) ? b.source : 'typed';
    return H.addReading(d, { patientId: b.patientId, deviceId: b.deviceId || null, type, value, at: b.at && b.at < d.clock ? b.at : undefined, source, words: b.text || null });
  }));
  app.post('/api/parse-reading', (req, res) => res.json(parseReading((req.body || {}).text)));
  app.get('/api/health/:patientId', (req, res) => {
    // ?lang=<code> translates the feedback lines; without it they stay English for clinician screens.
    const s = H.summary(db(), req.params.patientId, { lang: typeof req.query.lang === 'string' ? req.query.lang : 'en' });
    if (!s) return res.status(404).json({ error: 'Patient not found' });
    if (req.query.view === 'family' && !s.patient.shareWithFamily) return res.status(403).json({ error: 'not shared', shared: false });
    res.json(s);
  });
  app.put('/api/ranges/:patientId', act((req, d) => H.setRanges(d, req.params.patientId, req.body || {}, (req.body || {}).doctor)));

  app.post('/api/reset', act(() => { store.reset(); return { ok: true }; }));

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
  return app;
}

module.exports = { createApp };
