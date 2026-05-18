import { useMemo, useState } from 'react';
import * as THREE from 'three';
import { useDesignStore } from '../store/designStore';
import type { Hole } from '../data/holes';

type Props = {
  hole: Hole;
  jointId: string;
  index: number;
};

const UP = new THREE.Vector3(0, 1, 0);

/**
 * Vykresluje jednu předvrtanou díru na kovové spojce.
 * Při aktivním holeAttach nebo piece attachPicking režimu je klikatelná.
 */
export default function HoleMarker({ hole, jointId, index }: Props) {
  const [hovered, setHovered] = useState(false);
  const holeAttach = useDesignStore((s) => s.holeAttach);
  const snapJointToHole = useDesignStore((s) => s.snapJointToHole);
  const attachPicking = useDesignStore((s) => s.attachPicking);
  const applyAttachAtPoint = useDesignStore((s) => s.applyAttachAtPoint);

  // Quaternion zorientovaný podle normály díry (kotouč ve výchozí XZ rovině).
  const quat = useMemo(() => {
    const q = new THREE.Quaternion();
    const to = new THREE.Vector3(hole.normal[0], hole.normal[1], hole.normal[2]).normalize();
    if (Math.abs(to.x - UP.x) < 1e-6 && Math.abs(to.y - UP.y) < 1e-6 && Math.abs(to.z - UP.z) < 1e-6) {
      return q;
    }
    q.setFromUnitVectors(UP, to);
    return q;
  }, [hole.normal[0], hole.normal[1], hole.normal[2]]);

  const active = !!holeAttach || !!attachPicking;
  const r = Math.max(2, hole.diameter / 2);

  return (
    <group position={hole.position} quaternion={quat}>
      {/* tmavá díra */}
      <mesh>
        <cylinderGeometry args={[r, r, 1, 16]} />
        <meshBasicMaterial color="#0a0a0a" />
      </mesh>
      {/* tenký kroužek po obvodu pro lepší viditelnost */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[r * 0.9, r * 1.15, 16]} />
        <meshBasicMaterial color="#5b5f66" side={THREE.DoubleSide} />
      </mesh>
      {/* hover/picking glow */}
      {active && (
        <mesh
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
            document.body.style.cursor = 'crosshair';
          }}
          onPointerOut={() => {
            setHovered(false);
            document.body.style.cursor = 'default';
          }}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.stopPropagation();
            if (holeAttach) {
              snapJointToHole(jointId, index);
            } else if (attachPicking) {
              const p = e.point;
              applyAttachAtPoint(null, [p.x, p.y, p.z]);
            }
          }}
        >
          <cylinderGeometry args={[r * 2.2, r * 2.2, 2, 18]} />
          <meshBasicMaterial
            color={hovered ? '#fbbf24' : '#f472b6'}
            transparent
            opacity={hovered ? 0.75 : 0.35}
          />
        </mesh>
      )}
    </group>
  );
}
