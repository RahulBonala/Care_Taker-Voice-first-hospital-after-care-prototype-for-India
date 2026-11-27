# Care Taker: pitch deck text

> Draft deck copy for Scaler x Wispr Flow Hackathon, Round 2 (Theme: Healthcare access).
> Note on numbers: figures from the Care Taker prototype itself are stated directly; every external healthcare, demographic, or vendor pricing figure is marked `[SOURCE NEEDED: ...]` until verified from a primary source.

---

## Section 1: Problem and solution

### Slide 1: Title
- **Care Taker**
- Voice-first hospital after-care for India.
- Hospital-verified prescriptions -> scheduled calls in the patient's language -> spoken or keypad reply -> mandatory read-back before any dose is logged.

### Slide 2: What breaks after hospital discharge
- Every year in India, `[SOURCE NEEDED: annual hospital discharges in India]` patients go home with multi-day prescriptions that must be taken on time to work.
- `[SOURCE NEEDED: share of discharged or outpatient patients in India who miss doses or stop courses early]` miss doses when meal times shift, cannot read English medicine strips, or stop antibiotics and chronic courses as soon as symptoms ease.
- Avoidable treatment failure and readmissions cost families `[SOURCE NEEDED: out-of-pocket or readmission burden figure for India]`, while hospital nurses cannot manually call discharged patients three times a day.
- Smartphone reminder apps miss elders, keypad-phone users (`[SOURCE NEEDED: share or count of feature/keypad phone users in India]`), and patients who prefer speaking in their mother tongue.

### Slide 3: How Care Taker works
- **1. Hospital desk & consent:** At discharge, a nurse dictates the prescription (`"Paracetamol 650, after breakfast and dinner, 5 days"`), records explicit patient consent in their chosen language, and verifies the schedule. Unverified patients never get calls.
- **2. Voice + keypad call at each dose slot:** Care Taker calls at the scheduled meal slot in the patient's own language (ten Indian languages and English, picked or detected from the reply), asks if the patient has eaten and taken the dose, and reminds them to finish the course from the halfway day onward.
- **3. Read-back before logging:** Nothing is ever logged as taken on the first reply. Care Taker reads back the slot and time and logs the dose only after a spoken `"yes"` or pressed `1`.
- **4. Human escalation, zero medical advice:** Replies like `"chakkar aa raha hai"` (`unwell`), `"stopped"`, repeated silence, or missed calls never get automated medical advice. They raise prioritized flags (`Urgent > Stopped early > Not reachable > Missed`) with the patient's exact words on the Nurse board.

### Slide 4: Product proof in this prototype
- Five synchronized live views: **Hospital desk**, **Nurse board**, **Patient phone**, **Family** (consent-gated), and **Doctor**.
- Rule-based Indian-language intent engine supporting native script, romanised speech, and English code-mixing across 4 language packs (`te`, `hi`, `ta`, `en`), backed by 124 automated tests.
- Built-in safety metric on the Nurse board: **Doses logged without a yes (target: 0)**.
- Instant opt-out on every call (`"stop calls"`, `"calls band karo"`, `"కాల్స్ ఆపండి"`, or key `9`).

---

## Section 2: Who it is for and how many

### Slide 5: Primary users
- **Patients sent home on multi-day courses:**
  - Older adults living alone or using keypad phones (modeled by seed patient Lakshmi Devi, 67, Telugu).
  - Working adults and students on multi-week or antibiotic courses where early stopping is common (modeled by Arjun, 24, Hindi-English, and Meena, 20, Tamil).
- **Hospital discharge nurses:** Need one queue sorted by clinical urgency rather than calling hundreds of patients who are already on track.
- **Treating doctors:** Need honest course completion percentages and the patient's own words at follow-up, without pill-counting theatre or photo uploads.
- **Distant family caregivers:** Children or relatives living in another city or abroad who want a read-only weekly check-in when the patient chooses to share.

### Slide 6: Reach and addressable scale
- **Total hospital discharges in India:** `[SOURCE NEEDED: total annual inpatient discharges and relevant outpatient prescription courses in India]`.
- **Target beachhead segment:** Medium-to-large charitable, trust, and regional multi-specialty hospitals (`[SOURCE NEEDED: number of 50-to-300 bed hospitals in Tier 1, Tier 2, and Tier 3 Indian cities]`) discharging general medicine, post-surgical, infectious disease, and dermatology patients.
- **Language coverage potential:** Adding a language in Care Taker is a single JSON configuration file (`server/lang/<code>.json`) plus native-speaker review; speakers of regional Indian languages represent `[SOURCE NEEDED: share of Indian population preferring non-English healthcare communication]`.

---

## Section 3: What it depends on, cost, and failure plan

### Slide 7: Dependencies and unit economics
- **Core prototype dependencies (zero external cost):** Node 20, Express, self-hosted Noto Sans fonts, rule-based intent engine, JSON store. Runs offline/locally via `docker compose up` with zero API keys.
- **Real-world telephony & speech dependencies (for live hospital pilot):**
  - Outbound PSTN voice & DTMF gateway (for example Twilio or an India-licensed cloud telephony operator): `[SOURCE NEEDED: per-minute outbound voice call rate in India in INR]`.
  - Indian-language TTS/STT (pre-recorded native studio clips for the 20 fixed bot prompts cost Rs 0 per call at runtime; live STT via Sarvam AI or equivalent costs `[SOURCE NEEDED: per-minute Indian-language STT API cost in INR]`).
  - Estimated direct call cost per 14-day, twice-daily course (28 short calls under 45 seconds each): `[SOURCE NEEDED: calculated per-course telephony + STT cost in INR from verified vendor rates]`.
- **Regulatory and legal dependencies before any real patient call:** DPDP Act 2023 notice and consent review, TRAI transactional voice regulations, Telemedicine Practice Guidelines 2020 boundary confirmation, and hospital data-processing agreements (tracked as open questions in `docs/LEGAL_NOTES.md`).

### Slide 8: Failure modes and fallbacks

| What can fail | How Care Taker handles it |
|---|---|
| Speech recognition fails, noisy room, or confidence `< 0.5` | Never guesses `taken`. Marks `unclear`, asks once more, then switches to keypad DTMF (`1` taken, `2` later, `3` nurse, `9` stop). |
| Patient says `"took it"` AND mentions a symptom (`"le li, lekin chakkar"`) | `unwell` outranks `taken` in `PRIORITY`. Dose is **not** logged; raises an **Urgent** nurse flag with exact words. |
| Browser has no Indic TTS voice or Sarvam API is down/unset | Falls back to pre-recorded `public/audio/{lang}/{lineId}.mp3`, then on-screen native + English text. |
| Patient does not answer or declines | Retries up to 3 rings (10 minutes apart), then marks `missed` + flag; 2 missed slots in a row raise `Not reachable` with family contact details. |
| Patient postpones repeatedly | Allows up to 3 postpones (10 to 90 minutes, default 30); a 4th postpone marks `missed` and flags the nurse. |
| Dialect phrase not in keyword list | Logged to **Misheard replies** on the Nurse board; optional keyed LLM can only suggest a fixed intent label for human review, never logs a dose or writes advice. |

---

## Section 4: Launch plan

### Slide 9: Phased path from prototype to hospital pilot
- **Stage 1: Clinical & linguistic validation (Weeks 1 to 3)**
  - Have native-speaking nurses review `te`, `hi`, `ta`, and `en` call scripts and record the 20 fallback `.mp3` clips per language, flipping `reviewedByNativeSpeaker` to `true`.
  - Complete legal counsel review on all items in `docs/LEGAL_NOTES.md` (DPDP Act 2023, TRAI voice rules, hospital BAA/DPA).
- **Stage 2: Shadow usability trial at one discharge desk (Weeks 4 to 6)**
  - Test Hospital desk dictation, consent capture, and Nurse board triage with nurses using synthetic cases (`[SOURCE NEEDED: target nurse setup time per discharge in seconds]`), refining misheard regional phrases.
- **Stage 3: Opt-in single-department pilot (Weeks 7 to 12)**
  - Run opt-in outbound calls on real keypad and smart phones for one high-drop-off prescription cohort (`[SOURCE NEEDED: pilot sample size and partner hospital department]`) using an India-compliant telephony line and managed Postgres storage.
  - Measure four numbers: call answer rate, confirmed course completion %, nurse callback turnaround on Urgent flags, and **doses logged without confirmation (must remain 0)**.
