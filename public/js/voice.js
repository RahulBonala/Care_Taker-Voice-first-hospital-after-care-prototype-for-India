// Voice in and out for the patient phone and mobile app.
// Out: recorded voiceover files in /audio/{lang}/{lineId}.(mp4|m4a|mp3|wav) first,
//      else Sarvam (if its key is set), else browser speechSynthesis in the line's language,
//      else the line is shown as text only.
// In:  webkitSpeechRecognition in the patient's language. Never listens while speaking.
import { post } from './lib.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const readingTime = (text) => Math.min(7000, 1100 + String(text || '').length * 48);

const LANG_SPEECH = {
  en: 'en-IN', hi: 'hi-IN', te: 'te-IN', ta: 'ta-IN', kn: 'kn-IN',
  ml: 'ml-IN', mr: 'mr-IN', bn: 'bn-IN', gu: 'gu-IN', pa: 'pa-IN', or: 'or-IN',
};

const NOVELTY_VOICE = /\b(albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|kathy|ralph|rocko|reed|shelley|sandy|flo|eddy|grandma|grandpa)\b/i;
const PREFERRED_VOICE = /\b(natural|premium|enhanced|google|siri|samantha|rishi|veena|moira|daniel|karen|lekha|geeta)\b/i;

let voicesLoaded = null;
function voicesReady() {
  if (!('speechSynthesis' in window)) return Promise.resolve([]);
  if (voicesLoaded) return voicesLoaded;
  voicesLoaded = new Promise((resolve) => {
    const have = speechSynthesis.getVoices();
    if (have.length) return resolve(have);
    const done = () => resolve(speechSynthesis.getVoices());
    speechSynthesis.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, 1500);
  });
  return voicesLoaded;
}

function rankVoice(v, targetCode) {
  const norm = (s) => String(s || '').replace('_', '-').toLowerCase();
  const vLang = norm(v.lang);
  let score = 0;
  if (vLang === targetCode) score += 20;
  else if (vLang.startsWith(targetCode.slice(0, 2) + '-')) score += 10;
  else return -100;
  if (NOVELTY_VOICE.test(v.name)) score -= 50;
  if (PREFERRED_VOICE.test(v.name)) score += 15;
  if (/aman/i.test(v.name)) score -= 5;
  if (v.localService) score += 2;
  return score;
}

export async function findVoice(speechCode) {
  const voices = await voicesReady();
  const code = String(speechCode || 'en-IN').replace('_', '-').toLowerCase();
  const candidates = voices
    .map((v) => ({ v, s: rankVoice(v, code) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  return candidates[0] ? candidates[0].v : null;
}

export function resolveClip(lineId, clips = []) {
  if (!lineId || !Array.isArray(clips) || !clips.length) return null;
  for (const ext of ['.mp4', '.m4a', '.mp3', '.wav', '.ogg']) {
    if (clips.includes(`${lineId}${ext}`)) return `${lineId}${ext}`;
  }
  if (clips.includes(lineId)) return `${lineId}.mp3`;
  return null;
}

// Describes how lines will be voiced, for the screen.
export async function outputMode(speechCode, sarvamKey, clips = []) {
  const hasRecorded = Array.isArray(clips) && clips.length > 0;
  if (hasRecorded) return { mode: 'file', label: 'Recorded voiceover audio (MP4/MP3)' };
  if (sarvamKey) return { mode: 'sarvam', label: 'Sarvam voice' };
  const v = await findVoice(speechCode);
  if (v) return { mode: 'browser', label: `Browser voice: ${v.name}` };
  return { mode: 'file', label: `No browser voice for ${speechCode}. Audio files, then text.` };
}

// Prepares text so browser TTS pronounces hospital terms, meal slots, and times naturally.
function cleanForSpeech(text, langCode) {
  let s = String(text || '');
  if (langCode === 'en' || String(langCode || '').startsWith('en')) {
    s = s
      .replace(/\bCare Taker\b/gi, 'Caretaker')
      .replace(/\bafter-breakfast\b/gi, 'after breakfast')
      .replace(/\bafter-lunch\b/gi, 'after lunch')
      .replace(/\bafter-dinner\b/gi, 'after dinner')
      .replace(/\b(\d{2}):(\d{2})\b/g, (_, hh, mm) => {
        const h24 = Number(hh);
        const m = Number(mm);
        const period = h24 >= 12 ? 'PM' : 'AM';
        const h12 = h24 % 12 || 12;
        return m === 0 ? `${h12} ${period}` : `${h12} ${m < 10 ? 'oh ' + m : m} ${period}`;
      });
  }
  return s;
}

let currentAudio = null;

async function speakSynth(text, voice, langCode) {
  if (!('speechSynthesis' in window)) return 'text';
  if (speechSynthesis.speaking || speechSynthesis.pending) {
    speechSynthesis.cancel();
    await wait(50);
  }
  return new Promise((resolve) => {
    const spokenText = cleanForSpeech(text, langCode || voice.lang);
    const u = new SpeechSynthesisUtterance(spokenText);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = 0.94;
    u.pitch = 1.0;
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        clearTimeout(guard);
        resolve('browser');
      }
    };
    // Chrome sometimes never fires onend, so a guard ends the line after its reading time.
    const guard = setTimeout(() => { speechSynthesis.cancel(); finish(); }, readingTime(text) + 1500);
    u.onend = () => setTimeout(finish, 120);
    u.onerror = finish;
    speechSynthesis.speak(u);
  });
}

function play(src) {
  return new Promise((resolve, reject) => {
    if (currentAudio) {
      try { currentAudio.pause(); } catch { /* ignore */ }
      currentAudio = null;
    }
    const a = new Audio(src);
    currentAudio = a;
    const clean = () => { if (currentAudio === a) currentAudio = null; };
    a.onended = () => { clean(); setTimeout(resolve, 120); };
    a.onerror = () => { clean(); reject(new Error('no audio')); };
    a.play().catch((err) => { clean(); reject(err); });
  });
}

let speaking = false;
export const isSpeaking = () => speaking;

// Speaks one line. Returns how it was voiced: file, sarvam, browser or text.
export async function speakLine(line, speechCode, { sarvamKey = false, clips = [] } = {}) {
  speaking = true;
  try {
    const lineLang = (line && line.lang) || 'en';
    const targetSpeechCode = LANG_SPEECH[lineLang] || speechCode || 'en-IN';
    const clipFile = resolveClip(line && line.lineId, clips);
    if (clipFile) {
      try {
        await play(`/audio/${lineLang}/${clipFile}`);
        return 'file';
      } catch { /* fall through if file cannot play */ }
    }
    if (sarvamKey) {
      try {
        const r = await post('/api/tts', { text: line.text, lang: lineLang });
        if (r && r.audio) { await play(`data:${r.mime || 'audio/wav'};base64,${r.audio}`); return 'sarvam'; }
      } catch { /* fall through to browser voice */ }
    }
    const voice = await findVoice(targetSpeechCode);
    if (voice) return await speakSynth(line.text, voice, lineLang);
    // Final fallback if lineId.mp4 or lineId.mp3 was dropped in after config loaded
    for (const ext of ['.mp4', '.mp3']) {
      if (clips.includes(line.lineId)) {
        try { await play(`/audio/${lineLang}/${line.lineId}${ext}`); return 'file'; } catch { /* ignore */ }
      }
    }
    await wait(readingTime(line.text));
    return 'text';
  } finally {
    speaking = false;
  }
}

export function stopSpeaking() {
  if (currentAudio) {
    try { currentAudio.pause(); } catch { /* ignore */ }
    currentAudio = null;
  }
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

// ---- listening -------------------------------------------------------------

export const canRecognize = () => !!(window.SpeechRecognition || window.webkitSpeechRecognition);
let current = null;

// Resolves with { text, confidence } or { silence: true } or { error } or { aborted: true }.
export function listen({ speechCode, onInterim = () => {}, silenceMs = 8000 }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return Promise.resolve({ error: 'unsupported' });
  stopListening();
  return new Promise((resolve) => {
    const started = Date.now();
    let done = false;
    let rec = null;
    const finish = (r) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      current = null;
      try { rec && rec.abort(); } catch { /* already stopped */ }
      resolve(r);
    };
    const timer = setTimeout(() => finish({ silence: true }), silenceMs);
    const start = () => {
      rec = new SR();
      rec.lang = speechCode;
      rec.interimResults = true;
      rec.continuous = false;
      rec.maxAlternatives = 1;
      rec.onresult = (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          if (res.isFinal) {
            // Chrome reports 0 when it computed no score; that is sent as "unknown", not as low.
            const c = res[0].confidence;
            return finish({ text: res[0].transcript, confidence: c > 0 ? c : null });
          }
          interim += res[0].transcript;
        }
        onInterim(interim);
      };
      rec.onerror = (e) => {
        if (e.error === 'no-speech') return; // keep waiting until the 8 second limit
        if (e.error === 'aborted') return finish({ aborted: true });
        finish({ error: e.error });
      };
      rec.onend = () => {
        // The engine can stop early on its own. Restart until the silence limit.
        if (!done && Date.now() - started < silenceMs - 500) { try { start(); } catch { finish({ silence: true }); } }
      };
      rec.start();
    };
    current = { abort: () => finish({ aborted: true }) };
    try { start(); } catch (err) { finish({ error: err.message }); }
  });
}

export function stopListening() { if (current) current.abort(); }

// Sarvam speech to text: records a few seconds and sends it to the server adapter.
export async function recordAndTranscribe(lang, ms = 6000) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const chunks = [];
  const rec = new MediaRecorder(stream);
  rec.ondataavailable = (e) => chunks.push(e.data);
  const stopped = new Promise((r) => { rec.onstop = r; });
  rec.start();
  await wait(ms);
  rec.stop();
  await stopped;
  stream.getTracks().forEach((t) => t.stop());
  const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
  const res = await fetch(`/api/stt?lang=${encodeURIComponent(lang)}`, { method: 'POST', headers: { 'content-type': blob.type }, body: blob });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Speech to text failed');
  return data;
}

// Mic level meter, 0 to 5, while listening.
let meter = null;
export async function startMeter(onLevel) {
  stopMeter();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    const id = setInterval(() => {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
      onLevel(Math.min(5, Math.round(peak / 12)));
    }, 120);
    meter = { stop: () => { clearInterval(id); stream.getTracks().forEach((t) => t.stop()); ctx.close(); onLevel(0); } };
  } catch {
    onLevel(0);
  }
}
export function stopMeter() { if (meter) { meter.stop(); meter = null; } }

// A soft two-tone ring made with WebAudio, so no audio file is needed.
let ringer = null;
export function startRing() {
  stopRing();
  try {
    const ctx = new AudioContext();
    const beep = () => {
      for (const [f, t] of [[440, 0], [480, 0]]) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 1.2);
        o.connect(g).connect(ctx.destination);
        o.start(ctx.currentTime + t);
        o.stop(ctx.currentTime + t + 1.3);
      }
    };
    beep();
    const id = setInterval(beep, 3000);
    ringer = { stop: () => { clearInterval(id); ctx.close(); } };
  } catch { ringer = null; }
}
export function stopRing() { if (ringer) { ringer.stop(); ringer = null; } }

// Soft two-note confirmation tone under 300ms, quieter than the ringer.
export function playConfirmTone() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    for (const [f, start, dur] of [[523.25, 0, 0.11], [659.25, 0.11, 0.14]]) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      g.gain.exponentialRampToValueAtTime(0.022, ctx.currentTime + start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + start);
      o.stop(ctx.currentTime + start + dur + 0.01);
    }
    setTimeout(() => { try { ctx.close(); } catch { /* ignore */ } }, 290);
  } catch { /* audio unavailable */ }
}

// Finds the patient's language from their voice.
// With a Sarvam key, the audio itself is sent for language detection. Without one, the browser
// listens for the name of a language ("Tamil", "Kannada") or for words it can place.
export async function detectLanguageByVoice({ sarvamKey = false, onListening = () => {} } = {}) {
  let text = '';
  if (sarvamKey) {
    onListening('Listening. Say anything in your language.');
    const r = await recordAndTranscribe('auto', 5000);
    if (r.lang) return { lang: r.lang, text: r.text, by: 'voice' };
    text = r.text;
  } else {
    if (!canRecognize()) return { error: 'Speech recognition needs Chrome. Choose from the list instead.' };
    onListening('Listening. Say the name of your language, for example "Tamil".');
    const r = await listen({ speechCode: 'en-IN', silenceMs: 7000 });
    if (r.error) return { error: r.error === 'not-allowed' ? 'Microphone is blocked. Choose from the list instead.' : `Microphone stopped (${r.error}). Choose from the list instead.` };
    text = r.text || '';
  }
  if (!text) return { error: 'Nothing heard. Try again or choose from the list.' };
  const d = await post('/api/detect-language', { text });
  return d.lang ? { lang: d.lang, text, by: d.by } : { error: `Heard "${text}" but could not place the language. Choose from the list.` };
}
