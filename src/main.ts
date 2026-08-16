import { startGame } from "./game";
import { mountOrientationGate } from "./ui/orientation";

const canvas = document.getElementById("game") as HTMLCanvasElement | null;
if (!canvas) throw new Error("#game canvas missing");

const versionTag = document.getElementById("appVersion");
if (versionTag) versionTag.textContent = `v${__APP_VERSION__} · ${__APP_COMMIT__}`;

// Landscape gate is mounted before the game so it can cover the Title screen
// too — the Title/Hub menus are DOM overlays inside #app, not a separate shell.
mountOrientationGate();

const hooks = startGame(canvas);

// DEV-only automation seam for scripts/asset-qa/ (Playwright drives these to
// reach a deterministic phase before screenshotting). `import.meta.env.DEV` is
// statically false in a production build, so Rollup drops this whole block —
// verified by grepping dist/assets/*.js for the property name after build.
if (import.meta.env.DEV && hooks) {
  (window as unknown as Record<string, unknown>).__LOTOPHAGOI_TEST_HOOKS__ = hooks;
}
