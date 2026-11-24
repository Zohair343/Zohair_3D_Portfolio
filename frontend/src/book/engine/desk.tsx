import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/*
 * The desk the book lies on, seen from above: a wooden top, an architect lamp at the book's
 * top-left corner that lights the pages, and a few props. Everything except the desk top is
 * cel-shaded and gets the ink outline, to match the comic.
 *
 * Coordinates: the desk is the XY plane (z = 0 is its surface), +z points up toward the camera.
 * The open book spans roughly x -1..1, y -0.7..0.7.
 */

export const DESK = {
  lamp: { base: new THREE.Vector3(-1.27, 0.6, 0), elbow: new THREE.Vector3(-1.33, 0.38, 0.36), head: new THREE.Vector3(-1.1, 0.3, 0.52), target: new THREE.Vector3(0.15, -0.05, 0) },
  lampIntensity: 8,
  lampColor: '#ffd9a0',
};

const ALL = (() => { const l = new THREE.Layers(); l.enableAll(); return l; })();

/** Three-band ramp for cel-shaded props. */
function toonRamp() {
  const data = new Uint8Array([70, 70, 70, 255, 170, 170, 170, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}
const INK = { thickness: 0.004, color: [0.09, 0.07, 0.06], alpha: 1, visible: true };
function toon(color: string, ramp: THREE.Texture, extra: Partial<THREE.MeshToonMaterialParameters> = {}) {
  const m = new THREE.MeshToonMaterial({ color, gradientMap: ramp, ...extra });
  m.userData.outlineParameters = INK;
  return m;
}

/** Procedural wood: planks with wavy grain, seams and a faint halftone so it still reads as "printed". */
function woodTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 1024;
  const g = c.getContext('2d')!;
  const planks = 4, ph = c.height / planks;
  for (let p = 0; p < planks; p++) {
    const hue = 24 + (p % 2) * 3, light = 30 + ((p * 7) % 5);
    g.fillStyle = `hsl(${hue} 45% ${light}%)`;
    g.fillRect(0, p * ph, c.width, ph);
    for (let i = 0; i < 70; i++) { // grain lines
      const y0 = p * ph + Math.random() * ph, amp = 2 + Math.random() * 6, freq = 0.004 + Math.random() * 0.01, ph0 = Math.random() * 6;
      g.strokeStyle = `hsla(${hue} 50% ${light - 8 + Math.random() * 14}% / ${0.25 + Math.random() * 0.35})`;
      g.lineWidth = 0.6 + Math.random() * 1.6;
      g.beginPath();
      for (let x = 0; x <= c.width; x += 8) g.lineTo(x, y0 + Math.sin(x * freq + ph0) * amp);
      g.stroke();
    }
    g.fillStyle = 'rgba(15,8,4,0.85)'; // seam between planks
    g.fillRect(0, p * ph, c.width, 3);
  }
  g.fillStyle = 'rgba(0,0,0,0.10)'; // halftone, very faint
  for (let y = 0; y < c.height; y += 12) for (let x = (y / 12) % 2 ? 6 : 0; x < c.width; x += 12) { g.beginPath(); g.arc(x, y, 1.6, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 3);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function DeskTop() {
  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.75, metalness: 0 });
    m.userData.outlineParameters = { visible: false };
    return m;
  }, []);
  return <mesh position={[0, 0, -0.03]} material={mat} receiveShadow><planeGeometry args={[14, 10]} /></mesh>;
}

/** A cylinder spanning two points (for the lamp's arms). */
function Rod({ a, b, r, material }: { a: THREE.Vector3; b: THREE.Vector3; r: number; material: THREE.Material }) {
  const { pos, quat, len } = useMemo(() => {
    const dir = b.clone().sub(a);
    return { pos: a.clone().add(b).multiplyScalar(0.5), quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()), len: dir.length() };
  }, [a, b]);
  return <mesh position={pos} quaternion={quat} material={material} castShadow><cylinderGeometry args={[r, r, len, 12]} /></mesh>;
}

/** Architect lamp whose spotlight lights the book. Click it to switch it off and on. */
export function DeskLamp() {
  const { base, elbow, head, target } = DESK.lamp;
  const ramp = useMemo(toonRamp, []);
  const body = useMemo(() => toon('#2f5d62', ramp), [ramp]);
  const metal = useMemo(() => toon('#c9c2b0', ramp), [ramp]);
  const inner = useMemo(() => { const m = toon('#fff1c9', ramp, { emissive: new THREE.Color('#ffe2a8'), emissiveIntensity: 0.9, side: THREE.DoubleSide }); return m; }, [ramp]);
  const bulb = useMemo(() => new THREE.MeshBasicMaterial({ color: '#fff6dc' }), []);
  const [on, setOn] = useState(true);
  const light = useRef<THREE.SpotLight>(null);
  const targetObj = useMemo(() => { const o = new THREE.Object3D(); o.position.copy(target); return o; }, [target]);
  // the shade points from the head toward the target
  const shadeQuat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), target.clone().sub(head).normalize()), [head, target]);
  const mouth = useMemo(() => head.clone().add(target.clone().sub(head).normalize().multiplyScalar(0.07)), [head, target]);

  useFrame((_, dt) => {
    const l = light.current;
    if (l) l.intensity += ((on ? DESK.lampIntensity : 0) - l.intensity) * (1 - Math.exp(-dt * 12));
    inner.emissiveIntensity = on ? 0.9 : 0;
  });

  const toggle = (e: { stopPropagation: () => void }) => { e.stopPropagation(); setOn((v) => !v); };
  return (
    <group onClick={toggle} onPointerOver={() => (document.body.style.cursor = 'pointer')} onPointerOut={() => (document.body.style.cursor = '')}>
      <mesh position={[base.x, base.y, 0.015]} rotation={[Math.PI / 2, 0, 0]} material={body} castShadow receiveShadow><cylinderGeometry args={[0.11, 0.125, 0.03, 32]} /></mesh>
      <Rod a={base} b={elbow} r={0.016} material={metal} />
      <Rod a={elbow} b={head} r={0.016} material={metal} />
      <mesh position={elbow} material={body} castShadow><sphereGeometry args={[0.03, 16, 12]} /></mesh>
      <group position={head} quaternion={shadeQuat} scale={0.72}>
        {/* open cone shade: outer colour, glowing inside */}
        <mesh position={[0, -0.07, 0]} material={body} castShadow><cylinderGeometry args={[0.05, 0.16, 0.16, 28, 1, true]} /></mesh>
        <mesh position={[0, -0.07, 0]} material={inner}><cylinderGeometry args={[0.048, 0.155, 0.155, 28, 1, true]} /></mesh>
        <mesh position={[0, 0.02, 0]} material={body}><sphereGeometry args={[0.055, 16, 12]} /></mesh>
        <mesh position={[0, -0.1, 0]} material={bulb}><sphereGeometry args={[0.035, 14, 10]} /></mesh>
      </group>
      <primitive object={targetObj} />
      <spotLight ref={light} layers={ALL} position={mouth} target={targetObj} color={DESK.lampColor} intensity={DESK.lampIntensity}
        angle={0.95} penumbra={0.85} decay={1.4} distance={6} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-near={0.1} shadow-camera-far={4} shadow-bias={-0.0005} />
    </group>
  );
}

/** A few things on the desk: a coffee mug, a pencil and sticky notes. */
export function DeskProps() {
  const ramp = useMemo(toonRamp, []);
  const mug = useMemo(() => toon('#e8e2d4', ramp), [ramp]);
  const coffee = useMemo(() => toon('#3b2414', ramp), [ramp]);
  const pencil = useMemo(() => toon('#f2c14e', ramp), [ramp]);
  const wood = useMemo(() => toon('#e8c48a', ramp), [ramp]);
  const lead = useMemo(() => toon('#2b2520', ramp), [ramp]);
  const eraser = useMemo(() => toon('#e47c8a', ramp), [ramp]);
  const yellow = useMemo(() => toon('#f7e39a', ramp, { side: THREE.DoubleSide }), [ramp]);
  const pink = useMemo(() => toon('#f4a7c6', ramp, { side: THREE.DoubleSide }), [ramp]);
  const steam = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (steam.current) steam.current.rotation.z = Math.sin(clock.elapsedTime * 0.6) * 0.15; });
  return (
    <group>
      {/* mug, bottom right */}
      <group position={[1.3, -0.46, 0]} scale={0.82}>
        <mesh position={[0, 0, 0.11]} rotation={[Math.PI / 2, 0, 0]} material={mug} castShadow><cylinderGeometry args={[0.11, 0.1, 0.22, 28, 1, true]} /></mesh>
        <mesh position={[0, 0, 0.2]} material={coffee}><circleGeometry args={[0.105, 28]} /></mesh>
        <mesh position={[0.13, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]} material={mug} castShadow><torusGeometry args={[0.05, 0.015, 10, 20]} /></mesh>
        <group ref={steam} position={[0, 0, 0.22]} />
      </group>
      {/* pencil, top right */}
      <group position={[1.26, 0.4, 0.012]} rotation={[0, 0, -0.9]}>
        <mesh rotation={[0, 0, Math.PI / 2]} material={pencil} castShadow><cylinderGeometry args={[0.012, 0.012, 0.42, 6]} /></mesh>
        <mesh position={[0.235, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={wood}><coneGeometry args={[0.012, 0.05, 6]} /></mesh>
        <mesh position={[0.258, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={lead}><coneGeometry args={[0.004, 0.012, 6]} /></mesh>
        <mesh position={[-0.225, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={eraser}><cylinderGeometry args={[0.012, 0.012, 0.03, 8]} /></mesh>
      </group>
      {/* sticky notes, bottom left */}
      <mesh position={[-1.3, -0.44, 0.002]} rotation={[0, 0, 0.18]} material={yellow} receiveShadow castShadow><planeGeometry args={[0.2, 0.2]} /></mesh>
      <mesh position={[-1.24, -0.54, 0.004]} rotation={[0, 0, -0.12]} material={pink} receiveShadow castShadow><planeGeometry args={[0.18, 0.18]} /></mesh>
    </group>
  );
}
