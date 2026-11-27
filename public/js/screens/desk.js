// Hospital desk: register a patient, record consent, enter the prescription (typed or dictated).
import { api, post, esc, icon, toast, busy, config, langTag, empty, SLOT_LABEL } from '../lib.js';
import * as voice from '../voice.js';

let el;
let cfg;

export async function mount(root) {
  el = root;
  cfg = await config();
  const langOptions = cfg.langs.map((l) => `<option value="${esc(l.code)}">${esc(l.name)} (${esc(l.nativeName)})${l.reviewed ? '' : ', under review'}</option>`).join('');
  const slotChoices = cfg.slots.map((s) => `<label class="ct-choice"><input type="checkbox" name="slots" value="${esc(s)}"><span>${esc(SLOT_LABEL[s])}, ${esc(cfg.slotTimes[s])}</span></label>`).join('');
  el.innerHTML = `
  <div class="ct-stack--lg">
    <div><h1>Hospital desk</h1><p class="muted">Register a patient going home with medicines. A nurse verifies before any call is made.</p></div>
    <div class="ct-grid">
      <form class="ct-col-8 ct-stack--lg" id="desk-form" novalidate>
        <section class="ct-card">
          <div class="ct-card__head"><h2 class="ct-section-title">${icon('user')}Patient</h2></div>
          <div class="ct-form-grid">
            ${field('name', 'Full name', '<input class="ct-input" id="f-name" name="name" required autocomplete="off">')}
            ${field('age', 'Age', '<input class="ct-input" id="f-age" name="age" type="number" min="0" max="120" inputmode="numeric">')}
            <div class="ct-field">
              <label class="ct-field__label" for="f-lang">Call language</label>
              <div class="ct-row ct-row--nowrap">
                <select class="ct-select" id="f-lang" name="lang">${langOptions}</select>
                <button class="ct-btn ct-btn--secondary" type="button" id="f-lang-detect">${icon('mic')}<span>Detect</span></button>
              </div>
              <span class="ct-field__help" id="f-lang-help">Choose, or let the patient speak and Care Taker finds the language. It also switches if they answer a call in another one.</span>
            </div>
            ${field('phone', 'Phone number', '<input class="ct-input" id="f-phone" name="phone" type="tel" autocomplete="off" placeholder="+91">')}
            <fieldset class="ct-fieldset ct-span-2"><legend>Phone type</legend>
              <div class="ct-choices">
                <label class="ct-choice"><input type="radio" name="phoneType" value="keypad" checked><span>Keypad phone</span></label>
                <label class="ct-choice"><input type="radio" name="phoneType" value="smart"><span>Smartphone</span></label>
              </div></fieldset>
          </div>
        </section>

        <section class="ct-card">
          <div class="ct-card__head"><h2 class="ct-section-title">${icon('user')}Family contact</h2><p>Told if the patient cannot be reached</p></div>
          <div class="ct-form-grid">
            ${field('fname', 'Name', '<input class="ct-input" id="f-fname" autocomplete="off">')}
            ${field('frel', 'Relation', '<input class="ct-input" id="f-frel" autocomplete="off" placeholder="Son, daughter, neighbour">')}
            ${field('fphone', 'Phone number', '<input class="ct-input" id="f-fphone" type="tel" autocomplete="off">', '', 'ct-span-2')}
            <label class="ct-check ct-span-2"><input type="checkbox" id="f-share"><span>Share with family: the family view shows this patient's dose record and words</span></label>
          </div>
        </section>

        <section class="ct-card">
          <div class="ct-card__head"><h2 class="ct-section-title">${icon('list')}Prescription</h2><p>Copy from the discharge sheet</p></div>
          <div class="ct-stack">
            <div class="ct-card ct-card--sunken ct-stack">
              <label class="ct-field" for="f-dictate"><span class="ct-field__label">Dictate</span>
                <span class="ct-field__help">Say or type: "Paracetamol 650, after breakfast and dinner, 5 days"</span></label>
              <div class="ct-row">
                <input class="ct-input" id="f-dictate" autocomplete="off">
                <button class="ct-btn ct-btn--secondary" type="button" id="f-mic">${icon('mic')}<span>Dictate</span></button>
                <button class="ct-btn ct-btn--ghost" type="button" id="f-fill">Fill form</button>
              </div>
              <p class="small muted" id="f-dictate-note" aria-live="polite"></p>
            </div>
            <div class="ct-form-grid">
              ${field('med', 'Medicine', '<input class="ct-input" id="f-med" autocomplete="off">')}
              ${field('dose', 'Dose', '<input class="ct-input" id="f-dose" autocomplete="off" placeholder="650 mg">')}
              <fieldset class="ct-fieldset ct-span-2"><legend>Meal slots</legend><div class="ct-choices" id="f-slots">${slotChoices}</div>
                <span class="ct-field__error" id="err-slots"></span></fieldset>
              ${field('days', 'Days', '<input class="ct-input" id="f-days" type="number" min="1" max="365" inputmode="numeric">')}
            </div>
          </div>
        </section>

        <section class="ct-card">
          <div class="ct-card__head"><h2 class="ct-section-title">${icon('shield')}Consent</h2><p>Both are needed before a nurse can verify</p></div>
          <div class="ct-stack">
            <label class="ct-check"><input type="checkbox" id="f-c1"><span id="f-c1-text"></span></label>
            <label class="ct-check"><input type="checkbox" id="f-c2"><span>Patient knows they can stop calls at any time by saying "stop calls" or pressing 9</span></label>
            ${field('nurse', 'Recorded by', '<input class="ct-input" id="f-nurse" autocomplete="off" placeholder="Nurse name">')}
          </div>
        </section>

        <div class="ct-row">
          <button class="ct-btn ct-btn--primary" type="submit" id="f-save" disabled>Save and send for verification</button>
          <span class="small muted" id="f-save-help">Tick both consent boxes to save</span>
        </div>
      </form>

      <aside class="ct-col-4">
        <section class="ct-card">
          <div class="ct-card__head"><h2>Recent patients</h2></div>
          <ul class="ct-list" id="desk-recent"></ul>
        </section>
      </aside>
    </div>
  </div>`;

  const form = el.querySelector('#desk-form');
  const updateConsent = () => {
    const l = cfg.langs.find((x) => x.code === form.querySelector('#f-lang').value);
    el.querySelector('#f-c1-text').textContent = `Patient agreed to receive dose calls in ${l ? l.name : 'their language'}`;
    const ok = form.querySelector('#f-c1').checked && form.querySelector('#f-c2').checked;
    form.querySelector('#f-save').disabled = !ok;
    el.querySelector('#f-save-help').textContent = ok ? 'A nurse checks it on the Nurse board' : 'Tick both consent boxes to save';
  };
  form.addEventListener('change', updateConsent);
  updateConsent();
  form.addEventListener('submit', (e) => { e.preventDefault(); save(form); });
  el.querySelector('#f-fill').addEventListener('click', () => fillFrom(el.querySelector('#f-dictate').value));
  el.querySelector('#f-dictate').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); fillFrom(e.target.value); } });
  el.querySelector('#f-mic').addEventListener('click', dictate);
  el.querySelector('#f-lang-detect').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const help = el.querySelector('#f-lang-help');
    btn.disabled = true;
    const r = await voice.detectLanguageByVoice({ sarvamKey: cfg.keys.sarvam, onListening: (t) => { help.textContent = t; } });
    if (!el) return;
    btn.disabled = false;
    if (r.error) { help.textContent = r.error; return; }
    const l = cfg.langs.find((x) => x.code === r.lang);
    el.querySelector('#f-lang').value = r.lang;
    el.querySelector('#f-lang').dispatchEvent(new Event('change', { bubbles: true }));
    help.textContent = `Detected ${l.name} (${l.nativeName}) from "${r.text}".`;
  });
  refresh();
}

function field(id, label, control, help = '', extra = '') {
  return `<label class="ct-field ${extra}"><span class="ct-field__label">${esc(label)}</span>${control}${help ? `<span class="ct-field__help">${esc(help)}</span>` : ''}<span class="ct-field__error" id="err-${id}"></span></label>`;
}

export async function refresh() {
  if (!el) return;
  const list = el.querySelector('#desk-recent');
  if (!list) return;
  const patients = await api('/api/patients');
  list.innerHTML = patients.length ? [...patients].reverse().slice(0, 8).map((p) => {
    const l = cfg.langs.find((x) => x.code === p.lang);
    const st = !p.verified ? '<span class="ct-status ct-status--later">' + icon('clock') + 'Awaiting nurse</span>'
      : p.callsStopped ? '<span class="ct-status ct-status--stopped">' + icon('stop') + 'Calls stopped</span>'
        : '<span class="ct-status ct-status--taken">' + icon('check') + 'Verified</span>';
    return `<li><span><strong>${esc(p.name)}</strong><br><span class="small muted">${esc(l ? l.name : p.lang)}${p.prescriptions[0] ? `, ${esc(p.prescriptions[0].medicine)}` : ''}</span> ${langTag(l)}</span>${st}</li>`;
  }).join('') : `<li>${empty('No patients yet.', 'user')}</li>`;
}

export function unmount() { voice.stopListening(); el = null; }

async function fillFrom(text) {
  const note = el.querySelector('#f-dictate-note');
  if (!text || !text.trim()) { note.textContent = 'Say or type the prescription first.'; return; }
  const r = await post('/api/parse-rx', { text });
  const filled = [];
  if (r.medicine) { el.querySelector('#f-med').value = r.medicine; filled.push('medicine'); }
  if (r.dose) { el.querySelector('#f-dose').value = r.dose; filled.push('dose'); }
  if (r.days) { el.querySelector('#f-days').value = r.days; filled.push('days'); }
  if (r.slots.length) {
    el.querySelectorAll('#f-slots input').forEach((i) => { i.checked = r.slots.includes(i.value); });
    filled.push('meal slots');
  }
  note.textContent = filled.length ? `Filled ${filled.join(', ')} from "${text}". Please check before saving.` : `Could not read "${text}". Fill the form by hand.`;
}

async function dictate() {
  const btn = el.querySelector('#f-mic');
  const note = el.querySelector('#f-dictate-note');
  if (!voice.canRecognize()) { note.textContent = 'Dictation needs Chrome. Type the prescription instead.'; return; }
  btn.querySelector('span').textContent = 'Listening';
  btn.disabled = true;
  note.textContent = 'Listening. Say the medicine, dose, meal slots and days.';
  const r = await voice.listen({ speechCode: 'en-IN', silenceMs: 10000, onInterim: (t) => { el.querySelector('#f-dictate').value = t; } });
  if (!el) return;
  btn.querySelector('span').textContent = 'Dictate';
  btn.disabled = false;
  if (r.text) { el.querySelector('#f-dictate').value = r.text; fillFrom(r.text); }
  else if (r.error) note.textContent = r.error === 'not-allowed' ? 'Microphone is blocked. Allow it in Chrome, or type instead.' : `Dictation stopped (${r.error}). Type instead.`;
  else note.textContent = 'Nothing heard. Try again or type.';
}

function setError(id, msg) {
  const e = el.querySelector(`#err-${id}`);
  if (e) e.innerHTML = msg ? `${icon('alert')}${esc(msg)}` : '';
  const input = el.querySelector(`#f-${id}`);
  if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
}

async function save(form) {
  const v = (id) => form.querySelector(`#f-${id}`).value.trim();
  const slots = [...form.querySelectorAll('#f-slots input:checked')].map((i) => i.value);
  const errors = {
    name: v('name') ? '' : 'Enter the patient name',
    med: v('med') ? '' : 'Enter the medicine',
    days: Number(v('days')) >= 1 ? '' : 'Enter the number of days',
    slots: slots.length ? '' : 'Choose at least one meal slot',
    nurse: v('nurse') ? '' : 'Enter the name of the nurse recording consent',
  };
  Object.entries(errors).forEach(([k, m]) => setError(k, m));
  const firstBad = Object.keys(errors).find((k) => errors[k]);
  if (firstBad) { const i = form.querySelector(`#f-${firstBad}`) || form.querySelector('#f-slots input'); if (i) i.focus(); return; }

  const btn = form.querySelector('#f-save');
  try {
    await busy(btn, async () => {
      const p = await post('/api/patients', {
        name: v('name'), age: v('age'), lang: v('lang'), phone: v('phone'),
        phoneType: form.querySelector('input[name="phoneType"]:checked').value,
        family: { name: v('fname'), relation: v('frel'), phone: v('fphone') },
        shareWithFamily: form.querySelector('#f-share').checked,
        consent: { calls: form.querySelector('#f-c1').checked, stopInfo: form.querySelector('#f-c2').checked, recordedBy: v('nurse') },
      });
      await post('/api/prescriptions', { patientId: p.id, medicine: v('med'), dose: v('dose'), slots, days: Number(v('days')) });
      return p;
    });
    toast('Saved. Waiting for nurse verification.');
    form.reset();
    form.dispatchEvent(new Event('change'));
    el.querySelector('#f-dictate-note').textContent = '';
    refresh();
  } catch (err) { toast(err.message, 'error'); }
}
