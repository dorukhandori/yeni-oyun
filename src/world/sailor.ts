import * as THREE from "three";
import { LOTUS, PALETTE, SAILOR } from "../constants";
import { loadSavedSkin, skinById, SKIN_CHANGE_EVENT, type SkinId } from "../skins";
import { glowSprite } from "./sprite";
import { fitGltfHeight, lightGltf, loadGltf } from "./gltf";
import {
  createHumanoidActor,
  type HumanoidActor,
  type LocomotionSlot,
} from "./humanoidRig";

export interface Sailor {
  root: THREE.Group;
  update(
    t: number,
    dt: number,
    moving: number,
    velX?: number,
    velZ?: number,
    camYaw?: number,
    harvest?: number,
    running?: boolean,
  ): void;
  faceCamera(camera: THREE.Camera, dt: number): void;
  setCarried(n: number): void;
  pulse(strength: number): void;
  land(strength: number): void;
  playWave(): void;
  playDelivery(): void;
}

export function buildSailor(): Sailor {
  const root = new THREE.Group();
  const hold = new THREE.Group();
  root.add(hold);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.32, 16),
    new THREE.MeshBasicMaterial({
      color: 0x1a120c,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  root.add(shadow);

  const bloomMat = new THREE.SpriteMaterial({
    map: glowSprite(),
    color: PALETTE.petalRipeTint,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const blooms: THREE.Sprite[] = [];
  for (let i = 0; i < LOTUS.carryCap; i++) {
    const b = new THREE.Sprite(bloomMat);
    b.center.set(0.5, 0.2);
    b.scale.set(0.16, 0.16, 1);
    b.position.set(-0.12 + i * 0.07, SAILOR.height * 0.52, 0.08);
    b.visible = false;
    root.add(b);
    blooms.push(b);
  }

  let squash = 0;
  let landSquash = 0;
  let actor: HumanoidActor | null = null;
  let loadGen = 0;

  const mountTextured = () => {
    void loadGltf(SAILOR.mesh)
      .then((scene) => {
        if (actor) return;
        lightGltf(scene);
        fitGltfHeight(scene, SAILOR.height);
        while (hold.children.length > 0) hold.remove(hold.children[0]);
        hold.add(scene);
        if (import.meta.env.DEV) {
          console.info("[sailor] textured mesh", SAILOR.mesh);
        }
      })
      .catch((err) => {
        console.warn("[sailor] textured mesh failed to load", err);
      });
  };

  const mountSkin = (id: SkinId) => {
    const skin = skinById(id);
    const gen = ++loadGen;
    actor = null;
    void createHumanoidActor(skin.meshRig, {
      heightMeters: SAILOR.height,
      expectedBytes: skin.meshRigBytes,
      clipFade: SAILOR.meshClipFade,
      mattePrint: skin.mattePrint,
    })
      .then((a) => {
        if (gen !== loadGen) return;
        actor = a;
        while (hold.children.length > 0) hold.remove(hold.children[0]);
        hold.position.set(0, SAILOR.meshYLift, 0);
        hold.add(a.scene);
        if (import.meta.env.DEV) {
          console.info("[sailor] mesh rig", skin.id, skin.meshRig, a.bones.length, "bones");
        }
      })
      .catch((err) => {
        if (gen !== loadGen) return;
        console.warn("[sailor] mesh rig failed, textured fallback", skin.id, err);
        if (id !== "classic") {
          mountSkin("classic");
          return;
        }
        mountTextured();
      });
  };

  mountSkin(loadSavedSkin());
  window.addEventListener(SKIN_CHANGE_EVENT, () => mountSkin(loadSavedSkin()));

  const pickSlot = (moving: number, harvest: number, running: boolean): LocomotionSlot => {
    if (harvest > 0.15) return "harvest";
    if (running && moving > SAILOR.gaitMin) return "run";
    if (moving > SAILOR.gaitMin) return "walk";
    return "idle";
  };

  return {
    root,
    setCarried(n: number) {
      for (let i = 0; i < blooms.length; i++) blooms[i].visible = i < n;
    },
    pulse(strength: number) {
      squash = Math.max(squash, strength);
    },
    land(strength: number) {
      landSquash = Math.max(landSquash, strength);
    },
    playWave() {},
    playDelivery() {},
    faceCamera() {},
    update(_t, dt, moving, _vx = 0, _vz = 0, _camYaw = 0, harvest = 0, running = false) {
      squash *= Math.exp(-10 * dt);
      landSquash *= Math.exp(-12 * dt);
      const s = 1 + squash * 0.08 + landSquash * 0.1;
      hold.scale.set(s, 1 / s, s);
      (shadow.material as THREE.MeshBasicMaterial).opacity = 0.24 + moving * 0.06;
      if (!actor) return;
      actor.update(dt);
      actor.play(pickSlot(moving, harvest, running));
    },
  };
}
