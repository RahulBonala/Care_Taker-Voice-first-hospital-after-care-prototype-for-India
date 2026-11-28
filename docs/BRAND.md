# Care Taker brand label

The Care Taker label is a phone with a heart on its screen, next to the words "Care Taker". The phone is the call the patient gets at dose time. The heart is the care behind it. All files are in `public/brand/`. They use the same geometry as `public/js/logo.js` and the footer signature (`public/js/signature.js`).

## Files

| File | What it is | Use it for |
|---|---|---|
| `care-taker-label.svg` | Horizontal lockup: the mark, then the wordmark "Care Taker" | Default. Headers, slides, the pitch deck, documents |
| `care-taker-label-stacked.svg` | Stacked lockup: the mark centred above the wordmark | Square or narrow spaces: title slides, posters, social images |
| `care-taker-mark.svg` | The mark alone, on a 32 by 32 grid | App icon, favicon, avatars, anywhere the name is already shown |
| `care-taker-checked-in.svg` | Status label: the mark with a green check-in badge, a check mark and "Checked in" | Showing a confirmed dose in demos and slides. It is a status, not a logo |

The wordmark in each file is outlined from Noto Sans Bold (letter spacing minus 3 percent), so the files look the same on any machine, with no font installed. Each file has a title and `role="img"` for screen readers.

## Construction

- The mark is drawn on a 32 by 32 grid: phone body 15 by 26 with corner radius 3.6 and a 2.2 stroke, a filled heart centred on the screen, and a short rounded slot at the bottom.
- In the lockups the phone body is 1.5 times the wordmark font size, the same ratio as the footer signature.
- The gap between the phone and the wordmark is 0.3 times the font size.
- The wordmark is centred on the phone's height.

## Clear space

Keep empty space on every side equal to the width of the phone body (the outer edge of its stroke). The SVG files already include this space inside their view box, so place them edge to edge with other content and the space is kept. No text, image or edge of a card may come inside it.

## Minimum size

| File | Smallest size on screen | Smallest size in print |
|---|---|---|
| Horizontal lockup | 120 px wide (wordmark about 14 px) | 30 mm wide |
| Stacked lockup | 80 px wide | 20 mm wide |
| Mark | 16 px tall (favicon size) | 5 mm tall |
| Checked in label | 140 px wide | 35 mm wide |

Below these sizes the heart fills in and the wordmark stops being readable. Use the mark alone instead.

## Colors

The SVG files use literal colors because they leave the app. Inside the app, always use the tokens from `public/css/tokens.css`.

| Part | Token | Value |
|---|---|---|
| Phone, heart, slot | `--color-primary` (deep teal) | #0F5C5A |
| Wordmark and "Checked in" | `--color-ink` (near black) | #1B1F24 |
| Check-in badge and check mark | `--status-taken` (green) | #1A6B3E |
| Badge ring and tick | `--color-ink-inverse` (white) | #FFFFFF |
| Warm highlight next to the label, never the label itself | `--color-accent` (marigold) | #E8A33D |

On a teal or dark background, show the whole label in white (`--color-ink-inverse`). Marigold is only a fill or highlight around the label. It is never used for the wordmark, because it fails contrast as text on white.

## Do

- Use the horizontal lockup first. Switch to the stacked lockup only when the space is close to square.
- Place the label on white (`--color-surface`) or warm paper (`--color-bg`).
- Keep the clear space and the minimum size.
- Scale the file as one piece, keeping its proportions.
- Use the "Checked in" label only next to a dose that was confirmed by a spoken or pressed yes.

## Do not

- Do not retype the wordmark in another font, weight or letter spacing.
- Do not recolor the mark, add gradients, shadows, outlines or glows, or put it in a box.
- Do not stretch, rotate, tilt or crop the label.
- Do not change the gap between the mark and the wordmark, or move the mark to the right of the words.
- Do not put the label on a busy photo or on marigold.
- Do not use the "Checked in" label as a logo, or for a dose that was not confirmed.
- Do not add a slogan inside the clear space.
