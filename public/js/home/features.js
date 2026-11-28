// Features: one role screen per scroll step, each in the device that role uses
// (same frames, rows and care cards as How it works).
import { esc, icon, status } from '../lib.js';
import { careCard } from '../care-card.js';
import { story, frame, bar, statusBar } from './story-markup.js';

const ROLES = [
  { key: 'desk', icon: 'user', title: 'Hospital desk', lead: 'Register a patient in under a minute.', points: ['Dictate the prescription, the form fills itself', 'Two consent boxes before anything starts', 'Choose the language, or let the patient speak'] },
  { key: 'nurse', icon: 'flag', title: 'Nurse board', lead: 'Verify, then call back whoever needs a person.', points: ['Flags sorted: urgent first', 'Exact words in every flag', 'Doses logged without a yes: always 0'] },
  { key: 'phone', icon: 'phone', title: 'Patient phone', lead: 'The call itself, by voice or keypad.', points: ['Live transcript and what was heard', 'Keys 1, 2, 3 and 9 always work', 'Same call on a real phone with Twilio keys'] },
  { key: 'family', icon: 'users', title: 'Family', lead: 'A week of doses, in the patient\'s words.', points: ['Only when the patient shares it', 'Seven-day strip and today\'s doses', 'Activity from watches and monitors'] },
  { key: 'doctor', icon: 'stethoscope', title: 'Doctor', lead: 'Course completion and what patients said.', points: ['Completion and adherence per course', 'Vitals and alert ranges', 'Every flag with the patient\'s words'] },
  { key: 'devices', icon: 'watch', title: 'Health devices', lead: 'Monitors, watches and rings, next to the doses.', points: ['Blood pressure and sugar over Bluetooth', 'Steps, calories and sleep from watches and rings', 'Outside the doctor\'s range goes to a nurse'] },
];

const tile = (v, l) => `<div class="ct-ui__tile"><strong>${esc(v)}</strong><span>${esc(l)}</span></div>`;
const row = (left, right = '', d = 1, cls = '') => `<div class="ct-ui__row ct-seq${cls}" data-d="${d}"><span>${left}</span>${right}</div>`;

const SCREENS = {
  desk: () => frame('laptop', `
    ${bar('user', 'Hospital desk', 'New patient', status('later', 'Awaiting nurse'))}
    <div class="ct-scr__body ct-scr__cols">
      <div class="ct-scr__col">
        ${row('<span class="muted">Patient</span>', '<strong>Lakshmi Devi, 67</strong>', 1)}
        ${row('<span class="muted">Language</span>', '<strong><span lang="te">తెలుగు</span> Telugu</strong>', 1)}
        <p class="ct-ui__bubble ct-ui__bubble--patient ct-seq" data-d="2">${icon('mic')} Paracetamol 650, after breakfast and dinner, 5 days</p>
        <div class="ct-ui__chips ct-seq" data-d="3"><span class="ct-ui__chip is-ok">Paracetamol</span><span class="ct-ui__chip is-ok">650 mg</span><span class="ct-ui__chip is-ok">Breakfast, dinner</span><span class="ct-ui__chip is-ok">5 days</span></div>
      </div>
      <div class="ct-scr__col">
        ${row(`${icon('shield')}Consent recorded`, status('taken', '2 of 2'), 4)}
        <div class="ct-seq" data-d="5">${careCard({ role: 'nurse', state: 'reviewing', text: 'Sent to Nurse Priya to verify', time: '10:14' })}</div>
      </div>
    </div>`, { icon: 'user', caption: 'Hospital desk, on a laptop' }),

  nurse: () => frame('laptop', `
    ${bar('flag', 'Nurse board', 'Flags, urgent first', `<span class="ct-scr__clock"><strong class="ct-scr__zero">0</strong> logged without a yes</span>`)}
    <div class="ct-scr__body">
      <div class="ct-ui__flag ct-seq" data-d="1">${status('urgent', 'Urgent')}<strong>Arjun</strong><span class="ct-quote" lang="hi">haan le li, lekin chakkar aa raha hai</span></div>
      <div class="ct-ui__flag ct-seq" data-d="2">${status('later', 'Reading to review')}<strong>Lakshmi Devi</strong><span>Blood pressure 162/98</span></div>
      <div class="ct-ui__flag ct-seq" data-d="3">${status('missed', 'Missed')}<strong>Meena</strong><span>Rang 3 times, no answer</span></div>
    </div>`, { icon: 'flag', caption: 'Nurse board, on a laptop' }),

  phone: () => frame('keypad', `
    <div class="ct-scr__lcd">
      <p class="ct-ui__bubble ct-ui__bubble--bot ct-seq" data-d="1">Have you taken your night tablet?</p>
      <p class="ct-ui__bubble ct-ui__bubble--patient ct-seq" data-d="2"><span lang="hi">le li</span><span>Heard: le li, Taken</span></p>
    </div>
    <div class="ct-scr__pad ct-seq" data-d="3"><span><b>1</b>Taken</span><span><b>2</b>Later</span><span><b>3</b>Nurse</span><span class="ct-scr__pad-wide"><b>9</b>Stop calls</span></div>`,
  { icon: 'keypad', caption: 'Patient, on a keypad phone' }),

  family: () => frame('phone', `
    ${statusBar('13:40')}
    ${bar('users', "Lakshmi's week", 'Paracetamol 650', status('taken', 'Shared'))}
    <div class="ct-scr__body">
      <div class="ct-ui__week ct-scr__week ct-seq" data-d="1">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => `<span class="${i < 3 ? 'is-ok' : i === 3 ? 'is-some' : ''}"><b>${d}</b>${i < 3 ? '2/2' : i === 3 ? '1/2' : ''}</span>`).join('')}</div>
      <p class="ct-ui__bubble ct-ui__bubble--patient ct-seq" data-d="2"><span lang="te">వేసుకున్నాను</span><span>Taken, Thursday 13:32</span></p>
      ${row(`${icon('watch')}2,940 steps today`, '<span class="muted small">Goal 2,500</span>', 3)}
      <div class="ct-seq" data-d="4">${careCard({ role: 'family', state: 'shared', text: 'Lakshmi shares her week with you', time: '13:32' })}</div>
    </div>`, { icon: 'users', caption: 'Family, on a phone' }),

  doctor: () => frame('tablet', `
    ${bar('stethoscope', 'Doctor', 'Course completion')}
    <div class="ct-scr__body">
      ${[['Lakshmi Devi', 12, 'Amoxiclav'], ['Arjun', 22, 'Isotretinoin'], ['Meena', 40, 'Cefuroxime']].map(([n, p, m], i) => `<div class="ct-ui__bar ct-seq" data-d="${i + 1}"><span><strong>${n}</strong> ${m}</span><progress max="100" value="${p}">${p}%</progress><span class="tabular">${p}%</span></div>`).join('')}
      ${row(`${icon('gauge')}Last blood pressure, Lakshmi Devi`, '<strong class="tabular">129/86</strong>', 4)}
      <div class="ct-seq" data-d="5">${careCard({ role: 'doctor', state: 'urgent', text: 'Arjun: "chakkar aa raha hai"', time: '22:01' })}</div>
    </div>`, { icon: 'stethoscope', caption: 'Doctor, on a tablet' }),

  devices: () => frame('phone', `
    ${statusBar('18:05')}
    ${bar('watch', 'Today from devices', 'Lakshmi Devi')}
    <div class="ct-scr__body">
      <div class="ct-ui__tiles ct-seq" data-d="1">${tile('7,778', 'Steps')}${tile('310', 'Active kcal')}${tile('129/86', 'Blood pressure')}${tile('121', 'Sugar mg/dL')}</div>
      ${row(`${icon('check')}Goal of 7,000 steps reached`, '', 2)}
      <div class="ct-seq" data-d="3">${careCard({ role: 'nurse', state: 'reviewing', text: '162/98 yesterday, outside the range', time: '07:40' })}</div>
    </div>`, { icon: 'watch', caption: 'Health devices, on a phone' }),
};

export const featuresMarkup = () => story({
  id: 'features', title: 'One screen for every role.', eyebrow: 'Features', items: ROLES,
  card: (key) => SCREENS[key](), size: 'ct-story--6', links: true,
});
