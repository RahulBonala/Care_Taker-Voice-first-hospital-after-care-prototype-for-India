# Care Taker: 2 minute 50 second demo video script

## Setup before recording

1. Run `docker compose up --build` and open `http://localhost:3000` in Google Chrome at `1280x800` (keep DevTools device toolbar ready to toggle `360x800` once during the keypad segment).
2. Allow microphone access on `http://localhost:3000`.
3. Open **Features -> Nurse board** (`#nurse`) and click **Reset sample data** so `Lakshmi Devi`, `Arjun`, and `Meena` start in their clean seeded states.
4. Navigate to **Patient phone** (`#phone`, click **Call** in the top bar) with **Lakshmi Devi** selected before hitting record.

---

## 0:00 to 0:20: Founder hook and the read-back confirmation beat

**On screen:**
1. Start on **Patient phone** (`#phone`) with **Lakshmi Devi** (67, Telugu `te-IN`, keypad phone, Amoxiclav 625 mg, day 3 of 14).
2. Click **Next slot**, then click **Answer**. Care Taker greets Lakshmi in Telugu and asks if she has eaten and taken her after-breakfast tablets.
3. Speak or click the sample chip `వేసుకున్నాను`.
4. Point to `#ph-chip` right below `#ph-heard`: the marigold pending dose chip appears (`After breakfast, 09:00 : Waiting for your yes`). Nothing is logged yet.
5. Speak or click `అవును` (or press key `1`). Watch the dose chip turn green (`After breakfast, 09:00 : Taken`), draw its checkmark stroke, and hear the soft confirm chime while `#ph-state` announces `Dose confirmed and logged`.

**Narration:**
> "I was told to take a skin tablet for two months, stopped after fifteen days once my skin looked healed, and still forget doses. For my parents and grandparents in India, apps do not work, phone calls do. When Care Taker calls Lakshmi in Telugu and she says 'vesukunnanu', the chip stays 'Waiting for your yes'. Only when she confirms with 'avunu' does Care Taker draw the check and log the dose."

---

## 0:20 to 0:55: Family view and Hospital desk dictation with consent

**On screen:**
1. Open **Features -> Family** (`#family`). Point to the top headline (`#fa-today-summary`): `"Lakshmi Devi's doses today: 1 of 1 confirmed, last at 09:00 IST."`, the **Print or save this week** button, and `"వేసుకున్నాను"` under **In Lakshmi's own words**.
2. Switch the patient selector to **Arjun** to show the privacy notice explaining that sharing is off and a nurse can turn it on with his consent.
3. Open **Features -> Hospital desk** (`#desk`). Type **Full name:** `Kiran Rao`, **Age:** `62`, **Call language:** `Telugu`, **Phone type:** `Keypad phone`.
4. In **Prescription -> Dictate**, click **Dictate** (or type) `"Paracetamol 650, after breakfast and dinner, 5 days"` and click **Fill form**. Watch Medicine (`Paracetamol`), Dose (`650 mg`), Meal slots (`After breakfast`, `After dinner`), and Days (`5`) fill automatically.
5. Tick both **Consent** checkboxes, enter `Nurse Priya`, and click **Save and send for verification**.

**Narration:**
> "Her son Ravi in London sees one sentence at the top: one of one confirmed today at nine o'clock IST, with a print button for the clinic visit, while Arjun's page stays private because he has not opted in. At discharge on the Hospital desk, a nurse dictates 'Paracetamol 650, after breakfast and dinner, 5 days', records explicit consent for calls and key 9 opt-out, and sends the schedule for verification."

---

## 0:55 to 1:40: Unwell priority, stopped-early check, and keypad fallback

**On screen:**
1. Click **Call** in the top bar (`#phone`) and select **Arjun** (24, Hindi-English `hi-IN`, Isotretinoin 20 mg, day 15 of 60).
2. Click **Next slot** (`22:00`) and **Answer**. Click `khana nahi khaya, aadha ghanta baad` to reschedule to `22:30`.
3. Click **Next slot** (`22:30`) and **Answer**. Click `haan le li, lekin chakkar aa raha hai`. Point out `Heard: haan le li, lekin chakkar aa raha hai -> Feels unwell` and `Urgent: a nurse will call`: zero dose is logged.
4. Select **Meena** (20, Tamil `ta-IN`, day 5 of 10). Click **Next slot** and **Answer** to show the halfway course reminder. Type `I feel fine, I have stopped`, then reply `fever is gone`.
5. Click **Next slot** and **Answer** again for **Meena**. Type `hmm` twice to trigger **keypad mode**, toggle `360x800` mobile width briefly to show the responsive phone layout, and press key `9` on the keyboard (`Stop calls`).

**Narration:**
> "When Arjun says 'aadha ghanta', Care Taker calls back in thirty minutes. When he says 'haan le li, lekin chakkar aa raha hai', safety outranks 'le li': no dose is logged and an urgent nurse flag is raised. When Meena stops her antibiotic on day five because her fever is gone, Care Taker records her reason in her own words without lecturing. And if speech is unclear twice, it switches to keypad tones, where pressing 9 stops future calls immediately."

---

## 1:40 to 2:20: Nurse board waiting time and one-tap call

**On screen:**
1. Open **Features -> Nurse board** (`#nurse`).
2. Point to **Measures**: `Doses logged without a yes: 0 (Must be 0)`.
3. Point to **Flags**: Arjun's **Urgent** flag sits at the top showing his exact words, the waiting badge (`Waiting 0 min`), the one-tap `Call Arjun` (`tel:`) button, and **Called back**.
4. Click **Verify** on `Kiran Rao` under **Waiting for verification**, and click **Called back** on Arjun's urgent flag.

**Narration:**
> "On the Nurse board, 'Doses logged without a yes' stays at zero. Open flags are sorted by clinical urgency, showing how long each patient has waited, their exact spoken words, and a one-tap phone link right beside 'Called back'."

---

## 2:20 to 2:50: Doctor view sorted by clinical need and close

**On screen:**
1. Open **Features -> Doctor** (`#doctor`).
2. Point to **Course completion**: `Meena` (who stopped early) and `Arjun` (lowest confirmed share) sort above `Lakshmi Devi`, with each patient's latest spoken quote shown directly under their row.
3. Point to **Print or save this week**, **Devices and vitals** with customizable alert ranges, and the footer notice (`Sample data. Not medical advice.`).

**Narration:**
> "On the Doctor screen, courses sort automatically by clinical need: patients who stopped early appear first, with their latest spoken words right underneath and a one-click print view for the review visit. Care Taker starts in one `docker compose up` with zero API keys, works across eleven languages by voice or keypad, and never logs a dose without the patient's yes."
