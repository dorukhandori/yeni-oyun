import { execSync } from "node:child_process";
import { defineConfig } from "vite";
import pkg from "./package.json" with { type: "json" };

/** Relative base so github.io/yeni-oyun/ and lotophagoi.ovarlak.games both resolve assets. */
const PAGES_BASE = "./";

/**
 * Short commit hash baked in at build time — not a hand-maintained counter,
 * so parallel sessions/branches never collide on "whose turn it is to bump
 * the version." `?` when building outside a git checkout (e.g. a tarball).
 */
function commitHash(): string {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "?";
  }
}

export default defineConfig(({ command }) => ({
  base: command === "build" && process.env.GITHUB_PAGES === "true" ? PAGES_BASE : "/",
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_COMMIT__: JSON.stringify(commitHash()),
  },
  server: {
    host: true,
    port: 5173,
  },
}));
