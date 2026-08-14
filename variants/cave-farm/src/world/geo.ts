import * as THREE from "three";

/**
 * Push vertices outward by a hashed offset. Shared positions get the same
 * offset so faceted rock chunks stay watertight.
 */
export function displace(
  geo: THREE.BufferGeometry,
  amount: number,
  rand: () => number,
): THREE.BufferGeometry {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const cache = new Map<string, [number, number, number]>();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const key = `${x.toFixed(3)}|${y.toFixed(3)}|${z.toFixed(3)}`;
    let off = cache.get(key);
    if (!off) {
      off = [
        (rand() - 0.5) * amount,
        (rand() - 0.5) * amount,
        (rand() - 0.5) * amount,
      ];
      cache.set(key, off);
    }
    pos.setXYZ(i, x + off[0], y + off[1], z + off[2]);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/** Clone + transform a geometry so it can be merged into a static batch. */
interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export function placed(
  geo: THREE.BufferGeometry,
  pos: Vec3,
  scale: Vec3,
  rot: Vec3,
): THREE.BufferGeometry {
  const g = geo.clone();
  const m = new THREE.Matrix4();
  m.compose(
    new THREE.Vector3(pos.x, pos.y, pos.z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rot.x, rot.y, rot.z)),
    new THREE.Vector3(scale.x, scale.y, scale.z),
  );
  g.applyMatrix4(m);
  return g;
}
