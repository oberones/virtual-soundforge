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

Use the Makefile dev server:

```bash
cd /path/to/soundbox
make serve
```

You can override the bind address or port if needed:

```bash
make serve PORT=9000 HOST=0.0.0.0
```

The underlying server is Python's built-in `http.server`, so you can also run
that directly if you prefer.

Then open:

- `http://localhost:8008/` or `http://localhost:8008/index.html` for the new app

Do not use `file://`; browser module loading and audio behavior are more
reliable through a local server.

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
`0.2.0-rc.1`. Tags with a `v` prefix do not publish. After this workflow is merged
to `main`, prepare a new release with Commitizen and push the resulting commit
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
it has no SSH steps, deployment secrets, or server configuration. After merging
and pushing a new release tag, successful hosted publishing and a manual Hera
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
