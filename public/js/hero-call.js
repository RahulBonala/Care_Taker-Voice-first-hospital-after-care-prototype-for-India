// Hero: a phone calling the patient. The call plays out, and the reports it creates appear
// for the nurse, doctor and family. Two calls alternate: a confirmed dose and an urgent one.
import { esc, icon } from './lib.js';
import { logo } from './logo.js';

const CALLS = [
  {
    who: 'Lakshmi Devi', slot: 'After breakfast, 09:00',
    lines: [
      { from: 'bot', text: 'మీ ఉదయం మాత్రలు వేసుకున్నారా?', gloss: 'Have you taken your breakfast tablets?' },
      { from: 'patient', text: 'ఆ... వేసుకున్నాను', gloss: 'Yes, I have taken it' },
      { from: 'bot', text: 'మీరు 09:02కి వేసుకున్నారు. సరేనా?', gloss: 'You took it at 09:02. Is that right?' },
      { from: 'patient', text: 'అవును', gloss: 'Yes' },
    ],
    result: ['taken', 'check', 'Dose confirmed, 09:02'],
    reports: [
      ['flag', 'Nurse board', 'Dose logged after a yes', ['taken', 'check', 'Taken']],
      ['stethoscope', 'Doctor', 'Amoxiclav course, 14% confirmed', ['taken', 'chart', 'Updated']],
      ['users', 'Family', 'Today: breakfast dose taken', ['taken', 'check', 'Shared']],
    ],
  },
  {
    who: 'Arjun', slot: 'Night, 22:00',
    lines: [
      { from: 'bot', text: 'रात की दवाई ले ली?', gloss: 'Have you taken your night tablet?' },
      { from: 'patient', text: 'haan le li, lekin chakkar aa raha hai', gloss: 'Took it, but feeling dizzy' },
      { from: 'bot', text: 'कुछ ही मिनटों में एक नर्स आपको कॉल करेंगी.', gloss: 'A nurse will call you in a few minutes.' },
    ],
    result: ['urgent', 'alert', 'Urgent: nurse calls back'],
    reports: [
      ['flag', 'Nurse board', 'Urgent, at the top of the list', ['urgent', 'alert', 'Urgent']],
      ['stethoscope', 'Doctor', 'His exact words are saved', ['later', 'quote', 'Review']],
      ['users', 'Family', 'Arjun keeps this private', ['missed', 'lock', 'Not shared']],
    ],
  },
];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let root = null;
let token = 0;

export function markup() {
  const bars = Array.from({ length: 9 }, () => '<span></span>').join('');
  return `
  <div class="ct-hcall" data-state="ringing" aria-label="A Care Taker dose call turning into reports">
    <div class="ct-hcall__phone" aria-hidden="true">
      <div class="ct-hcall__notch"></div>
      <div class="ct-hcall__screen">
        <div class="ct-hcall__status"><span>9:02</span><span class="ct-hcall__net"><span></span><span></span><span></span></span></div>
        <div class="ct-hcall__caller">
          <span class="ct-hcall__avatar">${logo()}</span>
          <strong>Care Taker</strong>
          <span class="ct-hcall__sub" id="hc-sub"></span>
        </div>
        <div class="ct-hcall__talk" id="hc-talk"></div>
        <div class="ct-hcall__foot">
          <span class="ct-hcall__bars">${bars}</span>
          <span class="ct-hcall__state" id="hc-state"></span>
        </div>
      </div>
    </div>
    <ul class="ct-hcall__reports" id="hc-reports"></ul>
    <p class="visually-hidden" id="hc-live" aria-live="polite"></p>
  </div>`;
}

function renderReports(call, shown) {
  root.querySelector('#hc-reports').innerHTML = call.reports.map(([ic, title, text, [kind, sic, label]], i) => `
    <li class="ct-hcall__report ${i < shown ? 'is-on' : ''}">
      <span class="ct-hcall__report-icon">${icon(ic)}</span>
      <span class="ct-hcall__report-body"><strong>${esc(title)}</strong><span>${esc(text)}</span></span>
      <span class="ct-status ct-status--${kind}">${icon(sic)}${esc(label)}</span>
    </li>`).join('');
}

function bubble(l) {
  return `<p class="ct-hcall__bubble ct-hcall__bubble--${l.from}"><span>${esc(l.text)}</span><span class="ct-hcall__gloss">${esc(l.gloss)}</span></p>`;
}

function setState(state, label) {
  root.dataset.state = state;
  root.querySelector('#hc-state').innerHTML = label;
}

async function play(t) {
  let i = 0;
  while (t === token) {
    const call = CALLS[i % CALLS.length];
    const talk = root.querySelector('#hc-talk');
    root.querySelector('#hc-sub').textContent = `Calling ${call.who}, ${call.slot}`;
    if (reduced()) {
      talk.innerHTML = call.lines.slice(-3).map(bubble).join('');
      setState('done', `${icon(call.result[1])}${esc(call.result[2])}`);
      renderReports(call, 3);
      return;
    }
    talk.innerHTML = '';
    renderReports(call, 0);
    setState('ringing', `${icon('phone')}Ringing`);
    await wait(1300); if (t !== token) return;
    for (const l of call.lines) {
      setState(l.from === 'bot' ? 'speaking' : 'listening', l.from === 'bot' ? `${icon('waveform')}Care Taker speaking` : `${icon('mic')}Listening`);
      talk.insertAdjacentHTML('beforeend', bubble(l));
      while (talk.children.length > 3) talk.firstElementChild.remove();
      await wait(l.from === 'bot' ? 1500 : 1300); if (t !== token) return;
    }
    setState('processing', `${icon('pending')}Writing the report`);
    await wait(900); if (t !== token) return;
    setState(call.result[0] === 'taken' ? 'done' : 'urgent', `${icon(call.result[1])}${esc(call.result[2])}`);
    root.querySelector('#hc-live').textContent = `${call.result[2]}. Reports created for the nurse board, doctor and family.`;
    for (let r = 1; r <= 3; r++) { renderReports(call, r); await wait(450); if (t !== token) return; }
    await wait(3600); if (t !== token) return;
    i += 1;
  }
}

export function mountHeroCall(container) {
  root = container.querySelector('.ct-hcall');
  if (!root) return;
  token += 1;
  play(token);
}
export function stopHeroCall() { token += 1; root = null; }
