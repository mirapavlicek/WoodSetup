import { useMemo, useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Piece } from '../types';
import { getProfile } from '../data/lumber';
import { useDesignStore } from '../store/designStore';
import { formatLength } from '../utils/units';

type Props = {
  piece: Piece;
};

function deg(d: number) {
  return (d * Math.PI) / 180;
}

export default function WoodPiece({ piece }: Props) {
  const meshRef = useRef<THREE.Mesh>(null);
  const profile = getProfile(piece.profileId);
  const selectedId = useDesignStore((s) => s.selectedId);
  const selectPiece = useDesignStore((s) => s.selectPiece);
  const units = useDesignStore((s) => s.units);
  const attachPicking = useDesignStore((s) => s.attachPicking);
  const applyAttachAtPoint = useDesignStore((s) => s.applyAttachAtPoint);
  const holeAttach = useDesignStore((s) => s.holeAttach);
  const snapJointAtWorldPoint = useDesignStore((s) => s.snapJointAtWorldPoint);
  const setOrbitEnabled = useDesignStore((s) => s.setOrbitEnabled);
  const [hovered, setHovered] = useState(false);

  const isSelected = selectedId === piece.id;
  const isAttachSource = attachPicking?.pieceId === piece.id;

  const color = piece.color ?? profile?.color ?? '#b88a4a';
  const width = profile?.width ?? 60;
  const height = profile?.height ?? 60;
  const length = piece.length;
  const mat = profile?.material ?? 'wood';

  const material = useMemo(() => {
    if (mat === 'metal') {
      return new THREE.MeshStandardMaterial({
        color,
        roughness: 0.4,
        metalness: 0.85,
      });
    }
    if (mat === 'aluminum') {
      return new THREE.MeshStandardMaterial({
        color,
        roughness: 0.28,
        metalness: 0.95,
      });
    }
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.85,
      metalness: 0.05,
    });
  }, [color, mat]);

  const outlineColor = isSelected ? '#fbbf24' : hovered ? '#fde68a' : null;

  return (
    <group
      position={piece.position}
      rotation={[deg(piece.rotation[0]), deg(piece.rotation[1]), deg(piece.rotation[2])]}
      onPointerDown={(e) => {
        if (e.button !== 0) return; // jen levé tlačítko
        e.stopPropagation();
        if (holeAttach && e.face) {
          const obj = e.object;
          const worldQuat = new THREE.Quaternion();
          obj.getWorldQuaternion(worldQuat);
          const n = new THREE.Vector3(
            e.face.normal.x,
            e.face.normal.y,
            e.face.normal.z,
          )
            .applyQuaternion(worldQuat)
            .normalize();
          snapJointAtWorldPoint(
            [e.point.x, e.point.y, e.point.z],
            [n.x, n.y, n.z],
            piece.id,
          );
          return;
        }
        if (attachPicking && !isAttachSource) {
          const p = e.point;
          applyAttachAtPoint(piece.id, [p.x, p.y, p.z]);
          return;
        }
        selectPiece(piece.id);
        // Zabrání kameře, aby se hnula při „cvaknutí" na prvek.
        setOrbitEnabled(false);
      }}
      onPointerUp={(e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        setOrbitEnabled(true);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor =
          holeAttach || (attachPicking && !isAttachSource)
            ? 'crosshair'
            : 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'default';
      }}
    >
      <mesh
        ref={meshRef}
        material={material}
        castShadow
        receiveShadow
        userData={{ pieceId: piece.id }}
      >
        <boxGeometry args={[width, height, length]} />
      </mesh>

      {outlineColor && (
        <mesh>
          <boxGeometry args={[width + 1, height + 1, length + 1]} />
          <meshBasicMaterial
            color={outlineColor}
            wireframe
            transparent
            opacity={0.85}
          />
        </mesh>
      )}

      {isSelected && (
        <Html
          position={[0, height / 2 + 60, 0]}
          center
          distanceFactor={800}
          zIndexRange={[10, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div className="px-2 py-0.5 rounded bg-stone-900/90 border border-wood-400 text-wood-100 text-xs whitespace-nowrap shadow">
            {profile?.name ?? 'Prvek'} • {formatLength(length, units)}
            {piece.label ? ` • ${piece.label}` : ''}
          </div>
        </Html>
      )}
    </group>
  );
}
