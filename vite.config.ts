import { defineConfig } from "vite";

/** GitHub Pages project site: https://dorukhandori.github.io/yeni-oyun/ */
const PAGES_BASE = "/yeni-oyun/";

export default defineConfig(({ command }) => ({
  base: command === "build" && process.env.GITHUB_PAGES === "true" ? PAGES_BASE : "/",
  server: {
    host: true,
    port: 5173,
  },
}));
