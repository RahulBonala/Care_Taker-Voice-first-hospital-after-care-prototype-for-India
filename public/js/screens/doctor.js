// Doctor: course completion for every patient and every flag with the patient's own words.
import { api, esc, icon, config, empty, progress, flagStatus, when, langTag } from '../lib.js';

let el;
let cfg;

export async function mount(root) {
  el = root;
  cfg = await config();
  el.innerHTML = `
  <div class="ct-stack--lg">
    <div><h1>Doctor</h1><p class="muted">Course completion and what patients said, for the next review.</p></div>
    <section class="ct-card">
      <div class="ct-card__head"><h2 class="ct-section-title">${icon('chart')}Course completion</h2><p>Confirmed doses out of all doses in the course</p></div>
      <div class="ct-table-wrap"><table class="ct-table">
        <thead><tr><th scope="col">Patient</th><th scope="col">Medicine</th><th scope="col">Completion</th><th scope="col">Confirmed when due</th><th scope="col">Not confirmed</th></tr></thead>
        <tbody id="dr-rows"></tbody></table></div>
    </section>
    <section class="ct-card">
      <div class="ct-card__head"><h2 class="ct-section-title">${icon('flag')}Flags with the patient's words</h2></div>
      <ul class="ct-flag-list" id="dr-flags"></ul>
    </section>
  </div>`;
  refresh();
}
export function unmount() { el = null; }

export async function refresh() {
  if (!el || !el.querySelector('#dr-rows')) return;
  const [patients, flags] = await Promise.all([api('/api/patients'), api('/api/flags')]);
  if (!el) return;
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
  el.querySelector('#dr-rows').innerHTML = rows.join('') || `<tr><td colspan="5">${empty('No verified patients.', 'user')}</td></tr>`;
  el.querySelector('#dr-flags').innerHTML = flags.length ? flags.map((f) => `<li class="ct-flag-item ${f.status === 'closed' ? 'ct-flag-item--closed' : ''}">
      <div class="ct-flag-item__head">${flagStatus(f)}<span class="ct-flag-item__name">${esc(f.patientName || '')}</span><span class="small muted">${when(f.createdAt)}, ${f.status}</span></div>
      <div class="ct-flag-item__body"><p>${esc(f.reason)}</p>
        ${f.words ? `<blockquote class="ct-quote">${esc(f.words)}</blockquote>` : '<p class="small muted">No words recorded</p>'}
        ${f.why ? `<p>Reason given: <span class="ct-quote">${esc(f.why)}</span></p>` : ''}</div></li>`).join('')
    : `<li>${empty('No flags.')}</li>`;
}
