// Health devices: pair blood pressure monitors, glucose meters and heart rate straps over Bluetooth,
// connect watches and rings through the phone's health app, add readings by voice or typing,
// and see plain feedback against the doctor's ranges. No advice: anything outside a range goes to a nurse.
import { api, post, esc, icon, toast, busy, empty, store, hm } from '../lib.js';
import * as ble from '../ble.js';
import * as voice from '../voice.js';

let el;
let pid = null;
let kinds = {};
const live = new Map(); // deviceId -> Bluetooth connection

const TYPE_LABEL = { bp: 'Blood pressure', glucose: 'Sugar', heartRate: 'Heart rate', spo2: 'Oxygen', steps: 'Steps', activeCalories: 'Active calories', calories: 'Calories', sleep: 'Sleep' };
const KIND_ICON = { bp: 'gauge', glucose: 'drop', hr: 'waveform', appleWatch: 'watch', androidWatch: 'watch', ring: 'ring' };
const fmt = (n) => (n === null || n === undefined ? 'None yet' : Number(n).toLocaleString('en-IN'));
const sleepText = (m) => (m === null || m === undefined ? 'None yet' : `${Math.floor(m / 60)}h ${m % 60}m`);

export async function mount(root) {
  el = root;
  kinds = await api('/api/devices/kinds');
  el.innerHTML = `
  <div class="ct-stack--lg">
    <div class="ct-row ct-row--between">
      <div data-reveal="up">
        <h1>Health devices</h1>
        <p class="muted">Blood pressure, sugar, steps, calories, heart rate and sleep, next to the dose record.</p>
      </div>
      <label class="ct-field"><span class="ct-field__label">Patient</span><select class="ct-select" id="dv-patient"></select></label>
    </div>
    <div class="ct-notice">${icon('info')}<p>Care Taker shows readings next to the ranges your doctor set. It does not give health advice. A reading outside a range goes to your nurse.</p></div>
    <div class="ct-grid">
      <div class="ct-col-8 ct-stack--lg">
        <section class="ct-card" aria-labelledby="dv-today-t">
          <div class="ct-card__head"><h2 id="dv-today-t" class="ct-section-title">${icon('chart')}Today</h2><p id="dv-synced"></p></div>
          <div class="ct-metrics" id="dv-today" data-reveal-group></div>
        </section>
        <section class="ct-card" aria-labelledby="dv-fb-t">
          <div class="ct-card__head"><h2 id="dv-fb-t" class="ct-section-title">${icon('list')}What your devices show</h2><p>Facts only, against your doctor's ranges</p></div>
          <ul class="ct-feedback" id="dv-feedback"></ul>
        </section>
        <section class="ct-card" aria-labelledby="dv-week-t">
          <div class="ct-card__head"><h2 id="dv-week-t" class="ct-section-title">${icon('calendar')}This week</h2></div>
          <div id="dv-week"></div>
          <div class="ct-grid ct-dv-tables">
            <div class="ct-col-6"><h3>Blood pressure</h3><ul class="ct-list" id="dv-bp"></ul></div>
            <div class="ct-col-6"><h3>Sugar</h3><ul class="ct-list" id="dv-sugar"></ul></div>
          </div>
        </section>
      </div>
      <aside class="ct-col-4 ct-stack--lg">
        <section class="ct-card" aria-labelledby="dv-con-t">
          <div class="ct-card__head"><h2 id="dv-con-t">Connected</h2></div>
          <ul class="ct-list" id="dv-devices"></ul>
        </section>
        <section class="ct-card" aria-labelledby="dv-add-t">
          <div class="ct-card__head"><h2 id="dv-add-t">Add a device</h2></div>
          <ul class="ct-list" id="dv-kinds"></ul>
          <p class="small muted" id="dv-ble-note"></p>
        </section>
        <section class="ct-card" aria-labelledby="dv-read-t">
          <div class="ct-card__head"><h2 id="dv-read-t">Add a reading</h2><p>Say it or type it</p></div>
          <form class="ct-stack" id="dv-read">
            <label class="ct-field"><span class="ct-field__label">Reading</span>
              <input class="ct-input" id="dv-read-text" autocomplete="off" placeholder="BP 130 by 85, or sugar 145 after food"></label>
            <div class="ct-row">
              <button class="ct-btn ct-btn--secondary" type="button" id="dv-read-mic">${icon('mic')}<span>Say it</span></button>
              <button class="ct-btn ct-btn--primary" type="submit">Add</button>
            </div>
            <p class="small muted" id="dv-read-note" aria-live="polite"></p>
          </form>
        </section>
        <section class="ct-card" aria-labelledby="dv-rng-t">
          <div class="ct-card__head"><h2 id="dv-rng-t">Doctor's ranges</h2></div>
          <dl class="ct-dl" id="dv-ranges"></dl>
          <p class="small muted" id="dv-ranges-by"></p>
          <a class="ct-btn ct-btn--ghost ct-btn--sm" href="#doctor">Change on the doctor screen</a>
        </section>
      </aside>
    </div>
  </div>`;

  el.querySelector('#dv-patient').addEventListener('change', (e) => { pid = e.target.value; store('ct.devices.pid', pid); refresh(); });
  el.querySelector('#dv-kinds').addEventListener('click', onAdd);
  el.querySelector('#dv-devices').addEventListener('click', onDevice);
  el.querySelector('#dv-read').addEventListener('submit', (e) => { e.preventDefault(); addTyped(el.querySelector('#dv-read-text').value, 'typed'); });
  el.querySelector('#dv-read-mic').addEventListener('click', sayReading);
  el.querySelector('#dv-ble-note').textContent = ble.bluetoothAvailable()
    ? 'Bluetooth pairing works with monitors that use the standard Bluetooth health formats.'
    : 'Bluetooth pairing needs Chrome on a computer or Android phone, on https or localhost. Sample devices work everywhere.';
  renderKinds();
  refresh();
}

export function unmount() {
  for (const c of live.values()) c.disconnect();
  live.clear();
  voice.stopListening();
  el = null;
}

function renderKinds() {
  el.querySelector('#dv-kinds').innerHTML = Object.entries(kinds).map(([k, v]) => {
    const how = v.via === 'bluetooth' ? 'Pairs here over Bluetooth' : `Through ${v.app} on the phone`;
    const pairBtn = v.via === 'bluetooth'
      ? `<button class="ct-btn ct-btn--secondary ct-btn--sm" type="button" data-pair="${esc(k)}" ${ble.bluetoothAvailable() ? '' : 'disabled'}>Pair</button>` : '';
    return `<li><span class="ct-dv-kind">${icon(KIND_ICON[k] || 'mark')}<span><strong>${esc(v.label)}</strong><br><span class="small muted">${esc(how)}</span></span></span>
      <span class="ct-row">${pairBtn}<button class="ct-btn ct-btn--ghost ct-btn--sm" type="button" data-sample="${esc(k)}">Add sample</button></span></li>`;
  }).join('');
}

async function onAdd(e) {
  const b = e.target.closest('button');
  if (!b || !pid) return;
  if (b.dataset.sample) {
    const k = kinds[b.dataset.sample];
    if (k.via === 'healthApp') toast(`A real ${k.label} connects through ${k.app} in the Care Taker phone app. Showing sample data.`);
    await busy(b, () => post('/api/devices', { patientId: pid, kind: b.dataset.sample, via: 'sample' }));
    toast(`${k.label} added with sample readings`);
    return refresh();
  }
  if (b.dataset.pair) {
    const kind = b.dataset.pair;
    try {
      const dev = await post('/api/devices', { patientId: pid, kind, via: 'bluetooth' });
      const conn = await ble.pair(kind, async (r) => {
        try {
          const out = await post('/api/readings', { patientId: pid, deviceId: dev.id, type: r.type, value: r.value, source: 'bluetooth' });
          toast(out.flag ? 'Reading saved. It is outside your doctor\'s range, so a nurse will look at it.' : 'Reading saved');
          refresh();
        } catch (err) { toast(err.message, 'error'); }
      });
      live.set(dev.id, conn);
      toast(`${conn.name} paired. Take a reading on the device.`);
      refresh();
    } catch (err) {
      toast(err.name === 'NotFoundError' ? 'No device chosen' : err.message, 'error');
      refresh();
    }
  }
}

async function onDevice(e) {
  const b = e.target.closest('button');
  if (!b) return;
  try {
    if (b.dataset.sync) { await busy(b, () => post(`/api/devices/${b.dataset.sync}/sync`)); toast('Synced'); }
    if (b.dataset.remove) {
      const c = live.get(b.dataset.remove);
      if (c) { c.disconnect(); live.delete(b.dataset.remove); }
      await api(`/api/devices/${b.dataset.remove}`, { method: 'DELETE' });
      toast('Device removed. Its past readings stay in the record.');
    }
    refresh();
  } catch (err) { toast(err.message, 'error'); }
}

async function addTyped(text, source) {
  const note = el.querySelector('#dv-read-note');
  if (!text || !text.trim()) { note.textContent = 'Say or type a reading first.'; return; }
  try {
    const out = await post('/api/readings', { patientId: pid, text, source });
    note.textContent = `Saved: ${TYPE_LABEL[out.reading.type]} from "${text}".${out.flag ? ' It is outside your doctor\'s range, so a nurse will look at it.' : ''}`;
    el.querySelector('#dv-read-text').value = '';
    refresh();
  } catch (err) { note.textContent = err.message; }
}

async function sayReading() {
  const note = el.querySelector('#dv-read-note');
  if (!voice.canRecognize()) { note.textContent = 'Speaking a reading needs Chrome. Type it instead.'; return; }
  const btn = el.querySelector('#dv-read-mic');
  btn.disabled = true;
  note.textContent = 'Listening. Say, for example, "BP 130 by 85".';
  const r = await voice.listen({ speechCode: 'en-IN', silenceMs: 8000, onInterim: (t) => { const i = el && el.querySelector('#dv-read-text'); if (i) i.value = t; } });
  if (!el) return;
  btn.disabled = false;
  if (r.text) { el.querySelector('#dv-read-text').value = r.text; addTyped(r.text, 'voice'); }
  else note.textContent = r.error ? `Microphone not available (${r.error}). Type the reading instead.` : 'Nothing heard. Try again or type it.';
}

function metric(value, label, target = '', state = '') {
  return `<div class="ct-metric ${state}"><span class="ct-metric__value">${value}</span><span class="ct-metric__label">${esc(label)}</span>${target ? `<span class="ct-metric__target">${target}</span>` : ''}</div>`;
}

function lastText(r, fn) {
  if (!r) return { v: 'None yet', t: '' };
  return { v: esc(fn(r.value)), t: `${r.outOfRange ? icon('alert') + 'Outside range, nurse told' : icon('check') + 'Inside range'}, ${esc(hm(r.at))}`, bad: r.outOfRange };
}

export async function refresh() {
  if (!el || !el.querySelector('#dv-today')) return;
  const patients = (await api('/api/patients')).filter((p) => p.verified);
  if (!el) return;
  if (!pid) pid = store('ct.devices.pid');
  if (!patients.some((p) => p.id === pid)) pid = patients[0] && patients[0].id;
  const sel = el.querySelector('#dv-patient');
  if (!sel.matches(':focus')) sel.innerHTML = patients.map((p) => `<option value="${esc(p.id)}" ${p.id === pid ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
  if (!pid) return;
  const s = await api(`/api/health/${encodeURIComponent(pid)}`);
  if (!el) return;
  const r = s.ranges;
  const bp = lastText(s.last.bp, (v) => `${v.sys}/${v.dia}`);
  const sugar = lastText(s.last.glucose, (v) => `${v.mgdl}`);
  const hr = s.last.heartRate;
  const stepsMet = s.today.steps !== null && s.today.steps >= r.stepsGoal;
  const tiles = [];
  if (s.today.steps !== null) tiles.push(metric(fmt(s.today.steps), 'Steps', `${icon(stepsMet ? 'check' : 'pending')}Doctor's goal ${fmt(r.stepsGoal)}`, stepsMet ? 'ct-metric--ok' : ''));
  if (s.today.activeCalories !== null) tiles.push(metric(fmt(s.today.activeCalories), 'Active calories, kcal'));
  if (s.today.calories !== null) tiles.push(metric(fmt(s.today.calories), 'Total calories, kcal'));
  if (s.today.sleep !== null) tiles.push(metric(sleepText(s.today.sleep), 'Sleep last night'));
  if (hr) tiles.push(metric(esc(hr.value.bpm), 'Heart rate', `${icon(hr.outOfRange ? 'alert' : 'check')}${hr.outOfRange ? 'Outside range' : 'Inside range'}`, hr.outOfRange ? 'ct-metric--bad' : ''));
  if (s.last.bp) tiles.push(metric(bp.v, 'Blood pressure, mmHg', bp.t, bp.bad ? 'ct-metric--bad' : 'ct-metric--ok'));
  if (s.last.glucose) tiles.push(metric(sugar.v, 'Sugar, mg/dL', sugar.t, sugar.bad ? 'ct-metric--bad' : 'ct-metric--ok'));
  if (s.last.spo2) tiles.push(metric(`${esc(s.last.spo2.value.pct)}%`, 'Oxygen'));
  if (s.today.steps === null) tiles.push(`<div class="ct-metric ct-metric--hint"><span class="ct-metric__label"><strong>Steps, calories and sleep</strong></span><span class="ct-metric__target">${icon('watch')}Add a watch or ring</span></div>`);
  if (!s.last.bp && !s.last.glucose) tiles.push(`<div class="ct-metric ct-metric--hint"><span class="ct-metric__label"><strong>Blood pressure and sugar</strong></span><span class="ct-metric__target">${icon('gauge')}Pair a monitor or say a reading</span></div>`);
  el.querySelector('#dv-today').innerHTML = tiles.join('');
  const lastSync = s.devices.map((d) => d.lastSync).filter(Boolean).sort().pop();
  el.querySelector('#dv-synced').textContent = lastSync ? `Last sync ${hm(lastSync)}` : '';

  el.querySelector('#dv-feedback').innerHTML = s.feedback.map((f) => `<li class="ct-feedback__item ct-feedback__item--${esc(f.kind)}">${icon(f.kind === 'flag' ? 'alert' : f.kind === 'ok' ? 'check' : 'info')}<span>${esc(f.text)}</span></li>`).join('');

  const maxSteps = Math.max(r.stepsGoal, ...s.week.map((d) => d.steps || 0));
  el.querySelector('#dv-week').innerHTML = s.week.some((d) => d.steps !== null) ? `
    <div class="ct-dv-week" aria-label="Steps for the last seven days">
      ${s.week.map((d, i) => `<div class="ct-dv-week__day ${i === 6 ? 'ct-dv-week__day--today' : ''}">
        <span class="ct-dv-week__name">${esc(new Date(d.date + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }))}</span>
        <progress class="ct-dv-week__bar ${d.steps !== null && d.steps >= r.stepsGoal ? 'is-met' : ''}" max="${maxSteps}" value="${d.steps || 0}">${fmt(d.steps)} steps</progress>
        <span class="ct-dv-week__val">${d.steps === null ? 'None' : fmt(d.steps)}</span></div>`).join('')}
    </div><p class="small muted">Steps a day. Filled bars reached the doctor's goal of ${fmt(r.stepsGoal)}.</p>` : '';
  const row = (x, txt) => `<li><span><strong class="tabular">${esc(txt)}</strong><br><span class="small muted">${esc(new Date(x.at).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', weekday: 'short' }))} ${esc(hm(x.at))}, ${esc(x.source === 'sample' ? 'sample device' : x.source)}</span></span>${x.outOfRange ? `<span class="ct-status ct-status--later">${icon('alert')}Nurse told</span>` : `<span class="ct-status ct-status--taken">${icon('check')}In range</span>`}</li>`;
  el.querySelector('#dv-bp').innerHTML = s.bpWeek.length ? s.bpWeek.slice(0, 6).map((x) => row(x, `${x.value.sys}/${x.value.dia}${x.value.pulse ? `, pulse ${x.value.pulse}` : ''}`)).join('') : `<li>${empty('No blood pressure readings this week.', 'gauge')}</li>`;
  el.querySelector('#dv-sugar').innerHTML = s.glucoseWeek.length ? s.glucoseWeek.slice(0, 6).map((x) => row(x, `${x.value.mgdl} mg/dL${x.value.context ? `, ${x.value.context}` : ''}`)).join('') : `<li>${empty('No sugar readings this week.', 'drop')}</li>`;

  el.querySelector('#dv-devices').innerHTML = s.devices.length ? s.devices.map((d) => `<li>
      <span class="ct-dv-kind">${icon(KIND_ICON[d.kind] || 'mark')}<span><strong>${esc(d.name)}</strong><br><span class="small muted">${d.via === 'bluetooth' ? (live.has(d.id) ? 'Bluetooth, connected' : 'Bluetooth, pair again to read') : `Sample data${d.app ? `, real one via ${esc(d.app)}` : ''}`}${d.lastSync ? `, synced ${esc(hm(d.lastSync))}` : ''}</span></span></span>
      <span class="ct-row">${d.via === 'sample' ? `<button class="ct-btn ct-btn--ghost ct-btn--sm" type="button" data-sync="${esc(d.id)}">Sync</button>` : ''}<button class="ct-btn ct-btn--ghost ct-btn--sm" type="button" data-remove="${esc(d.id)}" aria-label="Remove ${esc(d.name)}">Remove</button></span></li>`).join('')
    : `<li>${empty('No device yet. Add one below.', 'mark')}</li>`;

  const dl = [
    ['Blood pressure', `${r.bpSysMin}/${r.bpDiaMin} to ${r.bpSysMax}/${r.bpDiaMax}`],
    ['Sugar, fasting', `${r.glucoseMin} to ${r.glucoseFastingMax} mg/dL`],
    ['Sugar, after meal', `${r.glucoseMin} to ${r.glucoseAfterMealMax} mg/dL`],
    ['Heart rate', `${r.heartRateMin} to ${r.heartRateMax}`],
    ['Oxygen', `from ${r.spo2Min}%`],
    ['Steps goal', `${fmt(r.stepsGoal)} a day`],
  ];
  el.querySelector('#dv-ranges').innerHTML = dl.map(([k, v]) => `<dt>${esc(k)}</dt><dd class="tabular">${esc(v)}</dd>`).join('');
  el.querySelector('#dv-ranges-by').textContent = `Set by ${s.rangesSetBy}.`;
}
