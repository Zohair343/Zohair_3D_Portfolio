/**
 * AVATAR CONFIG — everything about the character lives here.
 * Swap the model: change `model`, the bone names (if the rig differs) and `restPose`.
 */
export const avatarConfig = {
  model: '/avatar/comic-character.glb',
  /** Pre-rendered portrait for the chat and the no-3D reading mode. */
  portrait: '/avatar/portrait.png',
  /** CC BY 4.0 requires this credit wherever the model is shown. */
  credit: {
    title: 'Stylized anime character',
    author: 'pinguinoconpulgares',
    url: 'https://sketchfab.com/3d-models/stylized-anime-character-cc31ff0d065c4af7acc97061e085', // TODO: full URL from Zohair
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    changes: 'Re-posed, optimised for the web and animated in code (idle, talking and pointing gestures).',
  },
  /** Model is normalised to this height (scene units) after loading. */
  height: 1,
  bones: {
    head: 'head_GUY_RIG',
    neck: 'neck_GUY_RIG',
    spine: 'spine03_GUY_RIG',
    clavicle: { L: 'clavicle_L_GUY_RIG', R: 'clavicle_R_GUY_RIG' },
    upperArm: { L: 'upperarm_L_GUY_RIG', R: 'upperarm_R_GUY_RIG' },
    lowerArm: { L: 'lowerarm_L_GUY_RIG', R: 'lowerarm_R_GUY_RIG' },
    hand: { L: 'hand_L_GUY_RIG', R: 'hand_R_GUY_RIG' },
    indexTip: { L: 'index03_L_GUY_RIG', R: 'index03_R_GUY_RIG' },
    /** Finger bones curled into a fist when pointing (index stays straight). */
    curl: ['middle', 'ring', 'pinky'] as const,
    thumb: 'thumb',
  },
  /** Cover character following the cursor: max turn (radians), share taken by the neck, follow speed (higher = snappier). */
  lookAt: { yaw: 0.65, pitch: 0.24, neckShare: 0.35, speed: 14 },
  /** Pointing hand (radians, bone-local XYZ, added to the rest pose). Fingers curl around -X;
   * the index stays straight. {S} is replaced by L or R. */
  pointingHand: {
    'middle01_{S}_GUY_RIG': [-1.2, 0, 0], 'middle02_{S}_GUY_RIG': [-1.4, 0, 0], 'middle03_{S}_GUY_RIG': [-1.0, 0, 0],
    'ring01_{S}_GUY_RIG': [-1.2, 0, 0], 'ring02_{S}_GUY_RIG': [-1.4, 0, 0], 'ring03_{S}_GUY_RIG': [-1.0, 0, 0],
    'pinky01_{S}_GUY_RIG': [-1.2, 0, 0], 'pinky02_{S}_GUY_RIG': [-1.4, 0, 0], 'pinky03_{S}_GUY_RIG': [-1.0, 0, 0],
    'thumb02_{S}_GUY_RIG': [-0.6, 0, 0],
  } as Record<string, [number, number, number]>,
  /** Thumb tuck differs by side (mirrored axis). */
  pointingThumb: { L: [0, 0, 0.5], R: [0, 0, -0.5] } as Record<'L' | 'R', [number, number, number]>,
  /** How the pointing arm is placed: shoulder just outside the page edge, a little above the page. */
  pointing: { shoulderZ: 0.24, shoulderDrop: 0.02, clipMargin: 0.13, edgeGap: 0.2, hover: 0.09, enterSeconds: 0.35, minScale: 1.6, maxScale: 3 },
  /** Euler offsets (radians, bone-local XYZ) applied on top of the bind pose for a relaxed stance. */
  restPose: {
    upperarm_L_GUY_RIG: [0, 0, -0.82],
    upperarm_R_GUY_RIG: [0, 0, 0.82],
    lowerarm_L_GUY_RIG: [0.32, 0, 0],
    lowerarm_R_GUY_RIG: [0.32, 0, 0],
  } as Record<string, [number, number, number]>,
};

export type Side = 'L' | 'R';
