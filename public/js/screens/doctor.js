// Doctor: course completion for every patient and every flag with the patient's own words.
import { api, esc, toast, icon, config, empty, skeleton, errorBox, progress, flagStatus, when, langTag } from '../lib.js';

let el;
let cfg;
let loaded = false;
let failCount = 0;

export async function mount(root) {
  el = root;
  rangesReady = false;
  loaded = false;
  failCount = 0;
  el.innerHTML = `
  <div class="ct-stack--lg">
    <div><h1>Doctor</h1><p class="muted">Course completion and what patients said, for the next review.</p></div>
    <section class="ct-card">
      <div class="ct-card__head"><h2 class="ct-section-title">${icon('chart')}Course completion</h2><p>Confirmed doses out of all doses in the course</p></div>
      <div class="ct-table-wrap"><table class="ct-table">
        <thead><tr><th scope="col">Patient</th><th scope="col">Medicine</th><th scope="col">Completion</th><th scope="col">Confirmed when due</th><th scope="col">Not confirmed</th></tr></thead>
        <tbody id="dr-rows" aria-busy="true"><tr><td colspan="5">${skeleton(3)}</td></tr></tbody></table></div>
    </section>
    <section class="ct-card">
      <div class="ct-card__head"><h2 class="ct-section-title">${icon('gauge')}Devices and vitals</h2><p>Last 7 days, against the ranges you set</p></div>
      <div class="ct-table-wrap"><table class="ct-table">
        <thead><tr><th scope="col">Patient</th><th scope="col">Devices</th><th scope="col">Last blood pressure</th><th scope="col">Last sugar</th><th scope="col">Steps a day</th><th scope="col">Outside range</th></tr></thead>
        <tbody id="dr-vitals" aria-busy="true"><tr><td colspan="6">${skeleton(3)}</td></tr></tbody></table></div>
    </section>
    <section class="ct-card">
      <div class="ct-card__head"><h2 class="ct-section-title">${icon('shield')}Alert ranges</h2><p>A reading outside these goes to the nurse. Care Taker gives no advice.</p></div>
      <form class="ct-stack" id="dr-ranges">
        <label class="ct-field ct-dr-patient"><span class="ct-field__label">Patient</span><select class="ct-select" id="dr-r-patient"></select></label>
        <div class="ct-form-grid ct-form-grid--3" id="dr-r-fields" aria-busy="true">${skeleton(3)}</div>
        <div class="ct-row"><button class="ct-btn ct-btn--primary" type="submit">Save ranges</button><span class="small muted" id="dr-r-note" aria-live="polite"></span></div>
      </form>
    </section>
    <section class="ct-card">
      <div class="ct-card__head"><h2 class="ct-section-title">${icon('flag')}Flags with the patient's words</h2></div>
      <ul class="ct-flag-list" id="dr-flags" aria-busy="true"><li>${skeleton(3)}</li></ul>
    </section>
  </div>`;
  el.addEventListener('click', (e) => { if (e.target.closest('button[data-retry]')) refresh(); });
  refresh();
}
export function unmount() { el = null; }

const RANGE_FIELDS = [
  ['bpSysMax', 'Systolic, upper'], ['bpDiaMax', 'Diastolic, upper'], ['bpSysMin', 'Systolic, lower'], ['bpDiaMin', 'Diastolic, lower'],
  ['glucoseFastingMax', 'Sugar fasting, upper'], ['glucoseAfterMealMax', 'Sugar after meal, upper'], ['glucoseMin', 'Sugar, lower'],
  ['heartRateMax', 'Heart rate, upper'], ['heartRateMin', 'Heart rate, lower'], ['spo2Min', 'Oxygen %, lower'], ['stepsGoal', 'Steps goal a day'],
];
let rangesReady = false;

function renderRangeFields(h) {
  if (!el || !h) return;
  const box = el.querySelector('#dr-r-fields');
  box.removeAttribute('aria-busy');
  box.innerHTML = RANGE_FIELDS.map(([k, label]) => `<label class="ct-field"><span class="ct-field__label">${esc(label)}</span><input class="ct-input tabular" name="${k}" type="number" inputmode="numeric" value="${esc(h.ranges[k])}"></label>`).join('');
  el.querySelector('#dr-r-note').textContent = `Set by ${h.rangesSetBy}`;
}

async function loadRanges(patientId) {
  const h = await api(`/api/health/${encodeURIComponent(patientId)}`);
  renderRangeFields(h);
}

function setupRanges(patients, initialHealth) {
  const sel = el.querySelector('#dr-r-patient');
  sel.innerHTML = patients.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
  sel.addEventListener('change', () => loadRanges(sel.value));
  el.querySelector('#dr-ranges').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = { doctor: 'Dr. Rao' };
    for (const i of e.currentTarget.querySelectorAll('input')) body[i.name] = i.value;
    try {
      await api(`/api/ranges/${encodeURIComponent(sel.value)}`, { method: 'PUT', body });
      toast('Ranges saved. New readings are checked against them.');
      loadRanges(sel.value);
    } catch (err) { el.querySelector('#dr-r-note').textContent = err.message; }
  });
  if (initialHealth) renderRangeFields(initialHealth);
  else if (patients[0]) loadRanges(patients[0].id);
  rangesReady = true;
}

export async function refresh() {
  if (!el || !el.querySelector('#dr-rows')) return;
  try {
    const patientsPromise = api('/api/patients');
    const healthPromise = patientsPromise.then((pts) =>
      Promise.all(pts.filter((x) => x.verified).map((p) => api(`/api/health/${encodeURIComponent(p.id)}`)))
    );
    const [c, patients, flags, health] = await Promise.all([config(), patientsPromise, api('/api/flags'), healthPromise]);
    cfg = c;
    if (!el) return;
    failCount = 0;
    const firstLoad = !loaded;
    loaded = true;
    for (const sel of ['#dr-rows', '#dr-vitals', '#dr-r-fields', '#dr-flags']) {
      const node = el.querySelector(sel);
      if (node) {
        node.removeAttribute('aria-busy');
        if (firstLoad) node.classList.add('ct-loaded-fade');
      }
    }
    const rows = [];
    for (const p of patients.filter((x) => x.verified)) {
      const l = cfg.langs.find((x) => x.code === p.lang);
      for (const rx of p.prescriptions) {
        rows.push(`<tr>
          <td data-label="Patient"><strong>${esc(p.name)}</strong>${p.age ? `, ${esc(p.age)}` : ''}<br><span class="small muted">${esc(l ? l.name : p.lang)}</span> ${langTag(l)}</td>
          <td data-label="Medicine">${esc(rx.medicine)} ${esc(rx.dose)}<br><span class="small muted">Day ${rx.day} of ${rx.days}</span></td>
          <td data-label="Completion">${progress(rx.taken, rx.totalDoses, `${rx.completionPct}%`, `${rx.taken} of ${rx.totalDoses} doses`)}</td>
          <td data-label="Confirmed when due" class="tabular">${rx.adherencePct === null ? 'No doses due yet' : `${rx.adherencePct}%`}</td>
          <td data-label="Not confirmed" class="tabular">${rx.missed}</td></tr>`);
      }
    }
    const verified = patients.filter((x) => x.verified);
    if (!rangesReady) setupRanges(verified, health[0]);
    el.querySelector('#dr-vitals').innerHTML = health.map((h) => {
      const steps = h.week.filter((d) => d.steps !== null);
      const avg = steps.length ? Math.round(steps.reduce((a, d) => a + d.steps, 0) / steps.length) : null;
      const out = h.bpWeek.concat(h.glucoseWeek).filter((x) => x.outOfRange).length;
      const v = (r, txt) => (r ? `<span class="tabular">${esc(txt)}</span><br><span class="small muted">${when(r.at)}</span>` : '<span class="muted">None</span>');
      return `<tr>
        <td data-label="Patient"><strong>${esc(h.patient.name)}</strong></td>
        <td data-label="Devices">${h.devices.length ? esc(h.devices.map((d) => d.name).join(', ')) : '<span class="muted">None</span>'}</td>
        <td data-label="Last blood pressure">${v(h.last.bp, h.last.bp ? `${h.last.bp.value.sys}/${h.last.bp.value.dia}` : '')}</td>
        <td data-label="Last sugar">${v(h.last.glucose, h.last.glucose ? `${h.last.glucose.value.mgdl} mg/dL` : '')}</td>
        <td data-label="Steps a day" class="tabular">${avg === null ? '<span class="muted">None</span>' : `${avg.toLocaleString('en-IN')}<br><span class="small muted">goal ${h.ranges.stepsGoal.toLocaleString('en-IN')}</span>`}</td>
        <td data-label="Outside range">${out ? `<span class="ct-status ct-status--later">${icon('alert')}${out} this week</span>` : `<span class="ct-status ct-status--taken">${icon('check')}None</span>`}</td></tr>`;
    }).join('');
    el.querySelector('#dr-rows').innerHTML = rows.join('') || `<tr><td colspan="5">${empty('No verified patients.', 'user')}</td></tr>`;
    el.querySelector('#dr-flags').innerHTML = flags.length ? flags.map((f) => `<li class="ct-flag-item ${f.status === 'closed' ? 'ct-flag-item--closed' : ''}">
        <div class="ct-flag-item__head">${flagStatus(f)}<span class="ct-flag-item__name">${esc(f.patientName || '')}</span><span class="small muted">${when(f.createdAt)}, ${f.status}</span></div>
        <div class="ct-flag-item__body"><p>${esc(f.reason)}</p>
          ${f.words ? `<blockquote class="ct-quote">${esc(f.words)}</blockquote>` : '<p class="small muted">No words recorded</p>'}
          ${f.why ? `<p>Reason given: <span class="ct-quote">${esc(f.why)}</span></p>` : ''}</div></li>`).join('')
      : `<li>${empty('No flags.')}</li>`;
  } catch (err) {
    failCount += 1;
    if (!loaded && el) {
      for (const sel of ['#dr-rows', '#dr-vitals', '#dr-r-fields', '#dr-flags']) {
        const node = el.querySelector(sel);
        if (node) node.removeAttribute('aria-busy');
      }
      el.querySelector('#dr-rows').innerHTML = `<tr><td colspan="5">${errorBox()}</td></tr>`;
      el.querySelector('#dr-vitals').innerHTML = `<tr><td colspan="6">${errorBox()}</td></tr>`;
      el.querySelector('#dr-r-fields').innerHTML = errorBox();
      el.querySelector('#dr-flags').innerHTML = `<li>${errorBox()}</li>`;
    } else if (failCount >= 3) {
      toast('Could not load. Check your connection.', 'error');
    }
  }
}
