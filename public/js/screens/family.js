// Family: read-only record and weekly report, built from the patient's own words. Only shown when shared.
import { api, esc, icon, config, empty, progress, slotStatus, intentStatus, when, dayName, SLOT_LABEL, flagStatus, store } from '../lib.js';

let el;
let cfg;
let pid = null;

export async function mount(root) {
  el = root;
  cfg = await config();
  el.innerHTML = `
  <div class="ct-stack--lg">
    <div class="ct-row ct-row--between">
      <div><h1>Family</h1><p class="muted">A read-only view for family members, in the patient's own words.</p></div>
      <label class="ct-field"><span class="ct-field__label">Patient</span><select class="ct-select" id="fa-patient"></select></label>
    </div>
    <div id="fa-body"></div>
  </div>`;
  el.querySelector('#fa-patient').addEventListener('change', (e) => { pid = e.target.value; store('ct.family.pid', pid); refresh(); });
  refresh();
}
export function unmount() { el = null; }

export async function refresh() {
  if (!el || !el.querySelector('#fa-body')) return;
  const patients = (await api('/api/patients')).filter((p) => p.verified);
  if (!el) return;
  if (!pid) pid = store('ct.family.pid');
  if (!patients.some((p) => p.id === pid)) pid = patients[0] && patients[0].id;
  const sel = el.querySelector('#fa-patient');
  if (!sel.matches(':focus')) sel.innerHTML = patients.map((p) => `<option value="${esc(p.id)}" ${p.id === pid ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
  const body = el.querySelector('#fa-body');
  if (!pid) { body.innerHTML = empty('No patients yet.', 'user'); return; }

  const res = await fetch(`/api/report/${encodeURIComponent(pid)}?view=family`);
  const r = await res.json();
  if (!el) return;
  if (res.status === 403) {
    body.innerHTML = `<section class="ct-card">${empty(`${r.patient.name} has not chosen to share their record with family.`, 'lock')}</section>`;
    return;
  }
  const rx = r.courses[0];
  const today = r.week[r.week.length - 1].date;
  const h = await api(`/api/health/${encodeURIComponent(pid)}?view=family`).catch(() => null);
  if (!el) return;
  body.innerHTML = `
  <div class="ct-grid">
    <section class="ct-card ct-card--raised ct-col-7 ct-stack">
      <div class="ct-card__head"><h2>This week</h2><p>${esc(r.patient.name)}</p></div>
      ${r.summary.map((s) => `<p>${esc(s)}</p>`).join('')}
      ${rx ? progress(rx.day, rx.days, `Day ${rx.day} of ${rx.days}`, `${rx.medicine}, ${rx.completionPct}% of the course confirmed`) : ''}
      <div class="ct-week" aria-label="Last seven days">${r.week.map((d) => {
        const done = d.taken + d.missed;
        const kind = !done ? 'pending' : d.taken === done ? 'all' : d.taken ? 'some' : 'none';
        const ic = { pending: 'pending', all: 'check', some: 'clock', none: 'missed' }[kind];
        return `<div class="ct-week__day ${d.date === today ? 'ct-week__day--today' : ''}"><span class="ct-week__name">${esc(dayName(d.date))}</span>
          <span class="ct-week__mark ct-week__mark--${kind}">${icon(ic)}</span><span class="ct-week__count">${d.taken}/${d.due}</span>
          <span class="visually-hidden">${d.taken} of ${d.due} doses confirmed</span></div>`;
      }).join('')}</div>
    </section>
    <section class="ct-card ct-col-5">
      <div class="ct-card__head"><h2>Today</h2></div>
      <ul class="ct-list">${r.today.length ? r.today.map((s) => `<li><span>${esc(SLOT_LABEL[s.slot])}</span>${slotStatus(s)}</li>`).join('') : `<li>${empty('No doses today.', 'calendar')}</li>`}</ul>
    </section>
    <section class="ct-card ct-col-7">
      <div class="ct-card__head"><h2 class="ct-section-title">${icon('quote')}In ${esc(r.patient.name.split(' ')[0])}'s own words</h2><p>What was said on the calls</p></div>
      <ul class="ct-list">${r.quotes.length ? r.quotes.map((q) => `<li><span><span class="ct-quote">${esc(q.words)}</span><br><span class="small muted">${when(q.at)}</span></span>${intentStatus(q.intent, q.label)}</li>`).join('') : `<li>${empty('No replies this week.', 'quote')}</li>`}</ul>
    </section>
    <section class="ct-card ct-col-5">
      <div class="ct-card__head"><h2>Care team follow-ups</h2></div>
      <ul class="ct-list">${r.flags.length ? r.flags.slice(0, 6).map((f) => `<li><span>${esc(f.reason)}<br><span class="small muted">${when(f.createdAt)}, ${f.status === 'open' ? 'open' : 'done'}</span></span>${flagStatus(f)}</li>`).join('') : `<li>${empty('Nothing to follow up.')}</li>`}</ul>
      <p class="small muted">Questions about the medicine go to the hospital, not to this page.</p>
    </section>
    ${h ? `<section class="ct-card ct-col-12">
      <div class="ct-card__head"><h2 class="ct-section-title">${icon('watch')}Activity and readings</h2><p>${h.devices.length ? esc(h.devices.map((d) => d.name).join(', ')) : 'No device connected'}</p></div>
      <ul class="ct-feedback">${h.feedback.map((f) => `<li class="ct-feedback__item ct-feedback__item--${esc(f.kind)}">${icon(f.kind === 'flag' ? 'alert' : f.kind === 'ok' ? 'check' : 'info')}<span>${esc(f.text.replace(/\bYour doctor's\b/g, 'The doctor\'s').replace(/\byour doctor's\b/g, 'the doctor\'s').replace(/\byour care team\b/g, 'the care team'))}</span></li>`).join('')}</ul>
      <a class="ct-btn ct-btn--ghost ct-btn--sm" href="#devices">Open health devices</a>
    </section>` : ''}
  </div>`;
}
