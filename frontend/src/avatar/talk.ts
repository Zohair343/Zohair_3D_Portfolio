import { avatarConfig } from './config';
import type { AvatarRig } from './rig';

const T = { headNod: 0.07, headTurn: 0.12, armLift: 0.22, forearm: 0.55, sway: 0.03 };

/**
 * Talking body language, layered on the rest pose: the head nods and turns, the forearms
 * gesture and the shoulders sway, all scaled by the voice's loudness `amp` (0..1).
 * The mouth stays still (the model has no jaw or face shapes): in comics the speech balloon
 * shows who is talking.
 */
export function applyTalking(rig: AvatarRig, amp: number, t: number, look = { yaw: 0, pitch: 0 }) {
  const b = avatarConfig.bones, rest = avatarConfig.restPose;
  const g = (speed: number, phase: number) => 0.5 + 0.5 * Math.sin(t * speed + phase); // 0..1 gesture wave
  const a = Math.min(1, amp);
  rig.setOffset(b.spine, [Math.sin(t * 1.6) * 0.015 + a * T.sway * Math.sin(t * 2.3), a * T.sway * Math.sin(t * 1.7), 0]);
  rig.setOffset(b.neck, [look.pitch * 0.35, look.yaw * 0.35, 0]);
  rig.setOffset(b.head, [
    look.pitch * 0.65 + a * T.headNod * Math.sin(t * 7.3) + 0.02 * Math.sin(t * 1.1),
    look.yaw * 0.65 + T.headTurn * Math.sin(t * 0.8) * (0.3 + a),
    a * 0.04 * Math.sin(t * 3.1),
  ]);
  // Right hand does most of the explaining; the left joins in more softly, out of phase.
  const r = a * g(3.2, 0), l = a * 0.6 * g(2.6, 1.7);
  const up = (name: string, side: 1 | -1, k: number) => {
    const [x, y, z] = rest[name];
    rig.setOffset(name, [x + k * 0.6 * T.armLift * 1.4, y, z - side * k * T.armLift]); // swing forward and out
  };
  up(b.upperArm.R, 1, r);
  up(b.upperArm.L, -1, l);
  const fore = (name: string, k: number) => { const [x, y, z] = rest[name]; rig.setOffset(name, [x + k * T.forearm, y, z]); };
  fore(b.lowerArm.R, r);
  fore(b.lowerArm.L, l);
}
