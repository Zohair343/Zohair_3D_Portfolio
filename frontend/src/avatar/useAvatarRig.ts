import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { avatarConfig } from './config';
import { AvatarRig } from './rig';

/** Loads the character once per use, in its relaxed rest pose. The model keeps its own
 * flat comic colours and built-in ink outline, so the book's outline pass skips it. */
export function useAvatarRig(clip?: THREE.Plane | THREE.Plane[]) {
  const gltf = useGLTF(avatarConfig.model);
  return useMemo(() => {
    const rig = new AvatarRig(gltf.scene);
    rig.applyRestPose();
    rig.root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.material) return;
      // Each copy of the character gets its OWN materials: clones share them by default, and
      // clipping set for one copy (e.g. the pointing arm) must not affect another (the cover).
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map((x) => x.clone()) : mesh.material.clone();
      const m = mesh.material;
      for (const mat of Array.isArray(m) ? m : [m]) {
        mat.userData.outlineParameters = { visible: false };
        // clipShadows: clipped-away parts must not cast shadows either
        if (clip) { mat.clippingPlanes = Array.isArray(clip) ? clip : [clip]; mat.clipShadows = true; mat.needsUpdate = true; }
      }
    });
    return rig;
  }, [gltf, clip]);
}
useGLTF.preload(avatarConfig.model);
