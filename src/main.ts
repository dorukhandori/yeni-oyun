import { startGame } from "./game";
import { bootShell } from "./ui/shell";
import type { SessionChoice } from "./ui/profile";

const canvas = document.getElementById("game") as HTMLCanvasElement | null;
if (!canvas) throw new Error("#game canvas missing");

bootShell((choice: SessionChoice) => {
  if (choice.island !== "lotus") return;
  void startGame(canvas, choice);
});
