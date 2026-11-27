---
name: design-system
description: Use for any UI change in Care Taker. Explains tokens, components, layout rules and the quality bar so every screen looks like one product.
---
1. Read `docs/DESIGN.md` and `public/css/tokens.css` first.
2. Build only from components in `public/css/components.css`. If a new pattern is needed, add it there as a component with a `ct-` class, document it in DESIGN.md, then use it.
3. Colors only through tokens. Status is always shown with color AND a text label AND an icon, never color alone.
4. Spacing only from the 4px scale tokens. Radius and shadow only from tokens.
5. Type: Noto Sans family for every script. Minimum body size `--text-md` on patient screens, `--text-sm` only for metadata.
6. Before finishing: check the screen at 360px and 1280px, tab through it with the keyboard, confirm focus rings are visible, confirm no raw hex or px font sizes outside tokens.css (`grep -rnE "#[0-9a-fA-F]{3,6}" public --include=*.css --include=*.html --include=*.js | grep -v tokens.css` must return nothing).
