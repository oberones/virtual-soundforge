# Generative Rewrite Plan

## What Exists Today

- `gui.js` is a tracker-era monolith that owns song data, editing, serialization, playback, and UI.
- The original SoundBox renderer helped validate the first prototype, but the generative app now uses its own direct PCM synth path.
- The legacy app still exists as a reference implementation and comparison point.

## Rewrite Direction

Build the generative application next to the legacy tracker until the new path is mature.

- Keep as reusable backend pieces:
  - broad musical constraints learned from the old row-based workflow
  - the existing repo as a reference while the new app matures
- Replace as new product surface:
  - authoring model
  - interaction model
  - UI
  - generation logic
  - audio rendering

## Phase Breakdown

### Phase 1

- Create a parallel app entry point
- Define a new project schema
- Add a seeded random generator
- Add a clean standalone synth renderer for playback and WAV export

### Phase 2

- Add phrase mode
- Introduce motif repetition and mutation
- Capture phrase families instead of direct row data

Status:

- The current generator now emits sections and phrase instances as the
  composition backbone.
- Phrase mode is now implemented as a first pass with reusable phrase families
  and lightweight mutation across repeated phrase instances.
- The next improvement is to make phrase mutations more musical and intentional
  rather than mostly structural.

### Phase 3

- Add song mode
- Generate sections such as intro, verse, chorus, and bridge
- Add contrast heuristics between sections

### Phase 4

- Replace the legacy live preview path with a modern Web Audio implementation
- Add better transport, section regeneration, and partial audition

## Current Assumptions

- The current prototype uses one bar per SoundBox pattern and 16 rows per bar.
- Random mode is the first implemented mode.
- The current prototype is intentionally harmonic-only and avoids percussive arrangement ideas.
- The generative app now owns `index.html` as the default entry point.
