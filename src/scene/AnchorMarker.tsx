import { useMemo } from 'react';
import { useDesignStore } from '../store/designStore';
import { worldAnchorPosition } from '../utils/anchor';

/**
 * Vykreslí zvolený zdrojový bod kotvy jako zářící kuličku.
 * Aktivní jen v režimu attachPicking.
 */
export default function AnchorMarker() {
  const attachPicking = useDesignStore((s) => s.attachPicking);
  const pieces = useDesignStore((s) => s.pieces);

  const pos = useMemo(() => {
    if (!attachPicking) return null;
    const piece = pieces.find((p) => p.id === attachPicking.pieceId);
    if (!piece) return null;
    return worldAnchorPosition(piece, attachPicking.anchor);
  }, [attachPicking, pieces]);

  if (!pos) return null;

  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[14, 16, 16]} />
        <meshBasicMaterial color="#f472b6" transparent opacity={0.95} />
      </mesh>
      <mesh>
        <sphereGeometry args={[22, 16, 16]} />
        <meshBasicMaterial color="#f472b6" transparent opacity={0.25} />
      </mesh>
    </group>
  );
}
