import * as THREE from "three";
import { assetUrl } from "./paths";

const loader = new THREE.TextureLoader();

export function loadTexture(relativePath: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    loader.load(
      assetUrl(relativePath),
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = true;
        resolve(tex);
      },
      undefined,
      reject,
    );
  });
}

/** Evenly slice a horizontal concept/turnaround sheet into `count` sub-textures. */
export function sliceHorizontalSheet(
  source: THREE.Texture,
  index: number,
  count: number,
): THREE.Texture {
  const tex = source.clone();
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  const w = 1 / count;
  tex.offset.set(index * w, 0);
  tex.repeat.set(w, 1);
  tex.needsUpdate = true;
  return tex;
}

export async function loadHorizontalSheet(
  relativePath: string,
  count: number,
): Promise<THREE.Texture[]> {
  const sheet = await loadTexture(relativePath);
  return Array.from({ length: count }, (_, i) => sliceHorizontalSheet(sheet, i, count));
}
