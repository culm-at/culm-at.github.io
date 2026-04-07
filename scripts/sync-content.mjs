import fs from "node:fs";
import path from "node:path";
import { discoverSources } from "../src/lib/source-discovery.js";

const root = process.cwd();
const mirrorRoot = path.resolve(root, ".content-sources");

function copyDirectory(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(from, to);
      continue;
    }

    fs.copyFileSync(from, to);
  }
}

const { available, missing } = discoverSources();

for (const { source, sitePath, mode } of available) {
  const target = path.join(mirrorRoot, source.id, "site");

  if (mode === "mirrored") {
    continue;
  }

  copyDirectory(sitePath, target);
  console.log(`Synced ${source.id} to ${target}`);
}

if (missing.length > 0) {
  console.log("Missing sources:");
  for (const m of missing) {
    console.log(`- ${m.source.id}: ${m.localSitePath}`);
  }
}
