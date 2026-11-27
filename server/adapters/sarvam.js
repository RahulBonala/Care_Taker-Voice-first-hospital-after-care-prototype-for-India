'use strict';
// Sarvam AI text to speech and speech to text for Indian languages. Runs only with SARVAM_API_KEY.
const { has, KeyNotSet } = require('./keys');
const BASE = 'https://api.sarvam.ai';

async function tts(text, speechCode) {
  if (!has('SARVAM_API_KEY')) throw new KeyNotSet('SARVAM_API_KEY');
  const res = await fetch(`${BASE}/text-to-speech`, {
    method: 'POST',
    headers: { 'api-subscription-key': process.env.SARVAM_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ inputs: [text], target_language_code: speechCode, model: process.env.SARVAM_TTS_MODEL || 'bulbul:v2', speaker: process.env.SARVAM_SPEAKER || 'anushka' }),
  });
  if (!res.ok) throw new Error(`Sarvam TTS failed with ${res.status}`);
  const json = await res.json();
  return { audio: json.audios && json.audios[0], mime: 'audio/wav' };
}

async function stt(buffer, mime, speechCode) {
  if (!has('SARVAM_API_KEY')) throw new KeyNotSet('SARVAM_API_KEY');
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mime || 'audio/webm' }), 'reply.webm');
  form.append('language_code', speechCode);
  form.append('model', process.env.SARVAM_STT_MODEL || 'saarika:v2');
  const res = await fetch(`${BASE}/speech-to-text`, { method: 'POST', headers: { 'api-subscription-key': process.env.SARVAM_API_KEY }, body: form });
  if (!res.ok) throw new Error(`Sarvam STT failed with ${res.status}`);
  const json = await res.json();
  return { text: json.transcript || '', confidence: null };
}

module.exports = { tts, stt };
