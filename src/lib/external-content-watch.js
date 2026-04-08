import fs from "node:fs";
import path from "node:path";
import { readSourcesConfig, resolveLocalSitePath } from "./site-config.js";

export function getWatchedSiteDirs() {
  return readSourcesConfig()
    .map((source) => resolveLocalSitePath(source))
    .filter((dir) => fs.existsSync(dir));
}

export function isExternalContentFile(filePath, siteDirs) {
  const resolvedFilePath = path.resolve(filePath);
  return siteDirs.some((dir) => {
    const resolvedDir = path.resolve(dir);
    return (
      resolvedFilePath.startsWith(`${resolvedDir}${path.sep}`) &&
      (resolvedFilePath.endsWith(".md") || resolvedFilePath.endsWith(`${path.sep}nav.yml`))
    );
  });
}

export function externalContentWatchPlugin() {
  const siteDirs = getWatchedSiteDirs();

  return {
    name: "watch-external-content",
    configureServer(server) {
      server.watcher.add(siteDirs);
    },
    handleHotUpdate(context) {
      if (!isExternalContentFile(context.file, siteDirs)) {
        return;
      }

      context.server.ws.send({ type: "full-reload" });
      return [];
    }
  };
}
