import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { avatarConfig } from './config';

/** A loaded, normalised character with named bones and remembered bind rotations. */
export class AvatarRig {
  root: THREE.Group;
  bones = new Map<string, THREE.Bone>();
  bind = new Map<string, THREE.Quaternion>();

  constructor(source: THREE.Object3D) {
    this.root = cloneSkinned(source) as THREE.Group;
    this.root.traverse((o) => {
      if ((o as THREE.Bone).isBone) { this.bones.set(o.name, o as THREE.Bone); this.bind.set(o.name, o.quaternion.clone()); }
      const m = o as THREE.Mesh;
      if (m.isMesh) { m.frustumCulled = false; m.castShadow = true; }
    });
    this.normalise(avatarConfig.height);
  }

  bone(name: string) { return this.bones.get(name); }

  /** Rotation = bind rotation × offset (bone-local Euler). */
  setOffset(name: string, euler: [number, number, number] | THREE.Euler, weight = 1) {
    const b = this.bones.get(name), q0 = this.bind.get(name);
    if (!b || !q0) return;
    const e = euler instanceof THREE.Euler ? euler : new THREE.Euler(...euler);
    const q = new THREE.Quaternion().setFromEuler(e);
    b.quaternion.copy(q0).multiply(weight === 1 ? q : new THREE.Quaternion().slerp(q, weight));
  }

  applyRestPose(pose = avatarConfig.restPose) {
    for (const [name, e] of Object.entries(pose)) this.setOffset(name, e);
    this.root.updateMatrixWorld(true);
  }

  private normalise(height: number) {
    this.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this.root, true);
    const s = height / (box.max.y - box.min.y || 1);
    this.root.scale.multiplyScalar(s);
    this.root.updateMatrixWorld(true);
    const b2 = new THREE.Box3().setFromObject(this.root, true);
    const c = b2.getCenter(new THREE.Vector3());
    this.root.position.x -= c.x; this.root.position.z -= c.z; this.root.position.y -= b2.min.y;
  }
}
