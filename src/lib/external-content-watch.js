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
    if (!resolvedFilePath.startsWith(`${resolvedDir}${path.sep}`)) {
      return false;
    }

    return (
      resolvedFilePath.endsWith(".md") ||
      resolvedFilePath.endsWith(`${path.sep}nav.yml`) ||
      // Bookmarklet sources are rendered into the page at build time, so editing one
      // has to reload the browser just like editing markdown does.
      (resolvedFilePath.endsWith(".js") &&
        resolvedFilePath.startsWith(`${resolvedDir}${path.sep}bookmarklets${path.sep}`))
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
