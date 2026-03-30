# Virtual Soundforge

Virtual Soundforge is a browser-based generative harmony application built in
plain HTML, CSS, and JavaScript.

The current project no longer treats the original SoundBox tracker as the main
runtime path. Instead, the generative app lives as its own standalone
experience, with its own composition model and its own lightweight synth
renderer.

## Current App

The main entry point for the new app is:

- `index.html`

The current prototype focuses on:

- harmonic composition instead of tracker editing
- configurable key, scale, tempo, bar count, note length, and number of voices
- seeded generation for repeatable results
- direct audio rendering to WAV using a custom synth path

## Legacy Reference

This repository still contains the original SoundBox-style editor and playback
code as reference material.

Relevant legacy files include:

- `gui.js`
- `player.js`
- `player-worker.js`
- `jammer.js`

Those files are no longer part of the active generative runtime, but they are
useful historical context while the rewrite continues.

## Project Structure

- `index.html`: standalone generative app entry point
- `index.css`: styling for the new UI
- `src/app/main.js`: app wiring, form handling, playback, export
- `src/core/project.js`: project schema and harmonic voice definitions
- `src/core/generators/random.js`: seeded harmonic generator
- `src/core/render/simple-synth.js`: custom audio renderer and WAV encoder
- `docs/rewrite-plan.md`: rewrite notes and implementation direction

## Running Locally

Serve the repository from a local web server:

```bash
cd /path/to/soundbox
python -m http.server 8008
```

Then open:

- `http://localhost:8008/` or `http://localhost:8008/index.html` for the new app

Do not use `file://`; browser module loading and audio behavior are more
reliable through a local server.

## Development Notes

- The active rewrite is intentionally framework-free.
- The generative app is now independent from the old SoundBox render path.
- The current prototype is harmonic-first and intentionally avoids percussion.
- Audio export currently produces a rendered WAV file in the browser.

## License

The repository still contains legacy SoundBox code and assets. The SoundBox
editor files remain covered by the GNU General Public License version 3; see
[gpl.txt](gpl.txt).

If licensing becomes important for distribution, review the inherited files
carefully and treat the legacy code separately from newly added rewrite code.
