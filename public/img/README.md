# Images

## People strip on the home page ("Made for the people who need it most")

Each figure is drawn today as inline line art in `public/js/home/hero.js`, coloured from the
design tokens. A real photo can replace any drawing without code changes:

1. Save the photo as `public/img/photos/<file name>.webp` (names below).
2. Add the name, without `.webp`, to `public/img/photos/manifest.json`, for example
   `{ "photos": ["keypad-grandmother"] }`.

On load the page reads the manifest, checks each listed file with a HEAD request, and shows the
photo in place of the drawing. If a file is missing, the drawing stays. Only names in the manifest
are requested, so a missing photo never logs a 404 in the console.

All photos: landscape 4:3, 1600 x 1200 px, WebP at quality 80 or similar (under 250 KB),
subject in the centre third (the frame is cropped with `object-fit: cover`). Natural light,
warm tones, no text or logos in the frame.

**License:** use only photos whose license allows commercial use and modification (for example
your own photos with signed model releases, or a stock license that covers commercial web use).
Do not use editorial-only images. Record the source, author and license of each file in the
table below before you commit it.

| File name | Photo to find | Setting in India | Alt text used |
|---|---|---|---|
| `keypad-grandmother.webp` | An elderly woman (70s) in a cotton sari answering a basic keypad phone held to her ear, smiling | Her home: an armchair or charpai, a window or wall clock behind; small town or city flat | Drawing of an elderly woman in a sari sitting in her armchair at home, holding a keypad phone to her ear. |
| `listening-grandfather.webp` | An elderly man (75 to 80) in a kurta with a shawl, listening closely to a call on a phone held in front of him | His sitting room or veranda, daytime | Drawing of an elderly man in a kurta and shawl listening to his dose call on a phone held in both hands. |
| `grandchildren-setup.webp` | Two grandchildren (about 8 to 14) showing their grandmother a smartphone and pressing record | A family sofa at home, the three of them together | Drawing of two grandchildren on a sofa with their grandmother, showing her a phone that is recording. |
| `family-daughter.webp` | A woman (25 to 40) at work glancing at a message on her phone | An office or flat window in a city such as Pune or Bengaluru | Drawing of a young woman by an office window looking at her phone, with a Family card showing a dose taken. |

When a photo goes in, update its alt text in the `PEOPLE` list in `public/js/home/hero.js` so it
describes the photo, not the drawing.

| File name | Source | Author | License |
|---|---|---|---|
| keypad-grandmother.webp | | | |
| listening-grandfather.webp | | | |
| grandchildren-setup.webp | | | |
| family-daughter.webp | | | |
