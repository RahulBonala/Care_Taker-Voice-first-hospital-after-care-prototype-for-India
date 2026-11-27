'use strict';
// Optional services only run when their keys are set. Nothing here is needed for the core flow.
function has(...names) { return names.every((n) => !!(process.env[n] && process.env[n].trim())); }
function status() {
  return {
    sarvam: has('SARVAM_API_KEY'),
    twilio: has('TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM'),
    twilioPublicUrl: has('PUBLIC_URL'),
    llm: has('LLM_API_KEY'),
  };
}
class KeyNotSet extends Error { constructor(what) { super(`key not set: ${what}`); this.status = 503; } }
module.exports = { has, status, KeyNotSet };
