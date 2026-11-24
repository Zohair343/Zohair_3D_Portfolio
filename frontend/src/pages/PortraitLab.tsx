import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useAvatarRig } from '../avatar/useAvatarRig';

/** Renders the head-and-shoulders portrait used by the chat and reading mode (tools/render-portrait.cjs). */
function Head() {
  const rig = useAvatarRig();
  return <primitive object={rig.root} />;
}
export default function PortraitLab() {
  return (
    <div className="lab-stage" style={{ width: 256, height: 256, background: '#efe2c8' }} data-ready="yes">
      <Canvas gl={{ preserveDrawingBuffer: true }} camera={{ position: [0, 0.87, 0.42], fov: 30 }} onCreated={({ camera }) => camera.lookAt(0, 0.875, 0)}>
        <ambientLight intensity={1} />
        <Suspense fallback={null}><Head /></Suspense>
      </Canvas>
    </div>
  );
}
