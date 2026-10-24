# Virtual Soundforge

Virtual Soundforge is a browser-based music generator for creating harmonic
sketches and evolving loops. Choose a key and sound, shape the arrangement,
and listen as you experiment. Export the result as audio or MIDI to use in
other music tools.

## Features

- **Three generation modes:** explore ideas with Random, build repeating motifs
  with Phrase, or create section-based arrangements with Song.
- **Musical controls:** choose major or minor, set tempo and bar count, layer up
  to six voices, and adjust note length.
- **Sound and arrangement:** choose Warm, Glassy, Organ, Dark, or Lush textures;
  adjust density, complexity, variation, drama, and evolution. Song mode also
  offers Short, Balanced, and Full forms.
- **Repeatable ideas:** the same seed and settings reproduce a composition;
  Shuffle Seed gives you a new starting point.
- **Live looping:** change controls during playback to reshape upcoming notes,
  with an animated visualizer alongside the music.
- **WAV and MIDI downloads:** save rendered audio or take the generated notes
  into a MIDI-capable music application.
- **Composition details:** view a summary and generation information on the
  Details page.

Generation, playback, and export run in your browser, with no account required.
The app focuses on harmony rather than drum programming or manual note editing.

## Getting started

1. Open the app in a browser with Web Audio support.
2. Choose a mode, key, scale, and style, or start with the defaults.
3. Click **Start Loop** to listen. Adjust the controls while it plays; changes
   apply automatically. Click **Generate** to apply the current settings immediately.
4. Click **Shuffle Seed** to explore another composition, or reuse a seed and
   settings you like. Click **Stop Loop** to stop playback.
5. Click **Export WAV** for audio or **Export MIDI** for editable notes.

Exports contain the current generated composition, not a recording of your
live control changes. MIDI sound depends on the instrument used to play it.
The Details page shows the latest composition in the current browser session;
it is not a saved-project library. Export work you want to keep, and record the
seed and settings if you want to recreate it.

## Run locally

With Python 3 and Make installed, run this from the repository directory:

```bash
make serve
```

Open [localhost:8008](http://localhost:8008/). Stop the server with Ctrl+C.
To use another port, run `make serve PORT=9000`.

Without Make, use:

```bash
python3 -m http.server 8008 --bind 127.0.0.1
```

Serve the app over HTTP rather than opening `index.html` directly from disk.
No Node.js installation or compilation step is needed to run the app.

## Build and run with Docker

With Docker installed, build the application image from the repository root:

```bash
docker build --platform linux/amd64 -t virtual-soundforge:local .
docker run --rm --platform linux/amd64 --name virtual-soundforge-local \
  -p 127.0.0.1:8080:80 virtual-soundforge:local
```

Open [localhost:8080](http://localhost:8080/). The image serves the application
with nginx. The release platform is `linux/amd64`; ARM computers need Docker's
x86 emulation for these commands.

## Deploy

The app can be hosted as static files or run as a Docker service.

For **static hosting**, upload `index.html`, `details.html`, `index.css`,
`favicon.ico`, `gpl.txt`, and the complete `src/` directory, preserving their
relative paths. Configure the server to serve JavaScript with the appropriate
MIME type and return 404 for missing files. No application server or database
is required.

For **Docker Compose**, use [deploy/compose.production.yml](deploy/compose.production.yml).
It pulls images from `ghcr.io/oberones/virtual-soundforge`. Choose a version
from a successful release workflow; the version below is a placeholder, not a
claim that it has been published.

From the repository root, create the external network once if it does not
already exist, then start the service:

```bash
docker network inspect web-backend >/dev/null 2>&1 || docker network create web-backend
export IMAGE_TAG='<published-version>'
docker compose --file deploy/compose.production.yml pull
docker compose --file deploy/compose.production.yml up --detach --no-build --wait
```

The default address is `http://127.0.0.1:8082/` on the Docker host. Put an HTTPS
reverse proxy in front for public access. A proxy on the same `web-backend`
Docker network can use `http://virtual-soundforge:80/`; a host proxy can use
`http://127.0.0.1:8082/`. Private registry packages require authentication before
pulling. Subdirectory hosting needs a trailing slash in the public URL and a
proxy that strips the prefix.

To update or roll back, select the desired published version and repeat the
pull/start commands. Release publishing does not deploy the application
automatically. See [AGENTS.md](AGENTS.md) for registry authentication, digest
pinning, proxy configuration, the full deployment runbook, and contributor notes.

## License

This repository includes legacy SoundBox code and assets. The SoundBox editor
files remain covered by the GNU General Public License version 3; see
[gpl.txt](gpl.txt).
