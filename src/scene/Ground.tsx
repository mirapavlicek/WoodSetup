import { useMemo } from 'react';
import * as THREE from 'three';
import { Grid, Line } from '@react-three/drei';
import { useDesignStore } from '../store/designStore';
import { groundBounds } from '../utils/ground';

export default function Ground() {
  const corners = useDesignStore((s) => s.groundCorners);
  const gridSize = useDesignStore((s) => s.gridSize);
  const attachPicking = useDesignStore((s) => s.attachPicking);
  const applyAttachAtPoint = useDesignStore((s) => s.applyAttachAtPoint);

  const bounds = useMemo(() => groundBounds(corners), [corners]);

  // BufferGeometry ze 4 rohů (dvě trojúhelníky), normály nahoru.
  const polygonGeom = useMemo(() => {
    const positions = new Float32Array([
      corners[0][0], 0, corners[0][1],
      corners[1][0], 0, corners[1][1],
      corners[2][0], 0, corners[2][1],
      corners[3][0], 0, corners[3][1],
    ]);
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeVertexNormals();
    return geo;
  }, [corners]);

  // Obrys polygonu (s mírným nadzvednutím, aby nezápasil s plochou)
  const outlinePoints = useMemo<[number, number, number][]>(
    () => [
      [corners[0][0], 0.5, corners[0][1]],
      [corners[1][0], 0.5, corners[1][1]],
      [corners[2][0], 0.5, corners[2][1]],
      [corners[3][0], 0.5, corners[3][1]],
      [corners[0][0], 0.5, corners[0][1]],
    ],
    [corners],
  );

  // Grid – stále čtvercový, ale rozšířený podle většího rozměru.
  const cellSize = gridSize;
  const sectionSize = gridSize * 10;
  const gridSizeWorld = bounds.size * 1.25;

  return (
    <group>
      {/* Polygonová plocha */}
      <mesh
        geometry={polygonGeom}
        position={[0, -0.5, 0]}
        receiveShadow
        onClick={(e) => {
          if (!attachPicking) return;
          e.stopPropagation();
          const p = e.point;
          applyAttachAtPoint(null, [p.x, p.y, p.z]);
        }}
      >
        <meshStandardMaterial
          color="#1f1d1a"
          roughness={0.95}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Obrys plochy – zlatá linka */}
      <Line points={outlinePoints} color="#c08443" lineWidth={2} transparent opacity={0.85} />

      {/* Rohy – malé žluté tečky pro orientaci */}
      {corners.map((c, i) => (
        <mesh key={i} position={[c[0], 1, c[1]]}>
          <sphereGeometry args={[Math.max(20, gridSize * 1.5), 12, 12]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.85} />
        </mesh>
      ))}

      {/* Pomocný rastr na úrovni 0 */}
      <Grid
        position={[bounds.center[0], 0, bounds.center[1]]}
        args={[gridSizeWorld, gridSizeWorld]}
        cellSize={cellSize}
        cellThickness={0.6}
        cellColor="#3f3a33"
        sectionSize={sectionSize}
        sectionThickness={1.2}
        sectionColor="#a06c2f"
        fadeDistance={bounds.size * 1.4}
        fadeStrength={1}
        infiniteGrid={false}
        followCamera={false}
      />
    </group>
  );
}
