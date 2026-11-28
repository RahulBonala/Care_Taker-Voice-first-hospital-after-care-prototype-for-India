# Care Taker: pitch deck text

> Deck copy for Scaler x Wispr Flow Hackathon, Round 2 (Theme: Healthcare access).
> Note on numbers: figures from the Care Taker prototype itself are stated directly; external healthcare, demographic, and vendor pricing figures cite verified primary sources listed on Slide 12.

---

## Section 1: Problem, founder story, and solution

### Slide 1: Title
- **Care Taker**
- **Just answer the call. Every dose, confirmed.**
- Voice-first hospital after-care for India: hospital-verified prescriptions -> scheduled calls in the patient's language -> spoken or keypad reply -> mandatory read-back before any dose is logged.

### Slide 2: Founder story (Why we built Care Taker)
- Rahul was prescribed a skin tablet for two months. After about 15 days, once his skin looked healed, he stopped taking the course early, and on busy days he sometimes forgets a dose altogether.
- His parents and grandparents face the harder version of the same problem: English medicine strips after discharge, shifting Indian meal times, and health apps that nobody over 60 wants to open after every meal.
- Care Taker replaces app reminders with the one habit every Indian household already shares: **answering a phone call in your own language**, with a mandatory read-back so a dose is never logged until the patient confirms it.

### Slide 3: What breaks after hospital discharge
- Across India, patients leave the hospital with multi-day prescriptions that must be taken on time to work, while hospitalisation already strains family budgets (averaging Rs 4,452 in public hospitals and Rs 31,845 in private hospitals per case, with 80.3% of rural and 83.7% of urban cases paid out of household income or savings; MoSPI NSS 75th Round, 2019).
- Globally, adherence to long-term therapies averages only 50% in developed countries and is even lower in developing countries (WHO, 2003), as patients miss doses when meal times shift, cannot read English medicine strips, or stop antibiotics and multi-week courses as soon as symptoms ease.
- Avoidable treatment failure and relapses send patients back to the clinic, while hospital nurses cannot manually call discharged patients three times a day.
- Smartphone reminder apps miss elders, keypad-phone users, and the 89.38% of Indians who do not speak English as a first, second, or third language (Census of India, 2011).

### Slide 4: How Care Taker works
- **1. Hospital desk and consent:** At discharge, a nurse dictates the prescription (`"Paracetamol 650, after breakfast and dinner, 5 days"`), records explicit patient consent in their chosen language, and verifies the schedule. Unverified patients never get calls.
- **2. Voice + keypad call at each dose slot:** Care Taker calls at the scheduled meal slot in the patient's own language (10 Indian languages and English, picked or detected from the reply), asks if the patient has eaten and taken the dose, and reminds them to finish the course from the halfway day onward.
- **3. Read-back before logging:** Nothing is ever logged as taken on the first reply. Care Taker shows `Waiting for your yes`, reads back the slot and time, and logs the dose only after a spoken `"yes"` (`"అవును"`, `"हाँ"`, `"ஆமாம்"`) or pressed `1`.
- **4. Human escalation, zero medical advice:** Replies like `"chakkar aa raha hai"` (`unwell`), `"stopped"`, repeated silence, or missed calls never get automated medical advice. They raise prioritised flags (`Urgent > Stopped early > Not reachable > Missed`) with the patient's exact words and waiting time on the Nurse board.

### Slide 5: Product proof in this prototype
- Five synchronised live clinical views (**Hospital desk**, **Nurse board**, **Patient phone**, **Family**, and **Doctor**) plus **Health devices**, **Guided tour**, and **Mobile app** walkthrough.
- Deterministic Indian-language intent engine supporting native script, romanised speech, and English code-mixing across 11 languages (`te`, `hi`, `ta`, `kn`, `ml`, `bn`, `mr`, `gu`, `pa`, `or`, `en`), backed by 350+ automated unit, fuzz, and API tests.
- Built-in safety metric on the Nurse board: **Doses logged without a yes (target: Must be 0)**.
- Instant opt-out on every call (`"stop calls"`, `"calls band karo"`, `"కాల్స్ ఆపండి"`, or key `9`).

---

## Section 2: Who it is for and reach

### Slide 6: Primary users
- **Patients sent home on multi-day courses:**
  - Older adults living alone or using keypad phones (modelled by seed patient Lakshmi Devi, 67, Telugu).
  - Working adults and students on multi-week dermatology or antibiotic courses where early stopping is common (modelled by Arjun, 24, Hindi-English on day 15 of 60, and Meena, 20, Tamil on day 5 of 10).
- **Hospital discharge nurses:** See one queue sorted by clinical urgency, how long each patient has waited (`Waiting 14 min`), and a one-tap phone call link (`Call Lakshmi Devi`).
- **Treating doctors:** See courses sorted by clinical need (stopped early first, then lowest confirmed share), the patient's latest spoken quote inline, and a printable one-page weekly summary for the review visit.
- **Distant family caregivers:** Children or relatives living in another city or abroad (like Lakshmi's son Ravi on a +44 number) who see a single top-of-page today summary and a printable weekly record when the patient chooses to share.

### Slide 7: Reach and addressable scale
- **Where patients are discharged:** In India, 55.3% of inpatient hospitalisations occur in private hospitals and 42.0% in public government hospitals (MoSPI NSS 75th Round, 2019), alongside high-volume outpatient prescription courses in general medicine, post-surgical care, infectious disease, and dermatology.
- **Target beachhead segment:** Medium-to-large charitable, trust, and regional multi-specialty hospitals in Tier 1, Tier 2, and Tier 3 Indian cities discharging patients on 5-to-60 day courses where follow-up nurse calls are currently manual or non-existent.
- **Language coverage:** Only 0.02% of Indians speak English as their mother tongue and 10.62% speak it overall (Census of India, 2011). Care Taker ships with 10 Indian languages (`te`, `hi`, `ta`, `kn`, `ml`, `bn`, `mr`, `gu`, `pa`, `or`) plus English, and adding a language is a single JSON file (`server/lang/<code>.json`) plus native-speaker review.

---

## Section 3: What it depends on, cost, and failure plan

### Slide 8: Dependencies and unit economics
- **Core prototype dependencies (zero external cost):** Node 20, Express, self-hosted Noto Sans and Newsreader fonts, deterministic rule-based intent engine, atomic JSON store. Runs locally or in Docker (`docker compose up`) with zero API keys.
- **Real-world telephony and speech dependencies (for a live hospital pilot):**
  - Outbound PSTN voice and DTMF gateway (Twilio or an India-licensed cloud telephony operator) using standard per-minute domestic outbound voice call rates.
  - Indian-language TTS/STT: pre-recorded native studio `.mp3` clips for the 20 fixed bot prompts cost Rs 0 per call at runtime; live speech-to-text via Sarvam AI (`saarika:v2`) is published at Rs 30 per audio hour, or **Rs 0.50 per audio minute** billed per second (Sarvam AI, 2025).
  - **Speech recognition cost per 14-day, twice-daily course:** 28 short calls of up to 45 seconds each equal 21 minutes of audio, or **Rs 10.50 in Sarvam AI STT cost per course** (plus standard carrier voice call charges).
- **Regulatory and legal dependencies before any real patient call:** DPDP Act 2023 notice and consent review, TRAI transactional voice regulations, Telemedicine Practice Guidelines 2020 boundary confirmation, and hospital data-processing agreements (tracked in `docs/LEGAL_NOTES.md`).

### Slide 9: Failure modes and fallbacks

| What can fail | How Care Taker handles it |
|---|---|
| Speech recognition fails, noisy room, or confidence `< 0.5` | Never guesses `taken`. Marks `unclear`, asks once more, then switches to keypad DTMF (`1` taken, `2` later, `3` nurse, `9` stop). |
| Patient says `"took it"` AND mentions a symptom (`"le li, lekin chakkar"`) | `unwell` outranks `taken` in `PRIORITY`. Dose is **not** logged; raises an **Urgent** nurse flag with exact words. |
| Browser has no Indic TTS voice or Sarvam API is down/unset | Falls back to pre-recorded `public/audio/{lang}/{lineId}.mp3`, then on-screen native + English text. |
| Patient does not answer or declines | Retries up to 3 rings (10 minutes apart), then marks `missed` + flag; 2 missed slots in a row raise `Not reachable` with family contact details. |
| Patient postpones repeatedly | Allows up to 3 postpones (10 to 90 minutes, default 30); a 4th postpone marks `missed` and flags the nurse. |
| Dialect phrase not in keyword list | Logged to **Misheard replies** on the Nurse board; optional keyed LLM can only suggest a fixed intent label for human review, never logs a dose or writes advice. |

---

## Section 4: Launch plan, judge Q&A, and sources

### Slide 10: Phased path from prototype to hospital pilot
- **Stage 1: Clinical and linguistic validation (Weeks 1 to 3)**
  - Have native-speaking nurses review all 11 language call scripts and record the 20 fallback `.mp3` clips per language, flipping `reviewedByNativeSpeaker` to `true`.
  - Complete legal counsel review on all items in `docs/LEGAL_NOTES.md` (DPDP Act 2023, TRAI voice rules, hospital DPA).
- **Stage 2: Shadow usability trial at one discharge desk (Weeks 4 to 6)**
  - Test Hospital desk dictation, consent capture, and Nurse board triage with discharge nurses on synthetic cases, keeping nurse setup under 60 seconds per patient and refining misheard regional phrases.
- **Stage 3: Opt-in single-department pilot (Weeks 7 to 12)**
  - Run opt-in outbound calls on keypad and smartphones for one post-discharge cohort in a general medicine or dermatology department using an India-compliant telephony line and managed Postgres storage.
  - Measure four numbers: call answer rate, confirmed course completion %, nurse callback turnaround on Urgent flags, and **doses logged without confirmation (must remain 0)**.

### Slide 11: Appendix: 6 judge questions and answers
1. **Why phone calls instead of a smartphone app?** Elders and keypad-phone users already answer phone calls in their mother tongue without installing apps, logging in, or reading English notifications.
2. **How does the patient know which tablets the read-back means?** Care Taker names the meal slot (`after-breakfast`, `after-dinner`) matching how Indian discharge sheets group medicines, and reads back the slot and time before asking for a yes.
3. **What if the patient says yes falsely?** Care Taker prevents accidental or misheard logging by requiring an explicit read-back confirmation and quotes the patient's exact spoken words for the doctor, rather than claiming invasive camera surveillance.
4. **How are privacy and consent handled?** No calls start until a nurse records two explicit consent checks and verifies the prescription, family view is locked unless `shareWithFamily` is enabled, and saying `"stop calls"` or pressing `9` stops all future calls immediately.
5. **What is the cost per patient per course?** Pre-recorded bot prompts cost Rs 0 at runtime, and live Indian-language speech recognition via Sarvam AI costs Rs 0.50 per audio minute, or Rs 10.50 across 28 calls of 45 seconds in a 14-day twice-daily course, plus carrier call charges.
6. **How does a hospital adopt it?** A discharge nurse dictates the prescription in one sentence on the Hospital desk screen, ticks consent, and clicks Verify on the Nurse board with zero EHR integration required on day one.

### Slide 12: Primary sources
- **World Health Organization (WHO), 2003:** *Adherence to Long-Term Therapies: Evidence for Action* (long-term medication adherence averages 50% in developed countries and lower in developing nations). URL: https://iris.who.int/handle/10665/42682
- **Ministry of Statistics and Programme Implementation (MoSPI), Government of India, 2019:** *Key Indicators of Social Consumption in India: Health, NSS 75th Round (July 2017 to June 2018)* (55.3% private vs 42.0% public inpatient hospitalisation share; Rs 4,452 public and Rs 31,845 private average medical expenditure per hospitalisation case; 80.3% rural and 83.7% urban cases financed from household income/savings). URL: https://mospi.gov.in
- **Office of the Registrar General & Census Commissioner, India, 2018:** *Census of India 2011, Paper 1 of 2018: Language and Multilingualism* (0.02% of India's population reports English as mother tongue; 10.62% overall including second and third language speakers). URL: https://censusindia.gov.in
- **Sarvam AI, 2025:** *Published API Pricing for Saarika Speech-to-Text* (Rs 30 per audio hour / Rs 0.50 per audio minute, billed per second). URL: https://www.sarvam.ai
