// Interactive 3-track application tour: Patients & family, Doctors & nurses, and How it works overall.
// Used both standalone on #tour and embedded on the #home product website.
import { api, post, esc, icon, status, intentStatus, progress } from '../lib.js';

const PHRASE_DEMOS = [
  { phrase: 'వేసుకున్నాను', lang: 'Telugu (te-IN)', intent: 'taken', label: 'Taken', bot: 'Reads back: "You took your after-breakfast tablets at 09:00. Is that right? Say yes or press 1." Logs nothing yet.' },
  { phrase: 'nahi li hai', lang: 'Hindi (hi-IN)', intent: 'notTaken', label: 'Not taken', bot: 'Asks: "Will you take it now? I can call back in 30 minutes."' },
  { phrase: '20 minutes tarvata call cheyandi', lang: 'Telugu + English', intent: 'later', label: 'Call later (20 min)', bot: 'Moves the dose slot ahead by 20 minutes (clamped to 10 to 90 minutes, max 3 postpones).' },
  { phrase: 'haan le li, lekin chakkar aa raha hai', lang: 'Hindi (hi-IN)', intent: 'unwell', label: 'Feels unwell', bot: 'Safety wins over "le li": logs zero dose, raises an Urgent nurse flag with exact words, and says a nurse will call.' },
  { phrase: 'I feel fine, I have stopped', lang: 'English (en-IN)', intent: 'stopped', label: 'Stopped the medicine', bot: 'Gives no medical lecture. Asks "Can you tell me why you stopped?", records the reason, and flags Stopped early.' },
  { phrase: 'కాల్స్ ఆపండి', lang: 'Telugu (te-IN)', intent: 'optOut', label: 'Stop calls', bot: 'Cancels all future dose slots immediately and notifies the care team. Key 9 does the same.' },
];

const RX_DEMOS = [
  'Paracetamol 650, after breakfast and dinner, 5 days',
  'Amoxiclav 625 after every meal for 2 weeks',
  'Isotretinoin 20 mg at night for 60 days',
];

const TRACKS = {
  patients: {
    title: 'For patients and families',
    sub: 'Consent, voice call in your language, read-back, and family view',
    icon: 'phone',
    steps: [
      {
        title: 'Agree in your own language at discharge',
        hint: 'Keypad phone or smartphone, explicit opt-in',
        badge: 'Step 1 of 5: Patient onboarding',
        body: 'Before leaving the hospital, the patient chooses the language they speak at home from ten Indian languages and English, or simply speaks and Care Taker detects it, and whether they use a keypad phone or a smartphone. Nothing starts until the patient agrees to receive dose calls and knows how to stop them at any time.',
        underHood: 'Consent is stored with the language, timestamp, and recording nurse name. Saying "stop calls" or pressing key 9 cancels all future calls immediately.',
        actionHref: '#mobile?persona=patient&stage=tour',
        actionLabel: 'Try patient mobile onboarding',
        preview: 'consent',
      },
      {
        title: 'Receive a call at each meal slot',
        hint: 'Breakfast, lunch, dinner, or bedtime',
        badge: 'Step 2 of 5: Scheduled call',
        body: 'At each scheduled meal slot, the patient gets a phone call in their chosen language. Care Taker asks whether they have eaten and taken that slot\'s tablets. From the halfway day of the course onward, it adds a polite reminder from their doctor to complete the course.',
        underHood: 'No app installation or internet is needed on a keypad phone. If unanswered or declined, Care Taker retries up to 3 rings (10 minutes apart) before raising a Missed flag.',
        actionHref: '#phone',
        actionLabel: 'Open keypad patient phone',
        preview: 'ring',
      },
      {
        title: 'Speak naturally or press keypad keys',
        hint: 'Native script, Hinglish, or keys 1, 2, 3, 9',
        badge: 'Step 3 of 5: Understanding replies',
        body: 'Patients answer in everyday speech, mixing native words and English if they wish. Tap any real patient reply below to see how Care Taker classifies it and why symptoms always outrank "taken".',
        underHood: 'Low confidence (under 0.5) or 8 seconds of silence is never guessed as taken. After two unclear replies, the call switches to keypad mode: 1 taken, 2 later, 3 nurse, 9 stop calls.',
        actionHref: '#mobile?persona=patient&stage=app',
        actionLabel: 'Try live call in mobile app',
        preview: 'phrases',
      },
      {
        title: 'Confirm the read-back before logging',
        hint: 'Spoken yes or key 1 required',
        badge: 'Step 4 of 5: Two-step confirmation',
        body: 'Saying "I took it" or "vesukunnanu" never writes a dose log on its own. Care Taker reads back the exact meal slot and time ("You took your after-breakfast tablets at 09:00. Is that right? Say yes or press 1.") and records the dose only after a clear yes.',
        underHood: 'The Nurse board tracks "Doses logged without a yes" as a primary safety measure with a hard target of 0.',
        actionHref: '#phone',
        actionLabel: 'Test read-back on Patient phone',
        preview: 'readback',
      },
      {
        title: 'Share a weekly record with family (optional)',
        hint: 'Read-only, in the patient\'s own words',
        badge: 'Step 5 of 5: Family peace of mind',
        body: 'When a patient lives alone (like Lakshmi Devi, 67, whose son Ravi lives abroad) and chooses "Share with family", relatives see a calm 7-day check-in built from the patient\'s own spoken words. If sharing is off (like Arjun), the family page stays locked.',
        underHood: 'Family sharing can be turned on or off at any time from the patient mobile setup or the Nurse board.',
        actionHref: '#family',
        actionLabel: 'Open Family view',
        preview: 'family',
      },
    ],
  },
  doctors: {
    title: 'For doctors and nurses',
    sub: 'Voice Rx setup, nurse verification, priority triage, and review',
    icon: 'stethoscope',
    steps: [
      {
        title: 'Dictate the discharge prescription',
        hint: 'Rule-based parser fills medicine, dose, slots, days',
        badge: 'Step 1 of 5: Hospital desk intake',
        body: 'At the discharge desk, a nurse dictates or types one sentence from the discharge sheet, such as "Paracetamol 650, after breakfast and dinner, 5 days". Fixed rules fill the structured schedule in under a second so the nurse can check it with the patient.',
        underHood: 'Test the live server parser (/api/parse-rx) right here. No external AI model is used to read prescriptions.',
        actionHref: '#desk',
        actionLabel: 'Open Hospital desk',
        preview: 'rx',
      },
      {
        title: 'Verify before any call is scheduled',
        hint: 'Two-step clinical check on Nurse board',
        badge: 'Step 2 of 5: Nurse verification gate',
        body: 'Saving a patient at the Hospital desk places them in "Waiting for verification". A nurse on duty checks the medicine, dose, meal slots, days, and consent receipt before clicking Verify. Unverified patients never receive calls.',
        underHood: 'Verification generates one DoseSlot per meal slot per day and cancels any first-day slots whose time has already passed.',
        actionHref: '#nurse',
        actionLabel: 'Open Nurse board',
        preview: 'verify',
      },
      {
        title: 'Work the priority triage queue',
        hint: 'Urgent > Stopped early > Not reachable > Missed',
        badge: 'Step 3 of 5: Exception-only callbacks',
        body: 'Instead of calling every discharged patient manually, nurses only call the people who need a human. Flags sort automatically by clinical priority, quoting the patient\'s exact words so the nurse knows why they are calling before picking up the phone.',
        underHood: 'Two missed dose slots in a row raise a Not reachable flag that includes the patient\'s designated family contact.',
        actionHref: '#mobile?persona=doctor&stage=app',
        actionLabel: 'Open Clinician mobile triage',
        preview: 'triage',
      },
      {
        title: 'Review honest course completion',
        hint: 'Doctor table with completion % and patient quotes',
        badge: 'Step 4 of 5: Doctor follow-up',
        body: 'At the follow-up visit, the treating doctor sees two honest numbers side by side: confirmed doses out of the entire course, and confirmed doses out of doses due so far, paired with every flag and the patient\'s spoken words.',
        underHood: 'No pill photos or gamified streaks. Care Taker trusts the patient\'s confirmed word and surfaces early stopping with their stated reason.',
        actionHref: '#doctor',
        actionLabel: 'Open Doctor screen',
        preview: 'doctor',
      },
      {
        title: 'Expand regional phrases safely',
        hint: 'Misheard queue for human rule updates',
        badge: 'Step 5 of 5: Language maintenance',
        body: 'Whenever a reply is unclear or heard with low confidence, Care Taker saves the transcript to the Misheard list on the Nurse board. Nurses and native speakers review real dialect phrases and add safe keywords to server/lang/*.json.',
        underHood: 'If LLM_API_KEY is configured, the optional helper can only suggest one fixed intent label for nurse review. Without keys it shows "key not set".',
        actionHref: '#nurse',
        actionLabel: 'Inspect Misheard list',
        preview: 'misheard',
      },
    ],
  },
  system: {
    title: 'How it works overall',
    sub: 'Data chain, safety priority, voice fallbacks, and zero-key ops',
    icon: 'compass',
    steps: [
      {
        title: 'One live data chain across all views',
        hint: 'Patient > Prescription > DoseSlot > Call > DoseLog > Flags',
        badge: 'Architecture 1 of 5: Data chain',
        body: 'Every screen in Care Taker (Hospital desk, Nurse board, Patient phone, Family, Doctor, and the Mobile App prototype) reads and writes the same server-owned state machine, polling every 2 seconds so one action updates every role live.',
        underHood: 'Persisted atomically to data/db.json using write-to-temp-and-rename, seeded with three realistic Indian patient courses on first start.',
        actionHref: '#nurse',
        actionLabel: 'Watch live measures',
        preview: 'chain',
      },
      {
        title: 'Safety-first intent priority ladder',
        hint: '11 intents, symptoms and negatives win first',
        badge: 'Architecture 2 of 5: Intent engine',
        body: 'Spoken replies match against per-language keyword lists (native script, romanised script, and English mixing) in strict priority order: unwell, optOut, wantPerson, someoneElse, stopped, notEaten, later, notTaken, taken, no, yes.',
        underHood: 'Because unwell sits at the top and notTaken sits above taken, "haan le li, lekin chakkar aa raha hai" is Urgent and "nahi li hai" is Not taken, never Taken.',
        actionHref: '#phone',
        actionLabel: 'Try phrases on Patient phone',
        preview: 'ladder',
      },
      {
        title: 'Four-layer voice and telephony fallback',
        hint: 'Browser voice -> Sarvam -> MP3 clips -> On-screen text',
        badge: 'Architecture 3 of 5: Voice I/O',
        body: 'Care Taker speaks using the browser\'s speechSynthesis voice when installed for te-IN, hi-IN, ta-IN, or en-IN. If missing, it falls back to Sarvam AI TTS (when keyed), then pre-recorded MP3 clips in public/audio/{lang}/, and always displays the bilingual text.',
        underHood: 'The microphone never listens while Care Taker is speaking, preventing echo self-triggers. Optional Twilio webhooks drive the exact same server/flow.js engine over a real phone call.',
        actionHref: '/voice-data.html',
        actionLabel: 'Read Voice and AI notice',
        preview: 'voice',
      },
      {
        title: 'Keypad phones and smartphones together',
        hint: 'DTMF keys 1, 2, 3, 9 plus full mobile companion app',
        badge: 'Architecture 4 of 5: Inclusive access',
        body: 'A 67-year-old elder with a keypad feature phone answers a normal voice call and presses 1, 2, 3, or 9 if the line is noisy. Smartphone users, family caregivers, nurses, and doctors also get a clean mobile web app with onboarding, setup, and live triage.',
        underHood: 'Designed mobile-first down to 360px wide with 48px minimum tap targets, self-hosted Noto Sans Indic fonts, and WCAG AA contrast.',
        actionHref: '#mobile',
        actionLabel: 'Explore Mobile app prototype',
        preview: 'dual',
      },
      {
        title: 'Strict clinical and legal guardrails',
        hint: 'Zero medical advice, DPDP 2023 & TRAI checklist',
        badge: 'Architecture 5 of 5: Safety & deploy',
        body: 'Care Taker reminds and records; it never diagnoses, recommends, or alters a dose. Every page carries the sample-data banner, emergency 112 notice, prototype Terms, Privacy Policy, Medical Disclaimer, and Voice & AI notice.',
        underHood: 'Runs out of the box with docker compose up, zero .env file, Node 20 slim healthcheck on /healthz, and 124 automated unit, flow, and API tests.',
        actionHref: '/disclaimer.html',
        actionLabel: 'Read Medical disclaimer',
        preview: 'guardrails',
      },
    ],
  },
};

export function renderTourWidget(container, { initialTrack = 'patients', initialStep = 0 } = {}) {
  let trackKey = TRACKS[initialTrack] ? initialTrack : 'patients';
  let stepIdx = Math.max(0, Math.min(4, Number(initialStep) || 0));
  let phraseIdx = 0;
  let rxResult = null;
  let rxInput = RX_DEMOS[0];
  let liveMeasures = null;

  api('/api/measures').then((m) => { liveMeasures = m; drawStage(); }).catch(() => {});

  container.innerHTML = `
    <div class="ct-tour">
      <div class="ct-tour__tracks" role="tablist" aria-label="Choose tour perspective" id="tr-tabs"></div>
      <div class="ct-tour__body">
        <ol class="ct-tour__nav" id="tr-steps"></ol>
        <div class="ct-tour__stage" id="tr-stage" aria-live="polite"></div>
      </div>
    </div>`;

  function drawTabs() {
    const tabs = container.querySelector('#tr-tabs');
    if (!tabs) return;
    tabs.innerHTML = Object.entries(TRACKS).map(([k, t]) => `
      <button type="button" role="tab" class="ct-tour__track" data-track="${esc(k)}" aria-selected="${k === trackKey ? 'true' : 'false'}">
        <span class="ct-tour__track-title">${icon(t.icon)}${esc(t.title)}</span>
        <span class="ct-tour__track-sub">${esc(t.sub)}</span>
      </button>`).join('');
  }

  function drawSteps() {
    const nav = container.querySelector('#tr-steps');
    if (!nav) return;
    const steps = TRACKS[trackKey].steps;
    nav.innerHTML = steps.map((s, idx) => `
      <li>
        <button type="button" class="ct-tour__step-btn" data-step="${idx}" ${idx === stepIdx ? 'aria-current="step"' : ''}>
          <span class="ct-tour__num">${String(idx + 1).padStart(2, '0')}</span>
          <span class="ct-tour__step-label"><strong>${esc(s.title)}</strong><span>${esc(s.hint)}</span></span>
        </button>
      </li>`).join('');
  }

  function renderPreview(kind) {
    if (kind === 'consent') {
      return `
        <div class="ct-tour__preview">
          <div class="ct-row ct-row--between"><strong>Sample discharge consent record</strong>${status('taken', 'Consent recorded')}</div>
          <p class="small">1. Patient agreed to receive dose calls in <strong>Telugu (తెలుగు)</strong>.</p>
          <p class="small">2. Patient knows they can stop calls at any time by saying <strong>"stop calls"</strong> or pressing <strong>9</strong>.</p>
          <p class="small muted">Recorded by Nurse Priya at hospital discharge.</p>
        </div>`;
    }
    if (kind === 'ring') {
      return `
        <div class="ct-tour__preview">
          <div class="ct-row ct-row--between"><strong>Call script: Lakshmi Devi (Day 3 of 14, 09:00)</strong><span class="ct-tag">te-IN</span></div>
          <p class="ct-quote">నమస్కారం Lakshmi గారు. నేను మీ ఆసుపత్రి నుండి కేర్ టేకర్ మాట్లాడుతున్నాను.</p>
          <p class="small muted">Translation shown for care team: "Hello Lakshmi. This is Care Taker, calling from your hospital. Have you eaten? Have you taken your after-breakfast tablets?"</p>
        </div>`;
    }
    if (kind === 'phrases') {
      const cur = PHRASE_DEMOS[phraseIdx];
      return `
        <div class="ct-tour__preview">
          <strong>Tap a real spoken phrase to test intent rules:</strong>
          <div class="ct-choices">
            ${PHRASE_DEMOS.map((d, i) => `<button type="button" class="ct-chip" data-phrase="${i}">${esc(d.phrase)}</button>`).join('')}
          </div>
          <div class="ct-card">
            <div class="ct-row ct-row--between"><span class="small muted">${esc(cur.lang)}</span>${intentStatus(cur.intent, cur.label)}</div>
            <p><strong>Heard:</strong> "${esc(cur.phrase)}"</p>
            <p class="small muted">${esc(cur.bot)}</p>
          </div>
        </div>`;
    }
    if (kind === 'readback') {
      return `
        <div class="ct-tour__preview">
          <ul class="ct-chain" aria-label="Read-back confirmation steps">
            <li class="ct-chain__node">1. Patient says "వేసుకున్నాను"</li>
            <li class="ct-chain__arrow" aria-hidden="true">-&gt;</li>
            <li class="ct-chain__node ct-chain__node--active">2. Bot reads back slot + 09:00</li>
            <li class="ct-chain__arrow" aria-hidden="true">-&gt;</li>
            <li class="ct-chain__node">3. Patient says "అవును" or key 1</li>
            <li class="ct-chain__arrow" aria-hidden="true">-&gt;</li>
            <li class="ct-chain__node ct-chain__node--active">4. DoseLog written</li>
          </ul>
          <p class="small muted">If the patient says "no" or hangs up at step 2, zero dose is logged.</p>
        </div>`;
    }
    if (kind === 'family') {
      return `
        <div class="ct-tour__preview">
          <div class="ct-row ct-row--between"><strong>Lakshmi Devi: shared with son Ravi</strong>${status('taken', 'Shared')}</div>
          ${progress(3, 14, 'Day 3 of 14', 'Amoxiclav 625 mg')}
          <p class="small">In Lakshmi's own words: <span class="ct-quote">వేసుకున్నాను</span> (09:00, Taken)</p>
          <p class="small muted">Arjun's record has Share with family turned off, so his family view returns HTTP 403 and shows a lock notice.</p>
        </div>`;
    }
    if (kind === 'rx') {
      const parsed = rxResult || { medicine: 'Paracetamol', dose: '650 mg', slots: ['breakfast', 'dinner'], days: 5 };
      return `
        <div class="ct-tour__preview">
          <strong>Live prescription rule parser (/api/parse-rx):</strong>
          <div class="ct-choices">
            ${RX_DEMOS.map((s) => `<button type="button" class="ct-chip" data-rxdemo="${esc(s)}">${esc(s)}</button>`).join('')}
          </div>
          <div class="ct-row">
            <input class="ct-input" id="tr-rx-in" value="${esc(rxInput)}" aria-label="Dictated prescription">
            <button type="button" class="ct-btn ct-btn--secondary" id="tr-rx-run">Parse by rules</button>
          </div>
          <dl class="ct-dl">
            <dt>Medicine</dt><dd><strong>${esc(parsed.medicine || 'None')}</strong></dd>
            <dt>Dose</dt><dd>${esc(parsed.dose || 'None')}</dd>
            <dt>Meal slots</dt><dd>${esc((parsed.slots || []).join(', ') || 'None')}</dd>
            <dt>Days</dt><dd>${esc(parsed.days || 'None')}</dd>
          </dl>
        </div>`;
    }
    if (kind === 'verify') {
      return `
        <div class="ct-tour__preview">
          <ul class="ct-chain">
            <li class="ct-chain__node">Hospital desk saves patient</li>
            <li class="ct-chain__arrow" aria-hidden="true">-&gt;</li>
            <li class="ct-chain__node">Status: Awaiting nurse (0 slots)</li>
            <li class="ct-chain__arrow" aria-hidden="true">-&gt;</li>
            <li class="ct-chain__node ct-chain__node--active">Nurse clicks Verify</li>
            <li class="ct-chain__arrow" aria-hidden="true">-&gt;</li>
            <li class="ct-chain__node ct-chain__node--active">DoseSlots scheduled</li>
          </ul>
        </div>`;
    }
    if (kind === 'triage') {
      const m = liveMeasures;
      return `
        <div class="ct-tour__preview">
          <div class="ct-row ct-row--between"><strong>Live Nurse board queue order</strong><span class="small muted">${m ? `${m.openFlags} open now` : 'Live'}</span></div>
          <div class="ct-row">
            ${status('urgent', '1. Urgent')}
            ${status('stopped', '2. Stopped early')}
            ${status('missed', '3. Not reachable')}
            ${status('missed', '4. Missed')}
          </div>
          <p class="small muted">Every flag carries the patient's exact quote and closes when a nurse clicks "Called back".</p>
        </div>`;
    }
    if (kind === 'doctor') {
      return `
        <div class="ct-tour__preview">
          <strong>Seeded patient courses ready to inspect on Doctor view:</strong>
          <ul class="ct-list">
            <li><span><strong>Lakshmi Devi, 67</strong> (Telugu, Amoxiclav 625 mg)</span><span class="tabular small">Day 3 of 14</span></li>
            <li><span><strong>Arjun, 24</strong> (Hindi, Isotretinoin 20 mg)</span><span class="tabular small">Day 15 of 60</span></li>
            <li><span><strong>Meena, 20</strong> (Tamil, Cefuroxime 500 mg)</span><span class="tabular small">Day 5 of 10</span></li>
          </ul>
        </div>`;
    }
    if (kind === 'misheard') {
      return `
        <div class="ct-tour__preview">
          <div class="ct-row ct-row--between"><strong>Sample misheard item</strong>${status('unclear', 'Low confidence 0.38')}</div>
          <p><span class="ct-quote">ఆ... ఎవరు</span> (Lakshmi Devi, te-IN)</p>
          <p class="small muted">Saved for nurse keyword review instead of guessing "taken".</p>
        </div>`;
    }
    if (kind === 'chain') {
      return `
        <div class="ct-tour__preview">
          <ul class="ct-chain" aria-label="Care Taker data chain">
            <li class="ct-chain__node ct-chain__node--active">Patient</li>
            <li class="ct-chain__arrow" aria-hidden="true">-&gt;</li>
            <li class="ct-chain__node ct-chain__node--active">Prescription</li>
            <li class="ct-chain__arrow" aria-hidden="true">-&gt;</li>
            <li class="ct-chain__node ct-chain__node--active">DoseSlot</li>
            <li class="ct-chain__arrow" aria-hidden="true">-&gt;</li>
            <li class="ct-chain__node ct-chain__node--active">Call</li>
            <li class="ct-chain__arrow" aria-hidden="true">-&gt;</li>
            <li class="ct-chain__node ct-chain__node--active">DoseLog</li>
            <li class="ct-chain__arrow" aria-hidden="true">-&gt;</li>
            <li class="ct-chain__node ct-chain__node--active">Flags and Reports</li>
          </ul>
        </div>`;
    }
    if (kind === 'ladder') {
      const order = ['1. unwell', '2. optOut', '3. wantPerson', '4. someoneElse', '5. stopped', '6. notEaten', '7. later', '8. notTaken', '9. taken', '10. no', '11. yes'];
      return `
        <div class="ct-tour__preview">
          <strong>First match wins (anything else or confidence under 0.5 is unclear):</strong>
          <div class="ct-row">${order.map((x) => `<span class="ct-tag">${esc(x)}</span>`).join('')}</div>
        </div>`;
    }
    if (kind === 'voice') {
      return `
        <div class="ct-tour__preview">
          <ul class="ct-chain">
            <li class="ct-chain__node ct-chain__node--active">1. Browser speechSynthesis</li>
            <li class="ct-chain__arrow" aria-hidden="true">-&gt;</li>
            <li class="ct-chain__node">2. Sarvam TTS (optional key)</li>
            <li class="ct-chain__arrow" aria-hidden="true">-&gt;</li>
            <li class="ct-chain__node">3. /audio/{lang}/{lineId}.mp3</li>
            <li class="ct-chain__arrow" aria-hidden="true">-&gt;</li>
            <li class="ct-chain__node ct-chain__node--active">4. On-screen text</li>
          </ul>
        </div>`;
    }
    if (kind === 'dual') {
      return `
        <div class="ct-tour__preview">
          <div class="ct-row">
            <a class="ct-btn ct-btn--secondary ct-btn--sm" href="#phone">${icon('keypad')}Keypad feature phone</a>
            <a class="ct-btn ct-btn--secondary ct-btn--sm" href="#mobile?persona=patient">${icon('phone')}Patient mobile app</a>
            <a class="ct-btn ct-btn--secondary ct-btn--sm" href="#mobile?persona=doctor">${icon('stethoscope')}Doctor &amp; nurse mobile app</a>
          </div>
        </div>`;
    }
    return `
      <div class="ct-tour__preview">
        <div class="ct-row">
          ${status('taken', 'Zero doses without yes')}
          ${status('urgent', 'Emergency: call 112')}
          ${status('pending', 'Sample data only')}
        </div>
      </div>`;
  }

  function drawStage() {
    const stage = container.querySelector('#tr-stage');
    if (!stage) return;
    const steps = TRACKS[trackKey].steps;
    const s = steps[stepIdx];
    stage.innerHTML = `
      <div class="ct-row ct-row--between">
        <span class="ct-eyebrow"><span class="ct-eyebrow__dot" aria-hidden="true"></span>${esc(s.badge)}</span>
        <span class="small muted tabular">${stepIdx + 1} / ${steps.length}</span>
      </div>
      <h3>${esc(s.title)}</h3>
      <p>${esc(s.body)}</p>
      ${renderPreview(s.preview)}
      <div class="ct-notice">${icon('info')}<p class="small"><strong>How it works in code:</strong> ${esc(s.underHood)}</p></div>
      <div class="ct-tour__foot">
        <div class="ct-row">
          <button type="button" class="ct-btn ct-btn--secondary ct-btn--sm" id="tr-prev" ${stepIdx === 0 ? 'disabled' : ''}>${icon('arrow-left')}Previous</button>
          <button type="button" class="ct-btn ct-btn--primary ct-btn--sm" id="tr-next">${stepIdx < steps.length - 1 ? `Next step${icon('arrow-right')}` : `Next track${icon('arrow-right')}`}</button>
        </div>
        <a class="ct-btn ct-btn--ghost ct-btn--sm" href="${esc(s.actionHref)}">${esc(s.actionLabel)}${icon('arrow-right')}</a>
      </div>`;
  }

  container.addEventListener('click', async (e) => {
    const tab = e.target.closest('[data-track]');
    if (tab) {
      trackKey = tab.dataset.track;
      stepIdx = 0;
      drawTabs();
      drawSteps();
      drawStage();
      return;
    }
    const sb = e.target.closest('[data-step]');
    if (sb) {
      stepIdx = Number(sb.dataset.step);
      drawSteps();
      drawStage();
      return;
    }
    const pb = e.target.closest('[data-phrase]');
    if (pb) {
      phraseIdx = Number(pb.dataset.phrase);
      drawStage();
      return;
    }
    const rb = e.target.closest('[data-rxdemo]');
    if (rb) {
      rxInput = rb.dataset.rxdemo;
      rxResult = await post('/api/parse-rx', { text: rxInput });
      drawStage();
      return;
    }
    if (e.target.closest('#tr-rx-run')) {
      const inp = container.querySelector('#tr-rx-in');
      rxInput = inp ? inp.value : rxInput;
      rxResult = await post('/api/parse-rx', { text: rxInput });
      drawStage();
      return;
    }
    if (e.target.closest('#tr-prev') && stepIdx > 0) {
      stepIdx -= 1;
      drawSteps();
      drawStage();
      return;
    }
    if (e.target.closest('#tr-next')) {
      const keys = Object.keys(TRACKS);
      if (stepIdx < TRACKS[trackKey].steps.length - 1) {
        stepIdx += 1;
      } else {
        trackKey = keys[(keys.indexOf(trackKey) + 1) % keys.length];
        stepIdx = 0;
        drawTabs();
      }
      drawSteps();
      drawStage();
    }
  });

  drawTabs();
  drawSteps();
  drawStage();
}

let rootEl = null;

export function mount(el, params) {
  rootEl = el;
  const track = (params && params.get('track')) || 'patients';
  el.innerHTML = `
    <div class="ct-stack--lg">
      <div class="ct-row ct-row--between">
        <div class="ct-stack">
          <span class="ct-eyebrow"><span class="ct-eyebrow__dot" aria-hidden="true"></span>Interactive walkthrough</span>
          <h1>Application tour</h1>
          <p class="muted">Step through how patients and families receive calls, how doctors and nurses verify and triage, and how the engine works under the hood.</p>
        </div>
        <div class="ct-row">
          <a class="ct-btn ct-btn--primary" href="#mobile">${icon('phone')}Open mobile app prototype</a>
          <a class="ct-btn ct-btn--secondary" href="#desk">Open hospital desk</a>
        </div>
      </div>
      <div id="tour-mount"></div>
    </div>`;
  renderTourWidget(el.querySelector('#tour-mount'), { initialTrack: track });
}

export function unmount() { rootEl = null; }
