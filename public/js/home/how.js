// How it works: the pinned four-step story. Each step is one full screen for one role, in the
// device that role uses: the patient's phone, the nurse board on a laptop, the doctor's tablet
// and the family's phone. While the section is on screen, a step line slides into the navbar.
import { esc, icon, status } from '../lib.js';
import { logo } from '../logo.js';
import { careCard } from '../care-card.js';
import { scrollToY } from '../motion.js';
import { storyStepY, isStacked } from '../story.js';
import { story, frame, bar, statusBar, swap } from './story-markup.js';

const HOW = [
  {
    key: 'call', icon: 'phone', title: 'Call', lead: 'Care Taker calls at every dose time.',
    text: 'The patient just answers, on a keypad phone or a smartphone, and replies in the language they speak at home.',
    points: ['Rings up to 3 times, 10 minutes apart', 'Listens only after it finishes speaking', 'Hears which language the patient answers in'],
  },
  {
    key: 'confirm', icon: 'check', title: 'Confirm', lead: 'Nothing is logged until the patient says yes.',
    text: 'Care Taker reads the dose and the time back. A spoken yes or a pressed 1 logs it. Anything else asks again.',
    points: ['Read back before every log', 'Never guesses taken', 'Keypad fallback after two unclear replies'],
  },
  {
    key: 'flag', icon: 'flag', title: 'Understand and flag', lead: 'Fixed rules decide what a reply means.',
    text: 'Rules run in a fixed order and the first match wins, so feeling unwell outranks taken and a nurse hears about it at once.',
    points: ['Unwell, stop calls and stopped early come first', 'The exact words go to the care team', 'No medical advice, ever'],
  },
  {
    key: 'adapt', icon: 'refresh', title: 'Adapt and update', lead: 'The plan changes with the answer.',
    text: 'Later moves the call, stop calls ends them, and every report updates on its own: nurse board, doctor and family.',
    points: ['Reschedules by the minutes heard', 'Reports update for every role', 'Switches language if the patient does'],
  },
];

const wave = '<span class="ct-ui__wave" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span><span></span></span>';

// 1. Call: the patient's phone, an incoming Care Taker call that is answered.
function callScreen() {
  return frame('phone', `
    ${statusBar('09:00')}
    <div class="ct-scr__body ct-scr__body--call">
      <div class="ct-scr__caller">
        <span class="ct-scr__avatar">${logo()}</span>
        <strong>Care Taker</strong>
        <span class="ct-scr__callstate">${swap(`${icon('phone')}Incoming call`, `${icon('check')}Answered, 00:06`, 2)}</span>
      </div>
      <p class="ct-ui__bubble ct-ui__bubble--bot ct-seq" data-d="3"><span lang="te">మీ ఉదయం మాత్రలు వేసుకున్నారా?</span><span>Have you taken your breakfast tablets?</span></p>
      <p class="ct-ui__bubble ct-ui__bubble--patient ct-seq" data-d="4"><span lang="te">ఆ... వేసుకున్నాను</span><span>Yes, I have taken it</span></p>
      <div class="ct-ui__row ct-seq" data-d="5"><span>${icon('ear')}Heard in Telugu</span>${wave}</div>
      <div class="ct-scr__keys">
        <span class="ct-scr__key">${icon('keypad')}<span>Keypad</span></span>
        <span class="ct-scr__key">${icon('mic')}<span>Speaker</span></span>
        <span class="ct-scr__key ct-scr__key--end">${icon('phone-down')}<span>End</span></span>
      </div>
    </div>`, { icon: 'phone', caption: 'Patient phone' });
}

// 2. Confirm: the nurse board on a laptop. The dose is read back and logged only after a yes.
function confirmScreen() {
  const row = (name, med, pill, d = 0) => `<li class="ct-scr__pt${d ? ' ct-scr__pt--live' : ''}"><span><strong>${esc(name)}</strong><span>${esc(med)}</span></span>${pill}</li>`;
  return frame('laptop', `
    ${bar('flag', 'Nurse board', 'Breakfast doses', `<span class="ct-scr__clock">${icon('clock')}09:02</span>`)}
    <div class="ct-scr__body ct-scr__cols">
      <div class="ct-scr__col">
        <div class="ct-scr__metric ct-seq" data-d="1"><strong>0</strong><span>Doses logged without a yes</span>${status('taken', 'Must be 0')}</div>
        <ul class="ct-scr__list ct-seq" data-d="1">
          ${row('Lakshmi Devi', 'Paracetamol 650', swap(status('pending', 'Pending'), status('taken', 'Taken 09:02'), 5), 5)}
          ${row('Arjun', 'Isotretinoin 20', status('taken', 'Taken 08:41'))}
          ${row('Meena', 'Cefuroxime 500', status('pending', 'Calling now'))}
        </ul>
      </div>
      <div class="ct-scr__col ct-scr__readback">
        <span class="ct-scr__label">Read back to Lakshmi Devi</span>
        <p class="ct-ui__bubble ct-ui__bubble--bot ct-seq" data-d="2">You took Paracetamol 650 after breakfast at 09:02. Is that right? Say yes or press 1.</p>
        <p class="ct-ui__bubble ct-ui__bubble--patient ct-seq" data-d="3"><span lang="te">అవును</span><span>Yes</span></p>
        <div class="ct-ui__row ct-ui__ok ct-seq" data-d="4"><span>${icon('check')}Logged after a yes</span><span class="tabular">09:02</span></div>
      </div>
    </div>`, { icon: 'flag', caption: 'Nurse board, on a laptop' });
}

// 3. Understand and flag: the doctor's tablet. Unwell ranks above taken, so the reply is urgent.
function flagScreen() {
  const rule = (n, name, hit = '', word = '') => `<li class="ct-rule${hit ? ` ct-rule--${hit}` : ''}"><span class="ct-rule__n">${n}</span><span class="ct-rule__name">${esc(name)}</span>${
    word ? `<span class="ct-rule__word ct-seq" data-d="3" lang="hi">"${esc(word)}"</span>` : ''}${
    hit === 'win' ? `<span class="ct-rule__tag ct-seq" data-d="3">${icon('alert')}Wins</span>`
      : hit === 'lose' ? `<span class="ct-rule__tag ct-seq" data-d="3">Ranks lower</span>` : ''}</li>`;
  return frame('tablet', `
    ${bar('stethoscope', 'Doctor', 'Arjun, Isotretinoin 20, day 22', `<span class="ct-scr__clock">${icon('clock')}22:01</span>`)}
    <div class="ct-scr__body ct-scr__cols">
      <div class="ct-scr__col">
        <span class="ct-scr__label ct-seq" data-d="1">${icon('ear')}Heard, in Hindi</span>
        <p class="ct-ui__bubble ct-ui__bubble--patient ct-scr__heard ct-seq" data-d="1"><span lang="hi">haan le li, lekin chakkar aa raha hai</span><span>Took it, but feeling dizzy</span></p>
        <span class="ct-scr__label ct-seq" data-d="2">Rules, in order. First match wins.</span>
        <ol class="ct-rules ct-seq" data-d="2">
          ${rule(1, 'Unwell', 'win', 'chakkar')}${rule(2, 'Stop calls')}${rule(3, 'Wants a person')}${rule(4, 'Stopped early')}${rule(5, 'Later')}${rule(6, 'Taken', 'lose', 'le li')}
        </ol>
      </div>
      <div class="ct-scr__col">
        <div class="ct-scr__flag ct-seq" data-d="4">
          <div class="ct-scr__flaghead">${status('urgent', 'Urgent')}<strong>Arjun</strong><time>22:01</time></div>
          <p>Says he feels unwell. Exact words:</p>
          <blockquote class="ct-quote" lang="hi">haan le li, lekin chakkar aa raha hai</blockquote>
        </div>
        <div class="ct-ui__row ct-seq" data-d="5"><span>${icon('flag')}On the nurse board, on top</span></div>
        <div class="ct-ui__row ct-seq" data-d="6"><span>${icon('minus')}Dose not logged as taken</span></div>
      </div>
    </div>`, { icon: 'stethoscope', caption: 'Doctor, on a tablet' });
}

// 4. Adapt and update: the family's phone. The week updates, the next call moves, every role is told.
function adaptScreen() {
  const days = [['Mon', '2/2', 'is-ok'], ['Tue', '2/2', 'is-ok'], ['Wed', '2/2', 'is-ok'], ['Thu', '1/2', 'is-some']];
  return frame('phone', `
    ${statusBar('09:00')}
    ${bar('users', "Meena's week", 'Cefuroxime 500, day 5', status('taken', 'Shared'))}
    <div class="ct-scr__body">
      <div class="ct-ui__week ct-scr__week ct-seq" data-d="1">
        ${days.map(([d, v, c]) => `<span class="${c}"><b>${d}</b>${v}</span>`).join('')}
        <span class="ct-scr__today"><b>Fri</b>${swap('0/2', `${icon('clock')}<span class="visually-hidden">Later</span>`, 3)}</span>
        <span><b>Sat</b></span><span><b>Sun</b></span>
      </div>
      <p class="ct-ui__bubble ct-ui__bubble--patient ct-seq" data-d="2"><span lang="ta">20 நிமிஷம் கழிச்சு கூப்பிடுங்க</span><span>Meena: call me after 20 minutes</span></p>
      <div class="ct-ui__row ct-seq" data-d="3"><span>${icon('clock')}Next call</span><strong class="tabular">${swap('09:00', '09:20', 3)}</strong></div>
      <div class="ct-scr__cards">
        <div class="ct-seq" data-d="4">${careCard({ role: 'nurse', state: 'scheduled', text: 'Call moved to 09:20', time: '09:00' })}</div>
        <div class="ct-seq" data-d="5">${careCard({ role: 'doctor', state: 'logged', text: '7 of 8 doses confirmed', time: '09:00' })}</div>
        <div class="ct-seq" data-d="6">${careCard({ role: 'family', state: 'shared', text: 'Week updated', time: '09:00' })}</div>
      </div>
    </div>`, { icon: 'users', caption: 'Family, on a phone' });
}

const SCREENS = { call: callScreen, confirm: confirmScreen, flag: flagScreen, adapt: adaptScreen };

export const howMarkup = () => story({
  id: 'how', title: 'From one call to every report.', eyebrow: 'How it works', items: HOW,
  card: (key) => SCREENS[key](), size: 'ct-story--4',
});

// Navbar step line: four steps joined by a line that fills to the active one.
let line = null;
let section = null;
let raf = 0;
let shown = false;

function lineMarkup() {
  return `<ol class="ct-stepline__list">${HOW.map((s, i) => `
    <li class="ct-stepline__item${i === 0 ? ' is-active' : ''}"${i === 0 ? ' aria-current="step"' : ''}>
      <button type="button" class="ct-stepline__btn" data-i="${i}"><span class="ct-stepline__icon">${icon(s.icon)}</span><span class="ct-stepline__label"><span class="visually-hidden">Step ${i + 1}: </span>${esc(s.title)}</span></button>
      ${i < HOW.length - 1 ? `<span class="ct-stepline__link" aria-hidden="true"><span class="ct-stepline__fill"></span>${icon('chevron', 'ct-stepline__chev')}</span>` : ''}
    </li>`).join('')}</ol>`;
}

function setStep(idx) {
  if (!line) return;
  line.querySelectorAll('.ct-stepline__item').forEach((li, i) => {
    li.classList.toggle('is-active', i === idx);
    li.classList.toggle('is-done', i < idx);
    if (i === idx) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
  });
}

function check() {
  raf = 0;
  if (!line || !section) return;
  const r = section.getBoundingClientRect();
  const vh = window.innerHeight;
  const on = !isStacked() && r.top < vh * 0.4 && r.bottom > vh * 0.6;
  if (on === shown) return;
  shown = on;
  const nav = line.parentElement;
  nav.classList.toggle('has-steps', on);
  line.setAttribute('aria-hidden', on ? 'false' : 'true');
  line.inert = !on;
}
const onScroll = () => { if (!raf) raf = requestAnimationFrame(check); };
const onStep = (e) => setStep(e.detail.index);

export function mountHow(root) {
  section = root.querySelector('#how');
  const nav = document.querySelector('.ct-pill-navbar');
  if (!section || !nav) return;
  line = document.createElement('div');
  line.className = 'ct-stepline';
  line.setAttribute('role', 'group');
  line.setAttribute('aria-label', 'How it works, steps');
  line.setAttribute('aria-hidden', 'true');
  line.inert = true;
  line.innerHTML = lineMarkup();
  nav.appendChild(line);
  line.querySelectorAll('.ct-stepline__btn').forEach((btn) => btn.addEventListener('click', () => {
    scrollToY(storyStepY(section, Number(btn.dataset.i)));
  }));
  section.addEventListener('ct:story', onStep);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  check();
}

export function unmountHow() {
  window.removeEventListener('scroll', onScroll);
  window.removeEventListener('resize', onScroll);
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  if (section) section.removeEventListener('ct:story', onStep);
  if (line) {
    line.parentElement?.classList.remove('has-steps');
    line.remove();
  }
  line = null;
  section = null;
  shown = false;
}
