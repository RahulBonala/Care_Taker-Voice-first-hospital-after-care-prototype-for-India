// Mobile application prototype (#mobile) for both Patients/Families and Doctors/Nurses.
// Covers the complete mobile flow: 1. Onboarding tour -> 2. Login -> 3. First-time setup -> 4. Live 4-tab app,
// wired directly to the live Express REST API and shared data/db.json store.
import { api, post, esc, icon, hm, when, dayName, toast, busy, config, status, slotStatus, intentStatus, flagStatus, progress, empty, SLOT_LABEL, store, clockTime } from '../lib.js';
import * as voice from '../voice.js';

let el = null;
let cfg = null;
let token = 0;

// Mobile prototype state
let persona = 'patient';          // 'patient' | 'doctor'
let stage = 'tour';               // 'tour' | 'login' | 'setup' | 'app'
let slideIdx = 0;                 // 0..2 onboarding carousel
let appTab = 'today';             // patient: today|call|family|more ; doctor: triage|courses|enroll|more

// Patient persona state
let patients = [];
let pid = null;
let otpSent = false;
let otpDigits = ['', '', '', ''];
let replyPref = 'voice';          // 'voice' | 'keypad'
let activeCall = null;
let lastHeard = null;
let speakingCall = false;
let patientReport = null;
let patientHealth = null;

// Clinician persona state
let clinicianRole = 'Dr. Anand Rao (General Medicine)';
let staffPin = ['', '', '', ''];
let wardDept = 'General Medicine';
let alertPref = 'all';
let measuresData = null;
let flagsData = [];
let selectedCoursePid = null;
let selectedCourseReport = null;
let rxParsed = null;

const PATIENT_SLIDES = [
  {
    ic: 'globe',
    badge: '1 of 3: Your language',
    title: 'Calls in the language you speak at home',
    body: 'Care Taker calls in your own language at each meal slot: ten Indian languages and English. Pick yours, or just speak and it finds it. Works on basic keypad phones by voice and keys, and right here on your smartphone.',
  },
  {
    ic: 'check',
    badge: '2 of 3: Read-back safety',
    title: 'Every dose is confirmed before it is logged',
    body: 'Say "vesukunnanu" or "le li", or press 1. Care Taker repeats the meal slot and time back to you and logs the dose only after you confirm with yes.',
  },
  {
    ic: 'shield',
    badge: '3 of 3: Always in your control',
    title: 'Nurses handle health questions, not bots',
    body: 'Mentioning dizziness or discomfort alerts a hospital nurse to call you back. You can stop calls any time by saying "stop calls" or pressing 9.',
  },
];

const DOCTOR_SLIDES = [
  {
    ic: 'mic',
    badge: '1 of 3: Fast discharge intake',
    title: 'Dictate discharge schedules by fixed rules',
    body: 'Say "Paracetamol 650, after breakfast and dinner, 5 days" to fill the schedule, capture two-point patient consent, and send to nurse verification.',
  },
  {
    ic: 'flag',
    badge: '2 of 3: Priority exception triage',
    title: 'Call back only the patients who need a person',
    body: 'Open flags sort Urgent first, then Stopped early, Not reachable, and Missed, always quoting the patient\'s exact spoken words.',
  },
  {
    ic: 'stethoscope',
    badge: '3 of 3: Honest clinical review',
    title: 'Real course completion %, zero guessed doses',
    body: 'Review confirmed course completion alongside due-dose adherence and spoken reasons for stopping early, with zero automated medical advice.',
  },
];

const STAGE_GUIDE = {
  patient: {
    tour: {
      title: 'Patient onboarding tour',
      desc: 'Introduces the three promises before login: calls in your own language, mandatory read-back before logging, and instant opt-out or nurse escalation.',
    },
    login: {
      title: 'Patient sign-in (sample discharge code)',
      desc: 'Patients sign in with the phone number registered at the hospital desk and a 4-digit sample verification code (4210). Zero SMS keys required.',
    },
    setup: {
      title: 'First-time preferences and family sharing',
      desc: 'Lets the patient confirm their call language, choose voice or keypad preference, review their verified meal times, and toggle live Family access.',
    },
    app: {
      title: 'Live patient and family mobile app',
      desc: 'Four tabs powered by the live API: Today\'s schedule, an interactive Dose Call screen with read-back, the Family weekly view, and consent settings.',
    },
  },
  doctor: {
    tour: {
      title: 'Clinician onboarding tour',
      desc: 'Walks doctors and ward nurses through voice prescription intake, the verification safety gate, priority triage, and follow-up course review.',
    },
    login: {
      title: 'Clinician sign-in (sample staff PIN)',
      desc: 'Switch between a treating doctor (Dr. Anand Rao) and an after-care nurse (Nurse Priya) using sample PIN 1204.',
    },
    setup: {
      title: 'Ward and shift alert setup',
      desc: 'Select the hospital department and triage filter before opening the live ward mobile workspace.',
    },
    app: {
      title: 'Live doctor and nurse mobile workspace',
      desc: 'Verify waiting patients, close Urgent flags with "Called back", inspect course completion % and patient quotes, or dictate a new discharge prescription.',
    },
  },
};

export async function mount(root, params) {
  el = root;
  token += 1;
  const myToken = token;
  cfg = await config();
  if (myToken !== token) return;

  const qPersona = params && params.get('persona');
  const qStage = params && params.get('stage');
  if (qPersona === 'doctor' || qPersona === 'patient') persona = qPersona;
  else persona = store('ct.mobile.persona') || 'patient';

  if (['tour', 'login', 'setup', 'app'].includes(qStage)) stage = qStage;
  else stage = 'tour';

  slideIdx = 0;
  appTab = persona === 'patient' ? 'today' : 'triage';

  el.innerHTML = `
    <div class="ct-stack--lg">
      <div class="ct-row ct-row--between">
        <div>
          <span class="ct-eyebrow"><span class="ct-eyebrow__dot" aria-hidden="true"></span>Interactive mobile prototype</span>
          <h1>Mobile application</h1>
          <p class="muted">Experience the complete mobile flow (tour, login, setup, and live app) for both patients and clinicians.</p>
        </div>
        <div class="ct-row">
          <a class="ct-btn ct-btn--secondary" href="#tour">${icon('compass')}Application tour</a>
          <a class="ct-btn ct-btn--ghost" href="#home">Back to website</a>
        </div>
      </div>

      <div class="ct-mobile-showcase">
        <div>
          <div class="ct-device" aria-label="Care Taker mobile app frame">
            <div class="ct-device__notch" aria-hidden="true"></div>
            <div class="ct-device__screen">
              <div class="ct-device__statusbar">
                <span id="mb-clock">--:--</span>
                <span id="mb-badge">Care Taker</span>
              </div>
              <div class="ct-device__body" id="mb-body"></div>
              <nav class="ct-device__nav" id="mb-nav" aria-label="Mobile app tabs" hidden></nav>
            </div>
          </div>
        </div>

        <div class="ct-stack--lg">
          <section class="ct-card ct-stack">
            <div class="ct-card__head"><h2>1. Choose who is holding the phone</h2></div>
            <div class="ct-segmented" role="tablist" aria-label="Mobile persona">
              <button type="button" class="ct-segmented__item" data-persona="patient">${icon('phone')}Patient &amp; family</button>
              <button type="button" class="ct-segmented__item" data-persona="doctor">${icon('stethoscope')}Doctor &amp; nurse</button>
            </div>

            <div class="ct-stack">
              <strong>2. Jump to any step of the mobile flow</strong>
              <div class="ct-stage-pills" id="mb-stages"></div>
            </div>

            <div class="ct-card ct-card--sunken ct-stack" id="mb-guide"></div>
          </section>

          <section class="ct-card ct-stack">
            <div class="ct-card__head"><h2>Live sync with hospital screens</h2><p>Every action updates data/db.json</p></div>
            <p class="small muted">Confirming a dose, toggling family sharing, verifying a patient, or closing a flag in this mobile prototype immediately updates all five hospital role screens.</p>
            <div class="ct-row">
              <a class="ct-btn ct-btn--secondary ct-btn--sm" href="#desk">Hospital desk</a>
              <a class="ct-btn ct-btn--secondary ct-btn--sm" href="#nurse">Nurse board</a>
              <a class="ct-btn ct-btn--secondary ct-btn--sm" href="#phone">Keypad phone</a>
              <a class="ct-btn ct-btn--secondary ct-btn--sm" href="#family">Family</a>
              <a class="ct-btn ct-btn--secondary ct-btn--sm" href="#doctor">Doctor</a>
            </div>
          </section>
        </div>
      </div>
    </div>`;

  el.addEventListener('click', onClick);
  el.addEventListener('change', onChange);
  el.addEventListener('input', onInput);
  el.addEventListener('submit', onSubmit);

  await loadData(myToken);
  renderAll();
}

export function unmount() {
  token += 1;
  voice.stopSpeaking();
  voice.stopListening();
  voice.stopRing();
  el = null;
}

async function loadData(t = token) {
  const [pts, m, fl] = await Promise.all([
    api('/api/patients'),
    api('/api/measures'),
    api('/api/flags'),
  ]);
  if (t !== token || !el) return;
  patients = pts;
  measuresData = m;
  flagsData = fl;

  const verified = patients.filter((p) => p.verified);
  if (!pid || !patients.some((p) => p.id === pid)) {
    pid = (verified[0] || patients[0] || {}).id || null;
  }
  if (!selectedCoursePid || !verified.some((p) => p.id === selectedCoursePid)) {
    selectedCoursePid = (verified[0] || {}).id || null;
  }

  if (pid) {
    const [rep, calls, health] = await Promise.all([
      api(`/api/report/${encodeURIComponent(pid)}`),
      api(`/api/calls?patientId=${encodeURIComponent(pid)}&limit=1`),
      api(`/api/health/${encodeURIComponent(pid)}?lang=${encodeURIComponent((patients.find((x) => x.id === pid) || {}).lang || 'en')}`),
    ]);
    if (t !== token || !el) return;
    patientReport = rep;
    patientHealth = health;
    activeCall = calls[0] || null;
  }
  if (selectedCoursePid) {
    selectedCourseReport = await api(`/api/report/${encodeURIComponent(selectedCoursePid)}`);
  }
}

export async function refresh() {
  if (!el) return;
  const mbClk = el.querySelector('#mb-clock');
  if (mbClk) mbClk.textContent = clockTime();

  // Do not overwrite form inputs while the user is typing or on static onboarding steps.
  if (stage !== 'app' || speakingCall) return;
  const focused = document.activeElement;
  if (focused && el.contains(focused) && ['INPUT', 'SELECT', 'TEXTAREA'].includes(focused.tagName)) return;

  await loadData(token);
  if (el && stage === 'app' && !speakingCall) renderDevice();
}

// ---- rendering --------------------------------------------------------------

function renderAll() {
  if (!el) return;
  for (const b of el.querySelectorAll('[data-persona]')) {
    if (b.dataset.persona === persona) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  }
  const stages = [
    ['tour', '1. Tour'],
    ['login', '2. Login'],
    ['setup', '3. Setup'],
    ['app', '4. Live app'],
  ];
  el.querySelector('#mb-stages').innerHTML = stages.map(([k, label]) => `
    <button type="button" class="ct-stage-pill" data-stage="${k}" ${stage === k ? 'aria-current="step"' : ''}>${esc(label)}</button>`).join('');

  const g = STAGE_GUIDE[persona][stage];
  el.querySelector('#mb-guide').innerHTML = `
    <strong>${esc(g.title)}</strong>
    <p class="small muted">${esc(g.desc)}</p>`;

  renderDevice();
}

function renderDevice() {
  if (!el) return;
  el.querySelector('#mb-clock').textContent = clockTime();

  const p = patients.find((x) => x.id === pid);
  const pLang = cfg && p ? cfg.langs.find((l) => l.code === p.lang) : null;
  el.querySelector('#mb-badge').textContent = persona === 'patient'
    ? (pLang ? `${pLang.name} (${pLang.speechCode})` : 'Patient app')
    : 'Clinician ward app';

  const body = el.querySelector('#mb-body');
  const nav = el.querySelector('#mb-nav');

  if (stage === 'tour') {
    nav.hidden = true;
    body.innerHTML = renderTourSlide();
    return;
  }
  if (stage === 'login') {
    nav.hidden = true;
    body.innerHTML = persona === 'patient' ? renderPatientLogin() : renderDoctorLogin();
    return;
  }
  if (stage === 'setup') {
    nav.hidden = true;
    body.innerHTML = persona === 'patient' ? renderPatientSetup() : renderDoctorSetup();
    return;
  }

  nav.hidden = false;
  if (persona === 'patient') {
    const { ui } = uiFor(patients.find((x) => x.id === pid));
    const tabs = [
      ['today', 'home', ui.tabToday || 'Today'],
      ['call', 'phone', ui.tabCall || 'Call'],
      ['health', 'watch', ui.tabHealth || 'Health'],
      ['family', 'users', ui.tabFamily || 'Family'],
      ['more', 'globe', ui.tabMore || 'More'],
    ];
    nav.innerHTML = tabs.map(([k, ic, lbl]) => `
      <button type="button" class="ct-device__tab" data-tab="${k}" aria-selected="${appTab === k ? 'true' : 'false'}">${icon(ic)}<span>${esc(lbl)}</span></button>`).join('');
    body.innerHTML = renderPatientApp();
  } else {
    const tabs = [
      ['triage', 'flag', 'Triage'],
      ['courses', 'stethoscope', 'Courses'],
      ['enroll', 'mic', 'Enroll'],
      ['more', 'compass', 'Guide'],
    ];
    nav.innerHTML = tabs.map(([k, ic, lbl]) => `
      <button type="button" class="ct-device__tab" data-tab="${k}" aria-selected="${appTab === k ? 'true' : 'false'}">${icon(ic)}<span>${lbl}</span></button>`).join('');
    body.innerHTML = renderDoctorApp();
  }
}

function renderTourSlide() {
  const slides = persona === 'patient' ? PATIENT_SLIDES : DOCTOR_SLIDES;
  const s = slides[slideIdx] || slides[0];
  return `
    <div class="ct-stack--lg">
      <div class="ct-row ct-row--between">
        <span class="ct-eyebrow"><span class="ct-eyebrow__dot" aria-hidden="true"></span>${esc(s.badge)}</span>
        <button type="button" class="ct-btn ct-btn--ghost ct-btn--sm" data-act="skip-tour">Skip</button>
      </div>
      <div class="ct-card ct-stack">
        <div class="ct-phone__avatar">${icon(s.ic)}</div>
        <h2>${esc(s.title)}</h2>
        <p class="muted">${esc(s.body)}</p>
      </div>
      <div class="ct-dots" aria-hidden="true">
        ${slides.map((_, i) => `<span class="ct-dot ${i === slideIdx ? 'ct-dot--active' : ''}"></span>`).join('')}
      </div>
      <div class="ct-row ct-row--between">
        <button type="button" class="ct-btn ct-btn--secondary ct-btn--sm" data-act="slide-prev" ${slideIdx === 0 ? 'disabled' : ''}>Back</button>
        <button type="button" class="ct-btn ct-btn--primary" data-act="slide-next">${slideIdx < slides.length - 1 ? 'Next' : 'Continue to sign in'}${icon('arrow-right')}</button>
      </div>
    </div>`;
}

function renderPatientLogin() {
  const p = patients.find((x) => x.id === pid) || patients[0];
  return `
    <form class="ct-stack" id="mb-login-form">
      <span class="ct-eyebrow"><span class="ct-eyebrow__dot" aria-hidden="true"></span>Patient sign-in</span>
      <h2>Sign in with your hospital phone</h2>
      <p class="small muted">Choose a sample discharged patient below, then verify with sample code 4210.</p>
      <label class="ct-field">
        <span class="ct-field__label">Sample patient profile</span>
        <select class="ct-select" id="mb-pat-select">
          ${patients.filter((x) => x.verified).map((x) => `<option value="${esc(x.id)}" ${x.id === (p && p.id) ? 'selected' : ''}>${esc(x.name)} (${esc(x.phone || '+91 90000 00001')})</option>`).join('')}
        </select>
      </label>
      ${!otpSent ? `
        <button type="button" class="ct-btn ct-btn--primary ct-btn--block" data-act="send-otp">Send 4-digit code</button>
      ` : `
        <div class="ct-notice">${icon('info')}<p class="small">Sample prototype code: <strong>4210</strong> (no SMS sent).</p></div>
        <div class="ct-field">
          <span class="ct-field__label">Enter 4-digit code</span>
          <div class="ct-otp-row">
            ${otpDigits.map((d, i) => `<input class="ct-otp-box" type="text" inputmode="numeric" maxlength="1" data-otp="${i}" value="${esc(d)}" aria-label="Digit ${i + 1}">`).join('')}
          </div>
        </div>
        <div class="ct-row">
          <button type="button" class="ct-btn ct-btn--secondary ct-btn--sm" data-act="fill-otp">Auto-fill 4210</button>
          <button type="submit" class="ct-btn ct-btn--primary">Verify &amp; continue${icon('arrow-right')}</button>
        </div>
      `}
    </form>`;
}

function renderDoctorLogin() {
  const roles = [
    'Dr. Anand Rao (General Medicine)',
    'Nurse Priya (After-Care Desk)',
  ];
  return `
    <form class="ct-stack" id="mb-doc-login-form">
      <span class="ct-eyebrow"><span class="ct-eyebrow__dot" aria-hidden="true"></span>Clinician sign-in</span>
      <h2>Hospital staff access</h2>
      <p class="small muted">Pick a clinician role and enter sample ward PIN 1204.</p>
      <label class="ct-field">
        <span class="ct-field__label">Staff profile</span>
        <select class="ct-select" id="mb-doc-role">
          ${roles.map((r) => `<option value="${esc(r)}" ${r === clinicianRole ? 'selected' : ''}>${esc(r)}</option>`).join('')}
        </select>
      </label>
      <div class="ct-notice">${icon('info')}<p class="small">Sample prototype staff PIN: <strong>1204</strong>.</p></div>
      <div class="ct-field">
        <span class="ct-field__label">4-digit staff PIN</span>
        <div class="ct-otp-row">
          ${staffPin.map((d, i) => `<input class="ct-otp-box" type="text" inputmode="numeric" maxlength="1" data-pin="${i}" value="${esc(d)}" aria-label="PIN digit ${i + 1}">`).join('')}
        </div>
      </div>
      <div class="ct-row">
        <button type="button" class="ct-btn ct-btn--secondary ct-btn--sm" data-act="fill-pin">Auto-fill 1204</button>
        <button type="submit" class="ct-btn ct-btn--primary">Sign in${icon('arrow-right')}</button>
      </div>
    </form>`;
}

// The patient app talks in the patient's language.
function uiFor(p) {
  const l = cfg.langs.find((x) => x.code === (p && p.lang)) || cfg.langs.find((x) => x.code === 'en');
  return { l, ui: l.ui || {} };
}
const fillUi = (t, vars) => String(t || '').replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined ? m : vars[k]));

// Meal slot and dose status in the patient's language.
const SLOT_KEY = { breakfast: 'slotBreakfast', lunch: 'slotLunch', dinner: 'slotDinner', night: 'slotNight' };
const slotName = (ui, slot) => ui[SLOT_KEY[slot]] || SLOT_LABEL[slot];
function localSlotStatus(s, ui) {
  switch (s.status) {
    case 'taken': return status('taken', `${ui.stTaken}${s.takenAt ? `, ${hm(s.takenAt)}` : ''}`);
    case 'postponed': return status('later', `${ui.stLater}, ${hm(s.due)}`);
    case 'flagged': return status('urgent', ui.stNurse);
    case 'stopped': case 'missed': case 'cancelled': return status('missed', ui.stMissed);
    case 'calling': return status('pending', ui.stCalling);
    default: return status('pending', `${ui.stPending}, ${hm(s.due)}`);
  }
}

function languagePicker(p) {
  const { l, ui } = uiFor(p);
  return `
    <div class="ct-card ct-stack ct-langpick">
      <div class="ct-row ct-row--between"><strong>${icon('globe')} ${esc(ui.chooseLanguage)}</strong><span class="ct-tag">${esc(l.nativeName)}</span></div>
      <div class="ct-langpick__grid" role="group" aria-label="Languages">
        ${cfg.langs.map((x) => `<button type="button" class="ct-langpick__btn" data-act="set-lang" data-lang="${esc(x.code)}" aria-pressed="${x.code === l.code}" lang="${esc(x.code)}"><strong>${esc(x.nativeName)}</strong><span>${esc(x.name)}</span></button>`).join('')}
      </div>
      <button type="button" class="ct-btn ct-btn--secondary ct-btn--block" data-act="detect-lang">${icon('mic')}<span>${esc(ui.detect)}</span></button>
      <p class="small muted" id="mb-lang-note" aria-live="polite"></p>
    </div>`;
}

function renderPatientSetup() {
  const p = patients.find((x) => x.id === pid) || patients[0];
  if (!p) return empty('No patient found.', 'user');
  const l = cfg.langs.find((x) => x.code === p.lang);
  const rx = p.prescriptions && p.prescriptions[0];
  return `
    <div class="ct-stack">
      <span class="ct-eyebrow"><span class="ct-eyebrow__dot" aria-hidden="true"></span>Step 3: Quick setup</span>
      <h2>${esc(fillUi(uiFor(p).ui.hello, { name: p.name.split(' ')[0] }))}</h2>
      <p class="small muted">Check your call preferences before opening your schedule.</p>
      ${languagePicker(p)}

      <div class="ct-card ct-stack">
        ${rx ? `<p class="small"><strong>Verified medicine:</strong> ${esc(rx.medicine)} ${esc(rx.dose)}, ${rx.days} days (${esc(rx.slots.map((s) => `${SLOT_LABEL[s]} ${cfg.slotTimes[s]}`).join(', '))}).</p>` : ''}
        <fieldset class="ct-fieldset">
          <legend>How do you prefer to answer?</legend>
          <div class="ct-choices">
            <label class="ct-choice"><input type="radio" name="mb-replypref" value="voice" ${replyPref === 'voice' ? 'checked' : ''}><span>Voice + keypad</span></label>
            <label class="ct-choice"><input type="radio" name="mb-replypref" value="keypad" ${replyPref === 'keypad' ? 'checked' : ''}><span>Keypad keys 1, 2, 3</span></label>
          </div>
        </fieldset>
        <label class="ct-check">
          <input type="checkbox" id="mb-setup-share" ${p.shareWithFamily ? 'checked' : ''}>
          <span>Share read-only weekly summary with ${esc((p.family && p.family.name) || 'family')}</span>
        </label>
      </div>

      <button type="button" class="ct-btn ct-btn--primary ct-btn--block" data-act="finish-pat-setup">Save &amp; open my app${icon('arrow-right')}</button>
    </div>`;
}

function renderDoctorSetup() {
  const depts = ['General Medicine', 'Dermatology', 'Infectious Disease'];
  return `
    <div class="ct-stack">
      <span class="ct-eyebrow"><span class="ct-eyebrow__dot" aria-hidden="true"></span>Step 3: Ward setup</span>
      <h2>${esc(clinicianRole.split('(')[0].trim())}</h2>
      <p class="small muted">Configure your mobile triage view for this shift.</p>
      <div class="ct-card ct-stack">
        <label class="ct-field">
          <span class="ct-field__label">Department</span>
          <select class="ct-select" id="mb-dept">
            ${depts.map((d) => `<option value="${esc(d)}" ${d === wardDept ? 'selected' : ''}>${esc(d)}</option>`).join('')}
          </select>
        </label>
        <fieldset class="ct-fieldset">
          <legend>Mobile flag queue</legend>
          <div class="ct-choices">
            <label class="ct-choice"><input type="radio" name="mb-alertpref" value="all" ${alertPref === 'all' ? 'checked' : ''}><span>All open flags</span></label>
            <label class="ct-choice"><input type="radio" name="mb-alertpref" value="urgent" ${alertPref === 'urgent' ? 'checked' : ''}><span>Urgent &amp; Stopped first</span></label>
          </div>
        </fieldset>
        <p class="small muted">Clinical rule: Care Taker never sends medical advice. Flagged replies wait for your human callback.</p>
      </div>
      <button type="button" class="ct-btn ct-btn--primary ct-btn--block" data-act="finish-doc-setup">Open clinician workspace${icon('arrow-right')}</button>
    </div>`;
}

// ---- Live Patient Mobile App (4 tabs) ---------------------------------------

function renderPatientApp() {
  const p = patients.find((x) => x.id === pid);
  if (!p) return empty('No patient selected.', 'user');
  const l = cfg.langs.find((x) => x.code === p.lang) || cfg.langs[0];
  const rx = p.prescriptions && p.prescriptions[0];

  const ui = l.ui || {};
  if (appTab === 'today') {
    const todaySlots = (patientReport && patientReport.today) || [];
    return `
      <div class="ct-stack">
        <div class="ct-row ct-row--between">
          <div>
            <h2 lang="${esc(l.code)}">${esc(fillUi(ui.hello, { name: p.name.split(' ')[0] }))}</h2>
            <button type="button" class="ct-chip ct-chip--lang" data-tab="more">${icon('globe')}<span>${esc(l.nativeName)}, ${esc(l.name)}</span></button>
          </div>
          <select class="ct-select" id="mb-switch-pat" aria-label="Switch patient">
            ${patients.filter((x) => x.verified).map((x) => `<option value="${esc(x.id)}" ${x.id === p.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}
          </select>
        </div>

        ${rx ? `<div class="ct-card ct-stack">
          <div class="ct-row ct-row--between"><strong>${esc(rx.medicine)} ${esc(rx.dose)}</strong><span class="small muted tabular">${esc(fillUi(ui.pctDone, { pct: rx.completionPct }))}</span></div>
          ${progress(rx.day, rx.days, fillUi(ui.dayOf, { n: rx.day, total: rx.days }), `${rx.taken} / ${rx.totalDoses}`)}
          ${p.callsStopped
            ? `<div class="ct-notice ct-notice--warn">${icon('stop')}<p class="small">${esc(ui.callsStopped)}</p></div>`
            : `<button type="button" class="ct-btn ct-btn--primary ct-btn--block" data-act="ring-next">${icon('phone')}${esc(ui.ringNext)}${p.nextDue ? `, ${esc(hm(p.nextDue))}` : ''}</button>`}
        </div>` : ''}

        <div class="ct-card ct-stack">
          <strong>${esc(ui.todaysDoses)}</strong>
          <ul class="ct-list">
            ${todaySlots.length ? todaySlots.map((s) => `<li><span>${esc(slotName(ui, s.slot))}</span>${localSlotStatus(s, ui)}</li>`).join('') : `<li>${empty('No doses today.', 'calendar')}</li>`}
          </ul>
        </div>
      </div>`;
  }

  if (appTab === 'call') {
    const c = activeCall;
    const ringing = c && c.status === 'ringing';
    const live = c && c.status === 'active';
    return `
      <div class="ct-stack">
        <div class="ct-card ct-stack">
          <div class="ct-row ct-row--between">
            <strong>${ringing ? `Incoming call (ring ${c.rings}/${cfg.maxRings})` : live ? 'Active dose call' : 'Dose call'}</strong>
            ${c ? `<span class="ct-tag">${esc(c.status)}</span>` : ''}
          </div>
          ${!c || c.status === 'ended' ? `
            <p class="small muted">${c ? `Last call outcome: ${esc(c.outcome || 'ended')}.` : 'No active call right now.'}</p>
            <button type="button" class="ct-btn ct-btn--primary ct-btn--block" data-act="ring-next" ${p.callsStopped ? 'disabled' : ''}>${icon('forward')}Start next dose call</button>
          ` : ''}
          ${ringing ? `
            <p class="small">Care Taker is calling in <strong>${esc(l.name)}</strong>.</p>
            <div class="ct-row">
              <button type="button" class="ct-btn ct-btn--primary" data-act="call-answer">${icon('phone')}Answer</button>
              <button type="button" class="ct-btn ct-btn--danger" data-act="call-decline">${icon('phone-down')}Decline</button>
            </div>
          ` : ''}
          ${c && c.transcript && c.transcript.length ? `
            <div class="ct-phone__transcript">
              ${c.transcript.slice(-6).map((t) => {
                if (t.who === 'system') return `<p class="ct-phone__line ct-phone__line--system">${esc(t.text)}</p>`;
                if (t.who === 'bot') return `<p class="ct-phone__line ct-phone__line--bot">${esc(t.text)}${t.en && t.en !== t.text ? `<span class="ct-phone__line-en">${esc(t.en)}</span>` : ''}</p>`;
                return `<p class="ct-phone__line ct-phone__line--patient">${esc(t.text || '(silence)')}<span class="ct-phone__line-en">${esc(t.label || '')}</span></p>`;
              }).join('')}
            </div>
          ` : ''}
          ${lastHeard ? `<div class="ct-phone__heard"><strong>Heard:</strong> <span>${esc(lastHeard.text || '(silence)')}</span> -&gt; ${intentStatus(lastHeard.intent, lastHeard.label)}</div>` : ''}
        </div>

        ${live ? `
          <form class="ct-card ct-stack" id="mb-reply-form">
            <div class="ct-row ct-row--between">
              <strong>Reply in ${esc(l.name)}</strong>
              <button type="button" class="ct-btn ct-btn--secondary ct-btn--sm" data-act="mic-reply">${icon('mic')}Speak</button>
            </div>
            <div class="ct-row">
              <input class="ct-input" id="mb-reply-in" placeholder="Type or tap a phrase below" autocomplete="off">
              <button type="submit" class="ct-btn ct-btn--primary ct-btn--sm">Send</button>
            </div>
            <div class="ct-choices">
              ${(l.samples || []).map((s) => `<button type="button" class="ct-chip" data-sample="${esc(s)}">${esc(s)}</button>`).join('')}
            </div>
            <div class="ct-row">
              <button type="button" class="ct-btn ct-btn--secondary ct-btn--sm" data-key="1">1 Taken</button>
              <button type="button" class="ct-btn ct-btn--secondary ct-btn--sm" data-key="2">2 Later</button>
              <button type="button" class="ct-btn ct-btn--secondary ct-btn--sm" data-key="3">3 Nurse</button>
              <button type="button" class="ct-btn ct-btn--ghost ct-btn--sm" data-key="9">9 Stop</button>
            </div>
          </form>
        ` : ''}
      </div>`;
  }

  if (appTab === 'health') {
    const h = patientHealth;
    if (!h) return empty('Loading readings.', 'watch');
    const n = (v) => (v === null || v === undefined ? 'None' : Number(v).toLocaleString('en-IN'));
    const tile = (v, label) => `<div class="ct-metric"><span class="ct-metric__value">${esc(v)}</span><span class="ct-metric__label">${esc(label)}</span></div>`;
    const tiles = [];
    if (h.today.steps !== null) tiles.push(tile(n(h.today.steps), `${ui.mSteps}, ${n(h.ranges.stepsGoal)}`));
    if (h.today.activeCalories !== null) tiles.push(tile(n(h.today.activeCalories), ui.mActive));
    if (h.today.sleep !== null) tiles.push(tile(`${Math.floor(h.today.sleep / 60)}h ${h.today.sleep % 60}m`, ui.mSleep));
    if (h.last.bp) tiles.push(tile(`${h.last.bp.value.sys}/${h.last.bp.value.dia}`, ui.mBp));
    if (h.last.glucose) tiles.push(tile(String(h.last.glucose.value.mgdl), `${ui.mSugar}, mg/dL`));
    if (h.last.heartRate) tiles.push(tile(String(h.last.heartRate.value.bpm), ui.mHeart));
    return `
      <div class="ct-stack">
        <div class="ct-card ct-stack">
          <strong>${esc(ui.healthToday)}</strong>
          ${tiles.length ? `<div class="ct-metrics">${tiles.join('')}</div>` : '<p class="small muted">No readings yet.</p>'}
        </div>
        <div class="ct-card ct-stack">
          <strong>${esc(ui.healthShows)}</strong>
          <ul class="ct-feedback">${h.feedback.slice(0, 5).map((f) => `<li class="ct-feedback__item ct-feedback__item--${esc(f.kind)}">${icon(f.kind === 'flag' ? 'alert' : f.kind === 'ok' ? 'check' : 'info')}<span class="small" lang="${esc(h.lang || 'en')}">${esc(f.text)}</span></li>`).join('')}</ul>
        </div>
        <div class="ct-card ct-stack">
          <strong>${esc(ui.connected)}</strong>
          <ul class="ct-list">${h.devices.length ? h.devices.map((d) => `<li><span class="small">${esc(d.name)}</span><span class="small muted">${d.lastSync ? `synced ${esc(hm(d.lastSync))}` : 'paired'}</span></li>`).join('') : '<li><span class="small muted">No device yet.</span></li>'}</ul>
          <a class="ct-btn ct-btn--secondary ct-btn--block" href="#devices">${icon('watch')}${esc(ui.addDevice)}</a>
          <p class="small muted">Readings are compared with your doctor's ranges. Questions go to your nurse.</p>
        </div>
      </div>`;
  }

  if (appTab === 'family') {
    const rep = patientReport;
    const today = rep && rep.week && rep.week.length ? rep.week[rep.week.length - 1].date : '';
    return `
      <div class="ct-stack">
        <div class="ct-card ct-stack">
          <div class="ct-row ct-row--between">
            <strong>Family view (${esc((p.family && p.family.name) || 'Relative')})</strong>
            ${p.shareWithFamily ? status('taken', 'Shared') : status('missed', 'Private')}
          </div>
          <label class="ct-check">
            <input type="checkbox" data-toggle-share="${esc(p.id)}" ${p.shareWithFamily ? 'checked' : ''}>
            <span>${esc(ui.shareFamily)}</span>
          </label>
        </div>

        ${!p.shareWithFamily ? `<div class="ct-card">${empty(`${p.name} has kept the family view private.`, 'lock')}</div>` : rep ? `
          <div class="ct-card ct-stack">
            <strong>This week</strong>
            ${rep.summary.map((s) => `<p class="small">${esc(s)}</p>`).join('')}
            <div class="ct-week">
              ${rep.week.map((d) => {
                const done = d.taken + d.missed;
                const kind = !done ? 'pending' : d.taken === done ? 'all' : d.taken ? 'some' : 'none';
                const ic = { pending: 'pending', all: 'check', some: 'clock', none: 'missed' }[kind];
                return `<div class="ct-week__day ${d.date === today ? 'ct-week__day--today' : ''}"><span class="ct-week__name">${esc(dayName(d.date))}</span><span class="ct-week__mark ct-week__mark--${kind}">${icon(ic)}</span><span class="ct-week__count">${d.taken}/${d.due}</span></div>`;
              }).join('')}
            </div>
          </div>
          <div class="ct-card ct-stack">
            <strong>In ${esc(p.name.split(' ')[0])}'s own words</strong>
            <ul class="ct-list">
              ${rep.quotes.slice(0, 4).map((q) => `<li><span><span class="ct-quote">${esc(q.words)}</span><br><span class="small muted">${when(q.at)}</span></span>${intentStatus(q.intent, q.label)}</li>`).join('') || `<li><span class="small muted">No spoken replies yet.</span></li>`}
            </ul>
          </div>
        ` : ''}
      </div>`;
  }

  return `
    <div class="ct-stack">
      ${languagePicker(p)}
      <div class="ct-card ct-stack">
        <strong>Consent and safety</strong>
        <p class="small muted">Consent recorded by ${esc((p.consent && p.consent.recordedBy) || 'Nurse')} for calls in ${esc(l.name)}.</p>
        <p class="small muted">${esc(ui.emergency)}</p>
      </div>
      <button type="button" class="ct-btn ct-btn--secondary ct-btn--block" data-act="replay-tour">Replay onboarding tour</button>
      <button type="button" class="ct-btn ct-btn--ghost ct-btn--block" data-act="sign-out">Sign out / switch account</button>
    </div>`;
}

// ---- Live Doctor & Nurse Mobile App (4 tabs) --------------------------------

function renderDoctorApp() {
  const m = measuresData || { logsWithoutYes: 0, openFlags: 0, awaitingVerify: 0, takenPct: 0 };
  const waiting = patients.filter((p) => !p.verified);
  const verified = patients.filter((p) => p.verified);
  const openFlags = flagsData.filter((f) => f.status === 'open')
    .filter((f) => alertPref !== 'urgent' || f.type === 'urgent' || f.type === 'stoppedEarly');

  if (appTab === 'triage') {
    return `
      <div class="ct-stack">
        <div class="ct-row ct-row--between">
          <div><strong>${esc(wardDept)}</strong><br><span class="small muted">${esc(clinicianRole)}</span></div>
          ${status('taken', `0 without yes`)}
        </div>

        <div class="ct-metrics">
          <div class="ct-metric"><span class="ct-metric__value">${esc(m.openFlags)}</span><span class="ct-metric__label">Open flags</span></div>
          <div class="ct-metric"><span class="ct-metric__value">${esc(m.awaitingVerify)}</span><span class="ct-metric__label">To verify</span></div>
        </div>

        ${waiting.length ? `
          <div class="ct-card ct-stack">
            <strong>Waiting for nurse verification</strong>
            <ul class="ct-list">
              ${waiting.map((p) => {
                const rx = p.prescriptions[0];
                return `<li><span><strong>${esc(p.name)}</strong><br><span class="small muted">${rx ? `${esc(rx.medicine)} ${esc(rx.dose)}, ${rx.days}d` : 'No Rx'}</span></span>
                  <button type="button" class="ct-btn ct-btn--primary ct-btn--sm" data-verify="${esc(p.id)}">Verify</button></li>`;
              }).join('')}
            </ul>
          </div>` : ''}

        <div class="ct-card ct-stack">
          <strong>Priority callback queue</strong>
          ${openFlags.length ? `<ul class="ct-flag-list">${openFlags.map((f) => `
            <li class="ct-flag-item ${f.type === 'urgent' ? 'ct-flag-item--urgent' : ''}">
              <div class="ct-flag-item__head">${flagStatus(f)}<span class="ct-flag-item__name">${esc(f.patientName || '')}</span></div>
              <div class="ct-flag-item__body">
                <p class="small">${esc(f.reason)}</p>
                ${f.words ? `<blockquote class="ct-quote">${esc(f.words)}</blockquote>` : ''}
                ${f.why ? `<p class="small">Reason: "${esc(f.why)}"</p>` : ''}
                <button type="button" class="ct-btn ct-btn--secondary ct-btn--sm" data-close-flag="${esc(f.id)}">${icon('phone')}Called back</button>
              </div>
            </li>`).join('')}</ul>` : empty('No open flags in this view.', 'check')}
        </div>
      </div>`;
  }

  if (appTab === 'courses') {
    const rep = selectedCourseReport;
    return `
      <div class="ct-stack">
        <strong>Doctor course review</strong>
        <label class="ct-field">
          <span class="ct-field__label">Inspect patient</span>
          <select class="ct-select" id="mb-doc-pat">
            ${verified.map((p) => `<option value="${esc(p.id)}" ${p.id === selectedCoursePid ? 'selected' : ''}>${esc(p.name)} (${esc((p.prescriptions[0] || {}).medicine || 'Course')})</option>`).join('')}
          </select>
        </label>

        ${rep && rep.courses[0] ? `
          <div class="ct-card ct-stack">
            <div class="ct-row ct-row--between">
              <strong>${esc(rep.courses[0].medicine)} ${esc(rep.courses[0].dose)}</strong>
              <span class="tabular small">Day ${rep.courses[0].day} of ${rep.courses[0].days}</span>
            </div>
            ${progress(rep.courses[0].taken, rep.courses[0].totalDoses, `${rep.courses[0].completionPct}% of full course`, `${rep.courses[0].adherencePct ?? 0}% when due`)}
            <p class="small muted">Confirmed: ${rep.courses[0].taken} | Not confirmed: ${rep.courses[0].missed}</p>
          </div>
          <div class="ct-card ct-stack">
            <strong>Patient's spoken words</strong>
            <ul class="ct-list">
              ${rep.quotes.slice(0, 5).map((q) => `<li><span><span class="ct-quote">${esc(q.words)}</span><br><span class="small muted">${when(q.at)}</span></span>${intentStatus(q.intent, q.label)}</li>`).join('') || `<li><span class="small muted">No spoken words recorded.</span></li>`}
            </ul>
          </div>
        ` : empty('No verified courses.', 'user')}
      </div>`;
  }

  if (appTab === 'enroll') {
    const langOpts = cfg.langs.map((l) => `<option value="${esc(l.code)}">${esc(l.name)} (${esc(l.nativeName)})</option>`).join('');
    return `
      <form class="ct-stack" id="mb-enroll-form">
        <strong>Quick discharge enrollment</strong>
        <div class="ct-card ct-stack">
          <label class="ct-field"><span class="ct-field__label">Dictate prescription</span>
            <input class="ct-input" id="mb-rx-line" value="Paracetamol 650, after breakfast and dinner, 5 days"></label>
          <button type="button" class="ct-btn ct-btn--secondary ct-btn--sm" data-act="mb-parse-rx">${icon('mic')}Fill from line</button>
          <label class="ct-field"><span class="ct-field__label">Patient name</span>
            <input class="ct-input" id="mb-en-name" required placeholder="For example: Sita Rao"></label>
          <label class="ct-field"><span class="ct-field__label">Call language</span>
            <select class="ct-select" id="mb-en-lang">${langOpts}</select></label>
          <label class="ct-field"><span class="ct-field__label">Medicine</span>
            <input class="ct-input" id="mb-en-med" value="${esc((rxParsed && rxParsed.medicine) || 'Paracetamol')}" required></label>
          <div class="ct-row">
            <label class="ct-field"><span class="ct-field__label">Dose</span>
              <input class="ct-input" id="mb-en-dose" value="${esc((rxParsed && rxParsed.dose) || '650 mg')}"></label>
            <label class="ct-field"><span class="ct-field__label">Days</span>
              <input class="ct-input" id="mb-en-days" type="number" min="1" max="365" value="${esc((rxParsed && rxParsed.days) || 5)}"></label>
          </div>
          <label class="ct-check"><input type="checkbox" id="mb-en-c1" checked><span>Patient agreed to receive calls in this language</span></label>
          <label class="ct-check"><input type="checkbox" id="mb-en-c2" checked><span>Patient knows key 9 or "stop calls" stops calls</span></label>
          <button type="submit" class="ct-btn ct-btn--primary ct-btn--block">Save &amp; send to Verify</button>
        </div>
      </form>`;
  }

  return `
    <div class="ct-stack">
      <div class="ct-card ct-stack">
        <strong>${esc(clinicianRole)}</strong>
        <p class="small muted">Department: ${esc(wardDept)}. Doses logged without a yes: ${esc(m.logsWithoutYes)}.</p>
      </div>
      <button type="button" class="ct-btn ct-btn--secondary ct-btn--block" data-act="replay-tour">Replay clinician tour</button>
      <button type="button" class="ct-btn ct-btn--danger ct-btn--block" data-act="reset-demo">${icon('refresh')}Reset sample data</button>
      <button type="button" class="ct-btn ct-btn--ghost ct-btn--block" data-act="sign-out">Sign out</button>
    </div>`;
}

// ---- events -----------------------------------------------------------------

async function onClick(e) {
  const perBtn = e.target.closest('[data-persona]');
  if (perBtn) {
    persona = perBtn.dataset.persona;
    store('ct.mobile.persona', persona);
    stage = 'tour';
    slideIdx = 0;
    appTab = persona === 'patient' ? 'today' : 'triage';
    renderAll();
    return;
  }

  const stBtn = e.target.closest('[data-stage]');
  if (stBtn) {
    stage = stBtn.dataset.stage;
    renderAll();
    return;
  }

  const tabBtn = e.target.closest('[data-tab]');
  if (tabBtn) {
    appTab = tabBtn.dataset.tab;
    renderDevice();
    return;
  }

  const sampleBtn = e.target.closest('[data-sample]');
  if (sampleBtn) {
    await sendPatientReply({ text: sampleBtn.dataset.sample, via: 'typed' });
    return;
  }

  const keyBtn = e.target.closest('[data-key]');
  if (keyBtn && activeCall) {
    const c = await post(`/api/calls/${activeCall.id}/key`, { key: keyBtn.dataset.key });
    await playCallTurn(c);
    return;
  }

  const verifyBtn = e.target.closest('[data-verify]');
  if (verifyBtn) {
    await busy(verifyBtn, () => post(`/api/verify/${verifyBtn.dataset.verify}`, { nurse: clinicianRole }));
    toast('Patient verified. Dose slots scheduled.');
    await loadData();
    renderDevice();
    return;
  }

  const closeBtn = e.target.closest('[data-close-flag]');
  if (closeBtn) {
    await busy(closeBtn, () => post(`/api/flags/${closeBtn.dataset.closeFlag}/close`, { nurse: clinicianRole, note: 'Called back from mobile app' }));
    toast('Flag closed: called back');
    await loadData();
    renderDevice();
    return;
  }

  const actEl = e.target.closest('[data-act]');
  if (!actEl) return;
  const act = actEl.dataset.act;

  if (act === 'slide-prev' && slideIdx > 0) { slideIdx -= 1; renderDevice(); }
  else if (act === 'slide-next') {
    if (slideIdx < 2) { slideIdx += 1; renderDevice(); }
    else { stage = 'login'; renderAll(); }
  }
  else if (act === 'skip-tour') { stage = 'login'; renderAll(); }
  else if (act === 'send-otp') { otpSent = true; renderDevice(); }
  else if (act === 'fill-otp') { otpDigits = ['4', '2', '1', '0']; renderDevice(); }
  else if (act === 'fill-pin') { staffPin = ['1', '2', '0', '4']; renderDevice(); }
  else if (act === 'finish-pat-setup') {
    const shareBox = el.querySelector('#mb-setup-share');
    if (shareBox && pid) await api(`/api/patients/${pid}`, { method: 'PATCH', body: { shareWithFamily: shareBox.checked } });
    stage = 'app';
    appTab = 'today';
    await loadData();
    renderAll();
    toast('Preferences saved');
  }
  else if (act === 'finish-doc-setup') {
    stage = 'app';
    appTab = 'triage';
    await loadData();
    renderAll();
  }
  else if (act === 'set-lang') {
    const code = actEl.dataset.lang;
    await api(`/api/patients/${encodeURIComponent(pid)}`, { method: 'PATCH', body: { lang: code } });
    await loadData();
    renderDevice();
    const x = cfg.langs.find((y) => y.code === code);
    toast(`Language set to ${x.name} (${x.nativeName}). Calls and this app now use it.`);
  }
  else if (act === 'detect-lang') {
    const note = el.querySelector('#mb-lang-note');
    actEl.disabled = true;
    const r = await voice.detectLanguageByVoice({ sarvamKey: cfg.keys.sarvam, onListening: (t) => { if (note) note.textContent = t; } });
    if (!el) return;
    actEl.disabled = false;
    if (r.error) { if (note) note.textContent = r.error; return; }
    await api(`/api/patients/${encodeURIComponent(pid)}`, { method: 'PATCH', body: { lang: r.lang } });
    await loadData();
    renderDevice();
    const x = cfg.langs.find((y) => y.code === r.lang);
    toast(`Detected ${x.name} (${x.nativeName}). Calls and this app now use it.`);
  }
  else if (act === 'replay-tour') { slideIdx = 0; stage = 'tour'; renderAll(); }
  else if (act === 'sign-out') { otpSent = false; stage = 'login'; renderAll(); }
  else if (act === 'ring-next') {
    try {
      const c = await busy(actEl, () => post('/api/slots/next', { patientId: pid }));
      activeCall = c;
      lastHeard = null;
      appTab = 'call';
      await loadData();
      renderDevice();
      window.dispatchEvent(new Event('ct:refresh'));
    } catch (err) { toast(err.message, 'error'); }
  }
  else if (act === 'call-answer' && activeCall) {
    const c = await busy(actEl, () => post(`/api/calls/${activeCall.id}/answer`));
    await playCallTurn(c);
  }
  else if (act === 'call-decline' && activeCall) {
    const c = await busy(actEl, () => post(`/api/calls/${activeCall.id}/decline`, { reason: 'Declined in mobile app' }));
    activeCall = c;
    await loadData();
    renderDevice();
    toast(c.status === 'ringing' ? `Retrying in 10 min (ring ${c.rings})` : 'Marked missed and flagged');
  }
  else if (act === 'mic-reply' && activeCall) {
    if (!voice.canRecognize()) { toast('Voice input needs Chrome. Tap a sample phrase instead.', 'error'); return; }
    const p = patients.find((x) => x.id === pid);
    const l = cfg.langs.find((x) => x.code === (p && p.lang)) || cfg.langs[0];
    toast(`Listening in ${l.name}...`);
    const r = await voice.listen({ speechCode: l.speechCode });
    if (r.text) await sendPatientReply({ text: r.text, confidence: r.confidence });
    else if (r.silence) await sendPatientReply({ silence: true });
  }
  else if (act === 'mb-parse-rx') {
    const line = el.querySelector('#mb-rx-line').value;
    rxParsed = await post('/api/parse-rx', { text: line });
    renderDevice();
    toast('Prescription fields filled by rules');
  }
  else if (act === 'reset-demo') {
    await busy(actEl, () => post('/api/reset'));
    await loadData();
    renderDevice();
    toast('Sample data restored');
  }
}

async function onChange(e) {
  if (e.target.id === 'mb-pat-select' || e.target.id === 'mb-switch-pat') {
    pid = e.target.value;
    lastHeard = null;
    await loadData();
    renderDevice();
  } else if (e.target.id === 'mb-doc-role') {
    clinicianRole = e.target.value;
  } else if (e.target.id === 'mb-dept') {
    wardDept = e.target.value;
  } else if (e.target.name === 'mb-replypref') {
    replyPref = e.target.value;
  } else if (e.target.name === 'mb-alertpref') {
    alertPref = e.target.value;
  } else if (e.target.id === 'mb-doc-pat') {
    selectedCoursePid = e.target.value;
    await loadData();
    renderDevice();
  } else if (e.target.dataset.toggleShare) {
    await api(`/api/patients/${e.target.dataset.toggleShare}`, { method: 'PATCH', body: { shareWithFamily: e.target.checked } });
    await loadData();
    renderDevice();
    toast(e.target.checked ? 'Family sharing enabled' : 'Family sharing turned off');
  }
}

function onInput(e) {
  if (e.target.dataset.otp !== undefined) {
    const idx = Number(e.target.dataset.otp);
    otpDigits[idx] = e.target.value.slice(-1);
    const next = el.querySelector(`[data-otp="${idx + 1}"]`);
    if (otpDigits[idx] && next) next.focus();
  } else if (e.target.dataset.pin !== undefined) {
    const idx = Number(e.target.dataset.pin);
    staffPin[idx] = e.target.value.slice(-1);
    const next = el.querySelector(`[data-pin="${idx + 1}"]`);
    if (staffPin[idx] && next) next.focus();
  }
}

async function onSubmit(e) {
  e.preventDefault();
  if (e.target.id === 'mb-login-form') {
    if (otpDigits.join('').length < 4) { otpDigits = ['4', '2', '1', '0']; }
    stage = 'setup';
    await loadData();
    renderAll();
  } else if (e.target.id === 'mb-doc-login-form') {
    if (staffPin.join('').length < 4) { staffPin = ['1', '2', '0', '4']; }
    stage = 'setup';
    renderAll();
  } else if (e.target.id === 'mb-reply-form') {
    const inp = el.querySelector('#mb-reply-in');
    if (inp && inp.value.trim()) {
      const txt = inp.value.trim();
      inp.value = '';
      await sendPatientReply({ text: txt, via: 'typed' });
    }
  } else if (e.target.id === 'mb-enroll-form') {
    const name = el.querySelector('#mb-en-name').value.trim();
    const lang = el.querySelector('#mb-en-lang').value;
    const medicine = el.querySelector('#mb-en-med').value.trim();
    const dose = el.querySelector('#mb-en-dose').value.trim();
    const days = Number(el.querySelector('#mb-en-days').value) || 5;
    const c1 = el.querySelector('#mb-en-c1').checked;
    const c2 = el.querySelector('#mb-en-c2').checked;
    if (!name || !medicine || !c1 || !c2) {
      toast('Enter patient name, medicine, and both consent checks', 'error');
      return;
    }
    try {
      const slots = (rxParsed && rxParsed.slots && rxParsed.slots.length) ? rxParsed.slots : ['breakfast', 'dinner'];
      const p = await post('/api/patients', {
        name, lang, phoneType: 'smart', phone: '+91 90000 00099',
        shareWithFamily: true, consent: { calls: true, stopInfo: true, recordedBy: clinicianRole },
      });
      await post('/api/prescriptions', { patientId: p.id, medicine, dose, slots, days });
      toast('Saved. Verify on the Triage tab to start calls.');
      appTab = 'triage';
      await loadData();
      renderDevice();
    } catch (err) { toast(err.message, 'error'); }
  }
}

async function sendPatientReply(body) {
  if (!activeCall) return;
  try {
    const c = await post(`/api/calls/${activeCall.id}/reply`, body);
    await playCallTurn(c);
  } catch (err) { toast(err.message, 'error'); }
}

async function playCallTurn(c) {
  const myToken = token;
  activeCall = c;
  lastHeard = [...(c.transcript || [])].reverse().find((x) => x.who === 'patient') || null;
  await loadData(myToken);
  renderDevice();

  const p = patients.find((x) => x.id === pid);
  const l = cfg.langs.find((x) => x.code === (p && p.lang)) || cfg.langs[0];
  if (c.turn && c.turn.say && c.turn.say.length) {
    speakingCall = true;
    try {
      for (const line of c.turn.say) {
        if (myToken !== token) return;
        await voice.speakLine(line, l.speechCode, { sarvamKey: cfg.keys.sarvam, clips: (cfg.audio && cfg.audio[l.code]) || [] });
      }
    } finally {
      speakingCall = false;
    }
  }
  if (c.status === 'ended') {
    toast(c.outcome === 'taken' ? 'Dose confirmed and logged' : `Call ended: ${c.outcome}`);
    await loadData(myToken);
    if (myToken === token) renderDevice();
    window.dispatchEvent(new Event('ct:refresh'));
  }
}
