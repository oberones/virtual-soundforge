# Development guide

## Scope and documentation

Keep README.md user-facing: describe the application, its features, first use,
and basic build/deployment steps. Keep architecture, contributor checks,
release rules, and the detailed operations runbook here. Only document features
implemented in the active app; docs/rewrite-plan.md contains historical planning
context and is not a promise of shipped functionality.

## Architecture

Virtual Soundforge is a framework-free static application using HTML, CSS, and
browser ES modules. There is no package installation, bundler, backend service,
or database. The Docker build packages the active static files with nginx.

- `index.html` and `index.css`: Composer UI and shared styling.
- `details.html` and `src/app/details.js`: latest composition summary and generation log.
- `src/app/main.js`: form state, generation, live transport, and downloads.
  Control changes regenerate after a 140 ms debounce and update upcoming notes
  while the transport runs. Generate applies changes immediately.
- `src/app/visualizer.js`: canvas visualization connected to live playback.
- `src/core/project.js`: form normalization, project schema, harmonic voice
  definitions, style palettes, and composition summaries.
- `src/core/music-theory.js` and `src/core/seeded-rng.js`: musical helpers and
  reproducible random generation.
- `src/core/generators/random.js`: Random, Phrase, and Song generation, including
  sections, phrase families, phrase instances, and track note events.
- `src/core/render/live-synth.js`: live Web Audio playback and scheduling.
- `src/core/render/simple-synth.js`: direct PCM rendering and WAV encoding.
- `src/core/render/midi-export.js`: MIDI export from the composition.
- `src/core/storage/session.js`: sessionStorage snapshot under
  `virtual-soundforge.latest-snapshot` containing summary, debug data, and a
  timestamp. This powers Details; it is not a saved project or form restore.

The app focuses on harmony rather than percussion. Preserve seeded generation
and the shared composition model used by playback and exports. Live playback
and WAV rendering use separate synth implementations.

## Legacy reference and licensing

The original SoundBox tracker is historical reference, not the active runtime.
Legacy files include `gui.js`, `player.js`, `player-worker.js`, `player-small.js`,
`jammer.js`, and related demo, help, GUI, and preset assets. Do not reconnect the
new app to the old tracker/render path unintentionally. The rewrite has its own
composition model and lightweight synth renderers.

Legacy SoundBox editor files remain under GPLv3; see [gpl.txt](gpl.txt).
Review inherited files separately from newly added rewrite code when assessing
distribution licensing; do not infer a separate license for new code.

## Local development and validation

Use Python 3 and Make for `make serve` (default `127.0.0.1:8008`), or
`make serve PORT=9000 HOST=0.0.0.0` to override the listener. Serve over HTTP;
do not open the modules via `file://`. Node.js 24 is used by CI for checks.

```bash
make check
node --test scripts/release-metadata.test.mjs
docker compose --file deploy/compose.production.yml config --quiet
```

`make check` checks syntax in every active `src/**/*.js` module. Release tests
exercise release eligibility and image-tag rules; neither verifies audible
output. For runtime changes, also exercise generation modes, live control
changes, start/stop, visualization, Details, and WAV/MIDI downloads in a browser.
Container HTTP checks, hosted publication, server deployment, and interactive
browser/audio acceptance are separate evidence; report what was actually run.

## Container Usage

The nginx image serves the active app on port 80, including `details.html`,
all modules under `src/`, the stylesheet, favicon, and `gpl.txt`. Repository
metadata and legacy tracker files are excluded. Missing files return HTTP 404;
JavaScript is served with its module-compatible MIME type. App URLs remain
relative. A manually configured reverse proxy serving a subdirectory must
strip that prefix and redirect the bare prefix to a trailing slash.

Build and run locally with Docker (Node.js 24 is needed only for checks):

```bash
make check
node --test scripts/release-metadata.test.mjs
docker build --platform linux/amd64 -t virtual-soundforge:local .
docker run --rm --platform linux/amd64 --name virtual-soundforge-local \
  -p 127.0.0.1:8080:80 virtual-soundforge:local
```

Open `http://localhost:8080/` or `http://localhost:8080/details.html`.
In another terminal, run the same HTTP checks used in CI:

```bash
node scripts/container-smoke.mjs http://127.0.0.1:8080/
```

The release platform is `linux/amd64`; running it on an ARM computer requires
Docker's x86 emulation. The base nginx version and digest are pinned in the
Dockerfile. Update both together and rerun these checks when upgrading nginx.

## GHCR Releases

[The container workflow](.github/workflows/publish.yml) verifies pull requests
to `main`, pushes to `main`, and version-shaped tag pushes. It checks all active
JavaScript modules, tests release rules, validates production Compose, builds the
image, and runs it with the production Compose settings to check health, HTTP
status, MIME types, file contents, and 404 responses. Branch and PR runs only verify.
Publishing runs after verification, using `GITHUB_TOKEN` with `packages: write`
granted only to that job, following
[GitHub's publishing guidance](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images).

Release tags follow `.cz.toml`: unprefixed SemVer, such as `0.2.0` or
`0.2.0-rc.1`. Tags with a `v` prefix do not publish. To publish, prepare a new release with Commitizen and push the resulting commit
and its tag. For example, after Commitizen has created a new `0.2.0` tag:

```bash
git push origin main
git push origin 0.2.0
```

Use the actual new release version. The existing `0.1.0` tag is left in place;
do not move or recreate it to trigger this workflow. Installing the workflow
does not publish older tags retroactively.

Images are published to `ghcr.io/oberones/virtual-soundforge`:

| Release | Image tags |
| --- | --- |
| Stable, e.g. `0.2.0` | `0.2.0`, `sha-<full-commit>`, `latest` |
| Prerelease, e.g. `0.2.0-rc.1` | `0.2.0-rc.1`, `sha-<full-commit>` |

Only stable releases update `latest`, in publishing order, without comparing
version precedence. Prereleases leave it unchanged. If SemVer build metadata is
used, Docker's tag restrictions require `+` to become `_`, e.g.
`0.2.0+build.1` becomes `0.2.0_build.1`; the OCI version label keeps the original.
Versions longer than Docker's 128-character tag limit fail before publishing.
OCI labels record the source repository, version, and full commit revision.
The workflow summary lists the published tags and digest.

Pull and run a published version explicitly (replace `0.2.0` with an available
release):

```bash
docker pull --platform linux/amd64 ghcr.io/oberones/virtual-soundforge:0.2.0
docker run --rm --platform linux/amd64 -p 127.0.0.1:8080:80 \
  ghcr.io/oberones/virtual-soundforge:0.2.0
```

For an immutable reference, copy the digest from the successful workflow summary:

```bash
# Replace the placeholder with the full sha256:... digest from the summary.
IMAGE_DIGEST='sha256:<digest-from-workflow-summary>'
docker pull --platform linux/amd64 "ghcr.io/oberones/virtual-soundforge@$IMAGE_DIGEST"
docker run --rm --platform linux/amd64 -p 127.0.0.1:8080:80 \
  "ghcr.io/oberones/virtual-soundforge@$IMAGE_DIGEST"
```

Package visibility is managed separately and is not changed by the workflow.
Public packages allow anonymous pulls. For a private package, use a GitHub
personal access token **(classic)** with `read:packages` from an account with
access to the package; authorize SSO if your organization requires it. Set
`GHCR_READ_TOKEN` securely in your shell, then log in before pulling:

```bash
printf '%s' "$GHCR_READ_TOKEN" | docker login ghcr.io \
  --username YOUR_GITHUB_USERNAME --password-stdin
```

See [GitHub's container registry guidance](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
for authentication and access settings. If the package already exists and
publishing is denied, check that the source repository has Actions write access
to that package; a visibility change is not required.

Hera deployments remain manually managed. This workflow only publishes images;
it has no SSH steps, deployment secrets, or server configuration. After pushing a new release tag, successful hosted publishing and a manual Hera
pull of the reported digest are separate acceptance checks. Local build and
HTTP checks do not establish either of those results.

## Production Compose on Hera

[`deploy/compose.production.yml`](deploy/compose.production.yml) follows the
Local Dope Wars deployment layout. It pulls the GHCR image on `linux/amd64`,
restarts automatically, joins the existing external `web-backend` network, and
binds host port `8082` to loopback. The container still serves on port `80`.
It runs as UID/GID `101:101` with a read-only root filesystem, dropped Linux
capabilities, no privilege escalation, a 64-process limit, and rotated logs.
Temporary files, nginx's PID, and its cache use small writable tmpfs mounts.
The Compose entrypoint bypasses nginx's configuration-editing startup scripts;
a container-local sysctl permits the unprivileged process to bind port 80.
An HTTP health check requests `/index.html`.

After the first successful GHCR publication, copy the Compose file to Hera as
`/opt/virtual-soundforge/compose.yml`. The deployment directory needs only this
file and an operator-managed `.env`; the service has no source mounts, build
step, or persistent volumes. Log in to GHCR as the account running Compose if
the package is private, using the instructions above. Keep credentials out of
Compose and `.env`.

Create `/opt/virtual-soundforge/.env` with an available release tag:

```dotenv
IMAGE_TAG=0.2.0
VIRTUAL_SOUNDFORGE_PORT=8082
VIRTUAL_SOUNDFORGE_NETWORK=web-backend
```

Replace `0.2.0` with the selected published version or `sha-<full-commit>` tag.
An absent or empty `IMAGE_TAG` defaults to `latest`. To select an immutable
digest instead, add the full reference below, replacing the placeholder:

```dotenv
VIRTUAL_SOUNDFORGE_IMAGE=ghcr.io/oberones/virtual-soundforge@sha256:<digest-from-workflow-summary>
```

`VIRTUAL_SOUNDFORGE_IMAGE` takes precedence over `IMAGE_TAG`; remove it when
switching back to tag selection. Shell variables override `.env`, so clear old
overrides before using the deployment's saved settings.

On Hera, ensure the selected network exists (create it once if necessary), then
pull and start the selected image:

```bash
cd /opt/virtual-soundforge
unset IMAGE_TAG VIRTUAL_SOUNDFORGE_IMAGE VIRTUAL_SOUNDFORGE_PORT VIRTUAL_SOUNDFORGE_NETWORK
docker network inspect web-backend >/dev/null 2>&1 || docker network create web-backend
docker compose --env-file .env config --quiet
docker compose --env-file .env pull virtual-soundforge
docker compose --env-file .env up --detach --no-build --wait --wait-timeout 120 virtual-soundforge
docker compose --env-file .env ps
curl --fail --show-error --silent -I http://127.0.0.1:8082/index.html
```

Use the configured network and host port if they differ from these defaults.
A containerized reverse proxy must share that network and use
`http://virtual-soundforge:80/` as its upstream. A host proxy uses
`http://127.0.0.1:8082/`. For a subdirectory such as `/apps/virtual-soundforge/`,
the HTTPS proxy can use:

```nginx
location = /apps/virtual-soundforge {
    return 301 /apps/virtual-soundforge/;
}

location /apps/virtual-soundforge/ {
    proxy_pass http://virtual-soundforge:80/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

The trailing slash on `proxy_pass` strips the prefix. Reload the proxy after
replacing the app container if it caches the old container IP. Verify both HTML
pages and `src/app/main.js` through the public URL, check that a missing module
returns 404, then verify playback in the browser.

For an update, record the current image selection, edit `.env`, and repeat the
pull/start/check commands. To roll back, restore the previous selection and
repeat those commands. Inspect health, revision, and logs with:

```bash
docker inspect --format '{{.Config.Image}} {{.State.Health.Status}}' virtual-soundforge
docker inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' virtual-soundforge
docker compose --env-file .env logs --tail=100 virtual-soundforge
```

Compose startup and local HTTP checks are separate from the manual Hera pull,
public proxy, and browser acceptance checks. These instructions do not add
automatic deployment to the publishing workflow.

