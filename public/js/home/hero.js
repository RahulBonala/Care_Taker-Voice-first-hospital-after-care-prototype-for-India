// Hero: headline, the doctor writing the prescription, the live dose call with Care cards,
// and the strip of people Care Taker is made for.
import { esc, icon } from '../lib.js';
import { markup as heroCallMarkup, doctorMarkup, flowMarkup, mountHeroCall, stopHeroCall } from '../hero-call.js';

// Each figure is drawn here as line art. If public/img/photos/<photo>.webp exists, the photo
// replaces the drawing (see public/img/README.md).
const PEOPLE = [
  {
    photo: 'keypad-grandmother', who: 'Kamala, 74',
    text: 'Answers on her keypad phone at home and presses 1 for yes.',
    alt: 'Drawing of an elderly woman in a sari sitting in her armchair at home, holding a keypad phone to her ear.',
  },
  {
    photo: 'listening-grandfather', who: 'Ramesh, 79',
    text: 'Hears each dose read back in Telugu, slowly and clearly.',
    alt: 'Drawing of an elderly man in a kurta and shawl listening to his dose call on a phone held in both hands.',
  },
  {
    photo: 'grandchildren-setup', who: 'Meera and Kabir',
    text: 'Set up the phone for their grandmother and start the voice recording.',
    alt: 'Drawing of two grandchildren on a sofa with their grandmother, showing her a phone that is recording.',
  },
  {
    photo: 'family-daughter', who: 'Anita, in Pune',
    text: 'Sees every confirmed dose on the Family card, far from home.',
    alt: 'Drawing of a young woman by an office window looking at her phone, with a Family card showing a dose taken.',
  },
];

const ART = {
  'keypad-grandmother': `
    <rect class="p-wall-gold" x="0" y="0" width="320" height="240"/>
    <rect class="p-floor" x="0" y="196" width="320" height="44"/><path d="M0 196 H320"/>
    <rect class="p-white" x="26" y="30" width="70" height="76" rx="6"/><path d="M61 30 V106 M26 68 H96"/>
    <circle class="p-white" cx="262" cy="50" r="20"/><path d="M262 50 V38 M262 50 H251"/>
    <rect class="p-sand" x="236" y="146" width="62" height="9" rx="3"/><path d="M243 155 V196 M291 155 V196"/>
    <path class="p-white" d="M254 146 L256 126 L272 126 L274 146 Z"/>
    <rect class="p-teal-soft" x="102" y="78" width="116" height="118" rx="24"/>
    <rect class="p-teal" x="90" y="130" width="26" height="66" rx="10"/><rect class="p-teal" x="204" y="130" width="26" height="66" rx="10"/>
    <path class="p-gold" d="M132 122 C132 108 144 102 160 102 C176 102 188 108 188 122 L194 178 C196 192 186 198 160 198 C134 198 124 192 126 178 Z"/>
    <path class="p-red" d="M180 106 C170 130 150 150 128 160 L127 172 C152 162 178 140 188 118 Z"/>
    <ellipse class="p-skin" cx="146" cy="199" rx="9" ry="4"/><ellipse class="p-skin" cx="174" cy="199" rx="9" ry="4"/>
    <circle class="p-skin" cx="148" cy="160" r="6"/>
    <circle class="p-grey" cx="177" cy="66" r="9"/>
    <path class="p-skin" d="M154 88 L154 104 L166 104 L166 88 Z"/>
    <circle class="p-skin" cx="160" cy="76" r="19"/>
    <path class="p-grey" d="M141 75 C139 60 149 53 160 53 C172 53 182 61 179 75 C174 67 168 64 160 64 C152 64 146 68 141 75 Z"/>
    <circle class="p-red p-dot" cx="160" cy="71" r="2.2"/>
    <path d="M150 79 q3.5 -3 7 0 M163 79 q3.5 -3 7 0 M155 87 q5 4 10 0"/>
    <path class="p-limb-o" d="M184 112 L198 140 L184 94"/><path class="p-limb" d="M184 112 L198 140 L184 94"/>
    <rect class="p-ink" x="176" y="66" width="13" height="27" rx="3"/><rect class="p-gold-soft p-dot" x="178.5" y="69" width="8" height="7" rx="1"/>
    <circle class="p-skin" cx="184" cy="91" r="6"/>
    <path class="p-white" d="M206 62 H262 a8 8 0 0 1 8 8 V94 a8 8 0 0 1 -8 8 H214 L204 110 L206 100 a8 8 0 0 1 -6 -8 V70 a8 8 0 0 1 8 -8 Z"/>
    <rect class="p-teal-soft" x="212" y="72" width="22" height="22" rx="5"/>
    <text class="p-text" x="223" y="88" text-anchor="middle">1</text><text class="p-text" x="240" y="88">Yes</text>`,
  'listening-grandfather': `
    <rect class="p-wall-teal" x="0" y="0" width="320" height="240"/>
    <rect class="p-floor" x="0" y="196" width="320" height="44"/><path d="M0 196 H320"/>
    <rect class="p-white" x="30" y="32" width="58" height="48" rx="4"/><rect class="p-gold-soft" x="37" y="39" width="44" height="34" rx="2"/>
    <path d="M39 70 L52 54 L62 64 L68 58 L80 70"/><circle class="p-gold" cx="70" cy="47" r="4"/>
    <rect class="p-sand" x="104" y="90" width="112" height="106" rx="14"/>
    <path class="p-white" d="M126 128 C126 112 140 104 160 104 C180 104 194 112 194 128 L200 196 L120 196 Z"/>
    <path class="p-gold" d="M128 120 C142 110 178 110 192 120 L192 134 C178 125 142 125 128 134 Z"/>
    <path class="p-gold" d="M184 124 L198 178 L186 181 L174 128 Z"/>
    <ellipse class="p-skin" cx="146" cy="199" rx="10" ry="4"/><ellipse class="p-skin" cx="174" cy="199" rx="10" ry="4"/>
    <path class="p-skin" d="M154 90 L154 106 L166 106 L166 90 Z"/>
    <circle class="p-skin" cx="141" cy="80" r="4.5"/><circle class="p-skin" cx="179" cy="80" r="4.5"/>
    <circle class="p-skin" cx="160" cy="78" r="19"/>
    <path class="p-grey" d="M142 82 C140 74 141 67 145 62 L149 72 Z M178 82 C180 74 179 67 175 62 L171 72 Z"/>
    <circle cx="153" cy="77" r="5"/><circle cx="167" cy="77" r="5"/><path d="M158 77 H162"/>
    <circle class="p-ink p-dot" cx="153" cy="77" r="1.3"/><circle class="p-ink p-dot" cx="167" cy="77" r="1.3"/>
    <path class="p-white" d="M151 88 C155 85 158 86 160 88 C162 86 165 85 169 88 C166 92 162 92 160 90 C158 92 154 92 151 88 Z"/>
    <path class="p-limb-o" d="M132 122 C124 140 134 150 148 150"/><path class="p-limb p-limb--white" d="M132 122 C124 140 134 150 148 150"/>
    <path class="p-limb-o" d="M188 122 C196 140 186 150 172 150"/><path class="p-limb p-limb--white" d="M188 122 C196 140 186 150 172 150"/>
    <rect class="p-ink" x="150" y="124" width="20" height="34" rx="4"/><rect class="p-teal-soft p-dot" x="153" y="128" width="14" height="22" rx="2"/>
    <circle class="p-skin" cx="149" cy="149" r="6"/><circle class="p-skin" cx="171" cy="149" r="6"/>
    <path class="p-sound" d="M176 118 q7 -6 6 -15 M182 124 q14 -10 12 -28"/>
    <path class="p-white" d="M204 92 H302 a8 8 0 0 1 8 8 V136 a8 8 0 0 1 -8 8 H212 a8 8 0 0 1 -8 -8 V122 L194 116 L204 112 V100 a8 8 0 0 1 8 -8 Z"/>
    <text class="p-text" x="214" y="113">ఉదయం మాత్ర</text><text class="p-text p-text--muted" x="214" y="133">09:00 dose call</text>`,
  'grandchildren-setup': `
    <rect class="p-wall-blue" x="0" y="0" width="320" height="240"/>
    <rect class="p-floor" x="0" y="204" width="320" height="36"/><path d="M0 204 H320"/>
    <rect class="p-gold-soft" x="30" y="104" width="190" height="72" rx="18"/>
    <rect class="p-gold" x="24" y="160" width="202" height="38" rx="12"/><path d="M40 198 V206 M210 198 V206"/>
    <path class="p-teal" d="M98 150 C98 134 110 128 126 128 C142 128 154 134 154 150 L158 192 L94 192 Z"/>
    <path class="p-gold-soft" d="M146 132 C138 152 120 166 98 172 L97 182 C122 176 146 158 154 140 Z"/>
    <circle class="p-grey" cx="141" cy="94" r="8"/>
    <path class="p-skin" d="M120 112 L120 128 L132 128 L132 112 Z"/>
    <circle class="p-skin" cx="126" cy="102" r="17"/>
    <path class="p-grey" d="M109 101 C108 88 116 82 126 82 C137 82 145 89 143 101 C138 94 132 92 126 92 C119 92 113 95 109 101 Z"/>
    <circle class="p-red p-dot" cx="126" cy="98" r="2"/>
    <path d="M117 104 q3 -2.5 6 0 M129 104 q3 -2.5 6 0 M121 111 q5 4 10 0"/>
    <path class="p-blue" d="M44 160 C44 148 50 144 58 144 C66 144 72 148 72 160 L74 192 L42 192 Z"/>
    <circle class="p-skin" cx="58" cy="128" r="13"/>
    <path class="p-ink" d="M45 127 C44 116 50 112 58 112 C67 112 72 117 71 127 C67 121 62 120 58 120 C52 120 48 122 45 127 Z"/>
    <path d="M52 131 q3 3 6 0 M60 131 q3 3 6 0"/><path d="M54 136 q4 3 8 0"/>
    <path class="p-limb-o" d="M70 156 L88 146 L94 132"/><path class="p-limb p-limb--blue" d="M70 156 L88 146 L94 132"/>
    <circle class="p-skin" cx="94" cy="130" r="5"/>
    <path d="M218 214 V184 M234 214 V184"/>
    <path class="p-plum" d="M210 128 C210 118 216 114 226 114 C236 114 242 118 242 128 L250 186 L202 186 Z"/>
    <ellipse class="p-ink" cx="242" cy="92" rx="6" ry="9"/>
    <circle class="p-skin" cx="226" cy="96" r="15"/>
    <path class="p-ink" d="M211 95 C210 84 217 80 226 80 C235 80 242 85 241 95 C237 89 231 88 226 88 C219 88 214 90 211 95 Z"/>
    <path d="M219 99 q3 2.5 6 0 M229 99 q3 2.5 6 0 M222 105 q4 3 8 0"/>
    <path class="p-limb-o" d="M212 126 L196 140 L180 134"/><path class="p-limb p-limb--plum" d="M212 126 L196 140 L180 134"/>
    <rect class="p-ink" x="160" y="116" width="22" height="34" rx="4"/><rect class="p-white p-dot" x="163" y="120" width="16" height="24" rx="2"/>
    <circle class="p-red p-dot" cx="171" cy="132" r="5"/>
    <circle class="p-skin" cx="180" cy="134" r="5.5"/>
    <rect class="p-white" x="156" y="74" width="54" height="24" rx="12"/>
    <circle class="p-red p-dot" cx="170" cy="86" r="4.5"/><text class="p-text" x="180" y="91">Rec</text>`,
  'family-daughter': `
    <rect class="p-wall-plum" x="0" y="0" width="320" height="240"/>
    <rect class="p-floor" x="0" y="204" width="320" height="36"/><path d="M0 204 H320"/>
    <rect class="p-white" x="22" y="26" width="124" height="96" rx="6"/>
    <circle class="p-gold-soft" cx="118" cy="50" r="10"/>
    <path class="p-teal-soft" d="M30 122 V82 H48 V64 H64 V122 Z M70 122 V72 H90 V122 Z M96 122 V88 H112 V76 H128 V122 Z"/>
    <path d="M22 122 H146"/>
    <path d="M86 214 V176 M102 214 V176"/>
    <path class="p-teal" d="M76 126 C76 114 84 108 94 108 C104 108 112 114 112 126 L116 180 L72 180 Z"/>
    <path class="p-gold" d="M80 114 C88 132 100 140 112 142 L112 152 C98 150 84 140 76 124 Z"/>
    <path class="p-ink" d="M78 96 C76 80 84 70 94 70 C106 70 112 80 110 96 L112 116 L104 110 L84 110 L76 116 Z"/>
    <path class="p-skin" d="M88 100 L88 112 L100 112 L100 100 Z"/>
    <circle class="p-skin" cx="94" cy="90" r="14"/>
    <path class="p-ink" d="M80 88 C80 78 86 74 94 74 C102 74 108 78 108 88 C102 82 88 82 80 88 Z"/>
    <path d="M88 92 q2.5 2 5 0 M97 92 q2.5 2 5 0 M90 99 q4 3 8 0"/>
    <path class="p-limb-o" d="M108 122 L122 142 L130 126"/><path class="p-limb p-limb--teal" d="M108 122 L122 142 L130 126"/>
    <rect class="p-ink" x="124" y="106" width="18" height="30" rx="4"/><rect class="p-white p-dot" x="127" y="110" width="12" height="20" rx="2"/>
    <circle class="p-skin" cx="131" cy="128" r="5.5"/>
    <path class="p-link" d="M146 112 C156 102 162 94 170 90"/>
    <rect class="p-white" x="170" y="56" width="138" height="66" rx="12"/>
    <circle class="p-green p-dot" cx="190" cy="89" r="11"/><path class="p-tick" d="M184.5 89 l4 4 l7.5 -7.5"/>
    <text class="p-text" x="208" y="84">Family card</text><text class="p-text p-text--muted" x="208" y="102">Taken, 09:02</text>
    <rect class="p-sand" x="196" y="156" width="112" height="8" rx="3"/><path d="M204 164 V204 M300 164 V204"/>
    <path class="p-teal" d="M226 156 L230 140 L258 140 L262 156 Z"/>
    <path class="p-green" d="M244 140 C236 126 236 116 244 108 C252 116 252 126 244 140 Z M244 140 C232 132 226 124 226 116 C236 120 242 128 244 140 Z"/>`,
};

export function peopleMarkup() {
  return `
    <section class="ct-band ct-people" aria-labelledby="people-title">
      <div class="ct-people__inner">
        <div class="ct-people__head" data-reveal="up">
          <span class="ct-eyebrow"><span class="ct-eyebrow__dot" aria-hidden="true"></span>Who it is for</span>
          <h2 id="people-title" class="ct-section-title-lg">Made for the people who need it most.</h2>
          <p class="ct-section-lead">Older patients on a basic phone, and the families who look after them from near and far.</p>
        </div>
        <ul class="ct-people__grid" data-reveal-group>
          ${PEOPLE.map((p) => `
          <li>
            <figure class="ct-people__fig" data-photo="${esc(p.photo)}" data-alt="${esc(p.alt)}">
              <div class="ct-people__media">
                <svg class="ct-ill" viewBox="0 0 320 240" width="320" height="240" role="img" aria-label="${esc(p.alt)}" focusable="false">${ART[p.photo]}</svg>
              </div>
              <figcaption><strong>${esc(p.who)}</strong><span>${esc(p.text)}</span></figcaption>
            </figure>
          </li>`).join('')}
        </ul>
      </div>
    </section>`;
}

// Swap a drawing for an animated SVG or still photo when listed in public/img/manifest.json
// (or fallback public/img/photos/manifest.json). Under prefers-reduced-motion, prefer the
// calm still photo (.webp) when available, falling back to the SVG (which disables animation via CSS).
async function usePhotos(el) {
  let slots = {};
  let names = [];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  try {
    const mRes = await fetch('/img/manifest.json', { cache: 'no-cache' });
    if (mRes.ok) slots = (await mRes.json()).slots || {};
  } catch { /* optional */ }
  try {
    const res = await fetch('/img/photos/manifest.json', { cache: 'no-cache' });
    if (res.ok) names = (await res.json()).photos || [];
  } catch { /* optional */ }

  // Doctor slot (S1)
  const docSlot = slots.doctor;
  if (docSlot) {
    const docSrc = (!reduce && docSlot.type === 'svg') ? '/img/anim/doctor.svg' : '/img/photos/doctor.webp';
    try {
      let head = await fetch(docSrc, { method: 'HEAD' });
      let finalDocSrc = docSrc;
      if (!head.ok && docSrc.endsWith('.webp')) {
        finalDocSrc = '/img/anim/doctor.svg';
        head = await fetch(finalDocSrc, { method: 'HEAD' });
      }
      if (head.ok) {
        el.querySelectorAll('.ct-doc').forEach((svg) => {
          const anchor = svg.querySelector('.ct-doc__anchor');
          svg.innerHTML = `<image href="${finalDocSrc}" x="0" y="0" width="200" height="150" preserveAspectRatio="xMidYMid meet"/>`;
          if (anchor) svg.appendChild(anchor);
          svg.classList.add('has-scene');
        });
      }
    } catch { /* keep inline doctor */ }
  }

  el.querySelectorAll('.ct-people__fig[data-photo]').forEach(async (fig) => {
    const key = fig.dataset.photo;
    const slot = slots[key];
    if (!slot && !names.includes(key)) return;
    const preferSvg = slot && slot.type === 'svg' && !reduce;
    const candidates = preferSvg
      ? [`/img/anim/${key}.svg`, `/img/photos/${key}.webp`]
      : [`/img/photos/${key}.webp`, `/img/anim/${key}.svg`];
    for (const src of candidates) {
      try {
        const res = await fetch(src, { method: 'HEAD' });
        if (!res.ok || !(res.headers.get('content-type') || '').startsWith('image/')) continue;
        const img = new Image(1600, 1200);
        img.className = 'ct-people__photo';
        img.alt = fig.dataset.alt;
        img.decoding = 'async';
        img.loading = 'lazy';
        img.src = src;
        fig.querySelector('.ct-people__media').replaceChildren(img);
        fig.classList.add('has-photo');
        break;
      } catch { /* try next candidate */ }
    }
  });
}

export function heroMarkup() {
  return `
    <section class="ct-hero2" aria-labelledby="home-title" data-hero-scene data-phase="idle">
      <div class="ct-hero2__copy">
        <div class="ct-voice-badge"><span class="ct-voice-badge__pulse" aria-hidden="true"></span><span>Voice-first after-care for India</span></div>
        <h1 id="home-title" class="ct-hero2__title">
          <span class="ct-hero__sentence">Just answer the call.</span>
          <span class="ct-hero__sentence"><em class="ct-hero__serif-italic">Every dose, confirmed.</em></span>
        </h1>
        <div class="ct-hero2__rx ct-hero2__rx--wide">${doctorMarkup('wide')}</div>
        <p class="ct-hero2__one">In your language, by voice or keypad, on any phone.</p>
        <p class="ct-hero2__lead">Care Taker calls patients at every dose time after they leave hospital. It reads each dose back, logs it only after a yes, and turns every call into Care cards for the nurse, doctor and family.</p>
        <div class="ct-hero__ctas">
          <a class="ct-btn ct-btn--hero-cta" href="#phone">${icon('phone')}<span>Try a call</span><span class="ct-btn__pill-badge">Live</span></a>
          <a class="ct-btn ct-btn--secondary" href="#how">${icon('compass')}<span>See how it works</span></a>
        </div>
        <p class="ct-hero2__note">${icon('info')}Sample data. Not medical advice.</p>
      </div>
      <div class="ct-hero2__visual">
        <div class="ct-hero2__rx ct-hero2__rx--narrow">${doctorMarkup('narrow')}</div>
        ${heroCallMarkup()}
        <p class="visually-hidden">Animation: a doctor writes a prescription, the dose times travel to the patient's phone, Care Taker calls the patient in their language, and Care cards update for the nurse, doctor and family.</p>
      </div>
      ${flowMarkup()}
    </section>`;
}
export function mountHero(el) { mountHeroCall(el); usePhotos(el); }
export function unmountHero() { stopHeroCall(); }
