import { useMemo } from 'react';
import * as THREE from 'three';
import type { Joint as JointModel } from '../types';
import { getJointType } from '../data/joints';
import { getHoles } from '../data/holes';
import { useDesignStore } from '../store/designStore';
import HoleMarker from './HoleMarker';

type Props = { joint: JointModel };

function deg(d: number) {
  return (d * Math.PI) / 180;
}

export default function Joint({ joint }: Props) {
  const type = getJointType(joint.typeId);
  const selectedId = useDesignStore((s) => s.selectedId);
  const selectPiece = useDesignStore((s) => s.selectPiece);
  const setOrbitEnabled = useDesignStore((s) => s.setOrbitEnabled);
  const holeAttach = useDesignStore((s) => s.holeAttach);
  const isSelected = selectedId === joint.id;

  const color = type?.color ?? '#cccccc';
  const length = type?.length ?? 60;
  const size = type?.size ?? 5;

  const holes = useMemo(() => (type ? getHoles(type) : []), [type]);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color,
        metalness: type?.material === 'metal' ? 0.85 : 0.1,
        roughness: type?.material === 'metal' ? 0.3 : 0.8,
      }),
    [color, type?.material],
  );

  const headMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color,
        metalness: type?.material === 'metal' ? 0.85 : 0.1,
        roughness: type?.material === 'metal' ? 0.3 : 0.8,
      }),
    [color, type?.material],
  );

  return (
    <group
      position={joint.position}
      rotation={[deg(joint.rotation[0]), deg(joint.rotation[1]), deg(joint.rotation[2])]}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        // V režimu „přišroubuj do díry" nechceme zachytávat klik na těle spojky.
        if (holeAttach) return;
        e.stopPropagation();
        selectPiece(joint.id);
        setOrbitEnabled(false);
      }}
      onPointerUp={(e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        setOrbitEnabled(true);
      }}
    >
      {/* Vrut – válec s hlavičkou */}
      {type?.category === 'vrut' && (
        <group rotation={[Math.PI / 2, 0, 0]}>
          <mesh material={material} castShadow>
            <cylinderGeometry args={[size / 2, size / 2, length, 12]} />
          </mesh>
          <mesh material={headMaterial} position={[0, length / 2, 0]} castShadow>
            <cylinderGeometry args={[size, size, size * 0.6, 14]} />
          </mesh>
        </group>
      )}

      {/* Závitová tyč – delší válec bez hlavy */}
      {type?.category === 'zavit' && (
        <group rotation={[Math.PI / 2, 0, 0]}>
          <mesh material={material} castShadow>
            <cylinderGeometry args={[size / 2, size / 2, length, 12]} />
          </mesh>
        </group>
      )}

      {/* Dřevěný čep – válec */}
      {type?.category === 'cep' && (
        <group rotation={[Math.PI / 2, 0, 0]}>
          <mesh material={material} castShadow>
            <cylinderGeometry args={[size / 2, size / 2, length, 12]} />
          </mesh>
        </group>
      )}

      {/* Hřebík – tenký válec s plochou hlavou */}
      {type?.category === 'hrebik' && (
        <group rotation={[Math.PI / 2, 0, 0]}>
          <mesh material={material} castShadow>
            <cylinderGeometry args={[size / 2, size / 2, length, 10]} />
          </mesh>
          <mesh material={headMaterial} position={[0, length / 2, 0]} castShadow>
            <cylinderGeometry args={[size * 1.4, size * 1.4, size * 0.3, 14]} />
          </mesh>
        </group>
      )}

      {/* Hmoždinka / kotva – válec s rozšířenou hlavou */}
      {type?.category === 'hmozdinka' && (
        <group rotation={[Math.PI / 2, 0, 0]}>
          <mesh material={material} castShadow>
            <cylinderGeometry args={[size / 2, size / 2, length, 12]} />
          </mesh>
          <mesh material={headMaterial} position={[0, length / 2, 0]} castShadow>
            <cylinderGeometry args={[size * 1.1, size / 2, size * 0.8, 14]} />
          </mesh>
        </group>
      )}

      {/* Plotna – obdélníková tenká destička */}
      {type?.category === 'plotna' && (
        <mesh material={material} castShadow>
          <boxGeometry args={[length, 3, size]} />
        </mesh>
      )}

      {/* Úhelník – dvě desky v pravém úhlu */}
      {type?.category === 'uhelnik' && (
        <group>
          <mesh material={material} position={[0, size / 2, 0]} castShadow>
            <boxGeometry args={[length, 3, size]} />
          </mesh>
          <mesh material={material} position={[0, 0, size / 2]} castShadow>
            <boxGeometry args={[length, size, 3]} />
          </mesh>
        </group>
      )}

      {/* Trámová botka – U-tvar (dno + dvě stěny) */}
      {type?.category === 'botka' && (
        <group>
          <mesh material={material} position={[0, 0, 0]} castShadow>
            <boxGeometry args={[size, 3, length]} />
          </mesh>
          <mesh material={material} position={[-size / 2, length * 0.4, 0]} castShadow>
            <boxGeometry args={[3, length * 0.8, length]} />
          </mesh>
          <mesh material={material} position={[size / 2, length * 0.4, 0]} castShadow>
            <boxGeometry args={[3, length * 0.8, length]} />
          </mesh>
          {/* křidélka pro přišroubování */}
          <mesh material={material} position={[-size / 2 - size * 0.25, length * 0.4, length / 2 + 1.5]} castShadow>
            <boxGeometry args={[size * 0.5, length * 0.8, 3]} />
          </mesh>
          <mesh material={material} position={[size / 2 + size * 0.25, length * 0.4, length / 2 + 1.5]} castShadow>
            <boxGeometry args={[size * 0.5, length * 0.8, 3]} />
          </mesh>
        </group>
      )}

      {/* Patní kotva – H-tvar (dno + 2 svislé plotny) */}
      {type?.category === 'patka' && (
        <group>
          <mesh material={material} position={[0, 0, 0]} castShadow>
            <boxGeometry args={[size + 60, 6, size + 60]} />
          </mesh>
          <mesh material={material} position={[-size / 2 - 1.5, length / 2, 0]} castShadow>
            <boxGeometry args={[3, length, size]} />
          </mesh>
          <mesh material={material} position={[size / 2 + 1.5, length / 2, 0]} castShadow>
            <boxGeometry args={[3, length, size]} />
          </mesh>
        </group>
      )}

      {/* Krokvová / pásová spona – L nebo plochá páska */}
      {type?.category === 'spona' && (
        <group>
          {/* hlavní páska */}
          <mesh material={material} castShadow>
            <boxGeometry args={[length, 2, size]} />
          </mesh>
          {/* T-spona má kolmou nohu */}
          {type.id === 'spona-t-150' && (
            <mesh material={material} position={[0, 0, size]} castShadow>
              <boxGeometry args={[size, 2, size * 2]} />
            </mesh>
          )}
          {/* krokvová má ohyb */}
          {type.id === 'spona-krokvova' && (
            <mesh
              material={material}
              position={[length / 4, length / 8, 0]}
              rotation={[0, 0, -Math.PI / 4]}
              castShadow
            >
              <boxGeometry args={[length / 2, 2, size]} />
            </mesh>
          )}
        </group>
      )}

      {/* Vazníková (hřebíková) deska – plochá deska se vzorem */}
      {type?.category === 'vaznikova-deska' && (
        <group>
          <mesh material={material} castShadow>
            <boxGeometry args={[length, 2, size]} />
          </mesh>
        </group>
      )}

      {/* Výchozí kulička, kdyby kategorie nebyla rozpoznána */}
      {!type && (
        <mesh material={material} castShadow>
          <sphereGeometry args={[6, 12, 12]} />
        </mesh>
      )}

      {/* Předvrtané díry – vizualizace + interakce */}
      {holes.map((h, i) => (
        <HoleMarker key={i} hole={h} jointId={joint.id} index={i} />
      ))}

      {isSelected && (
        <mesh>
          <sphereGeometry args={[Math.max(length, size) * 0.7, 12, 12]} />
          <meshBasicMaterial color="#fbbf24" wireframe transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
}
