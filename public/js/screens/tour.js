// Interactive tour: a chapter list on the left and a framed product preview on the right.
// "Start the tour" walks 15 steps in 4 chapters. Each step switches the preview screen,
// rings one element and shows a tooltip card. Used on #tour and, compact, on the #home band.
import { esc, icon, status } from '../lib.js';

// ---- Steps -------------------------------------------------------------------------
// screen: which preview to show. stage: how far the call transcript has got. spot: the
// element to ring. tip: where the tooltip sits over the preview on wide screens.
const CHAPTERS = [
  {
    key: 'patients', name: 'Patients', sub: 'A call at each dose time',
    steps: [
      { screen: 'call', stage: 0, spot: 'lang', tip: 'bl', title: 'A call in their own language',
        text: 'At each dose time the patient gets a call in the language they picked or that was detected: ten Indian languages plus English.' },
      { screen: 'call', stage: 1, spot: 'reply', tip: 'br', title: 'Reply by voice or keypad',
        text: 'Lakshmi says she took it in Telugu. Anyone can press 1 taken, 2 later, 3 nurse or 9 stop calls instead.' },
      { screen: 'call', stage: 2, spot: 'readback', tip: 'bl', title: 'Every dose is read back',
        text: 'Care Taker repeats the meal slot and time, then asks her to say yes or press 1.' },
      { screen: 'call', stage: 3, spot: 'logged', tip: 'br', title: 'Logged only after a yes',
        text: 'The dose is saved as taken only after a spoken or pressed yes. Nothing is ever guessed.' },
      { screen: 'unwell', spot: 'urgent', tip: 'br', title: 'Unwell outranks everything',
        text: 'Arjun says he took it but feels dizzy, so no dose is logged and the nurse gets an urgent flag.' },
    ],
  },
  {
    key: 'families', name: 'Families', sub: 'A weekly record, if shared',
    steps: [
      { screen: 'family', spot: 'share', tip: 'br', title: 'Shared only if the patient agrees',
        text: 'Ravi sees this page because his mother chose to share it, and she can stop at any time.' },
      { screen: 'family', spot: 'week', tip: 'bl', title: 'A calm weekly record',
        text: 'Seven days at a glance: doses confirmed, moved to later or missed.' },
      { screen: 'family', spot: 'words', tip: 'bl', title: 'In her own words',
        text: 'Family read what she actually said on each call, not a score.' },
    ],
  },
  {
    key: 'nurses', name: 'Nurses', sub: 'Verify, then work the flags',
    steps: [
      { screen: 'desk', spot: 'rx', tip: 'bl', title: 'The nurse checks the prescription',
        text: 'At the hospital desk, one line from the discharge sheet becomes medicine, dose, meal slots and days.' },
      { screen: 'desk', spot: 'consent', tip: 'bl', title: 'Consent comes before any call',
        text: 'Calls start only after the patient agrees and the nurse presses Verify.' },
      { screen: 'nurse', spot: 'urgent', tip: 'bl', title: 'Most urgent first',
        text: 'Flags sort by priority and quote the patient, so the nurse knows why before calling back.' },
      { screen: 'nurse', spot: 'metric', tip: 'bl', title: 'Zero doses without a yes',
        text: 'The board counts doses logged without a yes. The target is always 0.' },
    ],
  },
  {
    key: 'doctors', name: 'Doctors', sub: 'Completion, vitals, words',
    steps: [
      { screen: 'doctor', spot: 'course', tip: 'bl', title: 'Honest course completion',
        text: 'Confirmed doses out of those due so far, and out of the whole course.' },
      { screen: 'doctor', spot: 'vitals', tip: 'bl', title: 'Health devices against your ranges',
        text: 'Readings from BP monitors, sugar meters, watches and rings are compared with the doctor\'s own ranges.' },
      { screen: 'doctor', spot: 'words', tip: 'br', title: 'The patient\'s words, with every flag',
        text: 'Each flag carries what the patient said, so the follow-up starts from their side.', last: true },
    ],
  },
];

const STEPS = CHAPTERS.flatMap((c, ci) => c.steps.map((s, si) => ({ ...s, chapter: ci, inChapter: si })));
const TOTAL = STEPS.length;
const firstOf = (ci) => STEPS.findIndex((s) => s.chapter === ci);
const TRACK_TO_CHAPTER = { patients: 0, families: 1, family: 1, nurses: 2, nurse: 2, doctors: 3, doctor: 3, system: 0 };

const LIVE_LINKS = [
  ['#phone', 'phone', 'Patient call'],
  ['#nurse', 'flag', 'Nurse board'],
  ['#family', 'users', 'Family'],
  ['#doctor', 'stethoscope', 'Doctor'],
];

const ADDRESS = { overview: 'caretaker.app/today', call: 'caretaker.app/patient', unwell: 'caretaker.app/patient', family: 'caretaker.app/family', desk: 'caretaker.app/desk', nurse: 'caretaker.app/nurse', doctor: 'caretaker.app/doctor' };
const SCREEN_NAME = { overview: 'Today overview', call: 'Patient call', unwell: 'Patient call', family: 'Family weekly record', desk: 'Hospital desk', nurse: 'Nurse board', doctor: 'Doctor review' };

// ---- Preview pieces ----------------------------------------------------------------
const pill = (cls, ic, label) => `<span class="ct-wk-chip ct-wk-chip--${cls}">${icon(ic)}${esc(label)}</span>`;
const fakeBtn = (label, cls = 'primary') => `<span class="ct-wk-fake ct-wk-fake--${cls}">${esc(label)}</span>`;
const KEYS = [['1', 'Taken'], ['2', 'Later'], ['3', 'Nurse'], ['9', 'Stop calls']];

function phone({ who, time, lang, lines }) {
  return `
    <div class="ct-wk-phone">
      <div class="ct-wk-phone__head">
        <span class="ct-wk-phone__avatar" aria-hidden="true">${icon('mark')}</span>
        <span class="ct-wk-phone__who"><strong>Care Taker</strong><span>Calling ${esc(who)}, ${esc(time)}</span></span>
      </div>
      <div class="ct-wk-phone__lang" data-spot="lang">${icon('globe')}${esc(lang)}</div>
      <ol class="ct-wk-phone__lines">${lines.map((l) => `
        <li class="ct-wk-line ct-wk-line--${l.from}" data-at="${l.at || 0}"${l.spot ? ` data-spot="${l.spot}"` : ''}>
          <span class="ct-wk-line__text" lang="${esc(l.lang || 'en')}">${esc(l.text)}</span>
          ${l.gloss ? `<span class="ct-wk-line__gloss">${esc(l.gloss)}</span>` : ''}
          ${l.heard ? `<span class="ct-wk-line__heard">Heard: ${esc(l.heard)}</span>` : ''}
        </li>`).join('')}
      </ol>
      <div class="ct-wk-keys" data-spot="keys">${KEYS.map(([k, l]) => `<span class="ct-wk-key"><strong>${k}</strong><span>${l}</span></span>`).join('')}</div>
    </div>`;
}

const SCREENS = {
  overview: () => `
    <div class="ct-wk-view ct-wk-overview">
      <div class="ct-wk-view__head"><div><span class="ct-wk-kicker">City Hospital after-care</span><h3>Today, 09:02</h3></div>${pill('taken', 'check', '3 calls answered')}</div>
      <div class="ct-wk-tiles">
        <div class="ct-wk-tile">
          <span class="ct-wk-tile__label">${icon('phone')}Patient call</span>
          <p class="ct-wk-tile__quote" lang="te">వేసుకున్నాను</p>
          <p class="ct-wk-tile__meta">Lakshmi Devi, after breakfast. Read back, then yes.</p>
          ${status('taken', 'Taken 09:02')}
        </div>
        <div class="ct-wk-tile">
          <span class="ct-wk-tile__label">${icon('flag')}Nurse board</span>
          <p class="ct-wk-tile__big">1 urgent</p>
          <p class="ct-wk-tile__meta">Arjun: "haan le li, lekin chakkar aa raha hai"</p>
          ${status('urgent', 'Urgent')}
        </div>
        <div class="ct-wk-tile">
          <span class="ct-wk-tile__label">${icon('stethoscope')}Doctor</span>
          <p class="ct-wk-tile__big">7 of 8 due</p>
          <div class="ct-wk-bar" aria-hidden="true"><span class="ct-wk-bar__fill ct-wk-bar__fill--88"></span></div>
          <p class="ct-wk-tile__meta">Day 3 of 14. BP in range, sugar to review.</p>
        </div>
        <div class="ct-wk-tile">
          <span class="ct-wk-tile__label">${icon('users')}Family</span>
          <p class="ct-wk-tile__big">Shared with Ravi</p>
          ${week(true)}
        </div>
      </div>
    </div>`,

  call: () => `
    <div class="ct-wk-view ct-wk-split">
      ${phone({
        who: 'Lakshmi Devi', time: '09:00', lang: 'Telugu, picked at discharge',
        lines: [
          { from: 'bot', at: 0, lang: 'te', text: 'మీ ఉదయం టిఫిన్ తర్వాతి మాత్రలు వేసుకున్నారా?', gloss: 'Did you take your after-breakfast tablets?' },
          { from: 'patient', at: 1, lang: 'te', text: 'వేసుకున్నాను', gloss: 'I took it', heard: 'Taken, needs read-back', spot: 'reply' },
          { from: 'bot', at: 2, lang: 'te', text: 'మీరు 09:00కి మీ మాత్రలు వేసుకున్నారు. సరేనా?', gloss: 'You took them at 09:00. Is that right? Say yes or press 1.', spot: 'readback' },
          { from: 'patient', at: 3, lang: 'te', text: 'అవును', gloss: 'Yes', heard: 'Yes' },
        ],
      })}
      <div class="ct-wk-panel">
        <span class="ct-wk-kicker">Dose slot</span>
        <h3>Amoxiclav 625 mg</h3>
        <dl class="ct-wk-dl">
          <div><dt>Slot</dt><dd>After breakfast, 09:00</dd></div>
          <div><dt>Course</dt><dd>Day 3 of 14</dd></div>
          <div><dt>Phone</dt><dd>Keypad phone</dd></div>
        </dl>
        <div class="ct-wk-log" data-spot="logged">
          <span class="ct-wk-log__label">Log</span>
          <span class="ct-wk-log__state ct-wk-log__state--wait">${status('pending', 'Waiting for a yes')}</span>
          <span class="ct-wk-log__state ct-wk-log__state--done">${status('taken', 'Taken 09:02, after yes')}</span>
        </div>
      </div>
    </div>`,

  unwell: () => `
    <div class="ct-wk-view ct-wk-split">
      ${phone({
        who: 'Arjun', time: '21:30', lang: 'Hindi, detected from speech',
        lines: [
          { from: 'bot', lang: 'hi', text: 'क्या आपने अपनी रात की दवाई ली?', gloss: 'Did you take your bedtime medicine?' },
          { from: 'patient', lang: 'hi-Latn', text: 'haan le li, lekin chakkar aa raha hai', gloss: 'Yes I took it, but I feel dizzy', heard: 'Unwell, outranks taken' },
          { from: 'bot', lang: 'hi', text: 'कुछ ही मिनटों में एक नर्स आपको कॉल करेंगी.', gloss: 'A nurse will call you in a few minutes.' },
        ],
      })}
      <div class="ct-wk-panel">
        <span class="ct-wk-kicker">Dose slot</span>
        <h3>Isotretinoin 20 mg</h3>
        <dl class="ct-wk-dl">
          <div><dt>Slot</dt><dd>Bedtime, 21:30</dd></div>
          <div><dt>Course</dt><dd>Day 15 of 60</dd></div>
        </dl>
        <div class="ct-wk-log ct-wk-log--stack" data-spot="urgent">
          ${status('pending', 'No dose logged')}
          ${status('urgent', 'Urgent flag raised')}
          <span class="ct-wk-log__note">Sent to the nurse board with his exact words.</span>
        </div>
      </div>
    </div>`,

  family: () => `
    <div class="ct-wk-view">
      <div class="ct-wk-view__head">
        <div><span class="ct-wk-kicker">Family view, read only</span><h3>Lakshmi Devi's week</h3></div>
        <span class="ct-wk-share" data-spot="share">${icon('lock')}Shared by Lakshmi with Ravi, son</span>
      </div>
      <div data-spot="week">${week(false)}</div>
      <div class="ct-wk-words" data-spot="words">
        <span class="ct-wk-kicker">In her words</span>
        <ul class="ct-wk-wordlist">
          <li><time>Wed 09:02</time><span lang="te">వేసుకున్నాను</span><span class="ct-wk-line__gloss">I took it</span></li>
          <li><time>Tue 21:10</time><span class="ct-wk-muted">No answer after 3 rings</span>${status('missed')}</li>
          <li><time>Tue 13:40</time><span lang="te">అవును, తిన్నాను</span><span class="ct-wk-line__gloss">Yes, I have eaten</span></li>
        </ul>
      </div>
    </div>`,

  desk: () => `
    <div class="ct-wk-view">
      <div class="ct-wk-view__head"><div><span class="ct-wk-kicker">Hospital desk</span><h3>Verify before discharge</h3></div>${pill('wait', 'clock', 'Waiting for verification')}</div>
      <p class="ct-wk-patient">${icon('user')}<strong>Lakshmi Devi, 67</strong><span>Telugu, keypad phone</span></p>
      <div class="ct-wk-rx" data-spot="rx">
        <span class="ct-wk-rx__said">${icon('mic')}"Amoxiclav 625 after every meal for 2 weeks"</span>
        <dl class="ct-wk-fields">
          <div><dt>Medicine</dt><dd>Amoxiclav</dd></div>
          <div><dt>Dose</dt><dd>625 mg</dd></div>
          <div><dt>Meal slots</dt><dd>Breakfast, lunch, dinner</dd></div>
          <div><dt>Days</dt><dd>14</dd></div>
        </dl>
      </div>
      <div class="ct-wk-consent" data-spot="consent">
        <ul class="ct-wk-checks">
          <li>${icon('check')}Agrees to dose calls in Telugu</li>
          <li>${icon('check')}Knows to say stop or press 9 to end calls</li>
        </ul>
        <div class="ct-wk-consent__foot">${fakeBtn('Verify and schedule calls')}<span class="ct-wk-muted">No call goes out before this.</span></div>
      </div>
    </div>`,

  nurse: () => `
    <div class="ct-wk-view">
      <div class="ct-wk-view__head"><div><span class="ct-wk-kicker">Nurse board</span><h3>Flags, most urgent first</h3></div></div>
      <ol class="ct-wk-flags">
        <li class="ct-wk-flag ct-wk-flag--urgent" data-spot="urgent">
          <div class="ct-wk-flag__head">${status('urgent')}<strong>Arjun</strong><time>21:30</time></div>
          <p>Says he feels unwell</p>
          <p class="ct-wk-quote" lang="hi-Latn">haan le li, lekin chakkar aa raha hai</p>
          ${fakeBtn('Called back', 'secondary')}
        </li>
        <li class="ct-wk-flag">
          <div class="ct-wk-flag__head">${status('stopped')}<strong>Meena</strong><time>19:05</time></div>
          <p class="ct-wk-quote">I feel fine, I have stopped</p>
        </li>
        <li class="ct-wk-flag">
          <div class="ct-wk-flag__head">${status('missed')}<strong>Lakshmi Devi</strong><time>Tue 21:10</time></div>
          <p>No answer after 3 rings</p>
        </li>
      </ol>
      <div class="ct-wk-metrics">
        <div class="ct-wk-metric ct-wk-metric--ok" data-spot="metric"><strong>0</strong><span>Doses logged without a yes</span><span class="ct-wk-metric__target">${icon('check')}Must be 0</span></div>
        <div class="ct-wk-metric"><strong>2</strong><span>Waiting for verification</span></div>
      </div>
    </div>`,

  doctor: () => `
    <div class="ct-wk-view">
      <div class="ct-wk-view__head"><div><span class="ct-wk-kicker">Doctor review</span><h3>Lakshmi Devi, Amoxiclav 625 mg</h3></div>${pill('neutral', 'calendar', 'Day 3 of 14')}</div>
      <div class="ct-wk-course" data-spot="course">
        <div class="ct-wk-course__row"><span>Confirmed of doses due so far</span><strong>7 of 8, 88%</strong></div>
        <div class="ct-wk-bar" aria-hidden="true"><span class="ct-wk-bar__fill ct-wk-bar__fill--88"></span></div>
        <div class="ct-wk-course__row"><span>Confirmed of the whole course</span><strong>7 of 42, 17%</strong></div>
        <div class="ct-wk-bar" aria-hidden="true"><span class="ct-wk-bar__fill ct-wk-bar__fill--17"></span></div>
      </div>
      <div class="ct-wk-cols">
        <div class="ct-wk-vitals" data-spot="vitals">
          <span class="ct-wk-kicker">Devices against your ranges</span>
          <ul class="ct-wk-vitlist">
            <li><span>${icon('gauge')}Blood pressure</span><strong>132/84</strong><span class="ct-wk-muted">Range 90 to 140 / 60 to 90</span>${status('taken', 'In range')}</li>
            <li><span>${icon('drop')}Fasting sugar</span><strong>146 mg/dL</strong><span class="ct-wk-muted">Range 70 to 130</span>${status('later', 'Above range')}</li>
          </ul>
        </div>
        <div class="ct-wk-words" data-spot="words">
          <span class="ct-wk-kicker">Patient's words</span>
          <p class="ct-wk-quote" lang="te">వేసుకున్నాను</p>
          <p class="ct-wk-muted">Wed 09:02, then yes on read-back</p>
          <div>${status('missed', 'Missed Tue dinner')}</div>
        </div>
      </div>
    </div>`,
};

function week(compact) {
  const days = [['Mon', 3, 'all'], ['Tue', 2, 'some'], ['Wed', 1, 'today'], ['Thu', 0, 'next'], ['Fri', 0, 'next'], ['Sat', 0, 'next'], ['Sun', 0, 'next']];
  const mark = { all: ['check', 'All doses confirmed'], some: ['clock', 'One dose missed'], today: ['check', 'Today so far'], next: ['pending', 'Still to come'] };
  return `<ol class="ct-wk-week${compact ? ' ct-wk-week--compact' : ''}">${days.map(([d, n, k]) => `
    <li class="ct-wk-week__day ct-wk-week__day--${k}">
      <span class="ct-wk-week__name">${d}</span>
      <span class="ct-wk-week__mark" aria-hidden="true">${icon(mark[k][0])}</span>
      ${compact ? '' : `<span class="ct-wk-week__count">${k === 'next' ? '' : `${n} of 3`}</span>`}
      <span class="visually-hidden">${mark[k][1]}</span>
    </li>`).join('')}</ol>`;
}

const CLOSE_SVG = '<svg class="ct-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

// ---- Widget ------------------------------------------------------------------------
let seq = 0;

export function renderTourWidget(container, opts = {}) {
  const full = !!opts.full;
  const id = `wk${++seq}`;
  let current = -1; // -1 means the overview, before the tour starts
  let shownScreen = null;
  const startChapter = TRACK_TO_CHAPTER[opts.initialTrack] ?? 0;

  container.innerHTML = `
    <section class="ct-walk${full ? ' ct-walk--full' : ''}" aria-label="Interactive tour" data-touring="false">
      <div class="ct-walk__intro">
        ${full ? `
          <span class="ct-walk__eyebrow">Interactive tour</span>
          <h1 class="ct-walk__title">See Care Taker in three minutes</h1>
          <p class="ct-walk__lead">Click through the real product with sample data. No sign-up, no install, nothing to connect.</p>` : ''}
        <div class="ct-walk__ctas">
          <button type="button" class="ct-btn ct-btn--primary ct-walk__start" id="${id}-start">Start the tour${icon('arrow-right')}</button>
          <a class="ct-btn ct-btn--secondary" href="#phone">${icon('phone')}Try a call</a>
        </div>
        <div class="ct-walk__meta">
          <div class="ct-walk__meta-row"><span>${TOTAL} steps in ${CHAPTERS.length} chapters</span><span>${icon('clock')}About 3 minutes</span></div>
          <progress class="ct-walk__bar" id="${id}-bar" max="${TOTAL}" value="0" aria-label="Tour progress">0 of ${TOTAL}</progress>
        </div>
        <ol class="ct-walk__chapters" id="${id}-chapters" aria-label="Chapters"></ol>
      </div>
      <div class="ct-walk__stage">
        <p class="ct-walk__label"><span class="ct-walk__live" aria-hidden="true"></span>Live preview<span aria-hidden="true">·</span>sample data</p>
        <div class="ct-walk__frame">
          <div class="ct-walk__chrome">
            <span class="ct-walk__dots" aria-hidden="true"><span></span><span></span><span></span></span>
            <span class="ct-walk__address">${icon('lock')}<span id="${id}-addr">${ADDRESS.overview}</span></span>
            <button type="button" class="ct-walk__x" id="${id}-x" aria-label="Close the tour" disabled>${CLOSE_SVG}</button>
          </div>
          <div class="ct-walk__screen" id="${id}-screen" role="group" aria-roledescription="preview" aria-label="Preview: ${SCREEN_NAME.overview}"></div>
        </div>
        <div class="ct-walk__tip" id="${id}-tip" role="dialog" aria-modal="false" aria-labelledby="${id}-tip-title" tabindex="-1" hidden></div>
      </div>
      <p class="visually-hidden" aria-live="polite" id="${id}-live"></p>
    </section>`;

  const root = container.querySelector('.ct-walk');
  const $ = (s) => root.querySelector(s);
  const screenEl = $(`#${id}-screen`);
  const tipEl = $(`#${id}-tip`);
  const startBtn = $(`#${id}-start`);
  const xBtn = $(`#${id}-x`);

  function drawChapters() {
    const step = STEPS[current];
    $(`#${id}-chapters`).innerHTML = CHAPTERS.map((c, ci) => {
      const isCur = step && step.chapter === ci;
      const done = step && step.chapter > ci;
      const first = firstOf(ci);
      return `
        <li class="ct-walk__chapter${isCur ? ' is-current' : ''}${done ? ' is-done' : ''}">
          <button type="button" class="ct-walk__chapter-btn" data-jump="${first}" ${isCur ? 'aria-current="step"' : ''}>
            <span class="ct-walk__num" aria-hidden="true">${done ? icon('check') : ci + 1}</span>
            <span class="ct-walk__chapter-name"><strong>${esc(c.name)}</strong><span>${esc(c.sub)}</span></span>
            <span class="ct-walk__count">${isCur ? `${step.inChapter + 1} of ${c.steps.length}` : `${c.steps.length} steps`}</span>
          </button>
          ${isCur ? `<ol class="ct-walk__substeps">${c.steps.map((s, si) => `
            <li><button type="button" class="ct-walk__substep" data-jump="${first + si}" ${si === step.inChapter ? 'aria-current="step"' : ''}>${esc(s.title)}</button></li>`).join('')}
          </ol>` : ''}
        </li>`;
    }).join('');
  }

  function drawScreen(key) {
    if (shownScreen !== key) {
      screenEl.innerHTML = SCREENS[key]();
      screenEl.setAttribute('aria-label', `Preview: ${SCREEN_NAME[key]}`);
      $(`#${id}-addr`).textContent = ADDRESS[key];
      shownScreen = key;
    }
    const step = STEPS[current];
    const stage = step && step.stage !== undefined ? step.stage : 9;
    for (const line of screenEl.querySelectorAll('[data-at]')) {
      const on = Number(line.dataset.at) <= stage;
      line.classList.toggle('is-shown', on);
      line.setAttribute('aria-hidden', on ? 'false' : 'true');
    }
    screenEl.querySelector('.ct-wk-log')?.classList.toggle('is-done', stage >= 3);
    screenEl.querySelector('.ct-wk-keys')?.classList.toggle('ct-wk-keys--lit', stage === 1);
    for (const n of screenEl.querySelectorAll('.is-spot')) n.classList.remove('is-spot');
    if (step) {
      const target = screenEl.querySelector(`[data-spot="${step.spot}"]`);
      if (target) target.classList.add('is-spot');
    }
  }

  function drawTip(focusId) {
    const step = STEPS[current];
    if (!step) { tipEl.hidden = true; tipEl.innerHTML = ''; return; }
    const ch = CHAPTERS[step.chapter];
    tipEl.hidden = false;
    tipEl.dataset.pos = step.tip;
    tipEl.innerHTML = `
      <div class="ct-walk__tip-card">
        <div class="ct-walk__tip-top">
          <span class="ct-walk__tip-count">Step ${current + 1} of ${TOTAL}<span aria-hidden="true"> · </span><span class="visually-hidden">, </span>${esc(ch.name)}</span>
          <button type="button" class="ct-walk__tip-close" data-act="close" aria-label="Close the tour">${CLOSE_SVG}</button>
        </div>
        <h3 class="ct-walk__tip-title" id="${id}-tip-title">${esc(step.title)}</h3>
        <p class="ct-walk__tip-text">${esc(step.text)}</p>
        ${step.last ? `
          <p class="ct-walk__tip-more">That is the tour. Open the live screens:</p>
          <ul class="ct-walk__links">${LIVE_LINKS.map(([h, ic, l]) => `<li><a href="${h}">${icon(ic)}${esc(l)}</a></li>`).join('')}</ul>` : ''}
        <div class="ct-walk__tip-nav">
          ${current > 0 ? `<button type="button" class="ct-btn ct-btn--ghost ct-btn--sm" data-act="back" id="${id}-back">${icon('arrow-left')}Back</button>` : `<button type="button" class="ct-btn ct-btn--ghost ct-btn--sm" data-act="close" id="${id}-skip">Skip</button>`}
          <span class="ct-walk__pips" aria-hidden="true">${ch.steps.map((_, i) => `<span class="${i === step.inChapter ? 'is-on' : ''}"></span>`).join('')}</span>
          ${step.last
            ? `<button type="button" class="ct-btn ct-btn--primary ct-btn--sm" data-act="close" id="${id}-next">Finish${icon('check')}</button>`
            : `<button type="button" class="ct-btn ct-btn--primary ct-btn--sm" data-act="next" id="${id}-next">Next${icon('arrow-right')}</button>`}
        </div>
      </div>`;
    $(`#${id}-live`).textContent = `Step ${current + 1} of ${TOTAL}: ${step.title}`;
    const f = focusId && tipEl.querySelector(`#${id}-${focusId}`);
    (f || tipEl).focus({ preventScroll: true });
    if (!isVisible(tipEl)) tipEl.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }

  function isVisible(el) {
    const r = el.getBoundingClientRect();
    return r.top >= 0 && r.bottom <= window.innerHeight;
  }

  function go(idx, focusId) {
    current = Math.max(0, Math.min(TOTAL - 1, idx));
    root.dataset.touring = 'true';
    startBtn.innerHTML = `Restart the tour${icon('refresh')}`;
    xBtn.disabled = false;
    $(`#${id}-bar`).value = current + 1;
    $(`#${id}-bar`).textContent = `${current + 1} of ${TOTAL}`;
    drawChapters();
    drawScreen(STEPS[current].screen);
    drawTip(focusId);
  }

  function close() {
    current = -1;
    root.dataset.touring = 'false';
    startBtn.innerHTML = `Start the tour${icon('arrow-right')}`;
    xBtn.disabled = true;
    $(`#${id}-bar`).value = 0;
    $(`#${id}-live`).textContent = 'Tour closed';
    drawChapters();
    drawScreen('overview');
    drawTip();
    startBtn.focus({ preventScroll: true });
  }

  root.addEventListener('click', (e) => {
    const jump = e.target.closest('[data-jump]');
    if (jump) { go(Number(jump.dataset.jump)); return; }
    if (e.target.closest(`#${id}-start`)) { go(startChapter && current < 0 ? firstOf(startChapter) : 0); return; }
    if (e.target.closest(`#${id}-x`)) { close(); return; }
    const act = e.target.closest('[data-act]');
    if (!act) return;
    if (act.dataset.act === 'next') go(current + 1, 'next');
    else if (act.dataset.act === 'back') go(current - 1, current - 1 > 0 ? 'back' : 'next');
    else if (act.dataset.act === 'close') close();
  });

  root.addEventListener('keydown', (e) => {
    if (current < 0 || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowRight' && current < TOTAL - 1) { e.preventDefault(); go(current + 1); }
    else if (e.key === 'ArrowLeft' && current > 0) { e.preventDefault(); go(current - 1); }
  });

  drawChapters();
  drawScreen('overview');
}

export function mount(el, params) {
  const track = (params && params.get('track')) || 'patients';
  el.innerHTML = '<div id="tour-mount"></div>';
  renderTourWidget(el.querySelector('#tour-mount'), { initialTrack: track, full: true });
}

export function unmount() {}
