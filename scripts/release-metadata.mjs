import { appendFileSync } from "node:fs";

const repository = "oberones/virtual-soundforge";
const image = `ghcr.io/${repository}`;
const numeric = "(?:0|[1-9][0-9]*)";
const identifier = `(?:${numeric}|[0-9]*[A-Za-z-][0-9A-Za-z-]*)`;
const semver = new RegExp(
  `^${numeric}\\.${numeric}\\.${numeric}` +
  `(?:-(?<prerelease>${identifier}(?:\\.${identifier})*))?` +
  "(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$",
);

export function releaseMetadata(env) {
  const skip = (reason) => ({ publish: false, version: "", tags: [], reason });
  if (env.GITHUB_REPOSITORY !== repository || env.GITHUB_EVENT_NAME !== "push" ||
      !env.GITHUB_REF?.startsWith("refs/tags/")) {
    return skip("Only tag pushes in the source repository can publish.");
  }

  const version = env.GITHUB_REF.slice("refs/tags/".length);
  const match = semver.exec(version);
  if (!match || match[0] !== version) {
    return skip("The tag is not an unprefixed semantic version.");
  }

  // Docker tags cannot contain '+'. '_' cannot occur in SemVer, so this
  // conversion preserves build metadata without colliding with another version.
  const containerVersion = version.replace("+", "_");
  if (containerVersion.length > 128) {
    throw new Error("The release version exceeds Docker's 128-character tag limit.");
  }
  if (!/^[0-9a-f]{40}$/.test(env.GITHUB_SHA ?? "")) {
    throw new Error("Publishing requires the full 40-character commit SHA.");
  }

  const tags = [`${image}:${containerVersion}`, `${image}:sha-${env.GITHUB_SHA}`];
  if (!match.groups.prerelease) tags.push(`${image}:latest`);
  return { publish: true, version, tags, reason: "Validated release tag." };
}

if (import.meta.main) {
  const metadata = releaseMetadata(process.env);
  console.log(JSON.stringify(metadata, null, 2));
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, [
      `publish=${metadata.publish}`,
      `version=${metadata.version}`,
      "tags<<RELEASE_TAGS",
      ...metadata.tags,
      "RELEASE_TAGS",
      "",
    ].join("\n"));
  }
}
