import { startGame } from "./game";
import { mountOrientationGate } from "./ui/orientation";

const canvas = document.getElementById("game") as HTMLCanvasElement | null;
if (!canvas) throw new Error("#game canvas missing");

// Landscape gate is mounted before the game so it can cover the Title screen
// too — the Title/Hub menus are DOM overlays inside #app, not a separate shell.
mountOrientationGate();

void startGame(canvas);
