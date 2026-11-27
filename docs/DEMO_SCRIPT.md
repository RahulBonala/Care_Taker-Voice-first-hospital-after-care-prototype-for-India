# Care Taker: 3-minute demo video script

## Setup before recording

1. Run `docker compose up --build` and open `http://localhost:3000` in Google Chrome at `1280x800` (keep DevTools device toolbar ready to toggle `360x800` once during the keypad segment).
2. Allow microphone access on `http://localhost:3000`.
3. Open **Nurse board** and click **Reset sample data** so the simulated clock starts at `08:55, Fri` with `Lakshmi Devi`, `Arjun`, and `Meena` in their clean starting states.
4. Navigate to **Hospital desk** (`#desk`) before hitting record.

---

## 0:00 to 0:20: Story and problem

**On screen:**
- Start on **Hospital desk** showing the top banner (`Sample data. Not medical advice.`), the Care Taker app bar, simulated clock (`08:55`), and the role switcher (`Hospital desk`, `Nurse board`, `Patient phone`, `Family`, `Doctor`).
- Briefly hover **Recent patients** (`Lakshmi Devi` in Telugu on a keypad phone, `Arjun` in Hindi on day 15 of 60, `Meena` in Tamil on day 5 of 10).

**Narration:**
> "Every day, patients leave Indian hospitals with a bag of medicines and an English discharge sheet. At home, meals run late, elders on keypad phones cannot use health apps, and people stop courses early the moment they feel fine. Care Taker calls each patient at dose time in their own language, listens by voice or keypad, and never logs a dose until the read-back is confirmed."

---

## 0:20 to 0:40: Nurse setup, dictation and consent

**On screen:**
1. On **Hospital desk**, type **Full name:** `Kiran Rao`, **Age:** `62`, **Call language:** `Telugu`, **Phone type:** `Keypad phone`.
2. In **Prescription -> Dictate**, click **Dictate** and speak:
   `"Paracetamol 650, after breakfast and dinner, 5 days"`
   Watch Medicine (`Paracetamol`), Dose (`650 mg`), Meal slots (`After breakfast`, `After dinner`), and Days (`5`) fill automatically.
3. Scroll to **Consent**: point out that **Save** is disabled until both boxes are ticked (`Patient agreed to receive dose calls in Telugu` and `Patient knows they can stop calls at any time by saying "stop calls" or pressing 9`). Tick both, enter `Nurse Priya`, and click **Save and send for verification**.
4. Switch to **Nurse board** and click **Verify** on `Kiran Rao`.

**Narration:**
> "At discharge, the nurse dictates 'Paracetamol 650, after breakfast and dinner, 5 days' and the schedule fills by rules. Nothing starts without explicit consent to receive calls and to opt out anytime with 'stop calls' or key 9. Only after a nurse clicks Verify on the Nurse board are dose slots created."

---

## 0:40 to 1:40: Lakshmi Devi's Telugu call and read-back confirmation

**On screen:**
1. Switch to **Patient phone** and select **Lakshmi Devi** (67, Telugu `te-IN`, keypad phone, lives alone, son Ravi abroad).
2. Click **Next slot**. The simulated clock advances to `09:00` and the keypad phone rings.
3. Click **Answer**. Care Taker greets Lakshmi in Telugu and asks if she has eaten and taken her after-breakfast tablets (with English translation shown below each bot bubble for the care team).
4. Speak into the mic (or tap sample chip): `వేసుకున్నాను`.
5. Point out the **Heard** bar: `Heard: వేసుకున్నాను -> Taken`, while Care Taker reads back:
   `"You took your after-breakfast tablets at 09:00. Is that right? Say yes or press 1."`
6. Speak `అవును` (or press `1`). Toast appears: `Dose logged`. Care Taker says goodbye with the next call time (`13:30`).
7. Click **Family** in the top bar (`Lakshmi Devi` selected). Show `Taken 09:00` under **Today** and `"వేసుకున్నాను"` in **In Lakshmi's own words**.

**Narration:**
> "Lakshmi is 67, lives alone with a keypad phone, and speaks Telugu. At nine o'clock her phone rings. Care Taker asks in Telugu if she has eaten and taken her morning tablets. When she says 'vesukunnanu', Care Taker does not log the dose yet. It reads back the slot and time and asks her to confirm. Only when she says 'avunu' is the dose recorded, and her son Ravi abroad sees her week in her own words because she chose to share it."

---

## 1:40 to 2:20: Arjun's postpone, unwell priority, and stopped-early check

**On screen:**
1. Switch to **Patient phone** and select **Arjun** (24, Hindi-English mix `hi-IN`, Isotretinoin 20 mg nightly, day 15 of 60).
2. Click **Next slot** (`22:00`) and **Answer**. Speak or type: `aadha ghanta`. Show toast: `Call rescheduled to 22:30`.
3. Click **Next slot** (`22:30`) and **Answer**. Speak or tap: `haan le li, lekin chakkar aa raha hai`.
   Point out `Heard: haan le li, lekin chakkar aa raha hai -> Feels unwell`: even though he said `"le li"`, `unwell` wins priority, nothing is logged as taken, and Care Taker says a nurse will call in a few minutes.
4. Select **Meena** (day 5 of 10). Click **Next slot** and **Answer**: point out the halfway course reminder (`"You are on day 5 of 10. Your doctor asked you to complete the course."`). Reply `I feel fine, I have stopped`, then answer the follow-up reason with `fever is gone`. Show `Stopped early: care team told`.

**Narration:**
> "With Arjun at night, saying 'aadha ghanta' reschedules the call by 30 minutes. On the callback he says 'haan le li, lekin chakkar aa raha hai'. Safety wins over 'le li': zero dose is logged, and an urgent nurse flag is raised with his exact words. And when Meena, halfway through a 10-day antibiotic course, says 'I feel fine, I have stopped', Care Taker gives no medical lecture: it asks why, records her words, and alerts her care team."

---

## 2:20 to 2:45: Keypad fallback, Nurse board, and mobile check

**On screen:**
1. Still on **Patient phone** with **Meena**, click **Next slot** and **Answer**. Type `hmm` twice (two unclear replies). Show Care Taker switching to **keypad mode** with a 10-second countdown, lighting keys `1`, `2`, `3`, and `9`. Press `2` (`Later`).
2. Briefly toggle `360px` mobile width to show the phone and stacked layout fitting cleanly with 48px tap targets, then return to desktop width.
3. Switch to **Nurse board**:
   - Point to **Measures**: `Doses logged without a yes: 0 (Must be 0)`.
   - Point to **Flags** sorted `Urgent` (Arjun's `"haan le li, lekin chakkar aa raha hai"`) above `Stopped early` (Meena's `"fever is gone"`) above `Missed`.
   - Click **Called back** on Arjun's urgent flag to close it, and point to **Misheard replies** (`"hmm"` logged for rule review) and `"key not set"` on optional keyed buttons.

**Narration:**
> "If speech is noisy twice, Care Taker falls back to keypad tones: 1 for taken, 2 for later, 3 for a nurse, 9 to stop calls. On the Nurse board, 'Doses logged without a yes' stays at zero, urgent flags sit at the top with the patient's exact words, misheard phrases are queued for rule updates, and nurses close flags as they call back."

---

## 2:45 to 3:00: Doctor view, Family privacy, and close

**On screen:**
1. Click **Family**, switch dropdown to **Arjun**, showing the lock state (`Arjun has not chosen to share their record with family`).
2. Click **Doctor**, showing course completion bars and quoted flags across all verified patients, plus the footer links (`Terms`, `Privacy`, `Medical disclaimer`, `Voice and AI notice`).

**Narration:**
> "Family members only see records when the patient opts in, and doctors review real course completion alongside what patients actually said. Care Taker runs in one `docker compose up` with zero API keys, works on any phone through voice or keypad, and keeps humans in charge of care."
