import { defineConfig } from "astro/config";
import { externalContentWatchPlugin } from "./src/lib/external-content-watch.js";

export default defineConfig({
  site: "https://culm.at",
  vite: {
    plugins: [externalContentWatchPlugin()]
  }
});
