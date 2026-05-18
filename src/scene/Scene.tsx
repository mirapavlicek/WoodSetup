import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  GizmoHelper,
  GizmoViewport,
  Environment,
  PerspectiveCamera,
} from '@react-three/drei';
import * as THREE from 'three';
import { useDesignStore } from '../store/designStore';
import Ground from './Ground';
import WoodPiece from './WoodPiece';
import JointMesh from './Joint';
import TransformGizmo from './TransformGizmo';
import AnchorMarker from './AnchorMarker';
import PivotMarker from './PivotMarker';
import { groundBounds } from '../utils/ground';

/** Exponuje GL kontext do refu kvůli exportu PNG. */
function GLCapture({
  rendererRef,
}: {
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>;
}) {
  const { gl } = useThree();
  useEffect(() => {
    rendererRef.current = gl;
  }, [gl, rendererRef]);
  return null;
}

type Props = {
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>;
};

export default function Scene({ rendererRef }: Props) {
  const pieces = useDesignStore((s) => s.pieces);
  const joints = useDesignStore((s) => s.joints);
  const selectPiece = useDesignStore((s) => s.selectPiece);
  const corners = useDesignStore((s) => s.groundCorners);
  const attachPicking = useDesignStore((s) => s.attachPicking);
  const orbitEnabled = useDesignStore((s) => s.orbitEnabled);

  const orbitRef = useRef<any>(null);

  const bounds = groundBounds(corners);
  const groundSize = bounds.size;
  // Vzdálenost kamery podle velikosti scény
  const camDist = groundSize * 0.9;

  return (
    <Canvas
      shadows
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      dpr={[1, 2]}
      onPointerMissed={() => {
        if (!attachPicking) selectPiece(null);
      }}
    >
      <GLCapture rendererRef={rendererRef} />
      <color attach="background" args={['#0f0d0a']} />

      <PerspectiveCamera
        makeDefault
        position={[camDist, camDist * 0.85, camDist]}
        fov={45}
        near={1}
        far={groundSize * 10}
      />

      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#fff1c1', '#1a1410', 0.4]} />
      <directionalLight
        position={[groundSize * 0.6, groundSize * 0.9, groundSize * 0.4]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-groundSize}
        shadow-camera-right={groundSize}
        shadow-camera-top={groundSize}
        shadow-camera-bottom={-groundSize}
        shadow-camera-near={1}
        shadow-camera-far={groundSize * 4}
      />

      <Suspense fallback={null}>
        <Environment preset="warehouse" background={false} />
      </Suspense>

      <Ground />

      {pieces.map((piece) => (
        <WoodPiece key={piece.id} piece={piece} />
      ))}
      {joints.map((joint) => (
        <JointMesh key={joint.id} joint={joint} />
      ))}

      <TransformGizmo />
      <AnchorMarker />
      <PivotMarker />

      <OrbitControls
        ref={orbitRef}
        makeDefault
        enabled={orbitEnabled}
        enableDamping
        dampingFactor={0.08}
        minDistance={200}
        maxDistance={groundSize * 4}
        target={[0, 0, 0]}
        maxPolarAngle={Math.PI / 2 - 0.05}
      />

      <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
        <GizmoViewport
          axisColors={['#ef4444', '#10b981', '#3b82f6']}
          labelColor="white"
        />
      </GizmoHelper>
    </Canvas>
  );
}
