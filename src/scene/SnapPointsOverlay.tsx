import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useDesignStore } from '../store/designStore';
import { closestAnchorOfPiece, worldAnchorPosition } from '../utils/anchor';
import type { Vec3 } from '../types';

/**
 * Snap-point dots během režimu „Přichytit k bodu" a během tažení s gizmem.
 * Pro každý prvek (kromě zdrojového / právě taženého) nakreslí:
 *  - rohy (8) – průsečík tří ploch → nejvyšší priorita, větší žluté kuličky
 *  - středy hran (12) – průsečík dvou ploch („kde se plochy stýkají") → oranžové
 *  - středy stěn (6) – jemný světlejší bod
 *
 * Vlastní snap udělá `closestAnchorOfPiece` při kliknutí na prvek;
 * tyhle body slouží jen jako vizuální nápověda, kam se klik chytne.
 * `raycast={null}` zajistí, že body neukrádají kliky – ty propadnou do prvku pod nimi.
 */

const NULL_RAYCAST = (() => null) as unknown as THREE.Object3D['raycast'];

type DotType = 'corner' | 'edge' | 'face';

type Dot = {
  pos: Vec3;
  type: DotType;
};

function dotsForPiece(
  worldPos: (anchor: [number, number, number]) => Vec3 | null,
): Dot[] {
  const out: Dot[] = [];
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        const nz =
          (x !== 0 ? 1 : 0) + (y !== 0 ? 1 : 0) + (z !== 0 ? 1 : 0);
        if (nz === 0) continue; // střed prvku (uvnitř) přeskočíme
        const wp = worldPos([x, y, z]);
        if (!wp) continue;
        const type: DotType = nz === 3 ? 'corner' : nz === 2 ? 'edge' : 'face';
        out.push({ pos: wp, type });
      }
    }
  }
  return out;
}

function CornerDot({ pos }: { pos: Vec3 }) {
  return (
    <group position={pos}>
      <mesh raycast={NULL_RAYCAST} renderOrder={999}>
        <sphereGeometry args={[11, 14, 14]} />
        <meshBasicMaterial
          color="#facc15"
          depthTest={false}
          transparent
          opacity={0.95}
        />
      </mesh>
      <mesh raycast={NULL_RAYCAST} renderOrder={998}>
        <sphereGeometry args={[18, 14, 14]} />
        <meshBasicMaterial
          color="#fde047"
          depthTest={false}
          transparent
          opacity={0.18}
        />
      </mesh>
    </group>
  );
}

function EdgeDot({ pos }: { pos: Vec3 }) {
  return (
    <mesh position={pos} raycast={NULL_RAYCAST} renderOrder={997}>
      <sphereGeometry args={[7, 12, 12]} />
      <meshBasicMaterial
        color="#fb923c"
        depthTest={false}
        transparent
        opacity={0.85}
      />
    </mesh>
  );
}

function FaceDot({ pos }: { pos: Vec3 }) {
  return (
    <mesh position={pos} raycast={NULL_RAYCAST} renderOrder={996}>
      <sphereGeometry args={[4.5, 10, 10]} />
      <meshBasicMaterial
        color="#fef3c7"
        depthTest={false}
        transparent
        opacity={0.55}
      />
    </mesh>
  );
}

/**
 * Halo, který každý frame přepočítá nejbližší kotvu prvku pod kurzorem
 * a usadí se na ni – uživatel vidí přesně, kam klik dopadne.
 */
function SnapHoverHalo({ sourceId }: { sourceId: string | null }) {
  const { raycaster, scene, mouse, camera } = useThree();
  const pieces = useDesignStore((s) => s.pieces);
  const ref = useRef<THREE.Group>(null);

  useFrame(() => {
    const g = ref.current;
    if (!g) return;

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(scene.children, true);

    let pieceId: string | null = null;
    let hitPoint: THREE.Vector3 | null = null;
    for (const h of hits) {
      // Snap halo reaguje jen na prvky (ne na spojky, podlahu apod.)
      const pid = (h.object.userData as { pieceId?: string } | undefined)
        ?.pieceId;
      if (pid) {
        pieceId = pid;
        hitPoint = h.point;
        break;
      }
    }
    if (!pieceId || !hitPoint || pieceId === sourceId) {
      g.visible = false;
      return;
    }
    const piece = pieces.find((p) => p.id === pieceId);
    if (!piece) {
      g.visible = false;
      return;
    }
    const closest = closestAnchorOfPiece(piece, [
      hitPoint.x,
      hitPoint.y,
      hitPoint.z,
    ]);
    if (!closest) {
      g.visible = false;
      return;
    }
    g.position.set(closest.position[0], closest.position[1], closest.position[2]);
    g.visible = true;
  });

  return (
    <group ref={ref} visible={false}>
      <mesh raycast={NULL_RAYCAST} renderOrder={1001}>
        <sphereGeometry args={[16, 18, 18]} />
        <meshBasicMaterial
          color="#fef3c7"
          depthTest={false}
          transparent
          opacity={0.95}
        />
      </mesh>
      <mesh raycast={NULL_RAYCAST} renderOrder={1000}>
        <sphereGeometry args={[28, 16, 16]} />
        <meshBasicMaterial
          color="#fde047"
          depthTest={false}
          transparent
          opacity={0.35}
        />
      </mesh>
      <mesh raycast={NULL_RAYCAST} renderOrder={999}>
        <sphereGeometry args={[44, 16, 16]} />
        <meshBasicMaterial
          color="#facc15"
          depthTest={false}
          transparent
          opacity={0.12}
        />
      </mesh>
    </group>
  );
}

export default function SnapPointsOverlay() {
  const attachPicking = useDesignStore((s) => s.attachPicking);
  const gizmoDragging = useDesignStore((s) => s.gizmoDragging);
  const selectedId = useDesignStore((s) => s.selectedId);
  const pieces = useDesignStore((s) => s.pieces);

  const active = attachPicking !== null || gizmoDragging;

  const allDots = useMemo<Dot[]>(() => {
    if (!active) return [];
    // V attach módu skryjeme dotsy zdrojového prvku; v drag módu skryjeme dotsy
    // vybraného prvku (právě taženého).
    const sourceId = attachPicking?.pieceId ?? (gizmoDragging ? selectedId : null);
    const acc: Dot[] = [];
    for (const piece of pieces) {
      if (sourceId && piece.id === sourceId) continue;
      const dots = dotsForPiece((a) => worldAnchorPosition(piece, a));
      acc.push(...dots);
    }
    return acc;
  }, [active, attachPicking?.pieceId, gizmoDragging, selectedId, pieces]);

  if (!active) return null;

  const sourceId =
    attachPicking?.pieceId ?? (gizmoDragging ? selectedId : null);

  return (
    <group>
      {allDots.map((d, i) => {
        const key = `${i}-${d.type}-${d.pos[0]}-${d.pos[1]}-${d.pos[2]}`;
        if (d.type === 'corner') return <CornerDot key={key} pos={d.pos} />;
        if (d.type === 'edge') return <EdgeDot key={key} pos={d.pos} />;
        return <FaceDot key={key} pos={d.pos} />;
      })}
      <SnapHoverHalo sourceId={sourceId} />
    </group>
  );
}
