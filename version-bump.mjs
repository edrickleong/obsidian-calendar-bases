// Read version from package.json
const packageJson = JSON.parse(await Bun.file("package.json").text());
const targetVersion = packageJson.version;

// read minAppVersion from manifest.json and bump version to target version
const manifest = JSON.parse(await Bun.file("manifest.json").text());
const { minAppVersion } = manifest;
manifest.version = targetVersion;
await Bun.write("manifest.json", JSON.stringify(manifest, null, "\t"));

// update versions.json with target version and minAppVersion from manifest.json
// but only if the target version is not already in versions.json
const versions = JSON.parse(await Bun.file("versions.json").text());
if (!Object.hasOwnProperty.call(versions, targetVersion)) {
  versions[targetVersion] = minAppVersion;
  await Bun.write("versions.json", JSON.stringify(versions, null, "\t"));
}
