// Product website / landing page (#home):
// 1. Editorial Hero (Single-line serif headlines, primary CTA, curved voice-to-report ribbon)
// 2. Always-visible Signature Animation: Voice Input -> Phone -> Heart morphs into Tick -> Wipes Care Taker name & reappears -> Health Report visuals
// 3. Five Neat & Clean Role Workspaces (Hospital Desk, Nurse Board, Patient Phone, Family, Doctor)
// 4. Scrollytelling 3-Stage Lifecycle Rail & Smooth Scroll Animations
// 5. Deterministic Rules vs Optional Adapters -> Interactive Tour -> Mobile Prototypes -> Comparison -> FAQ.

import { api, esc, icon } from '../lib.js';
import { renderTourWidget } from './tour.js';

let el = null;
let animTimer = null;
let activeStage = 0;
let activeScenario = 'taken_te';
let isPaused = false;
let scrollObserver = null;
let scrollRaf = null;

const SCENARIOS = {
  taken_te: {
    lang: 'Telugu',
    patient: 'Lakshmi Devi',
    age: 67,
    medicine: 'Amoxiclav 625mg',
    slot: '09:00 (After breakfast)',
    spokenPhrase: 'వేసుకున్నాను',
    spokenMeaning: 'Taken (Telugu)',
    rawStream: '...ఆఫ్టర్ బ్రేక్‌ఫాస్ట్ టాబ్లెట్ వేసుకున్నాను... అవును ఇప్పుడే వేసుకున్నాను... haan subah ki dawa le li...',
    cleanStream: 'Care Taker Report Created: Lakshmi Devi • Amoxiclav 625mg Taken at 09:00 (Confirmed Yes) • Nurse Board: 0 Unconfirmed Doses • Family 7-Day Strip Updated •',
    intent: 'taken',
    confidence: '0.98',
    readback: 'You took your after-breakfast tablets at 09:00. Is that right? Say yes or press 1.',
    confirmPhrase: 'అవును (Yes)',
    confirmKey: 'Key 1',
    statusBadge: 'DOSE VERIFIED',
    reportStatus: 'Logged to DoseLog after read-back confirmation',
    deskStatus: 'Rx verified by Nurse Priya (Day 3 of 14)',
    nurseStatus: '0 Doses logged without yes (Verified)',
    doctorPct: 92,
    doctorStatus: '92% adherence (12 of 13 doses confirmed)',
    familyStatus: 'Shared with family: Today marked Taken at 09:00',
  },
  unwell_hi: {
    lang: 'Hindi',
    patient: 'Arjun',
    age: 24,
    medicine: 'Isotretinoin 20mg',
    slot: '22:00 (Night)',
    spokenPhrase: 'haan le li, lekin chakkar aa raha hai',
    spokenMeaning: 'Took it, but feeling dizzy (Hindi)',
    rawStream: '...haan maine रात की दवा le li, lekin thoda chakkar aa raha hai... tabiyat theek nahi lag rahi...',
    cleanStream: 'Care Taker Urgent Report: Arjun • Symptom "chakkar aa raha hai" outranks Taken • 0 Dose Logged • Priority 1 Nurse Callback Flag Raised •',
    intent: 'unwell',
    confidence: '0.96',
    readback: 'Symptom detected: unwell outranks taken. Connecting to nurse on call.',
    confirmPhrase: 'Urgent triage initiated',
    confirmKey: 'Direct to nurse',
    statusBadge: 'URGENT SYMPTOM FLAGGED',
    reportStatus: 'Zero dose logged. Unwell flag routed to Nurse board.',
    deskStatus: 'Consent active • Escalated to ward nurse on duty',
    nurseStatus: 'Priority 1 Urgent Flag: "chakkar aa raha hai"',
    doctorPct: 86,
    doctorStatus: 'Symptom quoted verbatim for morning clinician review',
    familyStatus: 'Family sharing locked (patient preference: off)',
  },
  later_hi: {
    lang: 'Hindi',
    patient: 'Arjun',
    age: 24,
    medicine: 'Isotretinoin 20mg',
    slot: '22:00 (Night)',
    spokenPhrase: 'khana nahi khaya, aadha ghanta baad',
    spokenMeaning: 'Have not eaten yet, call in half hour',
    rawStream: '...abhi khana nahi khaya hai... aadha ghanta baad call karna... 30 minutes tarvata call cheyandi...',
    cleanStream: 'Care Taker Schedule Report: Arjun • Meal delayed ("aadha ghanta") • Slot rescheduled +30 min to 22:30 • Postpone 1 of 3 tracked •',
    intent: 'later',
    confidence: '0.94',
    readback: 'Understood. We will call you back in 30 minutes at 22:30.',
    confirmPhrase: 'Postponed 30 mins',
    confirmKey: 'Key 2',
    statusBadge: 'CALL POSTPONED',
    reportStatus: 'Slot rescheduled by 30 minutes (22:30). Dose pending.',
    deskStatus: 'Night slot shifted 22:00 -> 22:30 automatically',
    nurseStatus: 'Postpone count: 1 of 3 allowed before alert',
    doctorPct: 88,
    doctorStatus: 'Meal delay tracked, course timeline intact',
    familyStatus: 'Pending dose: next call scheduled for 22:30',
  },
  stopped_en: {
    lang: 'English',
    patient: 'Meena',
    age: 20,
    medicine: 'Cefixime 200mg',
    slot: '13:30 (After lunch)',
    spokenPhrase: 'I feel fine, I have stopped',
    spokenMeaning: 'Stopped antibiotic course early',
    rawStream: '...I feel fine now so I have stopped taking the tablets... fever is gone since yesterday...',
    cleanStream: 'Care Taker Early-Stop Report: Meena • Cefixime 200mg Day 5 of 10 • Reason recorded ("fever is gone") • Stopped Early Flag on Nurse Board •',
    intent: 'stopped',
    confidence: '0.99',
    readback: 'You are halfway through day 5 of 10. Can you share why you stopped for your doctor?',
    confirmPhrase: 'Reason: "fever is gone"',
    confirmKey: 'Logged for doctor',
    statusBadge: 'STOPPED EARLY FLAGGED',
    reportStatus: 'Antibiotic stop logged with verbatim patient reason',
    deskStatus: 'Halfway course reminder played on Day 5 of 10',
    nurseStatus: 'Stopped Early flag placed for clinician follow-up',
    doctorPct: 50,
    doctorStatus: 'Course incomplete: 5 of 10 days taken (Alert)',
    familyStatus: 'Family notified: stopped early flag for doctor call',
  },
};

const HERO_PROOF = [
  'Runs with zero API keys',
  'Dose logged only after a spoken or pressed yes',
  'Telugu, Hindi, Tamil and English on any phone',
  'Keypad & smartphones supported',
];

const ROLE_WORKSPACES = [
  {
    key: 'desk',
    href: '#desk',
    iconName: 'user',
    badge: '01 • Intake & Voice Rx',
    title: 'Hospital desk',
    desc: 'Register discharged patients, dictate prescriptions by voice ("Paracetamol 650, after breakfast and dinner, 5 days"), and record two-point consent.',
    metricLabel: 'Safety gate',
    metricVal: 'Consent + Nurse verify required',
  },
  {
    key: 'nurse',
    href: '#nurse',
    iconName: 'flag',
    badge: '02 • Priority Triage',
    title: 'Nurse board',
    desc: 'Verify waiting schedules, monitor live safety measures, and call back flagged exceptions sorted Urgent > Stopped early > Not reachable > Missed.',
    metricLabel: 'Primary measure',
    metricVal: '0 doses logged without yes',
  },
  {
    key: 'phone',
    href: '#phone',
    iconName: 'phone',
    badge: '03 • Voice & Keypad Call',
    title: 'Patient phone',
    desc: 'Interactive keypad feature phone that rings at each meal slot, speaks Telugu, Hindi, Tamil, or English, and confirms a read-back before logging.',
    metricLabel: 'Input modes',
    metricVal: 'Live mic, sample chips, keys 1/2/3/9',
  },
  {
    key: 'family',
    href: '#family',
    iconName: 'users',
    badge: '04 • Consent-Gated Strip',
    title: 'Family view',
    desc: 'Calm 7-day check-in strip and weekly summary built from the patient\'s own spoken words when family sharing is enabled (and locked when off).',
    metricLabel: 'Privacy control',
    metricVal: 'Patient opt-in toggle per course',
  },
  {
    key: 'doctor',
    href: '#doctor',
    iconName: 'stethoscope',
    badge: '05 • Follow-up Review',
    title: 'Doctor review',
    desc: 'Side-by-side course completion %, due-dose adherence %, and verbatim patient quotes for every symptom or early-stopped course.',
    metricLabel: 'Clinical clarity',
    metricVal: 'Honest completion % + exact words',
  },
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
    heading: 'Convert voice into clinical reports',
    summary: 'Route unwell or stopped-early replies straight to nurses, keep family updated when permitted, and give doctors honest numbers.',
    steps: [
      ['6. Nurse callback queue', 'Urgent symptoms, early stopping, 2 missed slots in a row, and 3 unanswered rings surface in priority order.'],
      ['7. Family & doctor visual reports', 'Opt-in 7-day family summary in the patient\'s own words, and course completion % with verbatim quotes for the doctor.'],
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
  activeStage = 0;
  activeScenario = 'taken_te';
  isPaused = false;

  const sc = SCENARIOS[activeScenario];

  el.innerHTML = `
    <!-- 1. Hero Section -->
    <section class="ct-band ct-band--first" aria-labelledby="home-title">
      <div class="ct-hero ct-reveal ct-revealed">
        <div class="ct-voice-badge">
          <span class="ct-voice-badge__pulse" aria-hidden="true"></span>
          <span>VOICE-FIRST HOSPITAL AFTER-CARE FOR INDIA</span>
        </div>

        <h1 id="home-title" class="ct-hero__title">
          <span class="ct-hero__serif-line">Don't type, <em class="ct-hero__serif-italic">just speak.</em></span>
          <span class="ct-hero__serif-line ct-hero__serif-line--sub">Don't miss, <em class="ct-hero__serif-italic">just answer.</em></span>
        </h1>

        <p class="ct-hero__subtitle-one-liner">Every metric is tracked, analyzed, and defined. Everything covered.</p>

        <p class="ct-hero__lead">
          The voice-first after-care system that captures patient phone replies in their mother tongue, confirms a mandatory read-back, and converts every call into visual clinical reports.
        </p>

        <div class="ct-hero__ctas">
          <a class="ct-btn ct-btn--hero-cta" href="#phone">
            <svg class="ct-icon" aria-hidden="true"><use href="#i-phone"/></svg>
            <span>Call Simulator</span>
            <span class="ct-btn__pill-badge">Live</span>
          </a>
          <a class="ct-btn ct-btn--secondary" href="#tour-band">
            <svg class="ct-icon" aria-hidden="true"><use href="#i-compass"/></svg>
            <span>Interactive Tour</span>
          </a>
          <a class="ct-btn ct-btn--ghost" href="#mobile">
            <span>Mobile App</span>
            <svg class="ct-icon" aria-hidden="true"><use href="#i-arrow-right"/></svg>
          </a>
        </div>

        <div class="ct-voice-proof">
          ${HERO_PROOF.map((p) => `<span class="ct-voice-proof__item"><svg class="ct-icon" aria-hidden="true"><use href="#i-tick"/></svg>${esc(p)}</span>`).join('')}
        </div>
      </div>

      <!-- 2. Curved Voice-to-Report Ribbon: Spoken Words (Left Loop) -> Processing Waveform Pill (Center) -> Clean Clinical Report Line (Right) -->
      <div class="ct-voice-ribbon-wrap" aria-label="Voice to clinical report transformation stream">
        <svg class="ct-voice-ribbon-svg" viewBox="0 0 1440 270" preserveAspectRatio="xMidYMid slice">
          <defs>
            <!-- Left loop path for incoming spoken patient words -->
            <path id="ct-ribbon-left-path" d="M -60,185 C 95,185 265,165 280,88 C 292,22 175,14 148,82 C 122,148 235,222 480,224 L 650,224" />
            <!-- Curved text path above the center waveform pill -->
            <path id="ct-ribbon-arc-path" d="M 650,152 C 690,132 750,132 790,152" />
            <!-- Right solid dark ribbon sweeping up to the right -->
            <path id="ct-ribbon-right-path" d="M 780,224 C 980,220 1195,182 1500,118" />
          </defs>

          <!-- Faint grey guide curve on left -->
          <use href="#ct-ribbon-left-path" class="ct-voice-ribbon-left-guide" />

          <!-- Raw spoken patient words flowing into the center pill -->
          <text class="ct-voice-ribbon-raw-text">
            <textPath href="#ct-ribbon-left-path" id="ribbon-raw-textpath" startOffset="0%">
              ${esc(sc.rawStream)}
              <animate attributeName="startOffset" from="-35%" to="15%" dur="13s" repeatCount="indefinite" />
            </textPath>
          </text>

          <!-- Right solid dark band -->
          <use href="#ct-ribbon-right-path" class="ct-voice-ribbon-band" />

          <!-- Clean structured clinical report flowing out on the right -->
          <text class="ct-voice-ribbon-clean-text" dy="5">
            <textPath href="#ct-ribbon-right-path" id="ribbon-clean-textpath" startOffset="4%">
              ${esc(sc.cleanStream)}
              <animate attributeName="startOffset" from="1%" to="18%" dur="11s" repeatCount="indefinite" />
            </textPath>
          </text>
        </svg>

        <!-- Center Processing Pill & Live Waveform Bars -->
        <div class="ct-voice-ribbon-center">
          <span class="ct-voice-ribbon-status" id="ribbon-status-badge">${esc(sc.statusBadge)}</span>
          <div class="ct-voice-ribbon-pill" title="Voice processing into Care Taker clinical report">
            <span class="ct-voice-wf-bar"></span>
            <span class="ct-voice-wf-bar"></span>
            <span class="ct-voice-wf-bar"></span>
            <span class="ct-voice-wf-bar"></span>
            <span class="ct-voice-wf-bar"></span>
            <span class="ct-voice-wf-bar"></span>
            <span class="ct-voice-wf-bar"></span>
            <span class="ct-voice-wf-bar"></span>
            <span class="ct-voice-wf-bar"></span>
            <span class="ct-voice-wf-bar"></span>
            <span class="ct-voice-wf-bar"></span>
            <span class="ct-voice-wf-bar"></span>
            <span class="ct-voice-wf-bar"></span>
            <span class="ct-voice-wf-bar"></span>
            <span class="ct-voice-wf-bar"></span>
          </div>
          <span class="ct-voice-ribbon-caption">Voice captured on phone -> Verified report in Care Taker</span>
        </div>
      </div>

      <!-- 3. Always-Visible Signature Morph & Voice-to-Report Interactive Stage -->
      <div class="ct-page">
        <section class="ct-flow-stage" aria-label="Voice input, phone read-back, heart-to-tick morph, and clinical report showcase">
          <!-- Always-Visible Signature Morph Bar: Voice Input -> Phone Heart Morphs to Tick -> Wipes Care Taker Name & Reappears -> Health Report Check -->
          <div class="ct-brand-morph-banner">
            <div class="ct-brand-morph-banner__left">
              <div class="ct-equalizer" aria-hidden="true">
                <span class="ct-equalizer__bar"></span>
                <span class="ct-equalizer__bar"></span>
                <span class="ct-equalizer__bar"></span>
                <span class="ct-equalizer__bar"></span>
                <span class="ct-equalizer__bar"></span>
              </div>
              <div class="ct-brand-morph-banner__step">
                <span class="small muted">1. Voice Input</span>
                <strong id="morph-banner-phrase">"${esc(sc.spokenPhrase)}"</strong>
              </div>
              <span class="ct-brand-morph-banner__arrow" aria-hidden="true">&rarr;</span>
              <div class="ct-brand-morph-banner__step">
                <span class="small muted">2. Phone Read-back</span>
                <strong id="morph-banner-confirm">${esc(sc.confirmPhrase)}</strong>
              </div>
              <span class="ct-brand-morph-banner__arrow" aria-hidden="true">&rarr;</span>
            </div>

            <!-- Phone + Heart morphing into Tick + Wiping Care Taker name and reappearing -->
            <div class="ct-brand-morph-lockup" aria-label="Heart morphs into tick, wipes Care Taker application name, and reappears">
              <div class="ct-morph-icon-wrap ct-morph-icon-wrap--inline">
                <div class="ct-morph-pulse-ring"></div>
                <svg class="ct-morph-svg ct-morph-svg--animating" viewBox="0 0 32 32">
                  <rect x="6" y="2" width="20" height="28" rx="4" class="ct-morph-phone-frame"/>
                  <path class="ct-morph-path ct-morph-path--heart" d="M16 22.5l-1.1-1C11 18 8.5 15.7 8.5 12.9 8.5 10.6 10.3 8.8 12.6 8.8c1.3 0 2.5.6 3.4 1.6.9-1 2.1-1.6 3.4-1.6 2.3 0 4.1 1.8 4.1 4.1 0 2.8-2.5 5.1-6.4 8.6L16 22.5z"/>
                  <path class="ct-morph-path ct-morph-path--tick" d="M21.5 12.5l-7 7-4-4"/>
                </svg>
              </div>
              <div class="ct-wipe-brand ct-wipe-brand--inline">
                <span class="ct-wipe-app-name">Care Taker</span>
                <span class="ct-wipe-bar" aria-hidden="true"></span>
              </div>
              <span class="ct-wipe-badge" id="morph-banner-badge">
                <svg class="ct-icon" aria-hidden="true"><use href="#i-check"/></svg>
                <span>Health Report Checked</span>
              </span>
            </div>

            <div class="ct-flow-controls">
              <button type="button" class="ct-btn ct-btn--ghost ct-btn--sm" id="btn-anim-toggle" aria-label="Pause or play animation">
                <span id="anim-toggle-icon">${icon('stop')}</span>
                <span id="anim-toggle-label">Pause Loop</span>
              </button>
            </div>
          </div>

          <!-- Interactive Scenario Switcher Chips -->
          <div class="ct-flow-scenarios ct-flow-scenarios--top">
            <span class="ct-flow-scenarios__label">Select live voice scenario:</span>
            <div class="ct-flow-scenarios__chips">
              <button type="button" class="ct-chip ct-flow-chip" data-scenario="taken_te">
                <span>వేసుకున్నాను (Taken - Telugu)</span>
              </button>
              <button type="button" class="ct-chip ct-flow-chip" data-scenario="unwell_hi">
                <span>haan le li, chakkar aa raha hai (Unwell - Hindi)</span>
              </button>
              <button type="button" class="ct-chip ct-flow-chip" data-scenario="later_hi">
                <span>aadha ghanta baad (Later - Hindi)</span>
              </button>
              <button type="button" class="ct-chip ct-flow-chip" data-scenario="stopped_en">
                <span>I feel fine, I have stopped (Stopped - English)</span>
              </button>
            </div>
          </div>

          <!-- Step Progression Nav -->
          <nav class="ct-flow-nav" aria-label="Animation steps">
            <button type="button" class="ct-flow-nav__btn" data-stage="0" aria-current="step">
              <span class="ct-flow-nav__num">1</span>
              <span class="ct-flow-nav__text">Voice Capture on Phone</span>
            </button>
            <button type="button" class="ct-flow-nav__btn" data-stage="1">
              <span class="ct-flow-nav__num">2</span>
              <span class="ct-flow-nav__text">Mandatory Read-back</span>
            </button>
            <button type="button" class="ct-flow-nav__btn" data-stage="2">
              <span class="ct-flow-nav__num">3</span>
              <span class="ct-flow-nav__text">Heart -> Tick &amp; Brand Wipe</span>
            </button>
            <button type="button" class="ct-flow-nav__btn" data-stage="3">
              <span class="ct-flow-nav__num">4</span>
              <span class="ct-flow-nav__text">Visual Clinical Reports</span>
            </button>
          </nav>

          <!-- Always-Visible 4-Column Live Pipeline + Active Stage Spotlight -->
          <div class="ct-flow-body" id="flow-body-mount">
            <!-- Rendered dynamically by renderAnimationStage() -->
          </div>
        </section>
      </div>

      <!-- 4. Live Clinical Pulse Band -->
      <div class="ct-page ct-reveal" id="pulse-section">
        <section class="ct-card ct-card--raised ct-stack" aria-labelledby="pulse-title">
          <div class="ct-card__head">
            <h2 id="pulse-title" class="ct-section-title">${icon('chart')}Live after-care pulse</h2>
            <p>Synchronized across Hospital desk, Nurse board, Patient phone, Family, and Doctor views</p>
          </div>
          <div class="ct-metrics" id="home-metrics"></div>
          <div class="ct-row ct-row--between">
            <p class="small muted">Every role screen reads and updates the same single source of truth in real time.</p>
            <div class="ct-row">
              <a class="ct-btn ct-btn--secondary ct-btn--sm" href="#desk">${icon('user')}Hospital desk</a>
              <a class="ct-btn ct-btn--secondary ct-btn--sm" href="#nurse">${icon('flag')}Nurse board</a>
              <a class="ct-btn ct-btn--secondary ct-btn--sm" href="#phone">${icon('phone')}Patient phone</a>
              <a class="ct-btn ct-btn--secondary ct-btn--sm" href="#family">${icon('users')}Family view</a>
              <a class="ct-btn ct-btn--secondary ct-btn--sm" href="#doctor">${icon('stethoscope')}Doctor review</a>
            </div>
          </div>
        </section>
      </div>
    </section>

    <!-- 5. Five Synchronized Clinical Role Workspaces Section ("Neat and clean everywhere") -->
    <section class="ct-band ct-band--surface" id="workspaces-section" aria-labelledby="workspaces-title">
      <div class="ct-band__inner ct-stack--lg">
        <div class="ct-section-head">
          <div class="ct-section-head__copy ct-reveal">
            <span class="ct-eyebrow"><span class="ct-eyebrow__dot" aria-hidden="true"></span>Five Synchronized Workspaces</span>
            <h2 id="workspaces-title">Hospital desk, Nurse board, Patient phone, Family, and Doctor. Neat and clean everywhere.</h2>
            <p class="muted">Every voice call on the patient's phone automatically updates the clinical records, nurse triage board, consent-gated family strip, and doctor review table.</p>
          </div>
        </div>
        <div class="ct-workspaces-grid">
          ${ROLE_WORKSPACES.map((w, idx) => `
            <a class="ct-workspace-card ct-reveal ct-reveal--delay-${(idx % 4) + 1}" href="${esc(w.href)}">
              <div class="ct-workspace-card__top">
                <span class="ct-workspace-card__badge">${esc(w.badge)}</span>
                <span class="ct-workspace-card__icon">${icon(w.iconName)}</span>
              </div>
              <h3 class="ct-workspace-card__title">${esc(w.title)}</h3>
              <p class="ct-workspace-card__desc">${esc(w.desc)}</p>
              <div class="ct-workspace-card__foot">
                <div>
                  <span class="small muted">${esc(w.metricLabel)}</span>
                  <strong class="ct-workspace-card__metric">${esc(w.metricVal)}</strong>
                </div>
                <span class="ct-workspace-card__go">Open${icon('arrow-right')}</span>
              </div>
            </a>
          `).join('')}
        </div>
      </div>
    </section>

    <!-- 6. Scrollytelling 3-Stage Lifecycle Rail -->
    <section class="ct-band" id="rail-section" aria-labelledby="rail-title">
      <div class="ct-band__inner">
        <div class="ct-section-head ct-reveal">
          <div class="ct-section-head__copy">
            <span class="ct-eyebrow"><span class="ct-eyebrow__dot" aria-hidden="true"></span>End-to-End Clinical Lifecycle</span>
            <h2 id="rail-title">From hospital discharge to follow-up review, in three stages.</h2>
          </div>
          <a class="ct-btn ct-btn--secondary" href="#desk">Start at Hospital desk${icon('arrow-right')}</a>
        </div>
        <div class="ct-rail-track" aria-hidden="true">
          <div class="ct-rail-track__fill" id="rail-progress-fill"></div>
        </div>
        <div class="ct-rail">
          ${RAIL.map((g, idx) => `
            <div class="ct-rail__col ct-reveal ct-reveal--delay-${idx + 1}" data-rail-step="${idx}">
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

    <!-- 7. Method Split Section -->
    <section class="ct-band ct-band--surface" id="method-section" aria-labelledby="method-title">
      <div class="ct-band__inner">
        <div class="ct-split">
          <div class="ct-split__intro ct-reveal">
            <span class="ct-eyebrow"><span class="ct-eyebrow__dot" aria-hidden="true"></span>Deterministic Safety Architecture</span>
            <h2 id="method-title">Fixed clinical rules run every call. Optional services stay off unless keyed.</h2>
            <p class="muted">
              A medicine follow-up tool must never guess that a dose was taken and must never invent medical advice. Every call path, intent rule, and escalation in Care Taker is deterministic and covered by 124 automated tests.
            </p>
            <p class="muted">
              Optional cloud speech, telephony, and misheard-label helpers are isolated behind adapters in <code>server/adapters/</code> so a fresh Docker container runs with zero keys.
            </p>
          </div>
          <div class="ct-method">
            <div class="ct-method__col ct-reveal ct-reveal--delay-1">
              <h3>Done by fixed rules</h3>
              <ul class="ct-method__list">
                ${FIXED_RULES.map(([t, b]) => `<li><strong>${esc(t)}</strong><span>${esc(b)}</span></li>`).join('')}
              </ul>
            </div>
            <div class="ct-method__col ct-reveal ct-reveal--delay-2">
              <h3>Optional keyed adapters, labelled</h3>
              <ul class="ct-method__list">
                ${OPTIONAL_ADAPTERS.map(([t, b]) => `<li><strong>${esc(t)}</strong><span>${esc(b)}</span></li>`).join('')}
              </ul>
            </div>
          </div>
        </div>
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

  setupAnimationControls();
  renderAnimationStage();
  startAnimationTimer();
  initScrollReveals();

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

function setupAnimationControls() {
  if (!el) return;

  const stepButtons = el.querySelectorAll('.ct-flow-nav__btn');
  stepButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      activeStage = Number(btn.getAttribute('data-stage'));
      renderAnimationStage();
      restartAnimationTimer();
    });
  });

  const scenarioButtons = el.querySelectorAll('.ct-flow-chip');
  scenarioButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const sKey = btn.getAttribute('data-scenario');
      if (SCENARIOS[sKey]) {
        activeScenario = sKey;
        updateHeroRibbonForScenario();
        renderAnimationStage();
        restartAnimationTimer();
      }
    });
  });

  const toggleBtn = el.querySelector('#btn-anim-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      isPaused = !isPaused;
      const iconSpan = el.querySelector('#anim-toggle-icon');
      const labelSpan = el.querySelector('#anim-toggle-label');
      if (isPaused) {
        clearInterval(animTimer);
        animTimer = null;
        if (iconSpan) iconSpan.innerHTML = icon('forward');
        if (labelSpan) labelSpan.textContent = 'Play Loop';
      } else {
        startAnimationTimer();
        if (iconSpan) iconSpan.innerHTML = icon('stop');
        if (labelSpan) labelSpan.textContent = 'Pause Loop';
      }
    });
  }
}

function updateHeroRibbonForScenario() {
  if (!el) return;
  const sc = SCENARIOS[activeScenario] || SCENARIOS.taken_te;
  const rawEl = el.querySelector('#ribbon-raw-textpath');
  if (rawEl) {
    rawEl.innerHTML = `${esc(sc.rawStream)}<animate attributeName="startOffset" from="-35%" to="15%" dur="13s" repeatCount="indefinite" />`;
  }
  const cleanEl = el.querySelector('#ribbon-clean-textpath');
  if (cleanEl) {
    cleanEl.innerHTML = `${esc(sc.cleanStream)}<animate attributeName="startOffset" from="1%" to="18%" dur="11s" repeatCount="indefinite" />`;
  }
  const statusBadge = el.querySelector('#ribbon-status-badge');
  if (statusBadge) statusBadge.textContent = sc.statusBadge;
  const phraseEl = el.querySelector('#morph-banner-phrase');
  if (phraseEl) phraseEl.textContent = `"${sc.spokenPhrase}"`;
  const confirmEl = el.querySelector('#morph-banner-confirm');
  if (confirmEl) confirmEl.textContent = sc.confirmPhrase;
}

function renderAnimationStage() {
  if (!el) return;
  const mount = el.querySelector('#flow-body-mount');
  if (!mount) return;

  const sc = SCENARIOS[activeScenario] || SCENARIOS.taken_te;

  const stepButtons = el.querySelectorAll('.ct-flow-nav__btn');
  stepButtons.forEach((btn, idx) => {
    if (idx === activeStage) {
      btn.setAttribute('aria-current', 'step');
      btn.classList.add('ct-flow-nav__btn--active');
    } else {
      btn.removeAttribute('aria-current');
      btn.classList.remove('ct-flow-nav__btn--active');
    }
  });

  const scenarioButtons = el.querySelectorAll('.ct-flow-chip');
  scenarioButtons.forEach((btn) => {
    const s = btn.getAttribute('data-scenario');
    if (s === activeScenario) btn.classList.add('ct-flow-chip--active');
    else btn.classList.remove('ct-flow-chip--active');
  });

  const statusClass =
    sc.intent === 'taken'
      ? 'ct-status--taken'
      : sc.intent === 'unwell'
        ? 'ct-status--urgent'
        : sc.intent === 'later'
          ? 'ct-status--later'
          : 'ct-status--stopped';

  mount.innerHTML = `
    <div class="ct-pipeline-grid">
      <!-- Column 1: Voice Input on Phone -->
      <article class="ct-pipeline-card ${activeStage === 0 ? 'ct-pipeline-card--active' : ''}" data-pipeline-card="0">
        <div class="ct-pipeline-card__head">
          <span class="ct-tag ct-tag--accent">1 • Voice Input</span>
          <span class="ct-status ct-status--unclear">${icon('mic')}${esc(sc.lang)}</span>
        </div>
        <h3 class="ct-pipeline-card__title">${esc(sc.patient)}, ${sc.age} (${esc(sc.medicine)})</h3>
        <div class="ct-pipeline-quote">
          <span class="ct-pipeline-quote__native">"${esc(sc.spokenPhrase)}"</span>
          <span class="small muted">${esc(sc.spokenMeaning)}</span>
        </div>
        <div class="ct-pipeline-meta">
          <span>Slot: <strong>${esc(sc.slot)}</strong></span>
          <span>Match: <strong>intent=${esc(sc.intent)}</strong> (${esc(sc.confidence)})</span>
        </div>
      </article>

      <!-- Column 2: Keypad / Phone Read-back -->
      <article class="ct-pipeline-card ${activeStage === 1 ? 'ct-pipeline-card--active' : ''}" data-pipeline-card="1">
        <div class="ct-pipeline-card__head">
          <span class="ct-tag ct-tag--accent">2 • Phone Read-back</span>
          <span class="small muted">${icon('phone')}Mandatory check</span>
        </div>
        <div class="ct-mini-phone">
          <div class="ct-mini-phone__top">
            <span>Care Taker Call</span>
            <span class="tabular">00:18</span>
          </div>
          <p class="ct-mini-phone__bot">${esc(sc.readback)}</p>
          <div class="ct-mini-phone__reply">
            <span>${esc(sc.confirmPhrase)}</span>
            <span class="ct-tag">${esc(sc.confirmKey)}</span>
          </div>
        </div>
      </article>

      <!-- Column 3: Heart Morphs to Tick & Wipes Care Taker Name -->
      <article class="ct-pipeline-card ${activeStage === 2 ? 'ct-pipeline-card--active' : ''}" data-pipeline-card="2">
        <div class="ct-pipeline-card__head">
          <span class="ct-tag ct-tag--accent">3 • Heart -> Tick Check</span>
          <span class="ct-status ${statusClass}">${icon('check')}Verified</span>
        </div>
        <div class="ct-morph-showcase ct-morph-showcase--compact">
          <div class="ct-morph-icon-wrap">
            <div class="ct-morph-pulse-ring"></div>
            <svg class="ct-morph-svg ct-morph-svg--animating" viewBox="0 0 24 24">
              <path class="ct-morph-path ct-morph-path--heart" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              <path class="ct-morph-path ct-morph-path--tick" d="M20 6L9 17l-5-5"/>
            </svg>
          </div>
          <div class="ct-wipe-container">
            <div class="ct-wipe-brand">
              <span class="ct-wipe-app-name">Care Taker</span>
              <span class="ct-wipe-bar" aria-hidden="true"></span>
            </div>
            <span class="ct-wipe-badge">${esc(sc.statusBadge)}</span>
            <p class="ct-wipe-desc">${esc(sc.reportStatus)}</p>
          </div>
        </div>
      </article>

      <!-- Column 4: Visual Clinical Reports Across All Roles -->
      <article class="ct-pipeline-card ${activeStage === 3 ? 'ct-pipeline-card--active' : ''}" data-pipeline-card="3">
        <div class="ct-pipeline-card__head">
          <span class="ct-tag ct-tag--accent">4 • Clinical Reports</span>
          <span class="small muted">All 5 roles synced</span>
        </div>
        <div class="ct-mini-reports">
          <div class="ct-mini-report-row">
            <strong>${icon('user')}Hospital desk:</strong>
            <span>${esc(sc.deskStatus)}</span>
          </div>
          <div class="ct-mini-report-row">
            <strong>${icon('flag')}Nurse board:</strong>
            <span>${esc(sc.nurseStatus)}</span>
          </div>
          <div class="ct-mini-report-row">
            <strong>${icon('stethoscope')}Doctor report:</strong>
            <span>${esc(sc.doctorStatus)}</span>
          </div>
          <div class="ct-mini-report-row">
            <strong>${icon('users')}Family strip:</strong>
            <span>${esc(sc.familyStatus)}</span>
          </div>
          <div class="ct-report-week-preview" aria-label="7-day dose strip preview">
            <span class="ct-report-day ct-report-day--taken">M ✓</span>
            <span class="ct-report-day ct-report-day--taken">T ✓</span>
            <span class="ct-report-day ct-report-day--taken">W ✓</span>
            <span class="ct-report-day ct-report-day--taken">T ✓</span>
            <span class="ct-report-day ct-report-day--today">F •</span>
            <span class="ct-report-day">S</span>
            <span class="ct-report-day">S</span>
          </div>
        </div>
      </article>
    </div>

    <div class="ct-flow-footer">
      <span>Click any card or scenario above to inspect how spoken replies convert into verified hospital reports.</span>
      <div class="ct-flow-links">
        <a href="#desk">Hospital desk</a>
        <a href="#nurse">Nurse board</a>
        <a href="#phone">Patient phone</a>
        <a href="#family">Family</a>
        <a href="#doctor">Doctor</a>
      </div>
    </div>
  `;

  mount.querySelectorAll('[data-pipeline-card]').forEach((card) => {
    card.addEventListener('click', () => {
      activeStage = Number(card.getAttribute('data-pipeline-card'));
      renderAnimationStage();
      restartAnimationTimer();
    });
  });
}

function startAnimationTimer() {
  if (animTimer) clearInterval(animTimer);
  animTimer = setInterval(() => {
    if (isPaused) return;
    activeStage = (activeStage + 1) % 4;
    renderAnimationStage();
  }, 3200);
}

function restartAnimationTimer() {
  if (!isPaused) {
    startAnimationTimer();
  }
}

function onWindowScroll() {
  if (!el) return;
  if (scrollRaf) return;
  scrollRaf = window.requestAnimationFrame(() => {
    scrollRaf = null;
    if (!el) return;
    const vh = window.innerHeight || document.documentElement.clientHeight;

    // Update 3-stage rail progress fill & active card highlight on scroll
    const railSec = el.querySelector('#rail-section');
    const railFill = el.querySelector('#rail-progress-fill');
    if (railSec && railFill) {
      const r = railSec.getBoundingClientRect();
      const total = r.height + vh * 0.4;
      const scrolled = vh * 0.65 - r.top;
      const ratio = Math.min(1, Math.max(0, scrolled / Math.max(1, total)));
      railFill.style.transform = `scaleX(${ratio.toFixed(3)})`;

      const cols = el.querySelectorAll('.ct-rail__col');
      cols.forEach((col, idx) => {
        const cr = col.getBoundingClientRect();
        const isActive = cr.top < vh * 0.78 && cr.bottom > vh * 0.18;
        col.classList.toggle('ct-rail__col--active', isActive || ratio > (idx + 0.3) / 3);
      });
    }
  });
}

function initScrollReveals() {
  if (!el) return;
  if (scrollObserver) {
    scrollObserver.disconnect();
    scrollObserver = null;
  }

  const revealElements = Array.from(el.querySelectorAll('.ct-reveal'));

  if ('IntersectionObserver' in window) {
    scrollObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('ct-revealed');
          }
        });
      },
      {
        threshold: 0.06,
        rootMargin: '0px 0px -24px 0px',
      }
    );

    revealElements.forEach((node) => scrollObserver.observe(node));
  } else {
    revealElements.forEach((node) => node.classList.add('ct-revealed'));
  }

  window.addEventListener('scroll', onWindowScroll, { passive: true });
  onWindowScroll();
}

export async function refresh() {
  if (!el) return;
  const box = el.querySelector('#home-metrics');
  if (!box) return;
  try {
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
  } catch (err) {
    console.warn('refresh measures failed', err);
  }
}

export function unmount() {
  if (animTimer) {
    clearInterval(animTimer);
    animTimer = null;
  }
  if (scrollObserver) {
    scrollObserver.disconnect();
    scrollObserver = null;
  }
  if (scrollRaf) {
    window.cancelAnimationFrame(scrollRaf);
    scrollRaf = null;
  }
  window.removeEventListener('scroll', onWindowScroll);
  el = null;
}
