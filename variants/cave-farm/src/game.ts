import * as THREE from "three";
import { CAMERA, CELL, INTERACT_RANGE, PALETTE, PLAYER, START, STEP } from "./constants";
import {
  TOOLS,
  regenStamina,
  tickCrop,
  tryBuySeed,
  trySell,
  useTool,
  type ActResult,
  type Fx,
} from "./farm/crops";
import { cellAt, cellToWorld, createMap, walkable, worldToCell } from "./farm/world";
import { CameraRig } from "./render/cameraRig";
import { createStage } from "./render/stage";
import { Bursts } from "./systems/burst";
import { Input } from "./systems/input";
import type { CaveMap, Inventory, ToolId } from "./types";
import { Hud } from "./ui/hud";
import { buildCave } from "./world/cave";
import { buildCreature } from "./world/creature";
import { buildPlots } from "./world/plots";
import { buildWater } from "./world/water";

const FX_COLOR: Record<Fx, number> = {
  dirt: 0x8a6a45,
  plant: 0x8fe39a,
  water: 0x5fe0e6,
  harvest: PALETTE.ripe,
  sell: 0xffd27a,
  buy: 0xffe6a8,
};

export function startGame(canvas: HTMLCanvasElement): void {
  const stage = createStage(canvas);
  const map: CaveMap = createMap();

  const cave = buildCave(map);
  const water = buildWater(map);
  const plots = buildPlots(map);
  const creature = buildCreature();
  const bursts = new Bursts();

  stage.scene.add(cave.group, water.group, plots.group, creature.root, bursts.points);

  const spawn = cellToWorld(map, map.spawn.cx, map.spawn.cz);
  const pos = new THREE.Vector3(spawn.x, 0, spawn.z);
  const vel = new THREE.Vector3();
  creature.root.position.copy(pos);

  const rig = new CameraRig(stage.camera, map);
  rig.snap(pos);

  const input = new Input();
  input.attach(canvas);
  const hud = new Hud();

  const inv: Inventory = {
    coins: START.coins,
    seeds: START.seeds,
    crops: 0,
    stamina: START.stamina,
    maxStamina: START.maxStamina,
    staminaRegen: 0,
  };
  let tool: ToolId = "hoe";

  const fwd = new THREE.Vector3();
  const rightV = new THREE.Vector3();
  const wish = new THREE.Vector3();
  let facing = Math.PI;
  let time = 0;

  const canStand = (x: number, z: number): boolean => {
    const r = PLAYER.radius;
    for (const [ox, oz] of [
      [0, 0],
      [r, 0],
      [-r, 0],
      [0, r],
      [0, -r],
    ]) {
      const c = worldToCell(map, x + ox, z + oz);
      if (!walkable(map, c.cx, c.cz)) return false;
    }
    return true;
  };

  interface Target {
    cx: number;
    cz: number;
    dist: number;
  }

  const findPlot = (): Target | null => {
    const here = worldToCell(map, pos.x, pos.z);
    // The plot straight ahead wins, so a crop is never hidden behind the sprite.
    const ahead = worldToCell(
      map,
      pos.x + Math.sin(facing) * CELL * 0.85,
      pos.z + Math.cos(facing) * CELL * 0.85,
    );
    if (cellAt(map, ahead.cx, ahead.cz)?.farmable) {
      return { cx: ahead.cx, cz: ahead.cz, dist: 0 };
    }

    let best: Target | null = null;
    let own: Target | null = null;
    for (let dz = -2; dz <= 2; dz++) {
      for (let dx = -2; dx <= 2; dx++) {
        const cx = here.cx + dx;
        const cz = here.cz + dz;
        const cell = cellAt(map, cx, cz);
        if (!cell?.farmable) continue;
        const w = cellToWorld(map, cx, cz);
        const dist = Math.hypot(w.x - pos.x, w.z - pos.z);
        if (dist > INTERACT_RANGE) continue;
        if (cx === here.cx && cz === here.cz) {
          own = { cx, cz, dist };
          continue;
        }
        const bias = dist - Math.cos(Math.atan2(w.x - pos.x, w.z - pos.z) - facing) * 0.8;
        if (!best || bias < best.dist) best = { cx, cz, dist: bias };
      }
    }
    return best ?? own;
  };

  const standWorld = cellToWorld(map, map.stand.cx, map.stand.cz);

  const report = (res: ActResult, at: THREE.Vector3): void => {
    hud.say(res.msg);
    if (!res.ok) return;
    if (res.fx) {
      bursts.spawn(at, FX_COLOR[res.fx], res.fx === "harvest" ? 26 : 15);
      rig.kick(res.fx === "harvest" ? 0.16 : 0.08);
      creature.pulse(res.fx === "harvest" ? 0.5 : 0.3);
    }
  };

  function step(): void {
    const dt = STEP / 1000;
    time += dt;

    // ---------------------------------------------------------------- camera
    const md = input.mouseDelta();
    rig.rotate(md.x * CAMERA.mouseSens, md.y * CAMERA.mouseSens);
    rig.rotate(input.yawKeys() * CAMERA.keySens, input.pitchKeys() * CAMERA.keySens * 0.6);

    // -------------------------------------------------------------- movement
    rig.forward(fwd);
    rig.right(rightV);
    wish.set(0, 0, 0).addScaledVector(fwd, input.moveZ()).addScaledVector(rightV, input.moveX());
    const pressing = wish.lengthSq() > 0.001;
    if (pressing) wish.normalize().multiplyScalar(PLAYER.speed);

    vel.x += (wish.x - vel.x) * Math.min(1, PLAYER.accel * dt);
    vel.z += (wish.z - vel.z) * Math.min(1, PLAYER.accel * dt);

    const nx = pos.x + vel.x * dt;
    const nz = pos.z + vel.z * dt;
    if (canStand(nx, pos.z)) pos.x = nx;
    else vel.x = 0;
    if (canStand(pos.x, nz)) pos.z = nz;
    else vel.z = 0;

    const speed = Math.hypot(vel.x, vel.z);
    if (speed > 0.35) {
      const want = Math.atan2(vel.x, vel.z);
      let d = want - facing;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      facing += d * PLAYER.turnLerp;
    }
    creature.root.position.set(pos.x, 0, pos.z);
    creature.root.rotation.y = facing;

    // ----------------------------------------------------------- interaction
    const slot = input.toolSlot();
    if (slot !== null) tool = TOOLS[slot];
    const cyc = input.toolCycle();
    if (cyc !== 0) {
      const i = (TOOLS.indexOf(tool) + cyc + TOOLS.length) % TOOLS.length;
      tool = TOOLS[i];
    }

    // Tighter than the plot range so the stand does not swallow nearby plots.
    const nearStand = Math.hypot(standWorld.x - pos.x, standWorld.z - pos.z) < 1.9;
    const target = nearStand ? null : findPlot();
    plots.setHighlight(target?.cx ?? 0, target?.cz ?? 0, !!target);

    if (nearStand) {
      hud.setPrompt(`<b>E</b> mahsul sat · <b>B</b> tohum al (4 altın)`);
    } else if (target) {
      const cell = map.cells[target.cz][target.cx];
      hud.setPrompt(`<b>E</b> ${labelFor(tool, cell.crop)}`);
    } else {
      hud.setPrompt(null);
    }

    if (input.interact) {
      if (nearStand) {
        report(trySell(inv), new THREE.Vector3(standWorld.x, 1.1, standWorld.z));
      } else if (target) {
        const cell = map.cells[target.cz][target.cx];
        const w = cellToWorld(map, target.cx, target.cz);
        report(useTool(cell, tool, inv), new THREE.Vector3(w.x, 0.2, w.z));
      } else {
        hud.setPrompt(null);
      }
    }
    if (input.buy && nearStand) {
      report(tryBuySeed(inv), new THREE.Vector3(standWorld.x, 1.1, standWorld.z));
    }

    // ---------------------------------------------------------------- growth
    for (let cz = 0; cz < map.height; cz++) {
      for (let cx = 0; cx < map.width; cx++) {
        const cell = map.cells[cz][cx];
        if (cell.farmable) tickCrop(cell);
      }
    }
    regenStamina(inv);

    // ----------------------------------------------------------------- visual
    creature.update(time, dt, Math.min(1, speed / PLAYER.speed));
    rig.update(pos, dt);
    cave.update(time);
    water.update(time);
    plots.sync();
    plots.update(time);
    bursts.update(dt);
    hud.update(inv, tool);

    input.endFrame();
  }

  let acc = 0;
  let last = performance.now();
  const loop = (now: number) => {
    acc += Math.min(now - last, 250);
    last = now;
    let guard = 0;
    while (acc >= STEP && guard++ < 5) {
      acc -= STEP;
      step();
    }
    stage.render();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  document.getElementById("loading")?.classList.add("gone");
  void CELL;
}

function labelFor(tool: ToolId, crop: string): string {
  if (tool === "hoe") return "çapala";
  if (tool === "seed") return "tohum ek";
  if (tool === "water") return "sula";
  return crop === "ripe" ? "hasat et" : "kontrol et";
}
