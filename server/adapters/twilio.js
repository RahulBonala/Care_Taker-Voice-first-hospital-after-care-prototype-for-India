'use strict';
// Optional real phone call through Twilio. Runs only with TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
// and a PUBLIC_URL that Twilio can reach for the speech webhooks. The call uses the same flow engine.
const { has, KeyNotSet } = require('./keys');

function esc(s) { return String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c])); }

async function placeCall(to, callId) {
  if (!has('TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM')) throw new KeyNotSet('TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM');
  if (!has('PUBLIC_URL')) throw new KeyNotSet('PUBLIC_URL');
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const body = new URLSearchParams({ To: to.replace(/\s+/g, ''), From: process.env.TWILIO_FROM,
    Url: `${process.env.PUBLIC_URL.replace(/\/$/, '')}/api/twilio/voice?callId=${encodeURIComponent(callId)}` });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`, {
    method: 'POST',
    headers: { authorization: 'Basic ' + Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64'), 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Twilio call failed with ${res.status}`);
  return res.json();
}

// TwiML for one turn of the flow.
function twiml(call, langInfo) {
  const voice = esc(langInfo.twilioVoice || 'alice');
  const said = (call.turn ? call.turn.say : []).map((l) => `<Say voice="${voice}" language="${esc(langInfo.speechCode)}">${esc(l.text)}</Say>`).join('');
  if (!call.turn || call.turn.expect === 'none') return `<?xml version="1.0" encoding="UTF-8"?><Response>${said}<Hangup/></Response>`;
  const base = process.env.PUBLIC_URL.replace(/\/$/, '');
  const input = call.turn.expect === 'key' ? 'dtmf' : 'speech dtmf';
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Gather input="${input}" numDigits="1" timeout="${call.turn.expect === 'key' ? 10 : 8}" language="${esc(langInfo.speechCode)}" action="${esc(base)}/api/twilio/gather?callId=${esc(call.id)}">${said}</Gather><Redirect>${esc(base)}/api/twilio/gather?callId=${esc(call.id)}&amp;silence=1</Redirect></Response>`;
}

module.exports = { placeCall, twiml };
