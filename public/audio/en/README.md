# English voiceover clips (`public/audio/en/`)

Drop your recorded `.mp4` (or `.m4a`, `.mp3`, `.wav`) voiceover files directly into this folder (`public/audio/en/<lineId>.mp4`).
When a file exists here, Care Taker plays your realistic recorded voiceover first instead of browser speech synthesis.

## Priority Core Clips for Live Demo (Record These 8 First)

These 8 sentences cover the complete live demo and mobile app call flows for Lakshmi Devi, Arjun, and Meena:

| File Name | Spoken Sentence to Record (English) | When It Plays |
|---|---|---|
| `greeting.mp4` | Hello Lakshmi. This is Care Taker, calling from your hospital. | Opening line when answering a dose call |
| `askTaken.mp4` | Have you eaten? Have you taken your after-breakfast tablets? | Right after greeting on a breakfast dose call |
| `readback.mp4` | You took your after-breakfast tablets at 9 AM. Is that right? Say yes or press 1. | After patient says "Yes, I took it" or presses 1 |
| `confirmed.mp4` | Thank you. I have written it down. | After patient confirms with "Yes" or presses 1 at read-back |
| `goodbye.mp4` | Take care. I will call again at 1:30 PM. | Closing line after logging a dose |
| `postponeOk.mp4` | Okay. I will call you again in 30 minutes. | After patient says "Not eaten yet" / "Later" or presses 2 |
| `nurseComing.mp4` | A nurse will call you in a few minutes. | After patient says "I feel dizzy" or presses 3 |
| `optOut.mp4` | All right. I will stop the calls. Your care team will be told. | After patient says "Stop calls" or presses 9 |

## Complete 20-Line Reference Table (`server/lang/en.json`)

| File Name (`<lineId>.mp4` or `.mp3`) | Template in `en.json` | Recommended Spoken Recording Script |
|---|---|---|
| `greeting.mp4` | `Hello {name}. This is Care Taker, calling from your hospital.` | Hello Lakshmi. This is Care Taker, calling from your hospital. |
| `askTaken.mp4` | `Have you eaten? Have you taken your {slot} tablets?` | Have you eaten? Have you taken your after-breakfast tablets? |
| `progress.mp4` | `You are on day {n} of {total}. Your doctor asked you to complete the course.` | You are on day 5 of 10. Your doctor asked you to complete the course. |
| `readback.mp4` | `You took your {slot} tablets at {time}. Is that right? Say yes or press 1.` | You took your after-breakfast tablets at 9 AM. Is that right? Say yes or press 1. |
| `confirmed.mp4` | `Thank you. I have written it down.` | Thank you. I have written it down. |
| `askAgain.mp4` | `Sorry. Please tell me again. Have you taken your {slot} tablets?` | Sorry. Please tell me again. Have you taken your after-breakfast tablets? |
| `notTakenOffer.mp4` | `Will you take it now? I can call back in 30 minutes.` | Will you take it now? I can call back in 30 minutes. |
| `takeNow.mp4` | `Please take it now. I will call back in {minutes} minutes to check.` | Please take it now. I will call back in 30 minutes to check. |
| `postponeOk.mp4` | `Okay. I will call you again in {minutes} minutes.` | Okay. I will call you again in 30 minutes. |
| `postponeLimit.mp4` | `We have moved this dose three times. I am telling your care team.` | We have moved this dose three times. I am telling your care team. |
| `nurseComing.mp4` | `A nurse will call you in a few minutes.` | A nurse will call you in a few minutes. |
| `askWhyStopped.mp4` | `Can you tell me why you stopped?` | Can you tell me why you stopped? |
| `tellingTeam.mp4` | `Thank you. I am telling your care team.` | Thank you. I am telling your care team. |
| `askCallbackWhen.mp4` | `When should I call back?` | When should I call back? |
| `unclear.mp4` | `Sorry, I did not hear that clearly. Have you taken your {slot} tablets?` | Sorry, I did not hear that clearly. Have you taken your after-breakfast tablets? |
| `keypad.mp4` | `Please use the keypad. Press 1 if you have taken it. Press 2 to call later. Press 3 to talk to a nurse.` | Please use the keypad. Press 1 if you have taken it. Press 2 to call later. Press 3 to talk to a nurse. |
| `noKey.mp4` | `I did not get an answer. I am telling your care team.` | I did not get an answer. I am telling your care team. |
| `goodbye.mp4` | `Take care. I will call again at {time}.` | Take care. I will call again at 1:30 PM. |
| `goodbyeDone.mp4` | `Take care. This was the last dose of your course.` | Take care. This was the last dose of your course. |
| `optOut.mp4` | `All right. I will stop the calls. Your care team will be told.` | All right. I will stop the calls. Your care team will be told. |
