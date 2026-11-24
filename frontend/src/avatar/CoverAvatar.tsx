import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { avatarConfig } from './config';
import { useAvatarRig } from './useAvatarRig';
import { useReducedMotion } from '../lib/useReducedMotion';
import { applyTalking } from './talk';
import { speech } from './speech';

/**
 * The character standing in front of the cover, cut off at the cover's lower border so it
 * leans in from behind it. Sinks away when the book opens.
 * @param clipY world-space height of the cover's lower border
 */
export function CoverAvatar({ visible, position, scale, waistY, clipY }: {
  visible: boolean; position: [number, number, number]; scale: number;
  /** Local height where the waist should sit (the cover's lower border). */
  waistY: number; clipY: () => number;
}) {
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const rig = useAvatarRig(plane);
  const group = useRef<THREE.Group>(null);
  const reduced = useReducedMotion();
  const pointer = useRef({ x: 0, y: 0 });
  const look = useRef({ x: 0, y: 0 }); // smoothed version of `pointer`
  const greetAt = useRef<number | null>(null);
  const b = avatarConfig.bones;

  useEffect(() => {
    if (visible && !reduced) greetAt.current = performance.now() + 500;
  }, [visible, reduced]);
  useEffect(() => {
    if (reduced || window.matchMedia('(pointer: coarse)').matches) return;
    const fn = (e: PointerEvent) => { pointer.current = { x: (e.clientX / innerWidth) * 2 - 1, y: (e.clientY / innerHeight) * 2 - 1 }; };
    addEventListener('pointermove', fn);
    return () => removeEventListener('pointermove', fn);
  }, [reduced]);

  useFrame(({ clock }, dt) => {
    const g = group.current;
    if (!g) return;
    g.position.y += ((visible ? 0 : -1) - g.position.y) * (reduced ? 1 : 1 - Math.exp(-dt * 6));
    g.visible = g.position.y > -0.95;
    plane.constant = -clipY();
    if (!g.visible || reduced) return;
    const t = clock.elapsedTime;
    // idle: breathing in the chest, head following the pointer, a nod to greet
    rig.setOffset(b.spine, [Math.sin(t * 1.6) * 0.015, 0, 0]);
    let nod = 0;
    if (greetAt.current !== null) {
      const s = (performance.now() - greetAt.current) / 1000;
      if (s > 0 && s < 1.3) nod = Math.sin(s * Math.PI * 2.2) * 0.16 * (1 - s / 1.3);
      else if (s >= 1.3) greetAt.current = null;
    }
    // Follow the cursor quickly but smoothly; neck and head share the turn so it looks natural.
    const L = avatarConfig.lookAt;
    const k = 1 - Math.exp(-dt * L.speed);
    look.current.x += (pointer.current.x - look.current.x) * k;
    look.current.y += (pointer.current.y - look.current.y) * k;
    const yaw = look.current.x * L.yaw, pitch = look.current.y * L.pitch;
    if (speech.speaking) {
      applyTalking(rig, speech.amp, t, { yaw, pitch }); // narrating the cover: talk while still following the cursor
      return;
    }
    rig.applyRestPose();
    rig.setOffset(b.neck, [pitch * L.neckShare, yaw * L.neckShare, 0]);
    rig.setOffset(b.head, [pitch * (1 - L.neckShare) + nod, yaw * (1 - L.neckShare), 0]);
  });

  return (
    <group position={position}>
      <group ref={group}>
        {/* waist is ~55% of the normalised height */}
        <group position={[0, waistY - 0.55 * scale, 0]} scale={scale}><primitive object={rig.root} /></group>
      </group>
    </group>
  );
}
