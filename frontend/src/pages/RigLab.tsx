import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useSearchParams } from 'react-router-dom';
import { avatarConfig } from '../avatar/config';
import { AvatarRig } from '../avatar/rig';

/** /lab/rig?upperarm_L_GUY_RIG=0,0,1.2&cam=front — try bone offsets from the URL. */
function Model() {
  const gltf = useGLTF(avatarConfig.model);
  const [sp] = useSearchParams();
  const rig = useMemo(() => {
    const r = new AvatarRig(gltf.scene);
    const pose: Record<string, [number, number, number]> = { ...avatarConfig.restPose };
    sp.forEach((v, k) => { if (k.includes('GUY')) pose[k] = v.split(',').map(Number) as [number, number, number]; });
    r.applyRestPose(pose);
    return r;
  }, [gltf, sp]);
  return <primitive object={rig.root} />;
}
export default function RigLab() {
  const [sp] = useSearchParams();
  const cam = sp.get('cam');
  const side = cam === 'side';
  // cam=hand: close-up of the character's left hand (screen right) in the rest pose
  // cam=x,y,z&look=x,y,z for any close-up; otherwise front or side views
  const num = (k: string) => sp.get(k)?.split(',').map(Number) as [number, number, number] | undefined;
  const pos: [number, number, number] = (cam && cam.includes(',') ? num('cam') : undefined) ?? (side ? [1.6, 0.6, 0] : [0, 0.6, 1.9]);
  const look: [number, number, number] = num('look') ?? [0, 0.55, 0];
  return (
    <div style={{ width: 600, height: 700, background: '#f4ecdc' }} data-ready="yes">
      <Canvas camera={{ position: pos, fov: 35 }} onCreated={({ camera }) => camera.lookAt(...look)}>
        <ambientLight intensity={1} />
        <directionalLight position={[-1, 2, 2]} intensity={2} />
        <Suspense fallback={null}><Model /></Suspense>
        <axesHelper args={[0.3]} />
      </Canvas>
    </div>
  );
}
