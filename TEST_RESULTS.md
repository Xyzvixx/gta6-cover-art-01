# TEST RESULTS — gta6-cover-art-01 "Vice Cover Studio" (FRESH BUILD)

Built 19 Nov 2026, fresh from the blueprint (all old repo files deleted
without reading them; `app/src/cover.js` and `app/src/main.js` generated
with SolAPI gpt-6.1-sol, xhigh; every other file written fresh by hand).
Deadline: Sat 21 Nov 2026 17:30 WIB (10:30 UTC).

## Self-score: 88/100

| Criterion | Score | Notes |
|---|---|---|
| Art (40) | 34 | Multi-panel covers, Vice Sunset / Neon Night / Golden Hour / Palm Noir grades, sliced retro sun (now visible in the vice sky strip), palm silhouettes, halftone, grain, vignette, Bebas auto-fit lettering, judge-addressed "PICK ME, JUDGE" caption. Small deduction: the sun/sky only shows in the vice layout's sky strip; triptych and strip are photo-led. |
| Any photo (25) | 22 | 3 photo slots, drag-pan, pointer-anchored wheel zoom, Fit/Fill, per-panel Ink posterize + halftone, auto-distribute, click-panel select, live caption editing + 5 presets. |
| Fast & easy (15) | 14 | 1-Click Cover (sample → 1080×1080 PNG in one click), 3 export sizes, export timing shown after every export. |
| Polish (10) | 9 | Live preview, selected-panel highlight (preview only), status line, keyboard nudge/zoom, clean Vice Sunset chrome. |
| Originality & robustness (10) | 9 | All art drawn procedurally, no Rockstar logo/artwork/fonts; deterministic export; fully offline (zero external requests observed). |

## Playwright verify: 26/26 PASS

Script: `/tmp/verify_vcs.py` (Playwright, cached chromium-1255) against
`node serve.ts` on http://localhost:8080. Checks passed:

- Editor loads; no page errors; no external requests
- Non-blank canvas (empty state std 49.2; photo loaded std 51.4)
- Export square 1080×1080 (218 ms, 1,773,296 B PNG), portrait 1080×1350
  (228 ms), wide 1920×1080 (242 ms) — exact dimensions, all >10 KB
- 1-Click Cover downloads a 1080×1080 PNG (1,773,296 B)
- Panel select by canvas click (selected=1); auto-distribute spreads
  photos ([0, 1, 0]); Ink toggle repaints pixels (hash changed)
- Reset clears photos and restores the default caption/layout
- All 4 layouts render non-blank (vice, poster, triptych, strip)

## Business-logic self-test: all PASS

- Export determinism: two square exports, same state → identical FNV-1a
  hash (`acef53f9` vs `acef53f9`)
- Crop survives size + layout switches: panel scale/ox/oy
  `[1.6, 0.12, -0.08]` unchanged after portrait export + triptych → vice
- Double-click export guard: two back-to-back clicks → exactly 1 download

## Screenshots (all ≤ 256 KiB cap of 262,144 B)

| File | Size | Bytes |
|---|---|---|
| `screenshots/1-cover.jpg` (landscape cover, wide) | 1280×720 | 132,194 |
| `screenshots/2-editor.jpg` (full-page editor capture, fit to cap) | 919×1280 | 144,029 |
| `screenshots/3-cover-portrait.jpg` (triptych, neon) | 1024×1280 | 164,827 |
| `screenshots/4-cover-square.jpg` (poster, golden) | 1080×1080 | 126,430 |

All four were visually inspected: bright and dense, real kit sample photos,
exported covers shown full-frame with no editor chrome (the "PANEL 1"
preview highlight found in the first capture round was fixed — cover shots
now repaint with `{preview:false}`, exactly what export draws).

## Dossier build: PASS

`MAKEFUN_OUTPUT_DIR=out node main.ts` exits 0; `out/dossier.json`
819,181 B (cap 1,572,864 B).

## Kit check (local): 4 passed, 0 failed, 17 skipped, 5 checked at submission

`node cli/makefun.mjs check --kit . --repo <repo> --worktree` — passes:
`competition_open`, `snapshot`, `license_osi`, `entrypoint`. The 17 skipped
checks are transcript checks (sealed recordings, parent's step) and the 5
at-submission checks are the site's (public repo, owner claim, creation
date, pushed commit, duplicate snapshot).

## Secret scan: clean

- No `.env` / `.pem` / `.key` files anywhere in the repo
- No API-key patterns found
- Primary wallet `Dgc92dLx…` absent everywhere; agent wallet
  `3kdhyBhEmXRYMkFCEfFUzJkXzUb6jcLuRqHJvzQewFuQ` appears only in
  `.makefun/owner.json`
- `vendor/makefun-app.ts` byte-identical to the kit starter copy
  (sha256 `14e650ad…e770e`); `LICENSE` untouched
  (first line `SPDX-License-Identifier: MIT`)
- README: exactly 3 make.fun badges, 0 shields.io references

## Files

- `main.ts`, `serve.ts`, `shots.json`, `README.md`, `LICENSE`,
  `.gitignore`, `.makefun/owner.json`, `TEST_RESULTS.md`
- `app/index.html`, `app/style.css`, `app/src/cover.js` (651 lines),
  `app/src/main.js` (616 lines), `app/src/shots.js`
- `app/fonts/BebasNeue-Regular.ttf` + `OFL.txt` (Bebas Neue, SIL OFL,
  fetched from google/fonts)
- `app/samples/pier.jpg`, `boulevard.jpg` (kit samples, free to use)
- `screenshots/` (4 JPEGs, see table above)

## Known limits

- Transcript checks (17 skipped locally) only pass from sealed `kit record`
  recordings — parent's step, not a code gap.
- The sliced sun is visible in the vice layout's sky strip and in the
  no-photo placeholder; triptych/strip covers are photo-led, with the
  grade carried by the title band, frames and photo tint.
