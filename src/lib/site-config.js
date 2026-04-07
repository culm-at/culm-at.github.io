import fs from "node:fs";
import path from "node:path";

const SOURCES_FILE = path.resolve(process.cwd(), "content/sources.json");

export function readSourcesConfig() {
  const raw = fs.readFileSync(SOURCES_FILE, "utf8");
  const parsed = JSON.parse(raw);
  return parsed.sources ?? [];
}

export function resolveLocalSitePath(source) {
  const repoPath = path.resolve(process.cwd(), source.localRepoPath);
  return path.join(repoPath, source.sitePath || "site");
}

export function resolveMirroredSitePath(source) {
  return path.resolve(process.cwd(), ".content-sources", source.id, "site");
}
