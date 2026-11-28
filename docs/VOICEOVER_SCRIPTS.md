# Care Taker Voiceover Scripts and Audio Integration Guide

This document contains every voiceover sentence spoken by Care Taker on the mobile app (`#mobile`) and the real-time patient phone (`#phone`), along with the exact filenames where your `.mp4` (or `.mp3`, `.m4a`, `.wav`) voiceover files go.

## How Audio Playback Works Now

1. **Recorded Voiceover Files First**: Whenever a matching `<lineId>.mp4` (or `.m4a`, `.mp3`, `.wav`, `.ogg`) file exists in `public/audio/<lang>/`, Care Taker plays your realistic recorded audio file first.
2. **Sarvam AI Second**: If no file exists for that line and `SARVAM_API_KEY` is configured, it uses Sarvam TTS.
3. **Browser Voice Fallback Third**: If neither is present, it picks the highest-quality natural browser voice for the line's exact language (`line.lang`), filtering out novelty/robotic voices and formatting times and medical terms so they never sound jumbled.
4. **Full Language Sync**: Selecting **English** (or any language) in the Mobile App (`#mobile`) or Patient Phone (`#phone`) immediately updates the patient profile, active call, call transcript, and family quotes so Telugu and English never mix.

---

## 1. Essential 8-Sentence Demo Pack (English: `public/audio/en/`)

If you want to record fewer voiceovers that cover 100% of the live presentation and mobile app demo, record these **8 short files** and place them in `public/audio/en/`:

1. **`public/audio/en/greeting.mp4`**
   > "Hello Lakshmi. This is Care Taker, calling from your hospital."

2. **`public/audio/en/askTaken.mp4`**
   > "Have you eaten? Have you taken your after-breakfast tablets?"

3. **`public/audio/en/readback.mp4`**
   > "You took your after-breakfast tablets at 9 AM. Is that right? Say yes or press 1."

4. **`public/audio/en/confirmed.mp4`**
   > "Thank you. I have written it down."

5. **`public/audio/en/goodbye.mp4`**
   > "Take care. I will call again at 1:30 PM."

6. **`public/audio/en/postponeOk.mp4`**
   > "Okay. I will call you again in 30 minutes."

7. **`public/audio/en/nurseComing.mp4`**
   > "A nurse will call you in a few minutes."

8. **`public/audio/en/optOut.mp4`**
   > "All right. I will stop the calls. Your care team will be told."

---

## 2. Remaining 12 Edge-Case Lines (English: `public/audio/en/`)

Record these only if you want pre-recorded audio for every branch (halfway reminder, stopped early, unclear/keypad fallback):

9. **`public/audio/en/progress.mp4`**
   > "You are on day 5 of 10. Your doctor asked you to complete the course."

10. **`public/audio/en/askAgain.mp4`**
    > "Sorry. Please tell me again. Have you taken your after-breakfast tablets?"

11. **`public/audio/en/notTakenOffer.mp4`**
    > "Will you take it now? I can call back in 30 minutes."

12. **`public/audio/en/takeNow.mp4`**
    > "Please take it now. I will call back in 30 minutes to check."

13. **`public/audio/en/postponeLimit.mp4`**
    > "We have moved this dose three times. I am telling your care team."

14. **`public/audio/en/askWhyStopped.mp4`**
    > "Can you tell me why you stopped?"

15. **`public/audio/en/tellingTeam.mp4`**
    > "Thank you. I am telling your care team."

16. **`public/audio/en/askCallbackWhen.mp4`**
    > "When should I call back?"

17. **`public/audio/en/unclear.mp4`**
    > "Sorry, I did not hear that clearly. Have you taken your after-breakfast tablets?"

18. **`public/audio/en/keypad.mp4`**
    > "Please use the keypad. Press 1 if you have taken it. Press 2 to call later. Press 3 to talk to a nurse."

19. **`public/audio/en/noKey.mp4`**
    > "I did not get an answer. I am telling your care team."

20. **`public/audio/en/goodbyeDone.mp4`**
    > "Take care. This was the last dose of your course."

---

## 3. Essential Demo Clips for Telugu, Hindi, and Tamil (Optional)

If you also demo a call in Telugu (`public/audio/te/`), Hindi (`public/audio/hi/`), or Tamil (`public/audio/ta/`), here are the core lines:

### Telugu (`public/audio/te/`)
- **`greeting.mp4`**: నమస్కారం లక్ష్మి గారు. నేను మీ ఆసుపత్రి నుండి కేర్ టేకర్ మాట్లాడుతున్నాను.
  *(Namaskaram Lakshmi garu. Nenu mee asupatri nundi Care Taker matladutunnanu.)*
- **`askTaken.mp4`**: మీరు భోజనం చేశారా? మీ ఉదయం టిఫిన్ తర్వాతి మాత్రలు వేసుకున్నారా?
  *(Meeru bhojanam chesara? Mee udayam tiffin tarvati matralu vesukunnara?)*
- **`readback.mp4`**: మీరు 09:00కి మీ ఉదయం టిఫిన్ తర్వాతి మాత్రలు వేసుకున్నారు. సరేనా? అవును అని చెప్పండి లేదా 1 నొక్కండి.
  *(Meeru 9 gantala ki mee udayam tiffin tarvati matralu vesukunnaru. Sarena? Avunu ani cheppandi leda 1 nokkandi.)*
- **`confirmed.mp4`**: ధన్యవాదాలు. నేను రాసుకున్నాను.
  *(Dhanyavadalu. Nenu rasukunnanu.)*
- **`goodbye.mp4`**: జాగ్రత్తగా ఉండండి. నేను 13:30కి మళ్ళీ కాల్ చేస్తాను.
  *(Jagrattaga undandi. Nenu 1:30 ki malli call chestanu.)*

### Hindi (`public/audio/hi/`)
- **`greeting.mp4`**: नमस्ते अर्जुन जी. मैं आपके अस्पताल से केयर टेकर बोल रहा हूँ.
  *(Namaste Arjun ji. Main aapke aspatal se Care Taker bol raha hoon.)*
- **`askTaken.mp4`**: क्या आपने खाना खा लिया? क्या आपने रात को सोने से पहले की दवाई ले ली?
  *(Kya aapne khana kha liya? Kya aapne raat ko sone se pehle ki dawai le li?)*
- **`nurseComing.mp4`**: कुछ ही मिनटों में एक नर्स आपको कॉल करेंगी.
  *(Kuch hi minto mein ek nurse aapko call karengi.)*
- **`postponeOk.mp4`**: ठीक है. मैं 30 मिनट बाद फिर से कॉल करूँगा.
  *(Theek hai. Main 30 minute baad phir se call karunga.)*
- **`goodbye.mp4`**: अपना ख्याल रखें. मैं 22:30 बजे फिर से कॉल करूँगा.
  *(Apna khayal rakhein. Main 10:30 baje phir se call karunga.)*

### Tamil (`public/audio/ta/`)
- **`greeting.mp4`**: வணக்கம் மீனா அவர்களே. உங்கள் மருத்துவமனையிலிருந்து கேர் டேக்கர் பேசுகிறேன்.
  *(Vanakkam Meena avargale. Ungal maruthuvamanaiyilirundhu Care Taker pesugiren.)*
- **`progress.mp4`**: இன்று உங்கள் மருந்து காலத்தில் 10 நாட்களில் 5வது நாள். மருந்தை முழுமையாக முடிக்குமாறு மருத்துவர் கூறியுள்ளார்.
  *(Indru ungal marundhu kaalathil 10 naatkalil 5-avadhu naal. Marundhai muzhumaiyaaga mudikkumaaru maruthuvar kooriyullaar.)*
- **`askTaken.mp4`**: சாப்பிட்டீர்களா? காலை உணவுக்குப் பிறகு மாத்திரை போட்டுக்கொண்டீர்களா?
  *(Saappitteergala? Kaalai unavukkup piragu maathirai pottukkondeergala?)*
- **`askWhyStopped.mp4`**: ஏன் நிறுத்தினீர்கள் என்று சொல்ல முடியுமா?
  *(Yen nirutthineergal endru solla mudiyuma?)*
- **`tellingTeam.mp4`**: நன்றி. உங்கள் மருத்துவக் குழுவிடம் தெரிவிக்கிறேன்.
  *(Nandri. Ungal maruthuvak kuzhuvidam therivikkiren.)*
- **`keypad.mp4`**: தயவுசெய்து கீபேடைப் பயன்படுத்தவும். மாத்திரை போட்டிருந்தால் 1ஐ அழுத்தவும். பிறகு அழைக்க 2ஐ அழுத்தவும். செவிலியரிடம் பேச 3ஐ அழுத்தவும்.
  *(Thayavuseydhu keypad-ai payanpaduthavum. Maathirai pottirundhaal 1-ai azhuthavum. Piragu azhaikka 2-ai azhuthavum. Seviliyaridam pesa 3-ai azhuthavum.)*
- **`optOut.mp4`**: சரி. இனி அழைப்புகளை நிறுத்துகிறேன். உங்கள் மருத்துவக் குழுவிடம் தெரிவிக்கப்படும்.
  *(Sari. Ini azhaippugalai niruthugiren. Ungal maruthuvak kuzhuvidam therivikkappadum.)*
