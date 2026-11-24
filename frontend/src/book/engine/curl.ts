import * as THREE from 'three';

/**
 * A page ("leaf") hinged at the spine (x = 0) that bends as it turns.
 * The page is treated as an inextensible strip whose direction angle grows
 * linearly from the spine to the free edge, so it rolls like paper instead of
 * rotating as a rigid card. A small diagonal term lets the lower corner lead.
 */
export interface CurlParams {
  /** Negative = free edge lags behind the spine (paper drag). */
  curl: number;
  /** Positive = lower corner leads the turn. */
  cornerLead: number;
}

export function makeLeafGeometry(w: number, h: number, segX = 40, segY = 10): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(w, h, segX, segY);
  g.translate(w / 2, 0, 0);
  g.userData.base = Float32Array.from(g.attributes.position.array as Float32Array);
  g.userData.size = [w, h];
  return g;
}

/** t = 0: lying flat on the right. t = 1: lying flat on the left. */
export function bendLeaf(g: THREE.BufferGeometry, t: number, zLift: number, p: CurlParams): void {
  const base = g.userData.base as Float32Array;
  const [w, h] = g.userData.size as [number, number];
  const pos = g.attributes.position.array as Float32Array;
  const theta = Math.PI * t;
  const bend = Math.sin(Math.PI * t);
  for (let i = 0; i < base.length; i += 3) {
    const u = base[i], y = base[i + 1];
    const yN = y / h; // -0.5 .. 0.5
    const a = (bend * (p.curl - p.cornerLead * yN)) / w; // dφ/ds
    let x: number, z: number;
    if (Math.abs(a) < 1e-5) {
      x = u * Math.cos(theta); z = u * Math.sin(theta);
    } else {
      x = (Math.sin(theta + a * u) - Math.sin(theta)) / a;
      z = (Math.cos(theta) - Math.cos(theta + a * u)) / a;
    }
    pos[i] = x; pos[i + 1] = y; pos[i + 2] = z + zLift;
  }
  g.attributes.position.needsUpdate = true;
  g.computeVertexNormals();
  g.computeBoundingSphere();
}

export const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
