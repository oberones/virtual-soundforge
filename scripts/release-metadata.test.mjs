import assert from "node:assert/strict";
import test from "node:test";
import { releaseMetadata } from "./release-metadata.mjs";

const sha = "0123456789abcdef0123456789abcdef01234567";
const image = "ghcr.io/oberones/virtual-soundforge";
const event = {
  GITHUB_EVENT_NAME: "push",
  GITHUB_REPOSITORY: "oberones/virtual-soundforge",
  GITHUB_REF: "refs/tags/1.2.3",
  GITHUB_SHA: sha,
};

test("stable releases publish version, full commit, and latest", () => {
  const result = releaseMetadata(event);
  assert.equal(result.publish, true);
  assert.equal(result.version, "1.2.3");
  assert.deepEqual(result.tags, [
    `${image}:1.2.3`, `${image}:sha-${sha}`, `${image}:latest`,
  ]);
});

for (const version of ["0.2.0-rc.1", "1.2.3-0", "1.2.3-alpha.0", "1.2.3-01a", "1.2.3-rc.1+build.42"]) {
  test(`prerelease ${version} cannot update latest`, () => {
    const result = releaseMetadata({ ...event, GITHUB_REF: `refs/tags/${version}` });
    assert.equal(result.publish, true);
    assert.deepEqual(result.tags, [
      `${image}:${version.replace("+", "_")}`, `${image}:sha-${sha}`,
    ]);
  });
}

test("stable build metadata is preserved without mistaking it for a prerelease", () => {
  const result = releaseMetadata({ ...event, GITHUB_REF: "refs/tags/1.2.3+build-42.01" });
  assert.equal(result.version, "1.2.3+build-42.01");
  assert.deepEqual(result.tags, [
    `${image}:1.2.3_build-42.01`, `${image}:sha-${sha}`, `${image}:latest`,
  ]);
});

for (const override of [
  { GITHUB_REF: "refs/heads/main" },
  { GITHUB_REF: "refs/heads/1.2.3" },
  { GITHUB_EVENT_NAME: "pull_request", GITHUB_REF: "refs/pull/1/merge" },
  { GITHUB_EVENT_NAME: "pull_request" },
  { GITHUB_EVENT_NAME: "pull_request_target" },
  { GITHUB_EVENT_NAME: "workflow_dispatch" },
  { GITHUB_REPOSITORY: "someone/virtual-soundforge" },
]) {
  test(`non-release event cannot publish: ${JSON.stringify(override)}`, () => {
    const result = releaseMetadata({ ...event, ...override });
    assert.equal(result.publish, false);
    assert.deepEqual(result.tags, []);
  });
}

for (const version of [
  "v1.2.3", "1.2", "1.2.3.4", "01.2.3", "1.02.3", "1.2.03", "1.2.3-01",
  "1.2.3-rc.01", "1.2.3-", "1.2.3-alpha..1", "1.2.3+", "1.2.3+build..42",
  "1.2.3_build", "1.2.3\n", "latest",
]) {
  test(`invalid version ${JSON.stringify(version)} cannot publish`, () => {
    const result = releaseMetadata({ ...event, GITHUB_REF: `refs/tags/${version}` });
    assert.equal(result.publish, false);
    assert.deepEqual(result.tags, []);
  });
}

test("unrepresentable Docker tags and abbreviated commit SHAs fail closed", () => {
  assert.throws(() => releaseMetadata({ ...event, GITHUB_REF: `refs/tags/1.2.3-${"a".repeat(123)}` }), /128-character/);
  assert.throws(() => releaseMetadata({ ...event, GITHUB_SHA: "0123456" }), /40-character/);
});
