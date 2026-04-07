import fs from "node:fs";
import { readSourcesConfig, resolveLocalSitePath, resolveMirroredSitePath } from "./site-config.js";

function existsDirectory(dir) {
  return fs.existsSync(dir) && fs.statSync(dir).isDirectory();
}

export function discoverSources() {
  const sources = readSourcesConfig();
  const available = [];
  const missing = [];

  for (const source of sources) {
    const localSitePath = resolveLocalSitePath(source);
    const mirroredSitePath = resolveMirroredSitePath(source);

    if (existsDirectory(localSitePath)) {
      available.push({ source, sitePath: localSitePath, mode: "local" });
      continue;
    }

    if (existsDirectory(mirroredSitePath)) {
      available.push({ source, sitePath: mirroredSitePath, mode: "mirrored" });
      continue;
    }

    missing.push({ source, localSitePath, mirroredSitePath });
  }

  return { available, missing };
}
