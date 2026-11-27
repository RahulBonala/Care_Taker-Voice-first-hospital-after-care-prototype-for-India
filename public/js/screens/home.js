// Product website / landing page (#home), modelled on Stepforge's editorial clarity:
// Hero -> Live pulse -> Fixed rules vs Optional adapters -> 3-stage rail -> Interactive tour -> Comparison -> FAQ.
import { api, esc, icon } from '../lib.js';
import { renderTourWidget } from './tour.js';

let el = null;

const HERO_PROOF = [
  'Runs with zero API keys',
  'Dose logged only after a spoken or pressed yes',
  'Telugu, Hindi, Tamil and English on any phone',
];

const FIXED_RULES = [
  ['Prescription dictation', 'Reads "Paracetamol 650, after breakfast and dinner, 5 days" in server/rxparse.js by deterministic rules. A nurse checks every field before saving.'],
  ['Spoken reply understanding', 'Per-language keyword rules in server/lang/*.json match native script, romanised speech, and English mixing in strict safety order.'],
  ['Mandatory read-back', 'Every "taken" reply is read back with the meal slot and time. Nothing is written to DoseLog until the patient confirms with yes or key 1.'],
  ['Priority triage and reports', 'Unwell, stopped-early, not-reachable, and missed flags sort automatically on the Nurse board with the patient\'s exact spoken words.'],
];

const OPTIONAL_ADAPTERS = [
  ['Sarvam AI speech (SARVAM_API_KEY)', 'Off unless keyed. Adds Indian-language neural voice synthesis and audio transcription when the browser lacks a local voice.'],
  ['Twilio phone line (TWILIO_* + PUBLIC_URL)', 'Off unless keyed. Places a real outbound phone call driven by the exact same server/flow.js state machine as the on-screen phone.'],
  ['Misheard label helper (LLM_API_KEY)', 'Off unless keyed. Suggests one fixed intent word on the Nurse board for replies the rules missed. Never logs a dose and never writes advice.'],
  ['Graceful without keys', 'When any optional key is unset, that button clearly says "key not set" and the entire hospital-to-patient flow works locally.'],
];

const RAIL = [
  {
    phase: 'Stage 01: Discharge',
    heading: 'Set up and verify at the hospital',
    summary: 'Capture consent in the patient\'s language, dictate the prescription, and have a nurse verify before any call is scheduled.',
    steps: [
      ['1. Register and consent', 'Choose call language, keypad or smart phone, family sharing preference, and tick both mandatory consent checks.'],
      ['2. Dictate schedule', 'Speak or type the discharge line to fill medicine, dose, meal slots, and course days.'],
      ['3. Nurse verification', 'A nurse reviews the entry on the Nurse board and clicks Verify to generate DoseSlot records.'],
    ],
  },
  {
    phase: 'Stage 02: Voice follow-up',
    heading: 'Call in their language at each meal',
    summary: 'Ring at breakfast, lunch, dinner, or night, listen by voice or keypad, and confirm every dose before logging.',
    steps: [
      ['4. Meal-slot call and halfway reminder', 'Asks if the patient has eaten and taken their tablets; reminds them to finish the course from the halfway day onward.'],
      ['5. Read-back confirmation', 'Repeats slot and time ("You took your after-breakfast tablets at 09:00. Is that right?") and logs only on yes or key 1.'],
    ],
  },
  {
    phase: 'Stage 03: Care team & family',
    heading: 'Escalate exceptions to humans',
    summary: 'Route unwell or stopped-early replies straight to nurses, keep family updated when permitted, and give doctors honest numbers.',
    steps: [
      ['6. Nurse callback queue', 'Urgent symptoms, early stopping, 2 missed slots in a row, and 3 unanswered rings surface in priority order.'],
      ['7. Family & doctor views', 'Opt-in 7-day family summary in the patient\'s own words, and course completion % with verbatim quotes for the doctor.'],
    ],
  },
];

const COMPARISON = [
  [
    'Phone needed by the patient',
    'Works on basic keypad phones by voice and keys 1, 2, 3, 9, plus a mobile web app for smartphones.',
    'Requires a smartphone, app store download, account creation, and notification permissions.',
  ],
  [
    'Language on the call',
    'Speaks and understands Telugu, Hindi, Tamil, and English, including Hinglish and romanised replies.',
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

export async function mount(root) {
  el = root;
  el.innerHTML = `
    <section class="ct-band ct-band--first" aria-labelledby="home-title">
      <div class="ct-hero">
        <span class="ct-eyebrow"><span class="ct-eyebrow__dot" aria-hidden="true"></span>Healthcare access prototype for India</span>
        <h1 id="home-title" class="ct-hero__title">
          Patients go home with medicines.
          <span class="ct-hero__accent">Care Taker calls in their language and confirms every dose.</span>
        </h1>
        <p class="ct-hero__lead">
          After hospital discharge, a nurse verifies the prescription, Care Taker calls at each meal slot in Telugu, Hindi, Tamil, or English, and every dose is read back before it is logged. Health concerns go straight to a nurse, never to automated advice.
        </p>
        <div class="ct-hero__ctas">
          <a class="ct-btn ct-btn--primary" href="#mobile">${icon('phone')}Open mobile app prototype${icon('arrow-right')}</a>
          <a class="ct-btn ct-btn--secondary" href="#tour-band">${icon('compass')}Take the application tour</a>
          <a class="ct-btn ct-btn--ghost" href="#desk">Open hospital desk</a>
        </div>
        <ul class="ct-proof-list" aria-label="Key guarantees">
          ${HERO_PROOF.map((p) => `<li>${icon('tick')}${esc(p)}</li>`).join('')}
        </ul>
      </div>

      <div class="ct-page">
        <section class="ct-card ct-card--raised ct-stack" aria-labelledby="pulse-title">
          <div class="ct-card__head">
            <h2 id="pulse-title" class="ct-section-title">${icon('chart')}Live after-care pulse</h2>
            <p>Connected to the same live sample store as all five role screens</p>
          </div>
          <div class="ct-metrics" id="home-metrics"></div>
          <div class="ct-row ct-row--between">
            <p class="small muted">Jump straight into any role screen or test both personas in the mobile app.</p>
            <div class="ct-row">
              <a class="ct-btn ct-btn--secondary ct-btn--sm" href="#phone">${icon('keypad')}Patient keypad phone</a>
              <a class="ct-btn ct-btn--secondary ct-btn--sm" href="#nurse">${icon('flag')}Nurse board</a>
              <a class="ct-btn ct-btn--secondary ct-btn--sm" href="#doctor">${icon('stethoscope')}Doctor review</a>
            </div>
          </div>
        </section>
      </div>
    </section>

    <section class="ct-band ct-band--surface" aria-labelledby="method-title">
      <div class="ct-band__inner">
        <div class="ct-split">
          <div class="ct-split__intro">
            <span class="ct-eyebrow"><span class="ct-eyebrow__dot" aria-hidden="true"></span>How Care Taker is built</span>
            <h2 id="method-title">Fixed clinical rules run every call. Optional services stay off unless keyed.</h2>
            <p class="muted">
              A medicine follow-up tool must never guess that a dose was taken and must never invent medical advice. Every call path, intent rule, and escalation in Care Taker is deterministic and covered by 124 automated tests.
            </p>
            <p class="muted">
              Optional cloud speech, telephony, and misheard-label helpers are isolated behind adapters in <code>server/adapters/</code> so a fresh Docker container runs with zero keys.
            </p>
          </div>
          <div class="ct-method">
            <div class="ct-method__col">
              <h3>Done by fixed rules</h3>
              <ul class="ct-method__list">
                ${FIXED_RULES.map(([t, b]) => `<li><strong>${esc(t)}</strong><span>${esc(b)}</span></li>`).join('')}
              </ul>
            </div>
            <div class="ct-method__col">
              <h3>Optional keyed adapters, labelled</h3>
              <ul class="ct-method__list">
                ${OPTIONAL_ADAPTERS.map(([t, b]) => `<li><strong>${esc(t)}</strong><span>${esc(b)}</span></li>`).join('')}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="ct-band" aria-labelledby="rail-title">
      <div class="ct-band__inner">
        <div class="ct-section-head">
          <div class="ct-section-head__copy">
            <span class="ct-eyebrow"><span class="ct-eyebrow__dot" aria-hidden="true"></span>End-to-end flow</span>
            <h2 id="rail-title">From hospital discharge to follow-up review, in three stages.</h2>
          </div>
          <a class="ct-btn ct-btn--secondary" href="#desk">Start at Hospital desk${icon('arrow-right')}</a>
        </div>
        <div class="ct-rail">
          ${RAIL.map((g) => `
            <div class="ct-rail__col">
              <span class="ct-rail__phase">${esc(g.phase)}</span>
              <h3>${esc(g.heading)}</h3>
              <p class="ct-rail__summary">${esc(g.summary)}</p>
              <ol class="ct-rail__steps">
                ${g.steps.map(([st, sd]) => `<li><strong>${esc(st)}</strong><span>${esc(sd)}</span></li>`).join('')}
              </ol>
            </div>`).join('')}
        </div>
      </div>
    </section>

    <section class="ct-band ct-band--surface" id="tour-band" aria-labelledby="tour-band-title">
      <div class="ct-band__inner">
        <div class="ct-section-head">
          <div class="ct-section-head__copy">
            <span class="ct-eyebrow"><span class="ct-eyebrow__dot" aria-hidden="true"></span>Interactive application tour</span>
            <h2 id="tour-band-title">See how patients use it, how doctors use it, and how it works overall.</h2>
            <p class="muted">Switch tracks below to test live spoken phrases, parse dictated prescriptions, and step through every clinical boundary.</p>
          </div>
          <a class="ct-btn ct-btn--ghost" href="#tour">Open full-screen tour${icon('arrow-right')}</a>
        </div>
        <div id="home-tour-mount"></div>
      </div>
    </section>

    <section class="ct-band" aria-labelledby="personas-title">
      <div class="ct-band__inner">
        <div class="ct-section-head">
          <div class="ct-section-head__copy">
            <span class="ct-eyebrow"><span class="ct-eyebrow__dot" aria-hidden="true"></span>Mobile prototypes for both sides</span>
            <h2 id="personas-title">Designed for patients at home and clinicians on the ward.</h2>
            <p class="muted">Explore the interactive mobile application with onboarding tour, sample OTP sign-in, first-time setup, and live call and triage tabs.</p>
          </div>
        </div>
        <div class="ct-grid">
          <section class="ct-card ct-col-6 ct-stack">
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

          <section class="ct-card ct-col-6 ct-stack">
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

    <section class="ct-band ct-band--surface" aria-labelledby="cmp-title">
      <div class="ct-band__inner ct-stack--lg">
        <div class="ct-section-head__copy">
          <span class="ct-eyebrow"><span class="ct-eyebrow__dot" aria-hidden="true"></span>Clear boundaries</span>
          <h2 id="cmp-title">Explicit about what is confirmed, and what requires a human.</h2>
          <p class="muted">How Care Taker compares with typical smartphone reminder apps and manual nurse follow-up calls.</p>
        </div>
        <div class="ct-compare" role="region" aria-label="Care Taker comparison">
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

    <section class="ct-band" aria-labelledby="faq-title">
      <div class="ct-band__inner">
        <div class="ct-faq">
          <div class="ct-stack">
            <span class="ct-eyebrow"><span class="ct-eyebrow__dot" aria-hidden="true"></span>Questions</span>
            <h2 id="faq-title">Frequently asked questions</h2>
            <p class="muted">Everything judges, clinicians, and patients ask before testing a voice call.</p>
          </div>
          <div class="ct-faq__list">
            ${FAQS.map((f) => `
              <details class="ct-faq__item">
                <summary class="ct-faq__q">${esc(f.q)}</summary>
                <div class="ct-faq__a"><p>${esc(f.a)}</p></div>
              </details>`).join('')}
          </div>
        </div>
      </div>
    </section>`;

  renderTourWidget(el.querySelector('#home-tour-mount'), { initialTrack: 'patients' });
  const anchor = el.querySelector('a[href="#tour-band"]');
  if (anchor) {
    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      const target = el.querySelector('#tour-band');
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  }
  await refresh();
}

export async function refresh() {
  if (!el) return;
  const box = el.querySelector('#home-metrics');
  if (!box) return;
  const m = await api('/api/measures');
  if (!el) return;
  const tile = (val, label, target = '', state = '') => `
    <div class="ct-metric ${state}">
      <span class="ct-metric__value">${esc(val)}</span>
      <span class="ct-metric__label">${esc(label)}</span>
      ${target ? `<span class="ct-metric__target">${target}</span>` : ''}
    </div>`;
  box.innerHTML = [
    tile(m.logsWithoutYes, 'Doses logged without a yes', `${icon(m.logsWithoutYes ? 'alert' : 'check')}Must be 0`, m.logsWithoutYes ? 'ct-metric--bad' : 'ct-metric--ok'),
    tile(`${m.takenPct}%`, `Doses confirmed (${m.taken} of ${m.dosesResolved})`),
    tile(m.activePatients, 'Verified patients on calls', `${m.awaitingVerify} awaiting nurse`),
    tile(m.openFlags, 'Open care-team flags', m.flagsByType.urgent ? `${icon('alert')}${m.flagsByType.urgent} urgent` : 'Sorted by clinical priority', m.flagsByType.urgent ? 'ct-metric--bad' : ''),
  ].join('');
}

export function unmount() { el = null; }
