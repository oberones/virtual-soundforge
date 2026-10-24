import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";

const base = new URL(process.argv[2] ?? "http://127.0.0.1:8080/");
const root = new URL("../", import.meta.url);
const request = (path) => fetch(new URL(path, base), {
  redirect: "manual",
  signal: AbortSignal.timeout(5000),
});

// Give nginx time to start, but do not retry failed content/type assertions.
for (let attempt = 0; ; attempt++) {
  try {
    const response = await request("index.html");
    await response.arrayBuffer();
    if (response.status === 200) break;
    throw new Error(`nginx is not ready (HTTP ${response.status})`);
  } catch (error) {
    if (attempt === 29) throw error;
    await setTimeout(1000);
  }
}

const assets = [
  ["", "text/html", "index.html"],
  ["index.html", "text/html"],
  ["details.html", "text/html"],
  ["index.css", "text/css"],
  ["favicon.ico", "image/x-icon"],
  ["gpl.txt", "text/plain"],
];
const modules = (await readdir(new URL("src/", root), { recursive: true }))
  .filter((path) => path.endsWith(".js")).sort();
assert.ok(modules.length > 0, "Expected active JavaScript modules");
for (const module of modules) assets.push([`src/${module}`, "application/javascript"]);

for (const [path, mime, file = path] of assets) {
  const response = await request(path);
  assert.equal(response.status, 200, `${path || "/"} status`);
  assert.equal(response.headers.get("content-type")?.split(";")[0], mime, `${path} MIME type`);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), await readFile(new URL(file, root)), `${path} contents`);
  console.log(`PASS ${path || "/"} (${mime})`);
}

for (const path of [
  "missing.html", "missing.css", "src/app/missing.js", ".git/config", ".git/HEAD",
  ".github/workflows/publish.yml", ".cz.toml", ".DS_Store", "src/.DS_Store",
  "Dockerfile", "docker/nginx.conf", "README.md", "Makefile", "50x.html",
  "scripts/release-metadata.mjs", "gui.js", "player.js", "help.html", "demo.html",
  "gui/keyboard.jpg", "third_party/Blob.js", "_notes/dwsync.xml",
]) {
  const response = await request(path);
  await response.arrayBuffer();
  assert.equal(response.status, 404, `${path} must not be served`);
  console.log(`PASS ${path} (404)`);
}
