// Home: hero with a live dose call, the pinned "how a call becomes care" story, languages,
// one screen per role (pinned), every device, the fixed rules, tour, apps, comparison and FAQ.
import { esc, icon, config } from '../lib.js';
import { renderTourWidget } from './tour.js';
import { markup as heroCallMarkup, mountHeroCall, stopHeroCall } from '../hero-call.js';
import { mountStories, unmountStories } from '../story.js';
import { scrollToY } from '../motion.js';

let el = null;

const HOW = [
  {
    key: 'capture', title: 'Capture the voice', lead: 'Care Taker calls at every dose time.',
    text: 'The patient just answers, on a keypad phone or a smartphone, and replies in the language they speak at home.',
    points: ['Rings up to 3 times, 10 minutes apart', 'Listens only after it finishes speaking', 'Detects the language the patient answers in'],
  },
  {
    key: 'confirm', title: 'Confirm with a yes', lead: 'Nothing is logged until the patient says yes.',
    text: 'Care Taker reads the dose and the time back. A spoken yes or a pressed 1 logs it. Anything else asks again.',
    points: ['Read back before every log', 'Never guesses taken', 'Keypad fallback after two unclear replies'],
  },
  {
    key: 'analyze', title: 'Understand and flag', lead: 'Fixed rules decide what a reply means.',
    text: 'Feeling unwell outranks everything else, so a nurse hears about it at once. Unclear words are saved for review.',
    points: ['Unwell, stop calls and stopped early come first', 'The exact words go to the care team', 'No medical advice, ever'],
  },
  {
    key: 'adapt', title: 'Adapt and update', lead: 'The plan changes with the answer.',
    text: 'Later moves the call, stop calls ends them, and every report updates on its own: nurse board, doctor and family.',
    points: ['Reschedules by the minutes heard', 'Reports update for every role', 'Switches language if the patient does'],
  },
];

const ROLES = [
  { key: 'desk', icon: 'user', title: 'Hospital desk', lead: 'Register a patient in under a minute.', points: ['Dictate the prescription, the form fills itself', 'Two consent boxes before anything starts', 'Choose the language, or let the patient speak'] },
  { key: 'nurse', icon: 'flag', title: 'Nurse board', lead: 'Verify, then call back whoever needs a person.', points: ['Flags sorted: urgent first', 'Exact words in every flag', 'Doses logged without a yes: always 0'] },
  { key: 'phone', icon: 'phone', title: 'Patient phone', lead: 'The call itself, by voice or keypad.', points: ['Live transcript and what was heard', 'Keys 1, 2, 3 and 9 always work', 'Same call on a real phone with Twilio keys'] },
  { key: 'family', icon: 'users', title: 'Family', lead: 'A week of doses, in the patient\'s words.', points: ['Only when the patient shares it', 'Seven-day strip and today\'s doses', 'Activity from watches and monitors'] },
  { key: 'doctor', icon: 'stethoscope', title: 'Doctor', lead: 'Course completion and what patients said.', points: ['Completion and adherence per course', 'Vitals and alert ranges', 'Every flag with the patient\'s words'] },
  { key: 'devices', icon: 'watch', title: 'Health devices', lead: 'Monitors, watches and rings, next to the doses.', points: ['Blood pressure and sugar over Bluetooth', 'Steps, calories and sleep from watches and rings', 'Outside the doctor\'s range goes to a nurse'] },
];

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


function howCard(key) {
  if (key === 'capture') return `
    <div class="ct-ui">
      <div class="ct-ui__head"><span class="ct-ui__title">${icon('phone')}Calling Lakshmi Devi</span><span class="ct-status ct-status--pending">${icon('clock')}09:00</span></div>
      <div class="ct-ui__row"><span>Ring 1 of 3</span><span class="ct-ui__wave"><span></span><span></span><span></span><span></span><span></span><span></span><span></span></span></div>
      <p class="ct-ui__bubble ct-ui__bubble--bot ct-ui__step">మీ ఉదయం మాత్రలు వేసుకున్నారా?<span>Have you taken your breakfast tablets?</span></p>
      <p class="ct-ui__bubble ct-ui__bubble--patient ct-ui__step">ఆ... వేసుకున్నాను<span>Yes, I have taken it</span></p>
      <div class="ct-ui__row ct-ui__step"><span class="muted">Heard in</span><strong>Telugu</strong></div>
    </div>`;
  if (key === 'confirm') return `
    <div class="ct-ui">
      <div class="ct-ui__head"><span class="ct-ui__title">${icon('mic')}Read-back</span><span class="ct-status ct-status--unclear">${icon('pending')}Waiting for yes</span></div>
      <p class="ct-ui__bubble ct-ui__bubble--bot ct-ui__step">You took your breakfast tablets at 09:02. Is that right? Say yes or press 1.</p>
      <p class="ct-ui__bubble ct-ui__bubble--patient ct-ui__step">అవును<span>Yes</span></p>
      <div class="ct-ui__row ct-ui__ok ct-ui__step"><span>${icon('check')}Dose logged, 09:02</span><span class="ct-status ct-status--taken">${icon('check')}Taken</span></div>
      <div class="ct-ui__row ct-ui__step"><span class="muted">Doses logged without a yes</span><strong class="tabular">0</strong></div>
    </div>`;
  if (key === 'analyze') return `
    <div class="ct-ui">
      <div class="ct-ui__head"><span class="ct-ui__title">${icon('ear')}Heard</span><span class="muted small">Hindi</span></div>
      <p class="ct-ui__bubble ct-ui__bubble--patient ct-ui__step">haan le li, lekin chakkar aa raha hai<span>Took it, but feeling dizzy</span></p>
      <div class="ct-ui__chips ct-ui__step">
        <span class="ct-ui__chip is-hit">${icon('alert')}Unwell</span><span class="ct-ui__chip">Stop calls</span><span class="ct-ui__chip">Wants a person</span><span class="ct-ui__chip">Stopped</span><span class="ct-ui__chip">Later</span><span class="ct-ui__chip is-skip">Taken</span>
      </div>
      <div class="ct-ui__row ct-ui__step"><span class="muted">First rule that matches wins</span><span class="ct-status ct-status--urgent">${icon('alert')}Urgent</span></div>
      <div class="ct-ui__row ct-ui__step"><span>A nurse calls back in minutes</span><span class="muted small">Dose not logged</span></div>
    </div>`;
  return `
    <div class="ct-ui">
      <div class="ct-ui__head"><span class="ct-ui__title">${icon('refresh')}Updated just now</span></div>
      <div class="ct-ui__row ct-ui__step"><span>${icon('clock')}Next call moved to 09:20</span><span class="muted small">"call in 20 minutes"</span></div>
      <div class="ct-ui__row ct-ui__step"><span>${icon('flag')}Nurse board</span><span class="ct-status ct-status--urgent">${icon('alert')}Urgent on top</span></div>
      <div class="ct-ui__row ct-ui__step"><span>${icon('stethoscope')}Doctor</span><span class="ct-status ct-status--taken">${icon('chart')}62% confirmed</span></div>
      <div class="ct-ui__row ct-ui__step"><span>${icon('users')}Family</span><span class="ct-status ct-status--taken">${icon('check')}Week updated</span></div>
      <div class="ct-ui__row ct-ui__step"><span>${icon('globe')}Language</span><span class="ct-status ct-status--unclear">${icon('globe')}Now Tamil</span></div>
    </div>`;
}

function roleCard(key) {
  const tile = (v, l) => `<div class="ct-ui__tile"><strong>${esc(v)}</strong><span>${esc(l)}</span></div>`;
  if (key === 'desk') return `
    <div class="ct-ui">
      <div class="ct-ui__head"><span class="ct-ui__title">${icon('user')}New patient</span><span class="ct-status ct-status--later">${icon('clock')}Awaiting nurse</span></div>
      <div class="ct-ui__row ct-ui__step"><span class="muted">Patient</span><strong>Lakshmi Devi, 67</strong></div>
      <div class="ct-ui__row ct-ui__step"><span class="muted">Language</span><strong>తెలుగు Telugu</strong></div>
      <p class="ct-ui__bubble ct-ui__bubble--patient ct-ui__step">${icon('mic')} Paracetamol 650, after breakfast and dinner, 5 days</p>
      <div class="ct-ui__chips ct-ui__step"><span class="ct-ui__chip is-ok">Paracetamol</span><span class="ct-ui__chip is-ok">650 mg</span><span class="ct-ui__chip is-ok">Breakfast, dinner</span><span class="ct-ui__chip is-ok">5 days</span></div>
      <div class="ct-ui__row ct-ui__step"><span>${icon('shield')}Consent recorded by Nurse Priya</span><span class="ct-status ct-status--taken">${icon('check')}2 of 2</span></div>
    </div>`;
  if (key === 'nurse') return `
    <div class="ct-ui">
      <div class="ct-ui__head"><span class="ct-ui__title">${icon('flag')}Flags</span><span class="ct-ui__metric"><strong>0</strong> logged without a yes</span></div>
      <div class="ct-ui__flag ct-ui__step"><span class="ct-status ct-status--urgent">${icon('alert')}Urgent</span><strong>Arjun</strong><span class="ct-quote">haan le li, lekin chakkar aa raha hai</span></div>
      <div class="ct-ui__flag ct-ui__step"><span class="ct-status ct-status--later">${icon('alert')}Reading to review</span><strong>Lakshmi Devi</strong><span>Blood pressure 162/98</span></div>
      <div class="ct-ui__flag ct-ui__step"><span class="ct-status ct-status--missed">${icon('missed')}Missed</span><strong>Meena</strong><span>Rang 3 times, no answer</span></div>
    </div>`;
  if (key === 'phone') return `
    <div class="ct-ui ct-ui--keypad">
      <div class="ct-ui__lcd">
        <p class="ct-ui__bubble ct-ui__bubble--bot ct-ui__step">Have you taken your night tablet?</p>
        <p class="ct-ui__bubble ct-ui__bubble--patient ct-ui__step">le li<span>Heard: le li, Taken</span></p>
      </div>
      <div class="ct-ui__keys ct-ui__step"><span><b>1</b>Taken</span><span><b>2</b>Later</span><span><b>3</b>Nurse</span><span class="ct-ui__key-wide"><b>9</b>Stop calls</span></div>
    </div>`;
  if (key === 'family') return `
    <div class="ct-ui">
      <div class="ct-ui__head"><span class="ct-ui__title">${icon('users')}Lakshmi's week</span><span class="ct-status ct-status--taken">${icon('check')}Shared</span></div>
      <div class="ct-ui__week ct-ui__step">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => `<span class="${i < 4 ? 'is-ok' : i === 4 ? 'is-some' : ''}"><b>${d}</b>${i < 4 ? '3/3' : i === 4 ? '2/3' : ''}</span>`).join('')}</div>
      <p class="ct-ui__bubble ct-ui__bubble--patient ct-ui__step">వేసుకున్నాను<span>Taken, Thursday 13:32</span></p>
      <div class="ct-ui__row ct-ui__step"><span>${icon('watch')}2,940 steps today</span><span class="muted small">Doctor's goal 2,500</span></div>
    </div>`;
  if (key === 'doctor') return `
    <div class="ct-ui">
      <div class="ct-ui__head"><span class="ct-ui__title">${icon('chart')}Course completion</span></div>
      ${[['Lakshmi Devi', 12, 'Amoxiclav'], ['Arjun', 22, 'Isotretinoin'], ['Meena', 40, 'Cefuroxime']].map(([n, p, m]) => `<div class="ct-ui__bar ct-ui__step"><span><strong>${n}</strong> ${m}</span><progress max="100" value="${p}">${p}%</progress><span class="tabular">${p}%</span></div>`).join('')}
      <div class="ct-ui__row ct-ui__step"><span>${icon('gauge')}Last blood pressure</span><strong class="tabular">129/86</strong></div>
    </div>`;
  return `
    <div class="ct-ui">
      <div class="ct-ui__head"><span class="ct-ui__title">${icon('watch')}Today from devices</span></div>
      <div class="ct-ui__tiles ct-ui__step">${tile('7,778', 'Steps')}${tile('310', 'Active kcal')}${tile('129/86', 'Blood pressure')}${tile('121', 'Sugar mg/dL')}</div>
      <div class="ct-ui__row ct-ui__step"><span>${icon('check')}Goal of 7,000 steps reached</span></div>
      <div class="ct-ui__row ct-ui__step"><span>${icon('alert')}162/98 yesterday, outside the range</span><span class="muted small">Nurse told</span></div>
    </div>`;
}

function story(id, title, eyebrow, items, cardFn, sizeClass) {
  return `
  <section class="ct-story ${sizeClass}" data-story id="${id}" aria-labelledby="${id}-title">
    <div class="ct-story__sticky">
      <div class="ct-story__head">
        <span class="ct-eyebrow"><span class="ct-eyebrow__dot" aria-hidden="true"></span>${esc(eyebrow)}</span>
        <h2 id="${id}-title" class="ct-section-title-lg">${esc(title)}</h2>
      </div>
      <div class="ct-story__body">
        <ol class="ct-story__tabs" aria-label="${esc(title)}">
          ${items.map((it, i) => `<li><button type="button" class="ct-story__tab${i === 0 ? ' is-active' : ''}" data-i="${i}">${icon(it.icon || ['phone', 'check', 'ear', 'refresh'][i])}<span>${esc(it.title)}</span></button></li>`).join('')}
        </ol>
        <div class="ct-story__stage">
          ${items.map((it, i) => `
          <article class="ct-story__panel${i === 0 ? ' is-active' : ''}" data-i="${i}">
            <div class="ct-story__copy">
              <span class="ct-story__step">${i + 1} of ${items.length}</span>
              <h3>${esc(it.lead)}</h3>
              ${it.text ? `<p>${esc(it.text)}</p>` : ''}
              <ul>${it.points.map((p) => `<li>${icon('tick')}<span>${esc(p)}</span></li>`).join('')}</ul>
              ${it.key && sizeClass === 'ct-story--6' ? `<a class="ct-btn ct-btn--on-dark" href="#${it.key}">Open ${esc(it.title)}${icon('arrow-right')}</a>` : ''}
            </div>
            <div class="ct-story__visual">${cardFn(it.key)}</div>
          </article>`).join('')}
        </div>
      </div>
    </div>
  </section>`;
}

export async function mount(root, params) {
  el = root;
  const cfg = await config();
  if (!el) return;
  const langs = cfg.langs || [];
  el.innerHTML = `
    <section class="ct-hero2" aria-labelledby="home-title">
      <div class="ct-hero2__copy">
        <div class="ct-voice-badge"><span class="ct-voice-badge__pulse" aria-hidden="true"></span><span>Voice-first after-care for India</span></div>
        <h1 id="home-title" class="ct-hero2__title">
          <span class="ct-hero__sentence">Just answer the call.</span>
          <span class="ct-hero__sentence"><em class="ct-hero__serif-italic">Every dose, confirmed.</em></span>
        </h1>
        <p class="ct-hero2__one">In your language, by voice or keypad, on any phone.</p>
        <p class="ct-hero2__lead">Care Taker calls patients at every dose time after they leave hospital. It reads each dose back, logs it only after a yes, and turns every call into reports for the nurse, doctor and family.</p>
        <div class="ct-hero__ctas">
          <a class="ct-btn ct-btn--hero-cta" href="#phone">${icon('phone')}<span>Try a call</span><span class="ct-btn__pill-badge">Live</span></a>
          <a class="ct-btn ct-btn--secondary" href="#how">${icon('compass')}<span>See how it works</span></a>
        </div>
        <p class="ct-hero2__note">${icon('info')}Sample data. Not medical advice.</p>
      </div>
      <div class="ct-hero2__visual">${heroCallMarkup()}</div>
    </section>

    ${story('how', 'From one call to every report.', 'How it works', HOW, howCard, 'ct-story--4')}

    <section class="ct-band ct-band--surface" id="languages" aria-labelledby="lang-title">
      <div class="ct-page">
        <div class="ct-split2">
          <div data-reveal="up">
            <span class="ct-eyebrow"><span class="ct-eyebrow__dot" aria-hidden="true"></span>Your language</span>
            <h2 id="lang-title" class="ct-section-title-lg">Speak your language. Care Taker answers in it.</h2>
            <p class="ct-section-lead">Choose a language from the list, or just start talking. Care Taker detects the language you answer in, switches the call to it, and shows the patient app in it too. Adding a language is adding one file.</p>
            <ul class="ct-checks">
              <li>${icon('tick')}<span>${langs.filter((l) => l.code !== 'en').length} Indian languages and English, mixed the way people speak</span></li>
              <li>${icon('tick')}<span>Detects the language from the reply and switches mid-call</span></li>
              <li>${icon('tick')}<span>Lines checked by a native speaker are marked reviewed</span></li>
            </ul>
          </div>
          <ul class="ct-langs" data-reveal-group aria-label="Languages">
            ${langs.map((l) => `<li class="ct-langs__item"><strong lang="${esc(l.code)}">${esc(l.nativeName)}</strong><span>${esc(l.name)}</span>${l.ask ? `<span class="ct-langs__ask" lang="${esc(l.code)}">${esc(l.ask)}</span>` : ''}</li>`).join('')}
          </ul>
        </div>
      </div>
    </section>

    ${story('features', 'One screen for every role.', 'Features', ROLES, roleCard, 'ct-story--6')}

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
            <span class="ct-eyebrow"><span class="ct-eyebrow__dot" aria-hidden="true"></span>Interactive Application Tour</span>
            <h2 id="tour-band-title">See how patients use it, how doctors use it, and how it works overall.</h2>
            <p class="muted">Switch tracks below to test live spoken phrases, parse dictated prescriptions, and step through every clinical boundary.</p>
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
  mountHeroCall(el);
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
  stopHeroCall();
  unmountStories();
  el = null;
}
