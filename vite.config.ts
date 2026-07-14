import { defineConfig } from "vite";

export default defineConfig({
  // Relative base so the built site works when served from any subpath
  // (e.g. apps.charliekrug.com/switchyard), not just the domain root.
  base: "./",
  build: {
    outDir: "dist",
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
});
