# Care Taker design system

## Personality

Calm, trustworthy, warm. Clinical without being cold. It should feel like the after-care desk of a good Indian hospital, not a startup dashboard.

- Clean paper background, white cards, thin warm borders.
- One deep teal for every action. Marigold only as a warm highlight (the banner, quote rules, progress accents).
- Clear status colors, always paired with an icon and a text label.
- No gradients, no glassmorphism, no emoji, no stock illustrations.
- Plain words. Short, second person, sentence case.

## Files

| File | Purpose |
|---|---|
| `public/css/tokens.css` | Every color, size, space, radius and shadow. The only file with raw values. |
| `public/css/fonts.css` | Self-hosted Noto Sans faces (Latin, Telugu, Devanagari, Tamil), copied from `@fontsource` by `scripts/copy-fonts.js`. |
| `public/css/base.css` | Reset, type scale, focus ring, page layout and the 12-column grid. |
| `public/css/components.css` | Every `ct-` component listed below. |

## Tokens

### Color

| Token | Value | Use |
|---|---|---|
| `--color-bg` | warm paper | Page background |
| `--color-surface` | white | Cards, inputs, app bar |
| `--color-surface-sunken` | light sand | Metric tiles, table row hover, segmented control track |
| `--color-border` | sand | Card and row borders |
| `--color-border-strong` | darker sand | Input borders, dashed chips |
| `--color-ink` | near black | Body text, phone body |
| `--color-ink-muted` | slate | Help text, metadata |
| `--color-ink-inverse` | white | Text on teal and on the phone body |
| `--color-primary` | deep teal | Buttons, links, active tab, brand mark |
| `--color-primary-hover` | darker teal | Hover on primary |
| `--color-primary-soft` | pale teal | Selected choice, bot lines on the phone |
| `--color-accent` | marigold | Fills and highlights only. Never text on white. |
| `--color-accent-soft` | pale marigold | Banner, patient lines on the phone |
| `--color-focus` | deep teal | Focus ring |

### Status

| Status | Text token | Background token | Icon | Label |
|---|---|---|---|---|
| Taken | `--status-taken` | `--status-taken-bg` | check circle | Taken |
| Later | `--status-later` | `--status-later-bg` | clock | Later |
| Urgent | `--status-urgent` | `--status-urgent-bg` | alert triangle | Urgent |
| Stopped early | `--status-stopped` | `--status-stopped-bg` | stop square | Stopped early |
| Missed | `--status-missed` | `--status-missed-bg` | phone off | Missed |
| Unclear | `--status-unclear` | `--status-unclear-bg` | question circle | Unclear |
| Pending | `--color-ink-muted` | `--color-surface-sunken` | empty circle | Pending |

### Contrast table

| Pair | Ratio | Passes |
|---|---|---|
| `--color-ink` on `--color-bg` | 15.2:1 | AA, AAA |
| `--color-ink-muted` on `--color-bg` | 6.1:1 | AA |
| White on `--color-primary` | 7.8:1 | AA, AAA |
| Each `--status-*` on its `--status-*-bg` | 5.7:1 or better | AA |
| `--color-ink` on `--color-accent-soft` (banner) | above 14:1 | AA, AAA |

### Type

`--font-sans` is Noto Sans with the Telugu, Devanagari and Tamil faces after it, so every script in a mixed line renders in one family. Scale: `--text-xs` 12, `--text-sm` 14, `--text-md` 16, `--text-lg` 18, `--text-xl` 22, `--text-2xl` 28, `--text-3xl` 36 (in rem). Body uses `--leading-body` (1.6) because Indic scripts need the extra height. Times, counts and day progress use `font-variant-numeric: tabular-nums`.

Patient screens never go below `--text-md`. `--text-sm` and `--text-xs` are for metadata only.

### Space, shape, layout

- Spacing: `--space-1` to `--space-8` on a 4px scale (4, 8, 12, 16, 24, 32, 48, 64).
- Radius: `--radius-sm` (6), `--radius-md` (10), `--radius-lg` (16), `--radius-pill`.
- Shadow: `--shadow-1` for resting, `--shadow-2` for raised cards, the phone and toasts.
- `--focus-ring`: a white gap then a teal ring, visible on any background.
- `--content-max` 1120px. 12-column grid at desktop, one column under 720px.
- `--tap-min` 48px: the minimum height of every button, key, chip and checkbox row.

## Motion

150ms ease-out on hover and toasts. One gentle pulse on the incoming call avatar. All animation is switched off under `prefers-reduced-motion`.

## Icons

One outline style, 1.5 stroke, round caps, inline SVG symbols in each page (`<svg class="ct-icon"><use href="#i-check"/></svg>`). No icon fonts.

## Components

### `ct-banner`
```html
<div class="ct-banner" role="note"><svg class="ct-icon"><use href="#i-info"/></svg>Sample data. Not medical advice.</div>
```

### `ct-app-bar` with the role switcher
```html
<header class="ct-app-bar"><div class="ct-app-bar__inner">
  <a class="ct-brand" href="/"><svg class="ct-icon"><use href="#i-mark"/></svg>Care Taker</a>
  <nav class="ct-segmented" aria-label="Role">
    <a class="ct-segmented__item" href="#desk" aria-current="page">Hospital desk</a>
    <a class="ct-segmented__item" href="#nurse">Nurse board</a>
  </nav>
</div></header>
```

### `ct-btn`
```html
<button class="ct-btn ct-btn--primary">Verify</button>
<button class="ct-btn ct-btn--secondary">Next slot</button>
<button class="ct-btn ct-btn--ghost">Cancel</button>
<button class="ct-btn ct-btn--danger">Reset data</button>
<button class="ct-btn ct-btn--primary ct-btn--loading" aria-busy="true">Saving</button>
```

### `ct-card`
```html
<section class="ct-card ct-card--raised">
  <div class="ct-card__head"><h2>Flags</h2><p>Most urgent first</p></div>
  ...
</section>
```

### `ct-status`
```html
<span class="ct-status ct-status--urgent"><svg class="ct-icon"><use href="#i-alert"/></svg>Urgent</span>
```

### `ct-field`
```html
<label class="ct-field">
  <span class="ct-field__label">Medicine</span>
  <input class="ct-input" aria-describedby="med-help med-err">
  <span class="ct-field__help" id="med-help">As written on the discharge sheet</span>
  <span class="ct-field__error" id="med-err"><svg class="ct-icon"><use href="#i-alert"/></svg>Medicine is required</span>
</label>
```
Related: `ct-check` (checkbox row), `ct-choices` and `ct-choice` (pill toggles for meal slots), `ct-chip` (tap a sample reply), `ct-form-grid`.

### `ct-table`
```html
<div class="ct-table-wrap"><table class="ct-table">
  <thead><tr><th>Patient</th><th>Course</th></tr></thead>
  <tbody><tr><td data-label="Patient">Meena</td><td data-label="Course">Day 5 of 10</td></tr></tbody>
</table></div>
```
Under 720px rows become stacked cards and each cell shows its `data-label`.

### `ct-progress`
```html
<div class="ct-progress">
  <div class="ct-progress__label"><strong>Day 15 of 60</strong><span>24% complete</span></div>
  <progress max="60" value="15">Day 15 of 60</progress>
</div>
```

### `ct-phone`
The keypad phone on the patient screen: dark ink body, white screen with `--radius-lg`, caller block, transcript with bot lines (`ct-phone__line--bot`), patient lines (`--patient`), a "Heard:" line (`ct-phone__heard`), a mic level indicator (`ct-mic` with `data-level` 0 to 5), Answer and Decline keys (`ct-key--answer`, `ct-key--decline`) and keys 1, 2, 3, 9 (`ct-key`). `ct-phone--ringing` pulses the avatar; `ct-phone--keypad` lights the number keys.

### `ct-flag-item`
```html
<li class="ct-flag-item ct-flag-item--urgent">
  <div class="ct-flag-item__head"><span class="ct-status ct-status--urgent">...Urgent</span><span class="ct-flag-item__name">Arjun</span><time>21:30</time></div>
  <div class="ct-flag-item__body"><p>Says they feel unwell</p><blockquote class="ct-quote">haan le li, lekin chakkar aa raha hai</blockquote></div>
  <div class="ct-flag-item__action"><button class="ct-btn ct-btn--secondary">Called back</button></div>
</li>
```

### `ct-metric`
```html
<div class="ct-metric ct-metric--ok">
  <span class="ct-metric__value">0</span>
  <span class="ct-metric__label">Doses logged without a yes</span>
  <span class="ct-metric__target">Must be 0</span>
</div>
```

### `ct-empty`
```html
<div class="ct-empty"><svg class="ct-icon"><use href="#i-check"/></svg><p>No open flags.</p><button class="ct-btn ct-btn--secondary">Show closed</button></div>
```

### `ct-toast`
```html
<div class="ct-toasts" aria-live="polite"><div class="ct-toast"><svg class="ct-icon"><use href="#i-check"/></svg>Dose logged</div></div>
```

### Smaller pieces
`ct-tag` (for "Language under review"), `ct-quote` (patient's exact words, marigold rule), `ct-notice` (inline information, `--warn`, `--urgent`), `ct-list`, `ct-dl`, `ct-week` (seven-day strip), `ct-footer`, `ct-legal` (legal page column).

## Do and don't

| Do | Don't |
|---|---|
| Pair status color with an icon and a label | Show status by color alone |
| Use marigold as a fill or a rule | Put marigold text on white (fails contrast) |
| Use tokens for every color, size and space | Write hex values or px font sizes outside `tokens.css` |
| Keep buttons at least `--tap-min` tall | Make small icon-only buttons without a label |
| Quote the patient's exact words | Paraphrase what a patient said in a flag |
| Say "A nurse will call you" | Give any health advice in UI or voice lines |
| Use a comma, colon or full stop | Use em or en dashes |
