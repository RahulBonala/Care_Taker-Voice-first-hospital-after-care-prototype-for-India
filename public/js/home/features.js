// Features: "One screen for every role." as a grid of six role tiles with Open links
// (no repeat of the How it works screens).
import { esc, icon } from '../lib.js';

const ROLES = [
  { key: 'desk', icon: 'user', title: 'Hospital desk', lead: 'Register a patient in under a minute.', points: ['Dictate the prescription, the form fills itself', 'Two consent boxes before anything starts', 'Choose the language, or let the patient speak'] },
  { key: 'nurse', icon: 'flag', title: 'Nurse board', lead: 'Verify, then call back whoever needs a person.', points: ['Flags sorted: urgent first', 'Exact words in every flag', 'Doses logged without a yes: always 0'] },
  { key: 'phone', icon: 'phone', title: 'Patient phone', lead: 'The call itself, by voice or keypad.', points: ['Live transcript and what was heard', 'Keys 1, 2, 3 and 9 always work', 'Same call on a real phone with Twilio keys'] },
  { key: 'family', icon: 'users', title: 'Family', lead: 'A week of doses, in the patient\'s words.', points: ['Only when the patient shares it', 'Seven-day strip and today\'s doses', 'Activity from watches and monitors'] },
  { key: 'doctor', icon: 'stethoscope', title: 'Doctor', lead: 'Course completion and what patients said.', points: ['Completion and adherence per course', 'Vitals and alert ranges', 'Every flag with the patient\'s words'] },
  { key: 'devices', icon: 'watch', title: 'Health devices', lead: 'Monitors, watches and rings, next to the doses.', points: ['Blood pressure and sugar over Bluetooth', 'Steps, calories and sleep from watches and rings', 'Outside the doctor\'s range goes to a nurse'] },
];

export const featuresMarkup = () => `
  <section class="ct-band ct-band--surface" id="features" aria-labelledby="features-title">
    <div class="ct-page">
      <div class="ct-center-head" data-reveal="up">
        <span class="ct-eyebrow"><span class="ct-eyebrow__dot" aria-hidden="true"></span>Features</span>
        <h2 id="features-title" class="ct-section-title-lg">One screen for every role.</h2>
        <p class="ct-section-lead">Six purpose-built workspaces sharing one verified patient record, from the discharge desk to the family phone.</p>
      </div>
      <ul class="ct-roles-grid" data-reveal-group>
        ${ROLES.map((r) => `
          <li class="ct-role-tile">
            <div class="ct-role-tile__head">
              <span class="ct-role-tile__icon" aria-hidden="true">${icon(r.icon)}</span>
              <h3>${esc(r.title)}</h3>
            </div>
            <p class="ct-role-tile__lead">${esc(r.lead)}</p>
            <ul class="ct-role-tile__points">
              ${r.points.map((p) => `<li>${icon('tick')}<span>${esc(p)}</span></li>`).join('')}
            </ul>
            <a class="ct-role-tile__open" href="#${esc(r.key)}"><span>Open ${esc(r.title)}</span>${icon('arrow-right')}</a>
          </li>`).join('')}
      </ul>
    </div>
  </section>`;
