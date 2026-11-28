# Care Taker: prompt pack for Gemini (high reasoning) or Claude Design

There are three prompts in this file. Each one is ready to paste and is complete on its own.

1. **Prompt A, illustrations and animations.** Five animated scenes: the doctor plus four people. The output is a zip that drops straight into the repo.
2. **Prompt B, screen review.** Paste this with screenshots. The model checks every required line and every layout rule, and answers pass or fail.
3. **Prompt C, footer loop.** An optional standalone animated SVG of the closing brand loop.

A checklist closes each prompt. Do not accept a result until every box is ticked.

---

## Prompt A: illustrations and animations (paste everything inside the block)

```
ROLE
You are a senior editorial illustrator and motion designer. You make warm, hand-crafted
spot illustrations for health products, in the tradition of good magazine and
public-health illustration. Nothing you make may look like stock clip art or generic
AI art.

PRODUCT CONTEXT
Care Taker is a voice-first after-care service for India. After a hospital stay, the
patient gets a phone call at every dose time, in their own language (Telugu, Hindi,
Tamil and 8 more). They answer by voice or by pressing a key on any phone, even a basic
keypad phone. Every dose is read back and logged only after the patient says yes.
Nurses, doctors and family see the result. The audience is older patients in India and
the families who look after them.

TASK
Create FIVE animated illustration scenes, listed below as S1 to S5. All five share the
same characters, style and palette, so they read as one set.

GLOBAL STYLE (apply to every scene)
- Editorial flat illustration with soft, hand-made shading: two tone steps per surface
  (base plus one shade), a subtle paper-grain texture at 4 to 6 percent opacity, and no
  glossy gradients, no glow, no lens flare, no 3D render look.
- One consistent line weight: 2.5 px at 1600 px width, colour Ink. Use rounded caps and
  joins. Some fills may have no outline, which keeps it painterly.
- Real proportions: adult heads are about 1/7 of body height. Hands have five fingers
  and natural poses. Faces are friendly and specific: wrinkles and laugh lines for older
  people, real hairstyles, glasses where stated. No dead eyes, no plastic skin, no
  identical faces, no extra limbs.
- People and settings are Indian and believable: sarees, kurtas, a shawl, bangles, a
  bindi where stated, steel tumblers, a Godrej-style steel almirah, a ceiling fan, a
  calendar on the wall, a tulsi pot on a window sill, terracotta and lime-washed walls.
- Lighting: warm morning light from the left, with soft contact shadows under feet and
  objects.
- No words inside the art, except the exact UI text given per scene, set in the font
  Noto Sans. Telugu text must be correct, typeset glyphs, never pseudo-script.
- Never show a pill being swallowed, a medicine name, a dosage or any medical
  instruction. Show the phone call and the people, not the medicine.

PALETTE (use only these, plus skin tones)
  Ink           #1B1F24   lines, dark hair
  Paper         #F7F5F0   main background
  Sand          #EFECE5   floors, secondary surfaces
  Sand line     #E3DED3   dividers
  Teal          #0F5C5A   primary accents: phone, kurta, Care Taker brand
  Teal soft     #E3F0EE   teal tints
  Marigold      #E8A33D   warm accents: saree, shawl, highlights
  Marigold soft #FBF0DC   warm tints
  Green ok      #1E7B4F   the "yes / taken" tick only
  Skin tones    three warm South Asian tones: #8D5A3B, #A86F4C, #C68B63, plus one shade each

CHARACTER BIBLE (keep identical in every scene where they appear)
- Kamala, 74. Grandmother, slim, grey hair in a low bun, small red bindi, thin gold
  bangles, a marigold cotton saree with a teal border, and reading glasses on a cord.
- Ramesh, 79. Grandfather, bald on top with white side hair, round steel glasses, a
  white kurta with a teal shawl over one shoulder, and a walking stick.
- Meera, 16. Granddaughter, long plait, purple kurti, a smartwatch.
- Kabir, 10. Grandson, short curly hair, a teal T-shirt, an excited expression.
- Anita, 42. Daughter living in Pune, shoulder-length hair, a teal kurta with a
  marigold dupatta, office lanyard, holding a smartphone.
- Dr. Rao, 50. Doctor, short salt-and-pepper hair, a white coat over a sky-blue shirt,
  a stethoscope round the neck, a pen in the right hand.

SCENES
S1  doctor (square 1:1, 800 x 800, TRANSPARENT background)
    Dr. Rao sits at a hospital desk with an Rx pad, writing a prescription by hand.
    Desk items: a laptop with its lid half open on the left, and a steel tumbler.
    Animation (6 s seamless loop):
      0.0 to 3.2 s  The pen moves along three handwriting lines. The ink draws in exactly
                    under the pen tip, so the line grows from the pen. Make it squiggles,
                    not readable words.
      3.2 to 3.8 s  The pen lifts. The top sheet of the Rx pad lifts at one corner, curls
                    slightly and tears off, floating up and to the right out of frame.
      3.8 to 6.0 s  A fresh blank sheet. The doctor glances up, blinks once and smiles
                    slightly, then lowers the pen to the start.
    Constant idle: breathing (chest rises 1 percent, 4 s cycle) and a blink every 3 to 5 s.

S2  keypad-grandmother (4:3, 1600 x 1200)
    Kamala at home in a wooden armchair beside a window with a tulsi pot. A wall
    calendar and a ceiling fan.
    She holds a basic keypad phone to her ear. A small speech bubble near the phone
    reads "1  Yes". The "1" is in a rounded key-cap shape.
    Animation (8 s loop): the phone screen lights up and vibrates (2 small shakes).
    She answers by lifting it to her ear. She listens, nodding twice. She presses a key
    with her thumb, the key-cap "1" in the bubble pops in, and a green tick appears. The
    fan turns slowly the whole time, and curtain edges sway gently.

S3  listening-grandfather (4:3, 1600 x 1200)
    Ramesh in a cane chair on a veranda with potted plants and a steel almirah inside the
    doorway. His phone is on speaker in his palm.
    A speech bubble from the phone reads, in Telugu: "ఉదయం మాత్రలు వేసుకున్నారా?" and under it, small:
    "09:00 dose call".
    Animation (8 s loop): sound waves pulse softly from the phone. He leans in, his eyebrows
    rise, and he smiles and says yes (his mouth opens for one beat). A green tick appears.
    A sparrow lands on the railing at about 5 s and flies off at about 7.5 s.

S4  grandchildren-setup (4:3, 1600 x 1200)
    The living room. Kamala sits on a sofa in the centre. Kabir kneels on the left,
    pointing at the phone. Meera sits on the right arm of the sofa, holding the phone
    out to Kamala with the screen visible. The screen shows a red record dot and "Rec".
    Animation (8 s loop): Meera taps the screen and the "Rec" dot starts pulsing. Kabir
    gives a thumbs up. Kamala leans towards the phone and speaks (her mouth moves for
    2 beats). A small waveform appears on the phone screen while she speaks. Meera smiles
    and nods. Then hold, and reset.

S5  family-daughter (4:3, 1600 x 1200)
    Anita at a work desk in Pune, with a window showing city buildings and a laptop.
    She holds a smartphone. A floating card beside it, styled as a clean white UI card
    with a soft shadow, reads "Family card" and below it "Taken, 09:02", with a green
    tick.
    Animation (8 s loop): the phone buzzes and she glances down. The card slides up from
    the phone (opacity 0 to 1, about 24 px rise). She relaxes, her shoulders drop, she
    smiles, and she puts the phone down. A plant leaf sways gently.

MOTION RULES (every scene)
- Natural easing: cubic-bezier(0.23, 1, 0.32, 1) for entrances and
  cubic-bezier(0.77, 0, 0.175, 1) for moves. No linear motion except the fan and
  constant waves.
- Small amplitudes: people move like real, calm older adults. No bouncing, no cartoon
  squash.
- Seamless loop: the last frame equals the first frame.
- Respect reduced motion. Animated SVGs must include
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
  and their default (non-animated) state must be the calm final pose.

DELIVERABLE FORMAT (choose A1 if you write code, A2 if you generate video)
A1  Animated SVG, one self-contained file per scene:
    - Inline CSS @keyframes inside <style> in the SVG. No external files, no JavaScript,
      no fonts loaded from the web. Convert text to paths, or use font-family
      "Noto Sans" with a sans-serif fallback.
    - viewBox matching the size above. Under 300 KB per file (optimise paths, reuse
      <symbol>/<use>).
    - Include <title> and <desc> for accessibility.
A2  Video loop per scene:
    - <name>.webm (VP9) and <name>.mp4 (H.264), 24 fps, seamless loop, no audio, under
      1.5 MB each. For S1 use WebM with alpha, or render on Paper #F7F5F0.
    - <name>.webp poster: the calm final pose, same size.
Always also give a still: <name>.webp, the calm final pose, same size, under 250 KB.

ZIP STRUCTURE (exactly this; names are fixed)
care-taker-art.zip
  img/anim/doctor.svg                    (A1)  or doctor.webm + doctor.mp4 (A2)
  img/anim/keypad-grandmother.svg        ...
  img/anim/listening-grandfather.svg
  img/anim/grandchildren-setup.svg
  img/anim/family-daughter.svg
  img/photos/doctor.webp                 (stills, always)
  img/photos/keypad-grandmother.webp
  img/photos/listening-grandfather.webp
  img/photos/grandchildren-setup.webp
  img/photos/family-daughter.webp
  img/manifest.json
  CREDITS.md   (tool used, date, licence statement: original work, commercial use allowed)

img/manifest.json example (one entry per delivered scene; "type" is "svg", "video" or "photo"):
{
  "slots": {
    "doctor":                { "type": "svg" },
    "keypad-grandmother":    { "type": "svg" },
    "listening-grandfather": { "type": "svg" },
    "grandchildren-setup":   { "type": "video" },
    "family-daughter":       { "type": "photo" }
  }
}

BEFORE YOU ANSWER, check every item below and fix anything that fails.
```

### Checklist for Prompt A
- [ ] All 5 scenes are delivered, with the exact file names and the zip structure above.
- [ ] Characters match the bible in every scene: same faces, clothes and colours.
- [ ] Only palette colours plus the listed skin tones. No gradients, glow or 3D look.
- [ ] Hands have five fingers, no extra limbs, and the faces have real expressions.
- [ ] Settings are clearly Indian: tulsi, steel tumbler, almirah, saree, kurta, ceiling fan.
- [ ] UI text is exactly as given. The Telugu line is correct, real script.
- [ ] No medicine names, no dosages, no pill being swallowed, no medical advice.
- [ ] Each loop is seamless and the duration is as given (S1 6 s, S2 to S5 8 s).
- [ ] Motion is calm. Easing curves are as given. Reduced motion shows the calm final pose.
- [ ] Animated SVG: under 300 KB, no JavaScript, no external files, `<title>` and `<desc>` present.
- [ ] Video: WebM plus MP4, under 1.5 MB each, no audio, with a poster.
- [ ] A still `.webp` exists for every scene.
- [ ] `manifest.json` is valid JSON and lists every delivered scene with its type.
- [ ] `CREDITS.md` states an original work that may be used commercially.

When the zip is ready, hand it over. Its contents go into `public/` (so `img/anim/doctor.svg` becomes `public/img/anim/doctor.svg`), and the page picks each scene up from `public/img/manifest.json`. No code change is needed.

---

## Prompt B: screen review (paste with screenshots)

```
ROLE
You are a strict product design reviewer. I will paste screenshots of the Care Taker
web prototype at 1440, 1024, 768, 390 and 360 px wide. Review them against every rule
and every required line below. Answer with a table: Item | Pass or Fail | Evidence
(screenshot + where) | Fix. Do not invent issues you cannot see; say "not visible" instead.

REQUIRED LINES (exact wording, sentence case)
Home hero
  - "Just answer the call." and on the next line "Every dose, confirmed."
  - Buttons "Try a call" (with a "Live" tag) and "See how it works"
  - Under the buttons: "Sample data. Not medical advice."
How it works (one pinned section, one screen per role)
  - Eyebrow "How it works", title "From one call to every report."
  - Stepper inside the section (NOT in the navbar): Call → Confirm → Understand and flag → Adapt and update
  - Step 1 Call = patient phone, Step 2 Confirm = nurse board on a laptop,
    Step 3 Understand and flag = doctor on a tablet, Step 4 Adapt and update = family on a phone
Languages
  - Heading on two lines: "Speak your language." / "Care Taker answers in it." ("Care Taker" never split)
  - Language pills around the phone logo; caption "One call, every language"; a visible pause button for the motion
Devices (directly under Languages)
  - "Works on every device it meets." with keypad phone, smartphone, tablet, laptop and desktop
Features
  - "One screen for every role." as a grid of six role tiles with Open links; no repeat of the How it works screens
People strip
  - "Made for the people who need it most." with Kamala, 74 / Ramesh, 79 / Meera and Kabir / Anita, in Pune
Tour
  - "See Care Taker in three minutes", "Start the tour", "15 steps in 4 chapters", "About 3 minutes",
    chapters Patients, Families, Nurses, Doctors, label "Live preview · sample data"
Footer
  - Footer of every page: "Sample data. Not medical advice." and "In an emergency call 112."
  - Closing loop: "Care Taker" turns into a line that joins the loop and ends in "Checked in"

LAYOUT AND QUALITY RULES
 1. Nothing overlaps: no chip, bubble, card or tooltip covers other text.
 2. The navbar never changes while scrolling, apart from the active link.
 3. The tour step card is fully on screen and never covers the preview content; the highlight ring is not clipped.
 4. Devices look like real hardware: a phone about 9:19.5 with an even bezel, an island and side buttons; a laptop with lid, hinge and a wider thin base; a tablet about 4:3 with an even bezel.
 5. Every section is centred on the same content width; left edges line up.
 6. No horizontal scroll at any width; at 360 px every line is readable.
 7. Text contrast is WCAG AA (4.5:1 for body text); focus rings are visible.
 8. No em dash or en dash characters anywhere in visible text.
 9. No medical advice anywhere; health questions point to the nurse.
10. Motion is calm; nothing flashes; a reduced-motion screenshot shows a calm still.
11. Illustrations look hand-made and consistent, not like clip art or generic AI art.
12. One idea per screen: each section fits in one viewport on desktop.

FINISH with: "Ready" only if every row passes, otherwise "Not ready" and the top five fixes in order.
```

### Checklist for Prompt B
- [ ] Screenshots attached at all five widths, plus one with reduced motion on.
- [ ] Every row in the reply has evidence.
- [ ] Every Fail is fixed and the screenshots are reviewed again until the verdict is "Ready".

---

## Prompt C: footer loop as one animated SVG (optional)

```
Create one self-contained animated SVG, 1440 x 360, transparent background, no JavaScript.
Use the palette from Prompt A and the font "Noto Sans" with a sans-serif fallback.

Layout, left to right:
- A thin Ink line (1.5 px, 60 percent opacity) enters from the far left edge.
- It forms one loose loop, then runs right to a phone icon at 55 percent width (rounded
  rectangle, Teal, with a heart on the screen).
- The line continues past the phone to the far right edge.
- Text rides on the line from the left: "I took my tablet at 1:00 pm", then a gap, then
  the same line in Telugu: "నేను 1 గంటకు మాత్ర వేసుకున్నాను". Never place text where the loop
  crosses itself; keep the text on the straight parts.
- To the right of the phone, the wordmark "Care Taker" in Ink, bold.

Animation, 9.6 s seamless loop:
  0.0 to 4.0 s  Text flows slowly right to left along the line (offset along the path).
  4.0 to 5.4 s  Each letter of "Care Taker", starting from the last, unravels into a short
                straight stroke of similar width. Each stroke slides left, joins the line
                end to end, and turns into part of it (draw it with stroke-dashoffset).
  5.4 to 6.2 s  A bright Teal segment runs along the line into the phone.
  6.2 to 6.8 s  The phone screen shows a tick (stroke draws in).
  6.8 to 7.4 s  The tick becomes the heart (one soft beat).
  7.4 to 8.8 s  "Checked in" with a small green tick wipes in where the wordmark was.
  8.8 to 9.6 s  "Checked in" fades out and "Care Taker" fades back in.

Easing: cubic-bezier(0.23, 1, 0.32, 1) for entrances, cubic-bezier(0.77, 0, 0.175, 1) for moves.
Reduced motion: show the static phone and the "Care Taker" wordmark only.
Under 120 KB. Include <title>Care Taker</title>.
```

### Checklist for Prompt C
- [ ] The line runs from the left edge to the right edge without a break.
- [ ] No text sits on the loop crossing.
- [ ] The letters become lines, not dots, and visibly join the line.
- [ ] The sequence runs tick, then heart, then "Checked in", then back to "Care Taker".
- [ ] The loop is seamless at 9.6 s and the reduced-motion version is static.

To use it, save the file as `public/brand/footer-loop.svg` and add `"footer-loop": { "type": "svg" }` to the `slots` in `public/img/manifest.json`. The footer then shows it in place of the coded loop. Reduced motion keeps the static logo.
