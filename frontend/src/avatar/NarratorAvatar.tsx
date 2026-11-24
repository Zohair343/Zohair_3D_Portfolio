import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAvatarRig } from './useAvatarRig';
import { applyTalking } from './talk';
import { speech } from './speech';
import { OVERLAY_LAYER } from '../book/engine/scene';
import { useReducedMotion } from '../lib/useReducedMotion';

/**
 * The narrator on inner pages: rises from the bottom edge of the book (bottom-left corner)
 * while narration plays, talking with head and hand gestures, and sinks away when it stops.
 * Drawn on the overlay layer, above the page HTML.
 *
 * @param anchor world position of the book's bottom edge where the narrator stands
 */
export function NarratorAvatar({ enabled, anchor }: { enabled: boolean; anchor: () => THREE.Vector3 }) {
  const floor = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const rig = useAvatarRig(floor);
  useMemo(() => rig.root.traverse((o) => { o.layers.set(OVERLAY_LAYER); (o as THREE.Mesh).castShadow = false; }), [rig]);
  const baseScale = useMemo(() => rig.root.scale.x, [rig]);
  const group = useRef<THREE.Group>(null);
  const rise = useRef(0);
  const reduced = useReducedMotion();
  const SCALE = 0.62; // character height relative to the 1.4-tall page

  useFrame(({ clock }, dt) => {
    const g = group.current;
    if (!g) return;
    const show = enabled && speech.speaking;
    rise.current += ((show ? 1 : 0) - rise.current) * (reduced ? 1 : 1 - Math.exp(-dt * 7));
    g.visible = rise.current > 0.01;
    if (!g.visible) return;
    const a = anchor();
    // waist at the book's bottom edge when fully risen; everything below the edge is cut away
    g.position.set(a.x, a.y - 0.55 * SCALE + (rise.current - 1) * 0.45 * SCALE, a.z);
    floor.constant = -a.y;
    rig.root.scale.setScalar(baseScale * SCALE);
    g.rotation.y = 0.35; // turned a little toward the pages
    applyTalking(rig, reduced ? 0 : speech.amp, clock.elapsedTime, { yaw: -0.15, pitch: 0.05 });
  });

  return <group ref={group}><primitive object={rig.root} /></group>;
}
