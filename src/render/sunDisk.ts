import * as THREE from "three";
import { SUN_DISK } from "../constants";
import { loadGltf } from "../world/gltf";

/**
 * The bright disc the god stands in.
 *
 * The previous gradient ran cream → amber → `rgb(210,110,28)` → `rgb(90,32,8)`
 * → near-black. Two problems: that brown/black rim is nowhere in
 * `art-bible.md` §2 (the sky family is altın → kehribar → gül, no browns), and
 * it drew a muddy ring around the sun. This ramp stays inside the bible: a
 * white-gold core, the bible's own halo hex `#ffcf80`, kehribar `#eeae6a`,
 * then a gül `#e08a86` edge that fades to nothing.
 *
 * 18 Aug 2026 (sahip: "güneşi küçült ve daha gerçekçi yap"): the plateau of
 * full-bright cream used to run all the way to 42% of the radius — a big,
 * evenly-lit graphic disc with a thin edge tacked on. Real bright light
 * sources read as a small blinding point with a longer graded falloff, not a
 * flat-lit circle, so every stop is pulled inward (plateau now ends at 16%,
 * was 42%) while the same bible hexes still carry the ramp — nothing left the
 * palette, the ramp is just compressed toward the centre. The outer edge
 * fades a touch softer too (last stop's alpha down from 0.92 to 0.85, and its
 * position pushed from 92% to 85% of the radius) since the disc itself is
 * now drawn much smaller in world units (see SUN_DISK.coreRadius) and a
 * slightly longer, softer taper reads as "real" rather than "cut out" at
 * that size.
 */
function discTexture(size: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("sunDisk: 2d context unavailable");
  const cx = size / 2;
  const g = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  g.addColorStop(0, "rgba(255,255,250,1)");
  g.addColorStop(0.16, "rgba(255,244,214,1)");
  g.addColorStop(0.4, "rgba(255,207,128,1)");
  g.addColorStop(0.62, "rgba(238,174,106,1)");
  // The falloff itself is a touch wider than before (last 15% vs. 8%) — at
  // the new, smaller world radius a razor edge read as a coin-punched hole;
  // this keeps a readable circumference without a crisp graphic rim.
  g.addColorStop(0.85, "rgba(224,138,134,0.85)");
  g.addColorStop(1, "rgba(224,138,134,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Wide atmospheric glow around the disc. Additive, so it only ever lifts the
 * sky — it must not carry an edge of its own or it reads as a second circle.
 */
function haloTexture(size: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("sunDisk: 2d context unavailable");
  const cx = size / 2;
  const g = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  g.addColorStop(0, "rgba(255,231,178,0.55)");
  g.addColorStop(0.16, "rgba(255,207,128,0.34)");
  g.addColorStop(0.38, "rgba(255,190,110,0.15)");
  g.addColorStop(0.64, "rgba(238,174,106,0.05)");
  g.addColorStop(1, "rgba(224,138,134,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function paintGod(root: THREE.Object3D): THREE.MeshBasicMaterial[] {
  const mats: THREE.MeshBasicMaterial[] = [];
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      // Multiply the cream vertex colours down so UnrealBloom cannot turn
      // the face into a white triangle; ACES still grades the sky.
      color: 0xe2c48a,
      fog: false,
      // Opaque in every practical sense (opacity 1), but it MUST join the
      // transparent queue: three.js draws all opaque objects before any
      // transparent one and `renderOrder` only sorts *within* a queue. Left
      // opaque, the god drew first and the transparent disc behind him then
      // painted straight over him — the sun looked like a plain gradient
      // circle with no figure in it at all.
      transparent: true,
      // Matches both sky spheres and the cloud deck, which are all
      // `toneMapped:false`. Left on `true` the god was ACES-compressed while
      // the sky behind it was not, so the sun read *darker* than the sky it
      // was supposed to be lighting.
      toneMapped: false,
      // Never writes depth (it is a sky element), but it MUST test: with
      // depthTest off the Helios head painted straight over the hull, the
      // sail, the masts and the HUD sun clock. It sits 220 m out along the
      // sun ray, so honest depth just means real geometry in front of it
      // occludes it — which is what "the sun is behind the ship" should look
      // like.
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
    });
    mesh.material = mat;
    // Drawn last of the three sun layers, so the god always sits *in front of*
    // the disc rather than being blended into it.
    mesh.renderOrder = 8;
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mats.push(mat);
  });
  return mats;
}

export interface SunDisk {
  group: THREE.Group;
  setDusk(duskT: number): void;
  faceCamera(camera: THREE.Camera): void;
}

/**
 * Helios head (ASSET-074) + additive hale. Flat disc stays as fallback until
 * the GLB loads. Unlit so the silhouette is the clock, not a lit sculpture.
 */
export function createSunDisk(): SunDisk {
  const group = new THREE.Group();
  group.name = "sunDisk";
  group.frustumCulled = false;
  group.renderOrder = 8;

  const haloMat = new THREE.MeshBasicMaterial({
    map: haloTexture(256),
    color: 0xffffff,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    // Same reason as paintGod() below — the glow tracked the head through
    // solid geometry too.
    depthTest: true,
    fog: false,
    transparent: true,
    // See paintGod() — all sun layers match the sky spheres' tone mapping.
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), haloMat);
  // PlaneGeometry(1,1) scaled by S spans S across → visible radius S/2.
  halo.scale.setScalar(SUN_DISK.haloRadius * 2);
  halo.renderOrder = 4;
  halo.frustumCulled = false;

  const coreMat = new THREE.MeshBasicMaterial({
    map: discTexture(256),
    color: 0xffffff,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    fog: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  const core = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), coreMat);
  core.scale.setScalar(SUN_DISK.coreRadius * 2);
  core.renderOrder = 5;
  core.frustumCulled = false;

  group.add(halo);
  group.add(core);

  const duskHalo = new THREE.Color(0.85, 0.38, 0.16);
  const dayHalo = new THREE.Color(0.72, 0.52, 0.28);
  const duskCore = new THREE.Color(0.95, 0.55, 0.28);
  const dayCore = new THREE.Color(0.92, 0.82, 0.62);
  const duskGod = new THREE.Color(SUN_DISK.godDusk);
  const dayGod = new THREE.Color(SUN_DISK.godDay);
  const tmp = new THREE.Color();
  haloMat.color.copy(dayHalo);

  const godMats: THREE.MeshBasicMaterial[] = [];
  let duskT = 0;

  const applyDusk = (t: number) => {
    tmp.copy(dayHalo).lerp(duskHalo, t);
    haloMat.color.copy(tmp);
    tmp.copy(dayCore).lerp(duskCore, t);
    coreMat.color.copy(tmp);
    tmp.copy(dayGod).lerp(duskGod, t);
    for (const mat of godMats) mat.color.copy(tmp);
  };

  // Skipped entirely when the head is off — no fetch, no draw call. See
  // SUN_DISK.showGod for why it is currently off.
  if (SUN_DISK.showGod) {
    void loadGltf(SUN_DISK.mesh)
      .then((root) => {
        root.scale.setScalar(SUN_DISK.meshScale);
        godMats.push(...paintGod(root));
        group.add(root);
        // Nudge the glow layers *behind* the head. Object3D.lookAt on a
        // non-camera object builds its basis from lookAt(target, position),
        // so local **+Z** points at the viewer — offsetting the disc along
        // +Z would put it in front of the god and hide him completely.
        core.position.z = -SUN_DISK.coreRadius * 0.1;
        halo.position.z = -SUN_DISK.coreRadius * 0.2;
        applyDusk(duskT);
      })
      .catch((err) => {
        console.warn("[sunDisk] sungod GLB missing, keeping flat disc", err);
      });
  }

  return {
    group,
    setDusk(next) {
      duskT = Math.min(1, Math.max(0, next));
      applyDusk(duskT);
    },
    faceCamera(camera) {
      group.lookAt(camera.position);
    },
  };
}
