// Patient phone: a keypad phone that rings at each dose time and talks in the patient's language.
import { api, post, esc, icon, hm, toast, busy, config, langTag, intentStatus, SLOT_LABEL, store, clockTime } from '../lib.js';
import * as voice from '../voice.js';

const RING_TIMEOUT_MS = 20000;
const KEY_TIMEOUT_MS = 10000;

let el;
let cfg;
let patients = [];
let pid = null;
let L = null;            // language info of the selected patient
let call = null;
let phase = 'idle';      // idle | ringing | speaking | listening | typing | waitingKey | processing | ended
let token = 0;           // bumps on unmount or patient change, so stale async work stops
let ringTimer = null;
let keyTimer = null;
let keyDeadline = 0;
let interim = '';
let heard = null;
let micNote = '';
let voiceLabel = '';
let lastTranscriptLen = -1;
let lastChipState = 'none';
let lastChipLabel = '';
let lastChipCallId = null;

const OUTCOME = {
  taken: 'Dose logged', postponed: 'Call rescheduled', urgent: 'Urgent: a nurse will call',
  stopped: 'Stopped early: care team told', missed: 'Missed: care team told', optOut: 'Calls stopped: care team told',
};

const OUTCOME_CHIP = {
  taken: 'taken',
  postponed: 'later',
  urgent: 'urgent',
  stopped: 'stopped',
  missed: 'missed',
  optOut: 'optOut',
};

export function doseChipState(c) {
  if (!c) return 'none';
  if (c.status === 'active' && c.pendingTaken) return 'pending';
  if (c.status === 'ended') return OUTCOME_CHIP[c.outcome] || 'none';
  return 'none';
}

export function renderDoseChip(c, { animate = false } = {}) {
  const state = doseChipState(c);
  if (state === 'none') return '';
  const slotMatch = c && c.transcript && c.transcript[0] && /for the (\w+) dose/.exec(c.transcript[0].text || '');
  const slotKey = (c && c.slot) || (slotMatch && slotMatch[1]) || '';
  const slotText = SLOT_LABEL[slotKey] || 'Dose';
  const timeText = state === 'pending'
    ? hm(c.pendingTaken && c.pendingTaken.at)
    : hm((state === 'taken' && c.pendingTaken && c.pendingTaken.at) || c.endedAt || c.startedAt);
  const slotTime = timeText ? `${slotText}, <time class="ct-dose-chip__time tabular">${esc(timeText)}</time>` : esc(slotText);

  const map = {
    pending: ['pending', 'pending', c.stage === 'keypad' ? 'Waiting for key 1' : 'Waiting for your yes'],
    taken: ['taken', 'check', 'Dose confirmed'],
    later: ['later', 'clock', OUTCOME.postponed],
    urgent: ['urgent', 'alert', OUTCOME.urgent],
    stopped: ['stopped', 'stop', OUTCOME.stopped],
    missed: ['missed', 'missed', OUTCOME.missed],
    optOut: ['stopped', 'stop', OUTCOME.optOut],
  };
  const [kind, ic, label] = map[state] || map.pending;
  const checkSvg = state === 'taken'
    ? '<svg class="ct-icon ct-dose-chip__check" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path class="ct-dose-chip__stroke" pathLength="1" d="M8 12.5l2.5 2.5L16 9.5"/></svg>'
    : icon(ic);
  return `<div class="ct-dose-chip ct-status ct-status--${kind}${animate ? ' is-entering' : ''}" data-state="${esc(state)}" aria-hidden="true">
    ${checkSvg}
    <span class="ct-dose-chip__body"><span class="ct-dose-chip__slot">${slotTime}</span><span class="ct-dose-chip__sep" aria-hidden="true">&middot;</span><strong class="ct-dose-chip__label">${esc(label)}</strong></span>
  </div>`;
}

export function mount(root) {
  el = root;
  token += 1;
  el.innerHTML = `
  <div class="ct-stack--lg">
    <div class="ct-row ct-row--between">
      <div><h1>Patient phone</h1><p class="muted">What the patient hears and says. Calls follow the simulated clock.</p></div>
    </div>
    <div class="ct-grid">
      <div class="ct-col-5">
        <div class="ct-phone" id="ph" aria-label="Keypad phone">
          <div class="ct-phone__speaker"></div>
          <div class="ct-phone__screen">
            <div class="ct-phone__status"><span id="ph-who">No patient</span><span id="ph-time"></span></div>
            <div class="ct-phone__caller">
              <div class="ct-phone__avatar">${icon('mark')}</div>
              <div class="ct-phone__caller-name">Care Taker</div>
              <div class="muted small" id="ph-sub">Waiting for the next dose</div>
            </div>
            <div class="ct-phone__transcript" id="ph-transcript" aria-live="polite"></div>
            <div class="ct-phone__live" id="ph-live"></div>
            <div class="ct-phone__heard" id="ph-heard"></div>
            <div class="ct-phone__chip" id="ph-chip" aria-hidden="true"></div>
          </div>
          <div class="ct-phone__state" id="ph-state" role="status"></div>
          <div class="ct-phone__call-keys">
            <button class="ct-key ct-key--answer" id="ph-answer" type="button">${icon('phone')}<span data-ui="answer">Answer</span></button>
            <button class="ct-key ct-key--decline" id="ph-decline" type="button">${icon('phone-down')}<span data-ui="decline">Decline</span></button>
          </div>
          <div class="ct-phone__keys" id="ph-keys">
            <button class="ct-key" type="button" data-key="1"><span class="ct-key__num">1</span><span class="ct-key__hint" data-ui="keyTaken">Taken</span></button>
            <button class="ct-key" type="button" data-key="2"><span class="ct-key__num">2</span><span class="ct-key__hint" data-ui="keyLater">Later</span></button>
            <button class="ct-key" type="button" data-key="3"><span class="ct-key__num">3</span><span class="ct-key__hint" data-ui="keyNurse">Nurse</span></button>
            <button class="ct-key ct-key--wide" type="button" data-key="9"><span class="ct-key__num">9</span><span class="ct-key__hint" data-ui="keyStop">Stop calls</span></button>
          </div>
        </div>
      </div>
      <div class="ct-col-7 ct-stack">
        <section class="ct-card">
          <div class="ct-card__head"><h2>Simulation</h2><p>One press moves the clock to the patient's next dose</p></div>
          <div class="ct-stack">
            <div class="ct-form-grid">
              <label class="ct-field"><span class="ct-field__label">Patient</span>
                <select class="ct-select" id="ph-patient"></select></label>
              <label class="ct-field"><span class="ct-field__label">Call language</span>
                <select class="ct-select" id="ph-lang"></select></label>
            </div>
            <div id="ph-info" class="muted small"></div>
            <div class="ct-row">
              <button class="ct-btn ct-btn--primary" id="ph-next" type="button">${icon('forward')}Next slot</button>
              <button class="ct-btn ct-btn--secondary" id="ph-real" type="button">${icon('phone')}Call real phone</button>
            </div>
            <p class="ct-field__error" id="ph-real-err"></p>
          </div>
        </section>
        <section class="ct-card">
          <div class="ct-card__head"><h2>Reply without a microphone</h2><p>Type, or tap what the patient says</p></div>
          <form class="ct-stack" id="ph-type">
            <div id="ph-micnote"></div>
            <label class="ct-field"><span class="ct-field__label">Patient says</span>
              <input class="ct-input" id="ph-text" autocomplete="off" placeholder="For example: le li"></label>
            <button class="ct-btn ct-btn--secondary" type="submit" id="ph-send">Send reply</button>
            <div class="ct-choices" id="ph-samples"></div>
          </form>
        </section>
        <section class="ct-card">
          <div class="ct-card__head"><h2>Voice</h2></div>
          <p id="ph-voice" class="small"></p>
        </section>
      </div>
    </div>
  </div>`;

  el.querySelector('#ph-patient').addEventListener('change', (e) => selectPatient(e.target.value));
  el.querySelector('#ph-lang').addEventListener('change', (e) => changeLanguage(e.target.value));
  el.querySelector('#ph-next').addEventListener('click', (e) => nextSlot(e.currentTarget));
  el.querySelector('#ph-real').addEventListener('click', (e) => realCall(e.currentTarget));
  el.querySelector('#ph-answer').addEventListener('click', answer);
  el.querySelector('#ph-decline').addEventListener('click', () => decline('Declined'));
  el.querySelectorAll('[data-key]').forEach((b) => b.addEventListener('click', () => pressKey(b.dataset.key)));
  el.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
    if (['1', '2', '3', '9'].includes(e.key)) {
      e.preventDefault();
      pressKey(e.key);
    }
  });
  el.querySelector('#ph-type').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = el.querySelector('#ph-text');
    if (input.value.trim()) typed(input.value.trim());
    input.value = '';
  });
  el.querySelector('#ph-samples').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-sample]');
    if (chip) typed(chip.dataset.sample);
  });
  init(token);
}

export function unmount() {
  token += 1;
  cleanup();
}

function cleanup() {
  voice.stopRing();
  voice.stopListening();
  voice.stopSpeaking();
  voice.stopMeter();
  clearTimeout(ringTimer);
  clearInterval(keyTimer);
}

async function init(t) {
  cfg = await config();
  patients = await api('/api/patients');
  if (t !== token) return;
  const stored = store('ct.phone.pid');
  const first = patients.find((p) => p.verified) || patients[0];
  pid = patients.some((p) => p.id === stored) ? stored : first && first.id;
  renderSelect();
  await selectPatient(pid);
}

function renderSelect() {
  const sel = el.querySelector('#ph-patient');
  sel.innerHTML = patients.map((p) => `<option value="${esc(p.id)}" ${p.id === pid ? 'selected' : ''} ${p.verified ? '' : 'disabled'}>${esc(p.name)}${p.verified ? '' : ' (not verified yet)'}${p.callsStopped ? ' (calls stopped)' : ''}</option>`).join('');
  const langSel = el.querySelector('#ph-lang');
  if (langSel && cfg && cfg.langs && !langSel.matches(':focus')) {
    const p = patients.find((x) => x.id === pid);
    const curLang = (p && p.lang) || (L && L.code) || 'en';
    langSel.innerHTML = cfg.langs.map((l) => `<option value="${esc(l.code)}" ${l.code === curLang ? 'selected' : ''}>${esc(l.name)} (${esc(l.nativeName)})</option>`).join('');
  }
}

async function changeLanguage(code) {
  if (!pid || !code) return;
  token += 1;
  cleanup();
  await api(`/api/patients/${encodeURIComponent(pid)}`, { method: 'PATCH', body: { lang: code } });
  patients = await api('/api/patients');
  const p = patients.find((x) => x.id === pid);
  L = cfg.langs.find((l) => l.code === (p && p.lang)) || cfg.langs[0];
  const clips = (cfg.audio && cfg.audio[L.code]) || [];
  voiceLabel = (await voice.outputMode(L.speechCode, cfg.keys.sarvam, clips)).label;
  lastTranscriptLen = -1;
  renderSelect();
  await refresh();
  toast(`Language set to ${L.name} (${L.nativeName})`);
}

async function selectPatient(id) {
  if (!id) { renderPhone(); return; }
  if (phase !== 'idle' && phase !== 'ended' && pid !== id) { token += 1; cleanup(); }
  pid = id;
  store('ct.phone.pid', id);
  const p = patients.find((x) => x.id === id);
  L = cfg.langs.find((l) => l.code === (p && p.lang)) || cfg.langs[0];
  call = null; phase = 'idle'; heard = null; interim = ''; lastTranscriptLen = -1;
  lastChipState = 'none'; lastChipLabel = ''; lastChipCallId = null;
  const clips = (cfg.audio && cfg.audio[L.code]) || [];
  const out = await voice.outputMode(L.speechCode, cfg.keys.sarvam, clips);
  voiceLabel = out.label;
  micNote = voice.canRecognize() ? '' : (cfg.keys.sarvam ? 'This browser has no speech recognition. Sarvam speech to text will be used.' : 'This browser has no speech recognition. Use Chrome, or type the reply here.');
  renderSelect();
  await refresh();
}

export async function refresh() {
  if (!el || !pid) return;
  const t = token;
  patients = await api('/api/patients');
  if (t !== token) return;
  const p = patients.find((x) => x.id === pid);
  if (p && cfg && (!L || L.code !== p.lang)) {
    L = cfg.langs.find((l) => l.code === p.lang) || cfg.langs[0];
    const clips = (cfg.audio && cfg.audio[L.code]) || [];
    voiceLabel = (await voice.outputMode(L.speechCode, cfg.keys.sarvam, clips)).label;
    lastTranscriptLen = -1;
  }
  if (!el.querySelector('#ph-patient').matches(':focus')) renderSelect();
  const latest = (await api(`/api/calls?patientId=${encodeURIComponent(pid)}&limit=1`))[0] || null;
  if (t !== token) return;
  const quiet = phase === 'idle' || phase === 'ended';
  if (quiet) {
    call = latest;
    // A call started elsewhere (for example the API) rings here too.
    if (call && call.status === 'ringing') onRinging();
    else if (call && call.status === 'active') phase = 'typing';
    else if (call && call.status === 'ended') phase = 'ended';
  }
  renderPhone();
}

// ---- rendering --------------------------------------------------------------

function renderPhone() {
  if (!el) return;
  // Keys and call buttons speak the patient's language too.
  if (L && L.ui) el.querySelectorAll('[data-ui]').forEach((n) => { if (L.ui[n.dataset.ui]) n.textContent = L.ui[n.dataset.ui]; });
  const p = patients.find((x) => x.id === pid);
  const ph = el.querySelector('#ph');
  ph.classList.toggle('ct-phone--ringing', phase === 'ringing');
  ph.classList.toggle('ct-phone--keypad', phase === 'waitingKey');
  el.querySelector('#ph-who').textContent = p ? `${p.name}, ${p.phoneType === 'keypad' ? 'keypad phone' : 'smartphone'}` : 'No patient';
  el.querySelector('#ph-time').textContent = clockTime();

  const sub = el.querySelector('#ph-sub');
  if (!call || (call.status === 'ended' && phase === 'idle')) sub.textContent = p && p.nextDue ? `Next dose call at ${hm(p.nextDue)}` : 'Waiting for the next dose';
  else if (call.status === 'ringing') sub.textContent = `Incoming call, ring ${call.rings} of ${cfg.maxRings}`;
  else if (call.status === 'active') sub.textContent = 'On call';
  else sub.textContent = `Call ended: ${OUTCOME[call.outcome] || call.outcome}`;

  // Transcript
  const box = el.querySelector('#ph-transcript');
  const items = call ? call.transcript : [];
  if (items.length !== lastTranscriptLen) {
    lastTranscriptLen = items.length;
    box.innerHTML = items.length ? items.map(line).join('') : `<p class="ct-phone__line ct-phone__line--system">No call yet</p>`;
    box.scrollTop = box.scrollHeight;
  }
  el.querySelector('#ph-live').textContent = phase === 'listening' && interim ? interim : '';
  el.querySelector('#ph-heard').innerHTML = heard
    ? `<strong>Heard:</strong> <span>${esc(heard.text || '(silence)')}</span> <span aria-hidden="true">&rarr;</span> ${intentStatus(heard.intent, heard.label)}${heard.minutes ? `<span class="tabular">${heard.minutes} min</span>` : ''}`
    : '';

  // Dose confirmation chip (P1): animate only when doseChipState changes from the previous render
  const chipBox = el.querySelector('#ph-chip');
  const nextChipState = doseChipState(call);
  const nextChipLabel = nextChipState === 'pending' ? (call && call.stage === 'keypad' ? 'keypad' : 'confirm') : nextChipState;
  const callId = call ? call.id : null;
  if (nextChipState !== lastChipState || nextChipLabel !== lastChipLabel || callId !== lastChipCallId) {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const stateChanged = nextChipState !== lastChipState || callId !== lastChipCallId;
    chipBox.innerHTML = renderDoseChip(call, { animate: !reduce && stateChanged });
    lastChipState = nextChipState;
    lastChipLabel = nextChipLabel;
    lastChipCallId = callId;
  }

  // State line
  const state = el.querySelector('#ph-state');
  const endedLabel = nextChipState === 'taken' ? `${icon('check')}Dose confirmed and logged` : `${icon('check')}Call ended`;
  const states = {
    idle: `${icon('clock')}Press Next slot to ring`,
    ringing: `${icon('phone')}Ringing`,
    speaking: `${icon('mark')}Care Taker is speaking`,
    listening: `<span class="ct-mic" id="ph-mic" data-level="0"><span></span><span></span><span></span><span></span><span></span></span>Listening, speak now`,
    typing: `${icon('keypad')}Type a reply or press a key`,
    waitingKey: `${icon('keypad')}Press a key: <span class="tabular" id="ph-count">${Math.max(0, Math.ceil((keyDeadline - Date.now()) / 1000))}</span>s`,
    processing: `${icon('pending')}Understanding the reply`,
    ended: endedLabel,
  };
  const stateKey = phase === 'ended' ? `ended:${nextChipState}` : phase;
  if (state.dataset.phase !== stateKey) { state.innerHTML = states[phase]; state.dataset.phase = stateKey; }

  // Controls
  const ringing = phase === 'ringing';
  el.querySelector('#ph-answer').disabled = !ringing;
  el.querySelector('#ph-decline').disabled = !ringing;
  const canKey = ['listening', 'typing', 'waitingKey'].includes(phase);
  el.querySelectorAll('[data-key]').forEach((b) => { b.disabled = !canKey; });
  const canType = phase === 'listening' || phase === 'typing';
  el.querySelector('#ph-text').disabled = !canType;
  el.querySelector('#ph-send').disabled = !canType;
  el.querySelector('#ph-next').disabled = !p || !p.verified || p.callsStopped || !(phase === 'idle' || phase === 'ended');
  el.querySelector('#ph-samples').innerHTML = (L ? L.samples : []).map((s) => `<button type="button" class="ct-chip" data-sample="${esc(s)}" ${canType ? '' : 'disabled'}>${esc(s)}</button>`).join('');
  el.querySelector('#ph-micnote').innerHTML = micNote ? `<div class="ct-notice ct-notice--warn">${icon('mic')}<p>${esc(micNote)}</p></div>` : '';
  el.querySelector('#ph-voice').innerHTML = L ? `${esc(L.name)} (${esc(L.nativeName)}), speech code ${esc(L.speechCode)} ${langTag(L)}<br>${esc(voiceLabel)}<br>Speech recognition: ${voice.canRecognize() ? 'available in this browser' : 'not available in this browser'}` : '';
  const info = el.querySelector('#ph-info');
  if (p) {
    const rx = p.prescriptions[0];
    info.innerHTML = rx ? `${esc(rx.medicine)} ${esc(rx.dose)}, day ${rx.day} of ${rx.days}. ${p.nextDue ? `Next dose ${esc(hm(p.nextDue))}.` : 'No doses left.'}${p.callsStopped ? ' The patient asked to stop calls.' : ''}` : 'No prescription yet.';
  }
}

function line(t) {
  if (t.who === 'system') return `<p class="ct-phone__line ct-phone__line--system">${esc(t.text)}</p>`;
  if (t.who === 'bot') {
    const isEn = L && L.code === 'en';
    const mainText = (isEn && t.en) ? t.en : t.text;
    const en = (!isEn && t.en && t.en !== mainText) ? `<span class="ct-phone__line-en">${esc(t.en)}</span>` : '';
    return `<p class="ct-phone__line ct-phone__line--bot" lang="${esc(L ? L.code : 'en')}">${esc(mainText)}${en}</p>`;
  }
  return `<p class="ct-phone__line ct-phone__line--patient">${esc(t.text || '(silence)')}<span class="ct-phone__line-en">${esc(t.label || '')}</span></p>`;
}

// ---- call actions -------------------------------------------------------------

function setPhase(next) { phase = next; renderPhone(); }

async function nextSlot(btn) {
  try {
    const c = await busy(btn, () => post('/api/slots/next', { patientId: pid }));
    call = c; heard = null; lastTranscriptLen = -1;
    if (c.status === 'ringing') onRinging();
    else if (c.status === 'active') setPhase('typing');
    window.dispatchEvent(new Event('ct:refresh'));
  } catch (err) { toast(err.message, 'error'); }
}

async function realCall(btn) {
  const errEl = el.querySelector('#ph-real-err');
  errEl.textContent = '';
  try {
    const c = await busy(btn, () => post(`/api/twilio/call/${encodeURIComponent(pid)}`));
    toast('Calling the real phone');
    call = c;
  } catch (err) {
    errEl.innerHTML = `${icon('alert')}${esc(err.status === 503 ? `${err.message}. Add Twilio keys and PUBLIC_URL to .env to place a real call.` : err.message)}`;
  }
}

function onRinging() {
  if (phase === 'ringing') return;
  setPhase('ringing');
  voice.startRing();
  clearTimeout(ringTimer);
  ringTimer = setTimeout(() => decline('No answer'), RING_TIMEOUT_MS);
}

async function answer() {
  const t = token;
  voice.stopRing();
  clearTimeout(ringTimer);
  setPhase('processing');
  try {
    const c = await post(`/api/calls/${call.id}/answer`);
    if (t === token) await processTurn(c, t);
  } catch (err) { toast(err.message, 'error'); setPhase('idle'); }
}

async function decline(reason) {
  voice.stopRing();
  clearTimeout(ringTimer);
  if (!call || call.status !== 'ringing') return;
  const t = token;
  phase = 'processing';
  try {
    const c = await post(`/api/calls/${call.id}/decline`, { reason });
    if (t !== token) return;
    call = c;
    if (c.status === 'ringing') {
      const again = [...c.transcript].reverse().map((x) => /Ringing again at (\d\d:\d\d)/.exec(x.text || '')).find(Boolean);
      toast(`${reason}. Ringing again at ${again ? again[1] : clockTime()}, ring ${c.rings} of ${cfg.maxRings}`);
      phase = 'idle';
      setTimeout(() => { if (t === token) onRinging(); }, 1200);
    } else {
      toast(OUTCOME.missed);
      setPhase('ended');
    }
    window.dispatchEvent(new Event('ct:refresh'));
  } catch (err) { toast(err.message, 'error'); setPhase('idle'); }
}

async function processTurn(c, t) {
  const wasTaken = doseChipState(call) === 'taken';
  call = c;
  lastTranscriptLen = -1;
  if (!wasTaken && doseChipState(c) === 'taken') voice.playConfirmTone();
  // The patient answered in another language: follow them for the rest of the call.
  if (c.lang && L && c.lang !== L.code) {
    const next = cfg.langs.find((l) => l.code === c.lang);
    if (next) {
      L = next;
      const clips = (cfg.audio && cfg.audio[L.code]) || [];
      voiceLabel = (await voice.outputMode(L.speechCode, cfg.keys.sarvam, clips)).label;
      renderSelect();
      toast(`Language switched to ${L.name} (${L.nativeName})`);
    }
  }
  const turn = c.turn;
  setPhase('speaking');
  voice.stopListening();
  voice.stopSpeaking();
  for (const l of turn.say) {
    if (t !== token) return;
    const lineLang = l.lang || L.code;
    const lineLangCfg = cfg.langs.find((x) => x.code === lineLang) || L;
    await voice.speakLine(l, lineLangCfg.speechCode, { sarvamKey: cfg.keys.sarvam, clips: (cfg.audio && cfg.audio[lineLang]) || [] });
  }
  if (t !== token) return;
  if (turn.expect === 'speech') return doListen(t);
  if (turn.expect === 'key') return waitForKey(t);
  setPhase('ended');
  if (c.outcome === 'postponed') {
    const slots = await api(`/api/slots?patientId=${encodeURIComponent(pid)}`);
    const s = slots.find((x) => x.id === c.slotId);
    toast(`Call rescheduled to ${s ? hm(s.due) : 'later'}`);
  } else if (c.outcome !== 'taken') {
    toast(OUTCOME[c.outcome] || 'Call ended');
  }
  window.dispatchEvent(new Event('ct:refresh'));
}

async function doListen(t) {
  interim = '';
  if (!voice.canRecognize()) {
    if (!cfg.keys.sarvam) return setPhase('typing');
    setPhase('listening');
    try {
      const r = await voice.recordAndTranscribe(L.code);
      if (t === token && phase === 'listening') return sendReply({ text: r.text, confidence: r.confidence }, t);
    } catch (err) { micNote = err.message; if (t === token) setPhase('typing'); }
    return;
  }
  setPhase('listening');
  voice.startMeter((lvl) => { const m = el && el.querySelector('#ph-mic'); if (m) m.dataset.level = String(lvl); });
  const r = await voice.listen({ speechCode: L.speechCode, onInterim: (txt) => { interim = txt; renderPhone(); } });
  voice.stopMeter();
  if (t !== token || r.aborted) return;
  if (r.error) {
    micNote = r.error === 'not-allowed' || r.error === 'service-not-allowed'
      ? 'Microphone is blocked. Allow the microphone in Chrome, or type the reply here.'
      : `Speech recognition stopped (${r.error}). Type the reply here or press a key.`;
    return setPhase('typing');
  }
  micNote = '';
  return sendReply(r.silence ? { silence: true } : { text: r.text, confidence: r.confidence }, t);
}

async function sendReply(body, t = token) {
  setPhase('processing');
  try {
    const c = await post(`/api/calls/${call.id}/reply`, body);
    if (t !== token) return;
    const said = [...c.transcript].reverse().find((x) => x.who === 'patient');
    heard = said || null;
    await processTurn(c, t);
  } catch (err) { toast(err.message, 'error'); setPhase('typing'); }
}

function typed(text) {
  if (!(phase === 'listening' || phase === 'typing')) return;
  voice.stopListening();
  voice.stopMeter();
  sendReply({ text, via: 'typed' });
}

function waitForKey(t) {
  keyDeadline = Date.now() + KEY_TIMEOUT_MS;
  setPhase('waitingKey');
  clearInterval(keyTimer);
  keyTimer = setInterval(async () => {
    if (t !== token) return clearInterval(keyTimer);
    const left = Math.ceil((keyDeadline - Date.now()) / 1000);
    const count = el.querySelector('#ph-count');
    if (count) count.textContent = String(Math.max(0, left));
    if (left <= 0) {
      clearInterval(keyTimer);
      sendKey(null, t);
    }
  }, 250);
}

function pressKey(k) {
  if (!['listening', 'typing', 'waitingKey'].includes(phase)) return;
  voice.stopListening();
  voice.stopMeter();
  clearInterval(keyTimer);
  sendKey(k, token);
}

async function sendKey(k, t) {
  setPhase('processing');
  try {
    const c = await post(`/api/calls/${call.id}/key`, { key: k });
    if (t !== token) return;
    heard = [...c.transcript].reverse().find((x) => x.who === 'patient') || null;
    await processTurn(c, t);
  } catch (err) { toast(err.message, 'error'); setPhase('typing'); }
}

