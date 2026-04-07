import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { readSourcesConfig, resolveLocalSitePath } from "../src/lib/site-config.js";

const root = process.cwd();
const shouldClone = process.argv.includes("--clone");

function existsDir(p) {
  return fs.existsSync(p) && fs.statSync(p).isDirectory();
}

function cloneRepo(cloneUrl, repoPath) {
  const parent = path.dirname(repoPath);
  if (!existsDir(parent)) {
    fs.mkdirSync(parent, { recursive: true });
  }
  execSync(`git clone "${cloneUrl}" "${repoPath}"`, {
    stdio: "inherit",
    cwd: root
  });
}

const sources = readSourcesConfig();
let missingCount = 0;

for (const source of sources) {
  const repoPath = path.resolve(root, source.localRepoPath);
  const sitePath = resolveLocalSitePath(source);

  if (existsDir(sitePath)) {
    console.log(`OK: ${source.id} -> ${sitePath}`);
    continue;
  }

  missingCount += 1;
  console.log(`\nMissing content source: ${source.id}`);
  console.log(`Expected at: ${sitePath}`);

  if (shouldClone && source.cloneUrl && !existsDir(repoPath)) {
    console.log(`Cloning ${source.cloneUrl} into ${repoPath}`);
    cloneRepo(source.cloneUrl, repoPath);
    if (existsDir(sitePath)) {
      console.log(`OK after clone: ${source.id}`);
      continue;
    }
  }

  console.log("Manual setup:");
  console.log(`  git clone ${source.cloneUrl} ${repoPath}`);
  console.log(`  # then ensure '${source.sitePath || "site"}/' exists in that repo`);
}

if (missingCount > 0 && !shouldClone) {
  console.log("\nTip: rerun with '--clone' to auto-clone missing repositories where possible.");
}
