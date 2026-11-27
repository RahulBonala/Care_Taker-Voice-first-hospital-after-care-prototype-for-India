# Care Taker

**Just answer the call. Every dose, confirmed.**

Voice-first hospital after-care prototype for India: patients sent home with medicines get a call at each dose time in their own language (ten Indian languages and English, picked or detected from their voice), answer by voice or keypad, and confirm a read-back before any dose is logged. It works on every device: keypad phones, smartphones, tablets, laptops and desktops.

- **Theme:** Healthcare access (Scaler x Wispr Flow Hackathon, Round 2)
- **Live demo:** `[LIVE DEMO LINK PLACEHOLDER]`
- **Demo video (3 min):** `[VIDEO LINK PLACEHOLDER]`
- **Pitch deck (PDF):** `[PITCH DECK LINK PLACEHOLDER]`

> Sample data. Not medical advice. Not a medical device or emergency service. In an emergency call 112.

## The problem

Patients leave Indian hospitals with multi-day prescriptions written in English, then go home to recover alone or in busy households where nobody tracks each dose.
Some miss doses when meals slip, some feel dizzy and stay quiet until their next visit, and many stop antibiotics or long courses early the day they feel fine.
App notifications fail on keypad phones and across language barriers, while nurses have no time to call every discharged patient after every meal.

## Screenshots

`[SCREENSHOTS PLACEHOLDER: add Hospital desk, Nurse board, Patient phone (360px and desktop), Family view, and Doctor view screenshots here]`

## Quick start

1. Run with Docker Compose (no `.env` file and no API keys required):

```bash
docker compose up --build
```

2. Open **http://localhost:3000** in **Google Chrome** and **allow microphone access** when prompted.
   - Chrome is recommended because live voice dictation and spoken patient replies use the browser Web Speech API (`webkitSpeechRecognition`).
   - Every call screen also has a typed reply box, tappable sample phrases in each language, and keypad buttons (`1`, `2`, `3`, `9`), so the full flow works even without a microphone.

### Local run without Docker (Node 20+)

```bash
npm ci
npm start        # http://localhost:3000
npm run dev      # watch mode
npm test         # unit, acceptance and HTTP API tests
npm run check    # syntax, pure-JS deps, env vars, secrets, dashes, design tokens, line count and tests
```

## Product website, interactive tour, mobile app, and role screens

Open `http://localhost:3000` to explore both the public product website and the live clinical application (every screen shares the same live state and polls every 2 seconds):

### Product views (top bar)
- **Website (`#home`):** Editorial product landing page explaining the problem, deterministic clinical rules vs optional keyed adapters, the 3-stage discharge-to-review rail, an embedded interactive tour, side-by-side comparison table, and FAQ.
- **Guided tour (`#tour`):** Three-track interactive walkthrough (**For patients and families**, **For doctors and nurses**, and **How it works overall**) with live spoken-phrase and prescription-dictation testers.
- **Mobile app (`#mobile`):** Dual-persona mobile application prototype (**Patient & family app** and **Doctor & nurse app**) covering **1. Onboarding tour**, **2. Sample OTP / staff PIN login**, **3. First-time setup**, and **4. Live 4-tab mobile workspace** wired to `/api/*`.

### Five clinical role screens (segmented switcher)

1. **Hospital desk (`#desk`):** Register a patient, pick call language and phone type, add family contact and sharing preference, dictate or type the prescription, and record the two required patient consent checks before sending for verification.
2. **Nurse board (`#nurse`):** Verify new prescriptions (unverified patients never get slots), work through open flags sorted `Urgent > Stopped early > Not reachable > Missed`, close flags with **Called back**, inspect live safety measures (including **Doses logged without a yes: Must be 0**), review misheard phrases, toggle family sharing, or **Reset sample data**.
3. **Patient phone (`#phone`):** Keypad-phone simulator with **Answer**, **Decline**, keys **1** (Taken), **2** (Later), **3** (Nurse), and **9** (Stop calls), mic level meter, live transcript, `"Heard: {words} -> {intent}"`, and **Next slot** to advance the simulated clock.
4. **Family (`#family`):** Read-only 7-day dose record and weekly summary built from the patient's own spoken words, visible only when **Share with family** is enabled on the patient record.
5. **Doctor (`#doctor`):** Course completion percentage, adherence on due doses, and flags with the patient's exact words quoted for the next clinical review.

## Health devices

Open **Devices** in the top bar.

- **Blood pressure monitors, glucose meters, heart rate straps:** press **Pair** in Chrome on a computer or Android phone. Any device that follows the standard Bluetooth health services works. Readings arrive when the device takes one.
- **Apple Watch, Android smartwatches, smart rings:** these share steps, calories, heart rate and sleep through Apple Health or Health Connect on the phone, which needs the Care Taker phone app. In this prototype, **Add sample** shows how the data looks.
- **Say or type a reading:** "BP 130 by 85", "sugar 145 after food", "fasting sugar 110".
- The doctor sets alert ranges on the **Doctor** screen. A reading outside them goes to the **Nurse board** as "Reading to review". Feedback states facts only, never advice.

## Demo steps (4 acceptance walkthroughs)

Click **Reset sample data** on the **Nurse board** at any time to restore the three seeded patients (`Lakshmi Devi`, `Arjun`, `Meena`) at `08:55` IST.

### 1. Hospital desk dictation, consent and nurse verification
1. Open **Hospital desk**. Fill **Full name** (`Ramesh Kumar`), **Age** (`58`), **Call language** (`Hindi`), and **Phone type** (`Keypad phone`).
2. In **Prescription -> Dictate**, click **Dictate** (or type) `"Paracetamol 650, after breakfast and dinner, 5 days"` and click **Fill form**. Confirm Medicine (`Paracetamol`), Dose (`650 mg`), Meal slots (`After breakfast`, `After dinner`), and Days (`5`) fill by rules.
3. Tick both **Consent** checkboxes, enter **Recorded by** (`Nurse Priya`), and click **Save and send for verification**. Notice the patient cannot be called yet.
4. Switch to **Nurse board** and click **Verify** next to `Ramesh Kumar`. Ten dose slots are generated.

### 2. Telugu dose confirmation with read-back (Lakshmi Devi)
1. Open **Patient phone** and select **Lakshmi Devi** (67, Telugu `te-IN`, keypad phone, Amoxiclav 625 mg, day 3 of 14).
2. Click **Next slot** (`09:00`), then click **Answer**. Care Taker greets Lakshmi in Telugu and asks if she has eaten and taken her after-breakfast tablets.
3. Say or tap `వేసుకున్నాను` (`Taken`). Notice the dose is **not** logged yet: Care Taker reads back `"You took your after-breakfast tablets at 09:00. Is that right? Say yes or press 1."`
4. Say or tap `అవును` (or press key `1`). Only now is the dose logged. Check **Family** (`Lakshmi Devi`) to see today's slot marked `Taken 09:00` and her exact Telugu words in the weekly record.

### 3. Postpone, unwell urgent flag, and stopped-early course check (Arjun)
1. On **Patient phone**, select **Arjun** (24, Hindi-English mix `hi-IN`, Isotretinoin 20 mg nightly, day 15 of 60).
2. Click **Next slot** (`22:00`) and **Answer**. Say or tap `khana nahi khaya, aadha ghanta baad` (or type `aadha ghanta`). Care Taker reschedules the slot by 30 minutes (`22:30`).
3. Click **Next slot** (`22:30`) and **Answer**. Say or tap `haan le li, lekin chakkar aa raha hai`. Even though `"le li"` is present, `unwell` wins priority: nothing is logged as taken, Care Taker says a nurse will call in a few minutes, and an **Urgent** flag with Arjun's exact words appears at the top of **Nurse board**.
4. Switch to **Family** and select **Arjun**: confirm his record is hidden because **Share with family** is off. Switch to **Doctor** to see course completion and quoted flags.
5. (Optional stopped-early check) Select **Meena** (day 5 of 10, halfway reminder plays on answer), click **Next slot** and **Answer**, then type `I feel fine, I have stopped`. Care Taker asks why she stopped, records her reason verbatim, and raises a **Stopped early** flag.

### 4. Unclear reply, keypad fallback, opt-out, and nurse callback
1. On **Patient phone**, start the next call for **Meena** and **Answer**.
2. Send two unclear replies (for example type `hmm` twice, or stay silent for 8 seconds). Both unclear replies are saved to **Misheard replies** on the Nurse board, and Care Taker switches to keypad mode (`1` taken, `2` later, `3` nurse, `9` stop calls, with a 10-second countdown).
3. Press `1` (Care Taker still reads back the dose and waits for a second `1` to confirm) or press `3` to request a nurse callback.
4. Open **Nurse board**, verify **Doses logged without a yes** is still `0`, review **Misheard replies**, and click **Called back** to close an open flag.

## Architecture and data chain

```text
Patient -> Prescription -> DoseSlot -> Call -> DoseLog -> Flags / Reports
```

- **Patient:** demographics, language code, phone type (`keypad` or `smart`), family contact, `shareWithFamily`, recorded consent, `verified`, `callsStopped`.
- **Prescription:** medicine, dose, meal slots (`breakfast`, `lunch`, `dinner`, `night`), `days`, `verified`.
- **DoseSlot:** generated only when a nurse verifies a prescription; tracks `due`, `status` (`pending`, `calling`, `postponed`, `taken`, `missed`, `flagged`, `stopped`, `cancelled`), and `postpones` (max 3).
- **Call:** server-owned state machine (`ask -> confirm | takeNow | callbackWhen | reason | keypad -> ended`) with 3 ring attempts (10 simulated minutes apart) and full bilingual transcript. Two missed slots in a row raise a `notReachable` flag with family contact details.
- **DoseLog:** created only after a spoken `yes` or pressed `1` at the `confirm` read-back stage.
- **Flags & Reports:** sorted `urgent > stoppedEarly > notReachable > missed`; powers Nurse board measures, Family 7-day summary, and Doctor completion table.

### Key endpoints

| Method & path | Purpose |
|---|---|
| `GET /healthz` | Health check (`{"ok":true}`) |
| `GET /api/patients`, `POST /api/patients`, `PATCH /api/patients/:id` | List, register (with consent) and update family sharing |
| `GET /api/prescriptions`, `POST /api/prescriptions`, `POST /api/parse-rx` | Prescriptions and rule-based dictation parser |
| `POST /api/verify/:id` | Nurse verification and `DoseSlot` generation |
| `GET /api/slots`, `POST /api/slots/next` | Dose slots and simulated clock advance to next call |
| `GET /api/calls`, `POST /api/calls/:id/answer`, `decline`, `reply`, `key` | Call state machine turns |
| `GET /api/flags`, `POST /api/flags/:id/close` | Sorted care-team flags and nurse callback closure |
| `GET /api/report/:patientId`, `GET /api/measures`, `GET /api/misheard` | Family/Doctor reports, KPI tiles, and unclear reply log |
| `POST /api/reset` | Restore seeded sample data in `data/db.json` |

## Languages and review status

Languages live as plain JSON files in `server/lang/*.json`: call lines, reply keywords, number words and the patient app's wording. Adding a language requires only adding a config file and test file (see `.claude/skills/add-language/SKILL.md`).

**Choose or just speak.** The hospital desk and the patient app list every language, and both have a **Detect** button. `server/langdetect.js` finds the language from a named language ("Tamil please"), from the script of the reply, or from romanised reply words. If a patient answers a call in another language, Care Taker switches the rest of the call to it and remembers it. English mixed into an Indian language is normal and never switches a call. With `SARVAM_API_KEY` set, the audio itself is sent for language detection. Without it, the browser listens for the language's name.

| Code | Language | Speech code | Intents covered | Native speaker review |
|---|---|---|---|---|
| `bn` | Bengali (বাংলা) | `bn-IN` | All 11 intents, native script, romanised and English mixing | `false` |
| `en` | English (English) | `en-IN` | All 11 intents, native script, romanised and English mixing | `false` |
| `gu` | Gujarati (ગુજરાતી) | `gu-IN` | All 11 intents, native script, romanised and English mixing | `false` |
| `hi` | Hindi (हिन्दी) | `hi-IN` | All 11 intents, native script, romanised and English mixing | `false` |
| `kn` | Kannada (ಕನ್ನಡ) | `kn-IN` | All 11 intents, native script, romanised and English mixing | `false` |
| `ml` | Malayalam (മലയാളം) | `ml-IN` | All 11 intents, native script, romanised and English mixing | `false` |
| `mr` | Marathi (मराठी) | `mr-IN` | All 11 intents, native script, romanised and English mixing | `false` |
| `or` | Odia (ଓଡ଼ିଆ) | `or-IN` | All 11 intents, native script, romanised and English mixing | `false` |
| `pa` | Punjabi (ਪੰਜਾਬੀ) | `pa-IN` | All 11 intents, native script, romanised and English mixing | `false` |
| `ta` | Tamil (தமிழ்) | `ta-IN` | All 11 intents, native script, romanised and English mixing | `false` |
| `te` | Telugu (తెలుగు) | `te-IN` | All 11 intents, native script, romanised and English mixing | `false` |

Intent priority order (first match wins, low confidence `< 0.5` or 8s silence is always `unclear`, never `taken`):
`unwell > optOut > wantPerson > someoneElse > stopped > notEaten > later > notTaken > taken > no > yes`.

## Environment variables (all optional)

Care Taker starts and runs the full demo flow with **no `.env` file and no API keys**. Copy `.env.example` to `.env` only if you want to test an optional adapter; without keys, optional actions return `"key not set"`.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP server port |
| `DATA_DIR` | `./data` (`/app/data` in Docker) | Directory for `db.json` |
| `SARVAM_API_KEY` | unset | Optional Sarvam AI Indian-language TTS/STT |
| `SARVAM_TTS_MODEL` | `bulbul:v2` | Sarvam TTS model when `SARVAM_API_KEY` is set |
| `SARVAM_STT_MODEL` | `saarika:v2` | Sarvam STT model when `SARVAM_API_KEY` is set |
| `SARVAM_SPEAKER` | `anushka` | Sarvam TTS voice speaker |
| `TWILIO_ACCOUNT_SID` | unset | Optional Twilio account SID for placing a real phone call |
| `TWILIO_AUTH_TOKEN` | unset | Optional Twilio auth token |
| `TWILIO_FROM` | unset | Optional Twilio caller number |
| `PUBLIC_URL` | unset | Public HTTPS URL of this server for Twilio speech/DTMF webhooks |
| `LLM_API_KEY` | unset | Optional API key to suggest an intent label on the Nurse board Misheard list |
| `LLM_MODEL` | `claude-haiku-5-5` | Model name used by the optional misheard-intent helper |
| `LLM_API_URL` | `https://api.anthropic.com/v1/messages` | Endpoint for the optional misheard-intent helper |

## Limits

- **Prototype on sample data only:** Do not enter real patient data. All state lives in local `data/db.json` and resets from the Nurse board.
- **No medical advice or emergency monitoring:** Care Taker never diagnoses, recommends, or alters doses. Health concerns raise a nurse flag; in an emergency call `112`.
- **Browser speech support:** Live microphone recognition uses `webkitSpeechRecognition` in Google Chrome over `localhost` or `HTTPS`. Other browsers fall back to typed replies, sample chips, and keypad keys (or Sarvam STT if `SARVAM_API_KEY` is configured).
- **Voice output fallback:** Uses browser `speechSynthesis` when a matching voice is installed on the OS, then Sarvam TTS (if keyed), then `public/audio/{lang}/{lineId}.mp3` (if recorded), and always displays the spoken line on screen.
- **Real phone calls:** Require `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`, and a reachable `PUBLIC_URL`.

## Documentation

- Design system: `docs/DESIGN.md`
- 3-minute demo script: `docs/DEMO_SCRIPT.md`
- Pitch deck text: `docs/PITCH_DECK.md`
- Submission checklist: `docs/SUBMISSION_CHECKLIST.md`
- Legal open questions: `docs/LEGAL_NOTES.md`
- Implementation decisions: `docs/DECISIONS.md`
- Prototype notices (also linked in the app footer): `/terms.html`, `/privacy.html`, `/disclaimer.html`, `/voice-data.html`

## License

MIT. See [LICENSE](./LICENSE).
