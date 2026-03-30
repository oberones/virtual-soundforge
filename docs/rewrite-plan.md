# Generative Rewrite Plan

## What Exists Today

- `gui.js` is a tracker-era monolith that owns song data, editing, serialization, playback, and UI.
- `player-worker.js` is the most reusable part of the current codebase because it can render a SoundBox song object without depending on the editor.
- `presets.js` contains a practical starting palette for generative output.

## Rewrite Direction

Build the generative application next to the legacy tracker until the new path is mature.

- Keep as reusable backend pieces:
  - instrument parameter model
  - preset library
  - offline renderer
- Replace as new product surface:
  - authoring model
  - interaction model
  - UI
  - generation logic

## Phase Breakdown

### Phase 1

- Create a parallel app entry point
- Define a new project schema
- Add a seeded random generator
- Add a SoundBox adapter that converts generated material into the legacy render format

### Phase 2

- Add phrase mode
- Introduce motif repetition and mutation
- Capture phrase families instead of direct row data

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
- The legacy tracker remains available at `index.html`.
- The new prototype lives at `generative.html`.
