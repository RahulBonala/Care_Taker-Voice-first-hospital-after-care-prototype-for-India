// Nurse board: verify patients, work through flags (most urgent first), watch the measures, review misheard replies.
import { api, post, esc, icon, toast, busy, config, langTag, empty, skeleton, errorBox, flagStatus, when, hm, progress, store, setClock, clockIso, waitLabel } from '../lib.js';

let el;
let cfg;
let showClosed = store('ct.nurse.closed') === '1';
let loaded = false;
let failCount = 0;
let prevMetrics = null;
let prevFlags = null;
let prevPatients = null;

export async function mount(root) {
  el = root;
  loaded = false;
  failCount = 0;
  prevMetrics = null;
  prevFlags = null;
  prevPatients = null;
  el.innerHTML = `
  <div class="ct-stack--lg">
    <div class="ct-row ct-row--between">
      <div><h1>Nurse board</h1><p class="muted">Verify new patients and call back anyone who needs a person.</p></div>
      <button class="ct-btn ct-btn--danger" id="nb-reset" type="button">${icon('refresh')}Reset sample data</button>
    </div>
    <section class="ct-card" aria-labelledby="nb-m-title">
      <div class="ct-card__head"><h2 id="nb-m-title" class="ct-section-title">${icon('chart')}Measures</h2><p>All patients, live</p></div>
      <div class="ct-metrics" id="nb-metrics" aria-busy="true">${skeleton(4)}</div>
    </section>
    <div class="ct-grid">
      <section class="ct-card ct-col-7" aria-labelledby="nb-f-title">
        <div class="ct-card__head"><h2 id="nb-f-title" class="ct-section-title">${icon('flag')}Flags</h2>
          <label class="ct-check"><input type="checkbox" id="nb-closed" ${showClosed ? 'checked' : ''}><span>Show closed</span></label></div>
        <p class="small muted">Urgent first, then stopped early, not reachable, missed.</p>
        <ul class="ct-flag-list" id="nb-flags" aria-busy="true"><li>${skeleton(3)}</li></ul>
      </section>
      <div class="ct-col-5 ct-stack--lg">
        <section class="ct-card" aria-labelledby="nb-v-title">
          <div class="ct-card__head"><h2 id="nb-v-title" class="ct-section-title">${icon('shield')}Waiting for verification</h2></div>
          <div id="nb-verify" aria-busy="true">${skeleton(2)}</div>
        </section>
        <section class="ct-card" aria-labelledby="nb-h-title">
          <div class="ct-card__head"><h2 id="nb-h-title" class="ct-section-title">${icon('ear')}Misheard replies</h2><p>Add common ones as keywords</p></div>
          <ul class="ct-list" id="nb-misheard" aria-busy="true"><li>${skeleton(2)}</li></ul>
        </section>
      </div>
    </div>
    <section class="ct-card" aria-labelledby="nb-p-title">
      <div class="ct-card__head"><h2 id="nb-p-title" class="ct-section-title">${icon('user')}Patients</h2></div>
      <div class="ct-table-wrap"><table class="ct-table">
        <thead><tr><th scope="col">Patient</th><th scope="col">Language</th><th scope="col">Course</th><th scope="col">Next call</th><th scope="col">Open flags</th><th scope="col">Family view</th></tr></thead>
        <tbody id="nb-patients" aria-busy="true"><tr><td colspan="6">${skeleton(3)}</td></tr></tbody></table></div>
    </section>
  </div>`;

  el.querySelector('#nb-closed').addEventListener('change', (e) => { showClosed = e.target.checked; store('ct.nurse.closed', showClosed ? '1' : '0'); refresh(); });
  el.querySelector('#nb-reset').addEventListener('click', async (e) => {
    if (!window.confirm('Reset all data to the sample patients? This deletes every change.')) return;
    await busy(e.currentTarget, () => post('/api/reset'));
    toast('Sample data restored');
    window.dispatchEvent(new Event('ct:refresh'));
  });
  el.addEventListener('click', onClick);
  el.addEventListener('change', onChange);
  refresh();
}

export function unmount() { el = null; }

async function onClick(e) {
  if (e.target.closest('button[data-retry]')) { refresh(); return; }
  const b = e.target.closest('button[data-act]');
  if (!b) return;
  const { act, id } = b.dataset;
  try {
    if (act === 'close') {
      await busy(b, () => post(`/api/flags/${id}/close`, { note: 'Called back' }));
      toast('Flag closed: called back');
    } else if (act === 'verify') {
      await busy(b, () => post(`/api/verify/${id}`, { nurse: 'Nurse on duty' }));
      toast('Verified. Dose calls are scheduled.');
    } else if (act === 'suggest') {
      const m = await busy(b, () => post(`/api/misheard/${id}/suggest`));
      toast(`Suggested: ${m.suggestion}. Check before adding a keyword.`);
    }
    refresh();
  } catch (err) {
    toast(err.status === 503 ? 'key not set: LLM_API_KEY' : err.message, 'error');
  }
}

async function onChange(e) {
  const t = e.target.closest('input[data-share]');
  if (!t) return;
  await api(`/api/patients/${t.dataset.share}`, { method: 'PATCH', body: { shareWithFamily: t.checked } });
  toast(t.checked ? 'Family view turned on' : 'Family view turned off');
}

export async function refresh() {
  if (!el || !el.querySelector('#nb-flags')) return;
  try {
    if (!cfg) cfg = await config();
    const [m, flags, patients, misheard] = await Promise.all([
      api('/api/measures'),
      api(`/api/flags${showClosed ? '' : '?status=open'}`),
      api('/api/patients'),
      api('/api/misheard'),
      clockIso() ? Promise.resolve() : api('/api/clock').then(setClock),
    ]);
    if (!el) return;
    failCount = 0;
    const firstLoad = !loaded;
    loaded = true;
    for (const sel of ['#nb-metrics', '#nb-flags', '#nb-verify', '#nb-misheard', '#nb-patients']) {
      const node = el.querySelector(sel);
      if (node) {
        node.removeAttribute('aria-busy');
        if (firstLoad) node.classList.add('ct-loaded-fade');
      }
    }
    renderMetrics(m);
    const phoneByPid = new Map(patients.map((p) => [p.id, p.phone || '']));
    const newFlagIds = prevFlags ? new Set(flags.filter((f) => !prevFlags.has(f.id)).map((f) => f.id)) : new Set();
    prevFlags = new Set(flags.map((f) => f.id));
    el.querySelector('#nb-flags').innerHTML = flags.length ? flags.map((f) => flagItem(f, newFlagIds.has(f.id), phoneByPid.get(f.patientId))).join('') : `<li>${empty('No open flags. Everyone is on track.')}</li>`;

    const waiting = patients.filter((p) => !p.verified);
    el.querySelector('#nb-verify').innerHTML = waiting.length ? `<ul class="ct-list">${waiting.map(verifyItem).join('')}</ul>` : empty('Nobody is waiting.', 'shield');

    el.querySelector('#nb-misheard').innerHTML = misheard.length ? misheard.slice(0, 8).map((x) => `<li>
        <span><span class="ct-quote">${esc(x.text)}</span><br><span class="small muted">${esc(x.patientName || '')}, ${esc(x.lang)}, ${x.confidence !== null && x.confidence !== undefined ? `confidence ${Number(x.confidence).toFixed(2)}, ` : ''}${esc(x.reason || '')}, ${when(x.at)}</span>
        ${x.suggestion ? `<br><span class="small">Suggested intent: <strong>${esc(x.suggestion)}</strong></span>` : ''}</span>
        <button class="ct-btn ct-btn--ghost ct-btn--sm" type="button" data-act="suggest" data-id="${esc(x.id)}" ${cfg.keys.llm ? '' : 'title="key not set"'}>Suggest intent${cfg.keys.llm ? '' : ' (key not set)'}</button></li>`).join('')
      : `<li>${empty('No misheard replies.', 'ear')}</li>`;

    const nextPatients = new Map();
    el.querySelector('#nb-patients').innerHTML = patients.filter((p) => p.verified).map((p) => {
      const l = cfg.langs.find((x) => x.code === p.lang);
      const rx = p.prescriptions[0];
      const rowKey = `${p.nextDue}:${p.openFlags}:${p.shareWithFamily}:${rx ? rx.taken : 0}`;
      const changed = prevPatients && prevPatients.has(p.id) && prevPatients.get(p.id) !== rowKey;
      nextPatients.set(p.id, rowKey);
      return `<tr class="${changed ? 'ct-row-changed' : ''}">
        <td data-label="Patient"><strong>${esc(p.name)}</strong>${p.age ? `, ${esc(p.age)}` : ''}<br><span class="small muted">${p.phoneType === 'keypad' ? 'Keypad phone' : 'Smartphone'}</span></td>
        <td data-label="Language">${esc(l ? l.name : p.lang)} ${langTag(l)}</td>
        <td data-label="Course">${rx ? progress(rx.day, rx.days, `Day ${rx.day} of ${rx.days}`, `${rx.taken} doses confirmed`) : 'None'}</td>
        <td data-label="Next call" class="tabular">${p.callsStopped ? 'Calls stopped' : p.nextDue ? esc(hm(p.nextDue)) : 'Course done'}</td>
        <td data-label="Open flags" class="tabular">${p.openFlags}</td>
        <td data-label="Family view"><label class="ct-check"><input type="checkbox" data-share="${esc(p.id)}" ${p.shareWithFamily ? 'checked' : ''}><span>Shared</span></label></td></tr>`;
    }).join('');
    prevPatients = nextPatients;
  } catch (err) {
    failCount += 1;
    if (!loaded && el) {
      for (const sel of ['#nb-metrics', '#nb-flags', '#nb-verify', '#nb-misheard', '#nb-patients']) {
        const node = el.querySelector(sel);
        if (node) node.removeAttribute('aria-busy');
      }
      el.querySelector('#nb-metrics').innerHTML = errorBox();
      el.querySelector('#nb-flags').innerHTML = `<li>${errorBox()}</li>`;
      el.querySelector('#nb-verify').innerHTML = errorBox();
      el.querySelector('#nb-misheard').innerHTML = `<li>${errorBox()}</li>`;
      el.querySelector('#nb-patients').innerHTML = `<tr><td colspan="6">${errorBox()}</td></tr>`;
    } else if (failCount >= 3) {
      toast('Could not load. Check your connection.', 'error');
    }
  }
}

function renderMetrics(m) {
  const next = {};
  const tile = (key, value, label, target = '', state = '') => {
    const str = String(value);
    next[key] = str;
    const pop = prevMetrics && prevMetrics[key] !== undefined && prevMetrics[key] !== str ? ' ct-metric--pop' : '';
    return `<div class="ct-metric ${state}${pop}"><span class="ct-metric__value">${esc(value)}</span><span class="ct-metric__label">${esc(label)}</span>${target ? `<span class="ct-metric__target">${target}</span>` : ''}</div>`;
  };
  el.querySelector('#nb-metrics').innerHTML = [
    tile('logsWithoutYes', m.logsWithoutYes, 'Doses logged without a yes', `${icon(m.logsWithoutYes ? 'alert' : 'check')}Must be 0`, m.logsWithoutYes ? 'ct-metric--bad' : 'ct-metric--ok'),
    tile('takenPct', `${m.takenPct}%`, `Doses confirmed (${m.taken} of ${m.dosesResolved})`),
    tile('missed', m.missed, 'Not confirmed'),
    tile('openFlags', m.openFlags, 'Open flags', m.flagsByType.urgent ? `${icon('alert')}${m.flagsByType.urgent} urgent` : '', m.flagsByType.urgent ? 'ct-metric--bad' : ''),
    tile('answerPct', m.answerPct === null ? 'None' : `${m.answerPct}%`, `Calls answered (${m.answered} of ${m.calls})`),
    tile('misheard', m.misheard, 'Misheard replies'),
    tile('activePatients', m.activePatients, 'Patients on calls'),
    tile('awaitingVerify', m.awaitingVerify, 'Waiting for verification'),
  ].join('');
  prevMetrics = next;
}

function flagItem(f, isNew = false, phone = '') {
  const closed = f.status === 'closed';
  const words = f.words ? `<blockquote class="ct-quote" lang="und">${esc(f.words)}</blockquote>` : '';
  const why = f.why ? `<p>Reason given: <span class="ct-quote">${esc(f.why)}</span></p>` : '';
  const wait = !closed ? waitLabel(f.createdAt) : '';
  const telHref = phone ? `tel:${phone.replace(/\s+/g, '')}` : '';
  const callLink = !closed && telHref
    ? `<a class="ct-btn ct-btn--secondary ct-btn--sm" href="${esc(telHref)}" aria-label="Call ${esc(f.patientName || 'patient')}">${icon('phone')}Call ${esc((f.patientName || 'patient').split(' ')[0])}</a>`
    : '';
  return `<li class="ct-flag-item ${f.type === 'urgent' && !closed ? 'ct-flag-item--urgent' : ''} ${closed ? 'ct-flag-item--closed' : ''}${isNew ? ' ct-flag-item--enter' : ''}">
    <div class="ct-flag-item__head">${flagStatus(f)}<span class="ct-flag-item__name">${esc(f.patientName || '')}</span>${wait ? `<span class="ct-tag tabular">${esc(wait)}</span>` : ''}<span class="small muted">${when(f.createdAt)}</span></div>
    <div class="ct-flag-item__body"><p>${esc(f.reason)}</p>${words}${why}
      ${closed ? `<p class="small muted">${esc(f.note || 'Closed')} by ${esc(f.closedBy || 'nurse')}, ${when(f.closedAt)}</p>` : ''}</div>
    <div class="ct-flag-item__action">${closed ? '' : `${callLink}<button class="ct-btn ct-btn--secondary ct-btn--sm" type="button" data-act="close" data-id="${esc(f.id)}">${icon('check')}Called back</button>`}</div>
  </li>`;
}

function verifyItem(p) {
  const l = cfg.langs.find((x) => x.code === p.lang);
  const rx = p.prescriptions[0];
  const consentOk = p.consent && p.consent.calls && p.consent.stopInfo;
  return `<li><div class="ct-stack">
      <div><strong>${esc(p.name)}</strong>${p.age ? `, ${esc(p.age)}` : ''}, ${esc(l ? l.name : p.lang)} ${langTag(l)}</div>
      <div class="small">${rx ? `${esc(rx.medicine)} ${esc(rx.dose)}, ${esc(rx.slots.join(', '))}, ${rx.days} days` : 'No prescription'}</div>
      <div class="small muted">${consentOk ? `${icon('shield')} Consent recorded by ${esc(p.consent.recordedBy)}, ${when(p.consent.at)}` : 'Consent missing'}</div>
    </div>
    <button class="ct-btn ct-btn--primary" type="button" data-act="verify" data-id="${esc(p.id)}" ${consentOk && rx ? '' : 'disabled'}>Verify</button></li>`;
}
