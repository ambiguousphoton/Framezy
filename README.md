<div align="center">
  <img src="assets/icon.png" alt="Framezy" width="120" />
  <h1>Framezy</h1>
  <p><strong>Shot tracking for animators.</strong></p>
</div>

Framezy tracks animation work the way animators actually measure it — in
**frames and pipeline stages**, not checkboxes. A shot isn't done or not-done; it
moves through Blocking → Splining → Polish, and progress is counted in footage.

Everything is stored locally on your device. No account, no server, no tracking.
See [PRIVACY.md](PRIVACY.md).

## Features

**Projects → Shots.** Group shots under a show, episode, or reel. Each project
sets a default pipeline and frame rate, a description, and an expected
completion date.

**Pipeline stages instead of a checkbox.** Tap the stage pill to walk a shot
down its pipeline:

| Pipeline | Stages |
| --- | --- |
| 3D / CG | Blocking → Blocking+ → Splining → Polish → Final |
| 2D / Hand-drawn | Thumbs → Keys → Breakdowns → Inbetweens → Cleanup → Colour |

Each shot picks its own pipeline, so mixed 2D/3D work lives in one list.

**Frame-based progress.** Shots carry a frame count and their own frame rate, so
headers report real footage — `412f of 1,180f · 35% · Length 49.2s` — with
progress weighted by how far each shot is through its pipeline.

**Timeline view.** Shots laid out as a track, scaled by **duration** so the
second-ruler stays honest even when shots run at different frame rates. Each
block is coloured by the shot's identity colour, with a keyframe diamond that
fills in at Final.

**Version tracking.** A `v001` badge that bumps when you submit to dailies — a
`v009` still sitting in Polish tells you which shot is fighting you.

**Dailies notes.** Notes anchored to a frame (`f47 — contact pose floaty`),
ticked off as you address them. Unaddressed counts surface on the row and the
timeline block.

**Drag to reorder.** Hold and drag a shot in either the list or the timeline; a
marker shows where it will land.

**Paste a shot list.** Paste `code frames stage` one per line — tabs, commas, or
spaces — so a column out of a spreadsheet imports directly. Headers and
duplicates are skipped, with a preview before you commit.

## Running locally

```sh
npm install
npx expo start
```

Then press `a` for Android, `i` for iOS, or scan the QR code with Expo Go.

All native modules used are bundled in Expo Go, so no development build is
needed to run it — though you'll need one to see the real splash screen, which
Expo Go substitutes with its own.

## Building

```sh
npx eas-cli build --profile preview  --platform android   # installable APK
npx eas-cli build --profile production --platform android # Play Store bundle
```

## Project layout

Flat by design — it's a small app, and a folder tree would add indirection
without adding clarity.

| File | Role |
| --- | --- |
| `App.tsx` | Routes between the two screens |
| `useStore.ts` | All state, validation, and local persistence |
| `types.ts` | Domain model, pipelines, and formatting helpers |
| `ProjectsScreen.tsx`, `ProjectRow.tsx`, `ProjectOptions.tsx` | Project list and settings sheet |
| `ShotsScreen.tsx`, `ShotRow.tsx`, `ShotDetail.tsx` | Shot list and shot editor |
| `Timeline.tsx` | Duration-scaled timeline track |
| `Reorderable.tsx`, `dragTarget.ts`, `reorderShots.ts` | Drag-to-reorder, with the geometry kept pure and testable |
| `parseShotList.ts` | Pasted shot-list parser |
| `Composer.tsx`, `AddShotBar.tsx`, `AddProjectBar.tsx` | Shared add-flow shell |
| `stats.ts` | Frame and duration rollups |
| `theme.ts` | Palette, contrast-safe text colours, shot colours |
| `scripts/make-icons.py` | Regenerates every app icon size from the source logo |

Design notes worth knowing if you're reading the code:

- **Colour carries two separate meanings.** The pink stage ramp means *progress*;
  a shot's own colour means *identity*. They're deliberately never mixed.
- **`textOn()` picks label colour by luminance**, because the brand pink is light
  enough that white text on it fails contrast.
- **Deadlines are parsed from components, not strings.** `new Date("2026-02-31")`
  silently rolls over to 3 March, and string parsing differs between Hermes and
  other engines.

## Licence

See [LICENSE](LICENSE).
