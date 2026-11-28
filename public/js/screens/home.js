// Home: hero with a live dose call, the pinned "how a call becomes care" story, languages,
// one screen per role (pinned), every device, the fixed rules, tour, apps, comparison and FAQ.
import { esc, icon, config } from '../lib.js';
import { renderTourWidget } from './tour.js';
import { heroMarkup, peopleMarkup, mountHero, unmountHero } from '../home/hero.js';
import { howMarkup, mountHow, unmountHow } from '../home/how.js';
import { featuresMarkup } from '../home/features.js';
import { languagesMarkup, mountLanguages, unmountLanguages } from '../home/languages.js';
import { mountStories, unmountStories } from '../story.js';
import { scrollToY } from '../motion.js';

let el = null;

const DEVICES = [
  ['keypad', 'Keypad phone', 'Voice and keys 1, 2, 3, 9'],
  ['phone', 'Smartphone', 'Calls and the patient app'],
  ['tablet', 'Tablet', 'Ward rounds and family'],
  ['laptop', 'Laptop and desktop', 'Hospital desk, nurse board, doctor'],
];

const PROMISES = [
  ['A nurse verifies first', 'No call goes out until a nurse checks the prescription and the recorded consent.'],
  ['The patient\'s own language', 'Ten Indian languages and English, picked from a list or detected from the reply.'],
  ['Read back before logging', 'Care Taker repeats the dose and the time. Only a spoken yes or a pressed 1 logs it.'],
  ['Unclear is never taken', 'Low confidence or eight seconds of silence asks again, then offers the keypad.'],
  ['Health questions go to a person', 'Feeling unwell or asking for someone raises an urgent flag for the nurse.'],
  ['Stop at any time', 'Saying "stop calls" or pressing 9 ends the calls and tells the care team.'],
  ['One record for everyone', 'Nurse, doctor and family, if shared, see the same confirmed record in the patient\'s words.'],
];

const COMPARISON = [
  [
    'Phone needed by the patient',
    'Works on basic keypad phones by voice and keys 1, 2, 3, 9, plus a mobile web app for smartphones.',
    'Requires a smartphone, app store download, account creation, and notification permissions.',
  ],
  [
    'Language on the call',
    'Speaks and understands ten Indian languages and English, including mixed and romanised replies, and detects the language from the reply.',
    'English menus or one-way text alerts that elders often ignore.',
  ],
  [
    'How a dose is marked taken',
    'Reads back the meal slot and time and logs only after a spoken "yes" or pressed 1.',
    'Single tap dismissal, easily tapped out of habit without taking the tablet.',
  ],
  [
    'Patient says "took it, feeling dizzy"',
    'unwell outranks taken: logs zero dose, tells the patient a nurse will call, and raises an Urgent flag with exact words.',
    'Logs the dose as taken and misses the symptom.',
  ],
  [
    'Stopping antibiotics or long courses early',
    'Plays a halfway reminder; if stopped, asks why without lecturing and alerts the care team.',
    'Silent drop-off until symptoms return at the next hospital visit.',
  ],
  [
    'Medical advice and data sharing',
    'Never gives medical advice, supports instant key-9 opt-out, and locks the Family view unless the patient opts in.',
    'Unstructured chat replies or family dashboards with no patient sharing toggle.',
  ],
];

const FAQS = [
  {
    q: 'Does Care Taker need API keys or an internet account to run?',
    a: 'No. Run docker compose up --build on a fresh clone with no .env file and open http://localhost:3000 in Google Chrome. Self-hosted Noto Sans fonts, seeded Indian patient courses, rule-based dictation, voice calls, and all role screens work out of the box.',
  },
  {
    q: 'How do patients without a smartphone use Care Taker?',
    a: 'Patients on basic keypad phones receive a normal voice call in their language and answer by speaking or pressing 1 (taken), 2 (call later), 3 (speak to a nurse), or 9 (stop calls). Smartphone users and family members can also open the Mobile app prototype (#mobile).',
  },
  {
    q: 'Why does Care Taker ask for confirmation after a patient already said they took the medicine?',
    a: 'Speech recognition on noisy phone lines can mishear short words. Reading back the meal slot and time ("You took your after-breakfast tablets at 09:00. Is that right? Say yes or press 1.") ensures zero doses are logged by mistake.',
  },
  {
    q: 'How do doctors and nurses use Care Taker day to day?',
    a: 'At discharge, the desk nurse dictates the prescription and records patient consent. A ward nurse verifies the schedule on the Nurse board and only calls back flagged exceptions (Urgent, Stopped early, Not reachable, Missed). At review, the doctor sees honest course completion % alongside the patient\'s own spoken words.',
  },
  {
    q: 'What happens if a patient says they feel dizzy or asks medical questions?',
    a: 'Care Taker never gives medical advice. Replies mentioning symptoms ("chakkar aa raha hai", "కళ్ళు తిరుగుతున్నాయి", "I feel dizzy") or asking for a person immediately stop dose logging, tell the patient a nurse will call in a few minutes, and place an Urgent flag at the top of the Nurse board. In an emergency, call 112.',
  },
  {
    q: 'Can family members see the patient\'s dose record automatically?',
    a: 'No. Family access is off unless "Share with family" is turned on for that patient. You can test both states right away: Lakshmi Devi and Meena share their weekly report, while Arjun\'s Family view is locked.',
  },
  {
    q: 'How do you add another Indian language such as Kannada, Malayalam, or Bengali?',
    a: 'Copy server/lang/en.json to server/lang/<code>.json, translate the 20 short voice lines and intent keywords (native script, romanised, and English mix), and add intent tests. The server discovers new language files automatically with no code changes.',
  },
  {
    q: 'Why should I open Care Taker in Google Chrome?',
    a: 'Live microphone speech recognition uses the browser Web Speech API (webkitSpeechRecognition), which Chrome supports. Every call screen also includes a typed reply box, tappable sample phrases in each language, and keypad buttons so you can test every flow without a microphone.',
  },
];


export async function mount(root, params) {
  el = root;
  const cfg = await config();
  if (!el) return;
  const langs = cfg.langs || [];
  el.innerHTML = `
    ${heroMarkup()}

    ${howMarkup()}

    ${languagesMarkup(langs)}

    <section class="ct-band" id="devices-band" aria-labelledby="every-title">
      <div class="ct-page">
        <div class="ct-center-head" data-reveal="up">
          <span class="ct-eyebrow"><span class="ct-eyebrow__dot" aria-hidden="true"></span>Every device</span>
          <h2 id="every-title" class="ct-section-title-lg">Works on every device it meets.</h2>
          <p class="ct-section-lead">A keypad phone for the patient, a tablet on the ward, a laptop at the desk. Same record, same rules, laid out for each screen.</p>
        </div>
        <ul class="ct-every" data-reveal-group>
          ${DEVICES.map(([ic, t, d]) => `<li class="ct-every__item">${deviceIcon(ic)}<strong>${esc(t)}</strong><span>${esc(d)}</span></li>`).join('')}
        </ul>
      </div>
    </section>

    ${featuresMarkup()}

    ${peopleMarkup()}

    <section class="ct-band ct-band--surface" id="promises-section" aria-labelledby="promises-title">
      <div class="ct-page">
        <span class="ct-eyebrow" data-reveal="up"><span class="ct-eyebrow__dot" aria-hidden="true"></span>On every call</span>
        <h2 id="promises-title" class="ct-section-title-lg" data-reveal="up">Seven rules Care Taker never bends.</h2>
        <p class="ct-section-lead" data-reveal="up">The same fixed rules run for every patient, in every language, with or without API keys.</p>
        <ol class="ct-index" data-reveal-group>
          ${PROMISES.map(([t, d], i) => `<li class="ct-index__row"><span class="ct-index__num">${String(i + 1).padStart(2, '0')}</span><div><h3>${esc(t)}</h3><p>${esc(d)}</p></div></li>`).join('')}
        </ol>
      </div>
    </section>

    <!-- 8. Interactive Tour Section -->
    <section class="ct-band" id="tour-band" aria-labelledby="tour-band-title">
      <div class="ct-band__inner">
        <div class="ct-section-head ct-reveal">
          <div class="ct-section-head__copy">
            <span class="ct-eyebrow"><span class="ct-eyebrow__dot" aria-hidden="true"></span>Interactive tour</span>
            <h2 id="tour-band-title">See Care Taker in three minutes.</h2>
            <p class="muted">Four short chapters: patients, families, nurses and doctors. Sample data, nothing to install.</p>
          </div>
          <a class="ct-btn ct-btn--ghost" href="#tour">Open full-screen tour${icon('arrow-right')}</a>
        </div>
        <div id="home-tour-mount" class="ct-reveal ct-reveal--delay-1"></div>
      </div>
    </section>

    <!-- 9. Mobile Prototypes Section -->
    <section class="ct-band ct-band--surface" aria-labelledby="personas-title">
      <div class="ct-band__inner">
        <div class="ct-section-head ct-reveal">
          <div class="ct-section-head__copy">
            <span class="ct-eyebrow"><span class="ct-eyebrow__dot" aria-hidden="true"></span>Mobile Prototypes For Both Personas</span>
            <h2 id="personas-title">Designed for patients at home and clinicians on the ward.</h2>
            <p class="muted">Explore the interactive mobile application with onboarding tour, sample OTP sign-in, first-time setup, and live call and triage tabs.</p>
          </div>
        </div>
        <div class="ct-grid">
          <section class="ct-card ct-col-6 ct-stack ct-reveal ct-reveal--delay-1">
            <div class="ct-card__head"><h3 class="ct-section-title">${icon('phone')}Patient and family mobile app</h3><span class="ct-tag ct-tag--accent">Tour + Login + Setup + Call</span></div>
            <p class="muted">Walk through language selection, discharge code sign-in, meal-slot setup, family sharing control, and a live spoken or keypad dose call for Lakshmi Devi, Arjun, or Meena.</p>
            <ul class="ct-list">
              <li><span>3-slide onboarding tour in plain language</span><span class="small muted">Included</span></li>
              <li><span>Sample 4-digit discharge OTP login (code 4210)</span><span class="small muted">Zero SMS keys</span></li>
              <li><span>Live meal-slot schedule, voice call, and family view</span><span class="small muted">Real API</span></li>
            </ul>
            <div class="ct-row">
              <a class="ct-btn ct-btn--primary" href="#mobile?persona=patient">Launch patient app${icon('arrow-right')}</a>
              <a class="ct-btn ct-btn--secondary" href="#phone">Keypad phone frame</a>
            </div>
          </section>

          <section class="ct-card ct-col-6 ct-stack ct-reveal ct-reveal--delay-2">
            <div class="ct-card__head"><h3 class="ct-section-title">${icon('stethoscope')}Doctor and nurse clinician app</h3><span class="ct-tag ct-tag--accent">Tour + Ward Login + Triage</span></div>
            <p class="muted">Built for ward nurses verifying discharge schedules and doctors checking course completion and patient-reported flags between rounds.</p>
            <ul class="ct-list">
              <li><span>Clinician tour, staff sign-in, and ward alert setup</span><span class="small muted">Included</span></li>
              <li><span>One-tap Verify and priority flag callbacks with quotes</span><span class="small muted">Live sync</span></li>
              <li><span>Course completion % and mobile voice Rx enrollment</span><span class="small muted">Real API</span></li>
            </ul>
            <div class="ct-row">
              <a class="ct-btn ct-btn--primary" href="#mobile?persona=doctor">Launch clinician app${icon('arrow-right')}</a>
              <a class="ct-btn ct-btn--secondary" href="#doctor">Desktop Doctor view</a>
            </div>
          </section>
        </div>
      </div>
    </section>

    <!-- 10. Comparison Table Section -->
    <section class="ct-band" aria-labelledby="cmp-title">
      <div class="ct-band__inner ct-stack--lg">
        <div class="ct-section-head__copy ct-reveal">
          <span class="ct-eyebrow"><span class="ct-eyebrow__dot" aria-hidden="true"></span>Clear Boundaries</span>
          <h2 id="cmp-title">Explicit about what is confirmed, and what requires a human.</h2>
          <p class="muted">How Care Taker compares with typical smartphone reminder apps and manual nurse follow-up calls.</p>
        </div>
        <div class="ct-compare ct-reveal ct-reveal--delay-1" role="region" aria-label="Care Taker comparison">
          <div class="ct-compare__row ct-compare__row--head">
            <div class="ct-compare__cell">Dimension</div>
            <div class="ct-compare__cell ct-compare__cell--ours">With Care Taker</div>
            <div class="ct-compare__cell">Typical reminder apps</div>
          </div>
          ${COMPARISON.map(([dim, ours, other]) => `
            <div class="ct-compare__row">
              <div class="ct-compare__cell ct-compare__cell--dim">${esc(dim)}</div>
              <div class="ct-compare__cell ct-compare__cell--ours">${icon('tick')}<span>${esc(ours)}</span></div>
              <div class="ct-compare__cell ct-compare__cell--other">${icon('minus')}<span>${esc(other)}</span></div>
            </div>`).join('')}
        </div>
      </div>
    </section>

    <!-- 11. FAQ Section -->
    <section class="ct-band ct-band--surface" aria-labelledby="faq-title">
      <div class="ct-band__inner">
        <div class="ct-faq">
          <div class="ct-stack ct-reveal">
            <span class="ct-eyebrow"><span class="ct-eyebrow__dot" aria-hidden="true"></span>Questions</span>
            <h2 id="faq-title">Frequently asked questions</h2>
            <p class="muted">Everything judges, clinicians, and patients ask before testing a voice call.</p>
          </div>
          <div class="ct-faq__list ct-reveal ct-reveal--delay-1">
            ${FAQS.map((f) => `
              <details class="ct-faq__item">
                <summary class="ct-faq__q">${esc(f.q)}</summary>
                <div class="ct-faq__a"><p>${esc(f.a)}</p></div>
              </details>`).join('')}
          </div>
        </div>
      </div>
    </section>
  `;

  renderTourWidget(el.querySelector('#home-tour-mount'), { initialTrack: 'patients' });
  mountHero(el);
  mountHow(el);
  mountLanguages(el);
  mountStories(el);
  if (params && params.get('section')) {
    const target = el.querySelector(`#${CSS.escape(params.get('section'))}`);
    if (target) setTimeout(() => scrollToY(target.getBoundingClientRect().top + window.scrollY - 24), 60);
  }
}

function deviceIcon(kind) {
  const paths = {
    keypad: '<rect x="15" y="4" width="18" height="40" rx="4"/><rect x="18" y="8" width="12" height="11" rx="1.5"/><path d="M19 25h2M24 25h0.01M28 25h1M19 30h2M24 30h0.01M28 30h1M19 35h2M24 35h0.01M28 35h1"/>',
    phone: '<rect x="14" y="3" width="20" height="42" rx="5"/><path d="M21 39h6"/><path d="M24 15l-3.5-3.4a2.3 2.3 0 0 1 3.2-3.3l.3.3.3-.3a2.3 2.3 0 0 1 3.2 3.3z"/>',
    tablet: '<rect x="7" y="5" width="34" height="38" rx="4"/><path d="M21 38h6"/><path d="M14 14h20M14 20h14M14 26h17"/>',
    laptop: '<rect x="9" y="9" width="30" height="21" rx="2.5"/><path d="M4 37h40l-3-7H7z"/><path d="M14 16h20M14 22h12"/>',
  };
  return `<svg class="ct-every__icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false">${paths[kind]}</svg>`;
}

export async function refresh() {}

export function unmount() {
  unmountHero();
  unmountHow();
  unmountLanguages();
  unmountStories();
  el = null;
}
