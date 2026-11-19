# Vice Cover Studio

[![🎬 Make GTA 6 Cover Art — make.fun](https://make.fun/c/gta6-cover-art-01)](https://make.fun/c/gta6-cover-art-01)
[![🏆 make.fun — build, enter, get ranked](https://make.fun)](https://make.fun)
[![📋 GTA 6 Cover Art competition API — make.fun](https://make.fun/api/competitions/gta6-cover-art-01)](https://make.fun/api/competitions/gta6-cover-art-01)

**Vice Cover Studio** turns any photo and a caption into GTA-style
multi-panel cover art — the Vice City sunset poster look, with bold Bebas
lettering — and exports it as a PNG to share. It runs entirely offline in
your browser: no build step, no dependencies, no network requests, and your
photos never leave your machine.

## What it does

- **4 layouts** — Vice Cover (hero + 2 panels + title band), Poster
  (full-bleed), Triptych (3 vertical panels), Strip (2 panels + title band).
- **4 grades** — Vice Sunset, Neon Night, Golden Hour, Palm Noir: gradient
  skies, sliced retro sun, palm silhouettes, halftone, grain and vignette,
  all drawn procedurally on canvas.
- **Any photo** — 3 photo slots (upload your own or use the free kit
  samples); per-panel drag to pan, scroll to zoom (anchored at the cursor),
  Fit/Fill toggle, Ink posterize + halftone per panel, auto-distribute, and
  click a panel on the cover to select it.
- **Caption** — live title + subtitle editing with auto-fit lettering
  (solid or outline style) and one-click presets, including
  "PICK ME, JUDGE / YOUR NEXT WINNER".
- **Fast & easy** — ⚡ **1-Click Cover** loads a sample and exports a
  1080×1080 PNG in one click. Export sizes: 1080×1080, 1080×1350,
  1920×1080. Export is deterministic: the same cover always makes the
  same PNG bytes, and the time taken is shown after every export.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

No install, no build. Open `app/index.html` from any static server and it
works with no network.

## Original art only

Every visual is drawn fresh by this app (procedural sun, palms, halftone,
grain). No Rockstar Games logo, artwork, character or font is used anywhere.
Lettering is Bebas Neue (SIL Open Font License), vendored under
`app/fonts/` with its `OFL.txt`. The two sample photos ship with the kit
and are free to use.

## Files

- `app/index.html`, `app/style.css` — editor shell and Vice Sunset chrome
- `app/src/cover.js` — the art engine: layouts, grades, sun, palms,
  halftone, grain, lettering auto-fit (pure function of state; preview and
  export share this code path, so what you see is what you export)
- `app/src/main.js` — editor wiring: photo slots, pan/zoom, presets,
  export, 1-Click Cover
- `app/src/shots.js` — `?shot=cover|editor` staging for screenshots
- `main.ts` — entry program: copies `app/` + `screenshots/` to the output
  directory and writes `dossier.json` (Node 22, stdlib only)
- `serve.ts` — tiny static dev server
- `shots.json` — the four screenshot scenes
- `screenshots/` — the cover and editor screenshots

## License

MIT — see [LICENSE](LICENSE).
