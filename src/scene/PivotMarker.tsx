import { useMemo } from 'react';
import { useDesignStore } from '../store/designStore';
import { worldAnchorPosition } from '../utils/anchor';

/**
 * Zobrazí střed otáčení (rotationPivot) vybraného prvku, pokud není ve středu.
 * Pomáhá uživateli zorientovat se, kolem které kotvy se prvek bude točit.
 */
export default function PivotMarker() {
  const selectedId = useDesignStore((s) => s.selectedId);
  const pieces = useDesignStore((s) => s.pieces);
  const rotationPivot = useDesignStore((s) => s.rotationPivot);

  const pos = useMemo(() => {
    const piece = pieces.find((p) => p.id === selectedId);
    if (!piece) return null;
    if (
      rotationPivot[0] === 0 &&
      rotationPivot[1] === 0 &&
      rotationPivot[2] === 0
    )
      return null;
    return worldAnchorPosition(piece, rotationPivot);
  }, [selectedId, pieces, rotationPivot]);

  if (!pos) return null;

  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[10, 16, 16]} />
        <meshBasicMaterial color="#22d3ee" />
      </mesh>
      <mesh>
        <sphereGeometry args={[18, 16, 16]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.25} />
      </mesh>
    </group>
  );
}
