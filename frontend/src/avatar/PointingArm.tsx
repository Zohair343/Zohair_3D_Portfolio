import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { avatarConfig, type Side } from './config';
import { useAvatarRig } from './useAvatarRig';
import { solveCCD } from './ik';
import { ease } from '../book/engine/curl';
import { OVERLAY_LAYER } from '../book/engine/scene';
import { useReducedMotion } from '../lib/useReducedMotion';

/** Where to point: a world-space point on a page, and which page edge the arm comes from. */
export interface PointTarget { page: 'left' | 'right'; world: THREE.Vector3 }

/**
 * The character's arm reaching in over the page edge to point at a button or link.
 * A whole character stands just outside the book; a clipping plane at the page edge hides
 * everything beyond it, so only the arm and hand appear. Left page → the arm enters from the
 * left (character's left arm); right page → from the right (right arm).
 *
 * @param target  ref holding the current target (null = withdraw)
 * @param edgeX   world x of the book's outer left/right edges
 */
export function PointingArm({ target, edgeX }: { target: React.MutableRefObject<PointTarget | null>; edgeX: () => { left: number; right: number } }) {
  const cfg = avatarConfig.pointing;
  const b = avatarConfig.bones;
  // Two cuts: beyond the frame edge (hides the body), and below the reaching arm (hides the legs).
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(1, 0, 0), 0), []);
  const floor = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const planes = useMemo(() => [plane, floor], [plane, floor]);
  const rig = useAvatarRig(planes);
  // Drawn on the overlay canvas, above the page HTML; no shadow (it hovers over the paper).
  useMemo(() => rig.root.traverse((o) => { o.layers.set(OVERLAY_LAYER); (o as THREE.Mesh).castShadow = false; }), [rig]);
  const reduced = useReducedMotion();
  const state = useRef({ p: 0, page: 'left' as 'left' | 'right', aim: new THREE.Vector3(), scale: 1.6 });

  // The rig is normalised to height 1 via its base scale; `s.scale` multiplies that.
  const baseScale = useMemo(() => rig.root.scale.x, [rig]);
  // Arm length for a height-1 character (shoulder → fingertip), measured once from the skeleton.
  const armLen = useMemo(() => {
    const side: Side = 'L';
    const pts = [b.upperArm[side], b.lowerArm[side], b.hand[side], b.indexTip[side]].map((n) => rig.bone(n)!.getWorldPosition(new THREE.Vector3()));
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += pts[i].distanceTo(pts[i - 1]);
    return len * 1.08; // + fingertip beyond the last joint
  }, [rig, b]);

  const tip = (side: Side) => {
    const t = rig.bone(b.indexTip[side])!, p = t.parent as THREE.Bone;
    const a = p.getWorldPosition(new THREE.Vector3()), c = t.getWorldPosition(new THREE.Vector3());
    return c.addScaledVector(c.clone().sub(a), 0.9); // extend past the last joint to the fingertip
  };

  /** Rest pose + pointing hand for one side; the arm bones are then solved by IK. */
  const resetPose = (side: Side) => {
    for (const name of rig.bind.keys()) rig.setOffset(name, [0, 0, 0]);
    rig.applyRestPose();
    for (const [k, e] of Object.entries(avatarConfig.pointingHand)) rig.setOffset(k.replace('{S}', side), e);
    rig.setOffset(`thumb01_${side}_GUY_RIG`, avatarConfig.pointingThumb[side]);
    // start the arm roughly horizontal so IK converges quickly and the elbow bends naturally
    rig.setOffset(b.upperArm[side], [0, 0, side === 'L' ? 0.6 : -0.6]);
    rig.setOffset(b.lowerArm[side], [0.25, 0, 0]);
  };

  useFrame((_, dt) => {
    const s = state.current;
    const want = target.current;
    const step = reduced ? 1 : Math.min(dt, 0.1) / avatarConfig.pointing.enterSeconds;
    if (want && (s.p === 0 || want.page === s.page)) { s.page = want.page; s.aim.copy(want.world); s.p = Math.min(1, s.p + step); }
    else s.p = Math.max(0, s.p - step); // withdraw (also before switching sides)
    rig.root.visible = s.p > 0;
    if (!rig.root.visible) return;

    const side: Side = s.page === 'left' ? 'L' : 'R';
    const sign = s.page === 'left' ? -1 : 1;
    const edges = edgeX();
    const edge = s.page === 'left' ? edges.left : edges.right;

    // Keep the arm nearly straight: fixed hand size, shoulder pushed out past the edge as far as
    // the reach requires. Only targets too far from the edge make the character (and hand) larger.
    const dz = cfg.shoulderZ - s.aim.z, dy = cfg.shoulderDrop;
    const edgeShoulderX = edge + sign * cfg.edgeGap;
    const minDist = Math.hypot(edgeShoulderX - s.aim.x, dy, dz);
    const goalScale = THREE.MathUtils.clamp(Math.max(cfg.minScale, minDist / (armLen * 0.93)), cfg.minScale, cfg.maxScale);
    s.scale += (goalScale - s.scale) * (reduced ? 1 : 1 - Math.exp(-dt * 10));
    const reach = armLen * s.scale * 0.93;
    const h = Math.sqrt(Math.max(reach * reach - dz * dz - dy * dy, 0));
    const shoulder = new THREE.Vector3(s.aim.x + sign * h, s.aim.y + dy, cfg.shoulderZ);
    if (sign * (shoulder.x - edgeShoulderX) < 0) shoulder.x = edgeShoulderX; // never start inside the page

    // Face the camera; place the root so the shoulder lands on the anchor.
    resetPose(side);
    rig.root.scale.setScalar(baseScale * s.scale);
    rig.root.position.set(0, 0, 0);
    rig.root.updateMatrixWorld(true);
    const sh = rig.bone(b.upperArm[side])!.getWorldPosition(new THREE.Vector3());
    rig.root.position.sub(sh).add(shoulder);
    rig.root.updateMatrixWorld(true);

    // Only what's inside the frame is visible: clip just beyond the page edge (≈ the screen edge),
    // so the forearm crosses the desk margin and the body stays out of sight.
    const clipX = edge + sign * cfg.clipMargin;
    plane.normal.set(-sign, 0, 0);
    plane.constant = sign * clipX;
    floor.constant = -(Math.min(shoulder.y, s.aim.y) - 0.14 * s.scale); // keep y above the arm's lowest point

    // Slide the fingertip in from the edge toward the target.
    const from = new THREE.Vector3(edge - sign * 0.02, s.aim.y, s.aim.z);
    const aimNow = from.lerp(s.aim, ease(s.p));
    const chain = [b.upperArm[side], b.lowerArm[side], b.hand[side]].map((n) => rig.bone(n)!);
    solveCCD(chain, () => tip(side), aimNow, 12, 0.5);
  });

  return <primitive object={rig.root} />;
}
