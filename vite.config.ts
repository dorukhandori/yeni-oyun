import { execSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import pkg from "./package.json" with { type: "json" };

/**
 * Dev-only endpoint for the asset workbench (docs/production/
 * asset-pipeline-loop-plan.md §4): lists public/assets/models/*.glb so the
 * "Var olan assetler" dropdown doesn't need hand-typed paths. Never touches
 * the production build — configureServer only runs under `vite dev`.
 */
function workbenchAssetListPlugin(): Plugin {
  return {
    name: "workbench-asset-list",
    configureServer(server) {
      server.middlewares.use("/__workbench/models", (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        try {
          const files = readdirSync("public/assets/models")
            .filter((f) => /\.(glb|gltf)$/i.test(f))
            .sort();
          res.end(JSON.stringify(files));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(err) }));
        }
      });
    },
  };
}

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
  plugins: [workbenchAssetListPlugin()],
}));
