import { defineConfig } from "vite";

export default defineConfig({
  // Relative base so the built site works when served from any subpath
  // (e.g. apps.charliekrug.com/switchyard), not just the domain root.
  base: "./",
  build: {
    // Emit the deployable static bundle to site/ (the published artifact,
    // served from apps.charliekrug.com/switchyard). Relative base above keeps
    // asset URLs working from that subpath.
    outDir: "site",
    emptyOutDir: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
});
