import * as THREE from 'three';

const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpP = new THREE.Vector3();
const qWorld = new THREE.Quaternion(), qParent = new THREE.Quaternion(), qDelta = new THREE.Quaternion();

/**
 * Cyclic Coordinate Descent IK: rotates each bone in `chain` (shoulder → wrist) so the point
 * `tip()` moves toward `target`. Works in world space; simple, stable, no constraints needed
 * for a pointing arm. `maxStep` limits rotation per bone per iteration (radians).
 */
export function solveCCD(chain: THREE.Bone[], tip: () => THREE.Vector3, target: THREE.Vector3, iterations = 10, maxStep = 0.6) {
  for (let it = 0; it < iterations; it++) {
    for (let i = chain.length - 1; i >= 0; i--) {
      const bone = chain[i];
      bone.getWorldPosition(tmpP);
      const t = tip();
      tmpA.subVectors(t, tmpP).normalize();
      tmpB.subVectors(target, tmpP).normalize();
      const angle = tmpA.angleTo(tmpB);
      if (angle < 1e-4) continue;
      qDelta.setFromUnitVectors(tmpA, tmpB);
      if (angle > maxStep) qDelta.slerp(new THREE.Quaternion(), 1 - maxStep / angle);
      // world rotation of bone, apply delta in world, convert back to local
      bone.getWorldQuaternion(qWorld);
      bone.parent!.getWorldQuaternion(qParent);
      qWorld.premultiply(qDelta);
      bone.quaternion.copy(qParent.invert().multiply(qWorld));
      bone.updateMatrixWorld(true);
    }
    if (tip().distanceTo(target) < 1e-3) break;
  }
}
