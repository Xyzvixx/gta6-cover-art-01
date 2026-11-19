# Vice Cover Studio — GTA 6-style cover art maker

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Xyzvixx/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Xyzvixx/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn any photo into a sun-soaked, neon-drenched multi-panel cover in the
spirit of GTA 6 key art — right in your browser, with no upload, no account,
and no build step. Pick a photo, pick a layout and a colour grade, type a
title, and export a print-ready PNG. The whole thing runs offline from a
static folder.

This is an entry for the
[make.fun bounty gta6-cover-art-01](https://make.fun/bounty/gta6-cover-art-01)
("Make GTA 6 Cover Art", $250 prize pool).

## What you get

- **Four poster layouts.** Vice Cover (hero photo plus two panels under a
  title band), Poster (one full-bleed image), Triptych (three upright
  panels), and Strip (two panels with a title band, made for widescreen).
- **Four colour grades.** Vice Sunset (hot pink melting into tangerine),
  Neon Night (deep purple with cyan and magenta glow), Golden Hour (warm
  amber), and Palm Noir (high-contrast black-and-white with a single neon
  accent). Every grade is a gradient and duotone treatment drawn live over
  your photo — nothing is a flat filter.
- **Real cover art, drawn by code.** The sliced retro sun, the palm-tree
  skyline, the halftone dots, the vignette, and the film grain are all
  painted procedurally on canvas. There are no Rockstar logos, no official
  artwork, and no official fonts anywhere in the project.
- **Big condensed lettering.** Titles are set in Bebas Neue (open licensed,
  bundled in `app/fonts/`) with a white fill, dark outline, and hard drop
  shadow, and they shrink to fit automatically so a long title never
  overflows the frame. A letterspaced subtitle and a "VICE CITY" tag line
  finish the look.
- **Any photo, arranged your way.** Three photo slots: upload your own
  pictures or use the two bundled samples. Each panel can show any slot, or
  mirror the hero photo so one shot stretches across the whole cover. Drag
  to pan inside a panel, scroll or slide to zoom, switch between Fit and
  Fill, or let the auto-distribute button spread your photos across the
  panels for you. Clicking a panel on the canvas selects it.
- **Captions with one-click presets.** Type any title and subtitle, or grab
  a preset — including one that speaks straight to the judge. The Ink
  toggle repaints the selected panel as a posterized, halftone print.
- **Four export sizes, including Story.** Export a PNG at 1080×1080
  (square), 1080×1350 (portrait), 1920×1080 (wide), or **1080×1920 (story,
  9:16 — new in Round 2)** for Instagram and TikTok stories. The preview
  and the export run through the exact same drawing code, so what you see
  is byte-for-byte what you download.
- **One-click cover.** A single button loads a sample photo and saves a
  1080×1080 PNG — photo to finished cover in one click. The status line
  tells you how many milliseconds the export took.
- **Deterministic exports.** Exporting the same cover twice produces
  byte-identical PNGs. Panning and zooming survive switching size or
  layout, and double-clicking Export can only ever start one download.

## How to use it

1. Open the app (see *Run it locally* below) and load a photo into slot 1
   — either upload your own or click one of the sample photos.
2. Optionally load a second and third photo, then press **Auto-distribute**
   to spread them across the panels.
3. Choose a layout and a grade. Click a panel on the canvas to select it,
   then drag the photo inside it to reframe, and zoom with the mouse wheel
   or the zoom slider.
4. Type your title and subtitle, or pick a caption preset. Flip the **Ink**
   toggle if you want that panel printed like a poster.
5. Pick an export size — square, portrait, wide, or story — and press
   **Export PNG**. Your file downloads as
   `vice-cover-<size>-<width>x<height>.png`.

### Keyboard shortcuts

- **Arrow keys** — nudge the selected photo inside its panel.
- **+ / −** — zoom the selected photo in and out.
- **1 / 2 / 3** — select panel 1, 2, or 3.

### Tips for a cover that pops

- Photos with a clear subject and a bit of sky work best; the sun and the
  palm skyline sit in the title band, so a horizon near the top of the
  frame composes beautifully.
- Fill crops, Fit letterboxes: use Fill when you want the panel packed
  edge to edge, Fit when the whole photo matters.
- Portrait photos in the wide layout get cropped, never stretched — drag
  to choose which part of the photo survives.
- No photo at all still makes a cover: the app paints the gradient sky,
  the sun, the palms, and your title, so the canvas is never blank.

## Run it locally

No dependencies, no build step — just a static file server:

```sh
node serve.ts
# open http://localhost:8000
```

Any static server works (`python3 -m http.server` from `app/` does the
job too). Everything is plain HTML, CSS, and JavaScript; the font and the
sample photos are bundled, and the app makes zero network requests.

## Privacy

Your photos never leave your machine. Uploads are read with `FileReader`
into object URLs and drawn straight onto the canvas; nothing is sent to a
server, because there is no server. Close the tab and the photos are gone.

## Screenshots

| File | Shows |
| --- | --- |
| `screenshots/1-cover.jpg` | Exported Vice Cover, 1920×1080 |
| `screenshots/2-editor.jpg` | The editor and its live preview |
| `screenshots/3-cover-portrait.jpg` | Exported portrait cover, 1080×1350 |
| `screenshots/4-cover-square.jpg` | Exported square cover, 1080×1080 |

## Project map

```text
repo/
  main.ts            dossier builder (copies app/ + screenshots/)
  serve.ts           tiny static server for local testing
  vendor/            make.fun kit file, unchanged
  shots.json         screenshot manifest (queries + sizes)
  app/
    index.html       editor shell: controls on the left, live preview centre
    style.css        Vice Sunset chrome for the editor
    fonts/           Bebas Neue Regular (SIL OFL) + licence text
    samples/         two bundled sample photos
    src/cover.js     the art engine: layouts, grades, sun, palms, lettering
    src/main.js      editor wiring: slots, pan/zoom, export, shortcuts
    src/shots.js     fixed scenes for repeatable screenshots
  screenshots/       the four shots above (each ≤ 256 KiB)
```

The drawing engine (`drawCover`) is a pure function of the editor state,
which is why the live preview, the export, and the screenshots can never
drift apart: one code path paints all three.

## Licence

MIT — see `LICENSE`. Bebas Neue is licensed under the SIL Open Font
License, included as `app/fonts/OFL.txt`.
