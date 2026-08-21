/**
 * Standard glTF 2.0 humanoid: SkinnedMesh + Skeleton + AnimationMixer.
 * Game sailor and the workbench Doryseus preset both load through here.
 *
 * Hip.z in this Tripo in-place export is ~0 on every clip while bind Hip.z
 * is pelvis height (~0.44 m). `pinRootHipTranslation` restores bind
 * translation on Root/Hip only — not a per-bone A-pose fix.
 */
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { assetUrl } from "../assets/paths";
import {
  fitGltfHeight,
  lightGltf,
  rebindSkinned,
  restBonePositions,
} from "./gltf";

const loader = new GLTFLoader();

export const HUMANOID_CLIPS = {
  idle: "preset:idle",
  walk: "preset:walk",
  run: "preset:run",
  harvest: "preset:biped:dig",
} as const;

export type LocomotionSlot = keyof typeof HUMANOID_CLIPS;

const ROOT_HIP = /^(Root|Hip|Hips)$/i;

export interface HumanoidActor {
  scene: THREE.Group;
  mixer: THREE.AnimationMixer;
  animations: THREE.AnimationClip[];
  bones: string[];
  skinnedCount: number;
  play(slot: LocomotionSlot, fade?: number): void;
  playIndex(index: number, fade?: number): void;
  update(dt: number): void;
}

export function pinRootHipTranslation(
  clip: THREE.AnimationClip,
  rest: Map<string, THREE.Vector3>,
): THREE.AnimationClip {
  const pinned = clip.clone();
  for (const track of pinned.tracks) {
    if (!track.name.endsWith(".position")) continue;
    const bone = track.name.slice(0, track.name.length - ".position".length);
    if (!ROOT_HIP.test(bone)) continue;
    const bind = rest.get(bone);
    if (!bind) continue;
    const values = track.values;
    for (let i = 0; i + 2 < values.length; i += 3) {
      values[i] = bind.x;
      values[i + 1] = bind.y;
      values[i + 2] = bind.z;
    }
  }
  return pinned;
}

function findClip(clips: THREE.AnimationClip[], name: string): THREE.AnimationClip {
  const hit = clips.find((c) => c.name === name);
  if (!hit) {
    throw new Error(`[humanoid] missing clip ${name}; have ${clips.map((c) => c.name).join(", ")}`);
  }
  return hit;
}

export async function createHumanoidActor(
  path: string,
  opts: { heightMeters: number; expectedBytes: number; clipFade: number },
): Promise<HumanoidActor> {
  const url = assetUrl(path);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`[humanoid] ${path} HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  console.assert(
    buf.byteLength === opts.expectedBytes,
    `[humanoid] ${path} is ${buf.byteLength} bytes; expected ${opts.expectedBytes}.`,
  );
  if (buf.byteLength !== opts.expectedBytes) {
    throw new Error(
      `[humanoid] refused ${path}: ${buf.byteLength} bytes ≠ ${opts.expectedBytes}`,
    );
  }

  const gltf = await new Promise<GLTF>((resolve, reject) => {
    loader.parse(buf, url, resolve, reject);
  });

  const scene = cloneSkinned(gltf.scene) as THREE.Group;
  lightGltf(scene);
  scene.traverse((obj) => {
    const skinned = obj as THREE.SkinnedMesh;
    if (skinned.isSkinnedMesh) skinned.frustumCulled = false;
  });
  const rest = restBonePositions(scene);
  fitGltfHeight(scene, opts.heightMeters);
  rebindSkinned(scene);

  const sourceClips = gltf.animations.slice();
  for (const name of Object.values(HUMANOID_CLIPS)) findClip(sourceClips, name);
  const animations = sourceClips.map((c) => pinRootHipTranslation(c, rest));

  const mixer = new THREE.AnimationMixer(scene);
  const actions = animations.map((clip) => {
    const action = mixer.clipAction(clip);
    action.setLoop(THREE.LoopRepeat, Infinity);
    return action;
  });

  const slotIndex: Record<LocomotionSlot, number> = {
    idle: animations.findIndex((c) => c.name === HUMANOID_CLIPS.idle),
    walk: animations.findIndex((c) => c.name === HUMANOID_CLIPS.walk),
    run: animations.findIndex((c) => c.name === HUMANOID_CLIPS.run),
    harvest: animations.findIndex((c) => c.name === HUMANOID_CLIPS.harvest),
  };

  let current = -1;
  const playIndex = (index: number, fade = opts.clipFade) => {
    if (index < 0 || !actions[index] || index === current) return;
    const next = actions[index];
    if (current < 0 || fade <= 0) {
      actions.forEach((a, i) => {
        if (i === index) a.reset().play();
        else a.stop();
      });
    } else {
      next.reset().fadeIn(fade).play();
      actions[current]?.fadeOut(fade);
    }
    current = index;
  };

  playIndex(slotIndex.idle, 0);

  const bones: string[] = [];
  let skinnedCount = 0;
  scene.traverse((obj) => {
    if ((obj as THREE.Bone).isBone) bones.push(obj.name);
    if ((obj as THREE.SkinnedMesh).isSkinnedMesh) skinnedCount += 1;
  });

  return {
    scene,
    mixer,
    animations,
    bones,
    skinnedCount,
    play(slot, fade = opts.clipFade) {
      playIndex(slotIndex[slot], fade);
    },
    playIndex,
    update(dt: number) {
      mixer.update(dt);
    },
  };
}
