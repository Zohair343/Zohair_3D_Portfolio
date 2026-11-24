import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js';
import { bendLeaf, ease, makeLeafGeometry, type CurlParams } from './curl';
import { EPS, FAST_TURN_S, H, TURN_S, W } from './constants';
import { useReducedMotion } from '../../lib/useReducedMotion';

const INK: [number, number, number] = [0.09, 0.07, 0.06];
export const zRight = (i: number, n: number) => (n - i) * EPS + 0.012;
export const zLeft = (i: number) => (i + 1) * EPS + 0.012;
const PAPER_CURL: CurlParams = { curl: -1.1, cornerLead: 0.9 };
const BOARD: CurlParams = { curl: 0, cornerLead: 0 };

function inked(m: THREE.Material, thickness: number) {
  m.userData.outlineParameters = { thickness, color: INK, alpha: 1, visible: thickness > 0 };
  return m;
}

/** One sheet: front and back faces share a geometry that bends as it turns. */
export function Leaf({ index, count, frontTex, backTex, progress, board, onPointerDown, registerMaterials }: {
  index: number; count: number; frontTex: THREE.Texture; backTex: THREE.Texture;
  progress: React.MutableRefObject<number[]>; board: boolean;
  onPointerDown: (e: ThreeEvent<PointerEvent>, side: 'front' | 'back') => void;
  registerMaterials: (front: THREE.MeshStandardMaterial, back: THREE.MeshStandardMaterial) => void;
}) {
  const geom = useMemo(() => makeLeafGeometry(W, H, board ? 2 : 40, board ? 1 : 10), [board]);
  const front = useMemo(() => inked(new THREE.MeshStandardMaterial({ map: frontTex, roughness: 0.92, side: THREE.FrontSide }), board ? 0.006 : 0.0035) as THREE.MeshStandardMaterial, [frontTex, board]);
  const back = useMemo(() => inked(new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.92, side: THREE.BackSide }), board ? 0.006 : 0.0035) as THREE.MeshStandardMaterial, [backTex, board]);
  useEffect(() => registerMaterials(front, back), [front, back, registerMaterials]);
  const last = useRef(-1);
  useFrame(() => {
    const p = progress.current[index];
    if (p === last.current) return;
    last.current = p;
    const e = ease(p);
    bendLeaf(geom, e, zRight(index, count) + (zLeft(index) - zRight(index, count)) * e, board ? BOARD : PAPER_CURL);
  });
  return (
    <group>
      <mesh geometry={geom} material={front} castShadow receiveShadow onPointerDown={(e) => onPointerDown(e, 'front')} />
      <mesh geometry={geom} material={back} castShadow receiveShadow onPointerDown={(e) => onPointerDown(e, 'back')} />
    </group>
  );
}

/** Back cover board, spine and the visible page block. */
export function Binding({ count }: { count: number }) {
  const board = useMemo(() => inked(new THREE.MeshStandardMaterial({ color: '#c9a66b', roughness: 0.9 }), 0.006), []);
  const edge = useMemo(() => inked(new THREE.MeshStandardMaterial({ color: '#efe4cc', roughness: 1 }), 0.004), []);
  return (
    <group>
      <mesh position={[W / 2 + 0.01, 0, -0.01]} material={board} castShadow receiveShadow><boxGeometry args={[W + 0.03, H + 0.04, 0.012]} /></mesh>
      <mesh position={[W / 2, 0, zRight(count, count) - 0.006]} material={edge} receiveShadow><boxGeometry args={[W - 0.005, H - 0.01, 0.01]} /></mesh>
      <mesh position={[0, 0, 0.01]} material={board}><cylinderGeometry args={[0.025, 0.025, H + 0.04, 12]} /></mesh>
    </group>
  );
}

/** Objects on this layer (the pointing arm) are drawn ABOVE the page HTML, on their own canvas. */
export const OVERLAY_LAYER = 1;

/**
 * Draw order, bottom to top:
 * 1. WebGL book + desk + cover avatar, with ink outlines
 * 2. live HTML pages (CSS3DRenderer) in the same 3D space
 * 3. overlay WebGL canvas with only OVERLAY_LAYER objects (the hand must sit on top of the page)
 */
export function Renderers() {
  const { gl, size, scene, camera } = useThree();
  const outline = useMemo(() => new OutlineEffect(gl), [gl]);
  const css = useMemo(() => new CSS3DRenderer(), []);
  const overlay = useMemo(() => {
    const r = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    r.setClearColor(0x000000, 0);
    r.localClippingEnabled = true;
    r.outputColorSpace = gl.outputColorSpace;
    r.toneMapping = gl.toneMapping;
    return r;
  }, [gl]);
  useEffect(() => {
    gl.localClippingEnabled = true;
    gl.shadowMap.enabled = true; gl.shadowMap.type = THREE.PCFSoftShadowMap;
    const el = css.domElement;
    Object.assign(el.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
    el.className = 'css3d-layer';
    gl.domElement.parentElement!.appendChild(el);
    const ov = overlay.domElement;
    Object.assign(ov.style, { position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '3' });
    ov.className = 'overlay-layer';
    gl.domElement.parentElement!.appendChild(ov);
    return () => { el.remove(); ov.remove(); overlay.dispose(); };
  }, [gl, css, overlay]);
  useEffect(() => { css.setSize(size.width, size.height); overlay.setPixelRatio(gl.getPixelRatio()); overlay.setSize(size.width, size.height); }, [css, overlay, gl, size]);
  useFrame(() => {
    camera.layers.set(0);
    outline.render(scene, camera);
    css.render(scene, camera);
    camera.layers.set(OVERLAY_LAYER);
    const bg = scene.background;
    scene.background = null; // the overlay must stay transparent except for the arm
    overlay.render(scene, camera);
    scene.background = bg;
    camera.layers.set(0);
  }, 1);
  return null;
}

/** Frames the closed cover, the open spread, or (on phones) one page at a time. */
export function CameraRig({ spread, focus, single }: { spread: number; focus: 'left' | 'right'; single: boolean }) {
  const { camera, size } = useThree();
  const reduced = useReducedMotion();
  useFrame((_, dt) => {
    const aspect = size.width / size.height;
    const fovV = THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov);
    const one = spread === 0 || single;
    const dist = Math.max(H + 0.3, ((one ? W : 2 * W) + 0.25) / aspect) / (2 * Math.tan(fovV / 2));
    const x = spread === 0 ? W / 2 : single ? (focus === 'left' ? -W / 2 : W / 2) : 0;
    const goal = new THREE.Vector3(x, -0.02 - dist * 0.12, dist);
    if (camera.position.distanceToSquared(goal) < 1e-8) return;
    if (reduced || camera.position.distanceToSquared(goal) < 1e-6) camera.position.copy(goal);
    else camera.position.lerp(goal, 1 - Math.exp(-dt * 4));
    camera.lookAt(camera.position.x, camera.position.y + dist * 0.12, 0);
  });
  return null;
}

/** Advances page-turn progress. Jumps of several pages turn faster, one after another. */
export function Animator({ progress, target, onSettled }: {
  progress: React.MutableRefObject<number[]>; target: React.MutableRefObject<number>; onSettled: (t: number) => void;
}) {
  const reduced = useReducedMotion();
  const inited = useRef(false);
  const settled = useRef(true);
  useFrame((_, dt) => {
    const p = progress.current, t = target.current, n = p.length;
    if (!inited.current) { inited.current = true; onSettled(t); }
    const pending = p.filter((v, i) => v !== (i < t ? 1 : 0)).length;
    const step = reduced ? 1 : Math.min(dt, 0.1) / (pending > 2 ? FAST_TURN_S : TURN_S); // cap so a stall doesn't skip the turn
    let moving = false;
    for (let i = 0; i < n; i++) {
      const goal = i < t ? 1 : 0;
      if (p[i] === goal) continue;
      moving = true;
      const fwd = goal === 1;
      const gate = fwd ? i === 0 || p[i - 1] > 0.35 || i - 1 >= t : i === n - 1 || p[i + 1] < 0.65 || i + 1 < t;
      if (gate) p[i] = fwd ? Math.min(1, p[i] + step) : Math.max(0, p[i] - step);
    }
    if (moving) settled.current = false;
    else if (!settled.current) { settled.current = true; onSettled(t); }
  });
  return null;
}
