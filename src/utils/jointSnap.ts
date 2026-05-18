import * as THREE from 'three';
import type { Joint, JointType, Piece, Vec3 } from '../types';
import { getProfile } from '../data/lumber';

/** Max vzdálenost (mm), v jaké magnet ještě „přitáhne" spojku k prvku. */
export const JOINT_MAGNET_THRESHOLD = 600;

/**
 * Lokální orientace spojky vůči prvku.
 *  - `awayLocal` – směr v lokálních osách spojky, který má při montáži směřovat
 *    PRYČ od prvku (= shodný s vnější normálou plochy prvku).
 *  - `longLocal` – směr v lokálních osách spojky, který se má zarovnat s podélnou
 *    osou prvku (lokální +Z prvku).
 *  - `offset`   – posun středu spojky od plochy prvku ve směru `awayLocal` (mm).
 *  - `prefer`   – které plochy prvku máme přednostně hledat:
 *      `'all'`  = libovolnou (bok i čelo),
 *      `'ends'` = pouze čela (lokální ±Z) – pro botky a patky.
 */
type Alignment = {
  awayLocal: [number, number, number];
  longLocal: [number, number, number];
  offset: number;
  prefer: 'all' | 'ends';
};

const ALIGN: Partial<Record<JointType['category'], Alignment>> = {
  plotna: {
    awayLocal: [0, 1, 0],
    longLocal: [1, 0, 0],
    offset: 1.5,
    prefer: 'all',
  },
  uhelnik: {
    awayLocal: [0, 1, 0],
    longLocal: [1, 0, 0],
    offset: 1.5,
    prefer: 'all',
  },
  spona: {
    awayLocal: [0, 1, 0],
    longLocal: [1, 0, 0],
    offset: 1,
    prefer: 'all',
  },
  'vaznikova-deska': {
    awayLocal: [0, 1, 0],
    longLocal: [1, 0, 0],
    offset: 1,
    prefer: 'all',
  },
  botka: {
    // U-tvar – dno (lokální -Y) usedne na čelo prvku, dlouhá osa botky = délka prvku.
    awayLocal: [0, -1, 0],
    longLocal: [0, 0, 1],
    offset: 1.5,
    prefer: 'ends',
  },
  patka: {
    // Patní kotva – horní strana (lokální +Y) drží sloup, sloup pokračuje vzhůru po jeho ose.
    awayLocal: [0, -1, 0],
    longLocal: [0, 1, 0],
    offset: 3,
    prefer: 'ends',
  },
};

export type JointSnapResult = {
  position: Vec3;
  rotation: Vec3;
  connectId: string;
};

function pieceMatrix(piece: Piece): THREE.Matrix4 {
  const e = new THREE.Euler(
    THREE.MathUtils.degToRad(piece.rotation[0]),
    THREE.MathUtils.degToRad(piece.rotation[1]),
    THREE.MathUtils.degToRad(piece.rotation[2]),
    'XYZ',
  );
  const q = new THREE.Quaternion().setFromEuler(e);
  return new THREE.Matrix4().compose(
    new THREE.Vector3(piece.position[0], piece.position[1], piece.position[2]),
    q,
    new THREE.Vector3(1, 1, 1),
  );
}

function pickPerpendicular(v: THREE.Vector3): THREE.Vector3 {
  const hint =
    Math.abs(v.x) < 0.9
      ? new THREE.Vector3(1, 0, 0)
      : new THREE.Vector3(0, 1, 0);
  return new THREE.Vector3().crossVectors(v, hint).normalize();
}

type Candidate = {
  piece: Piece;
  closestWorld: THREE.Vector3;
  faceNormalWorld: THREE.Vector3;
  pieceLongWorld: THREE.Vector3;
  dist: number;
};

/**
 * Najde nejbližší plochu nejbližšího prvku a vrátí pozici + rotaci,
 * při které spojka „dosedne" svým lokálním tvarem na povrch prvku.
 *
 * Vrací null, pokud:
 *  - spojka nemá definované zarovnání (vruty/hřebíky řeší hole-snap),
 *  - žádný prvek není v dosahu `JOINT_MAGNET_THRESHOLD`.
 */
export function snapJointToPiece(
  joint: Joint,
  type: JointType,
  pieces: Piece[],
): JointSnapResult | null {
  const align = ALIGN[type.category];
  if (!align) return null;
  if (pieces.length === 0) return null;

  const jp = new THREE.Vector3(
    joint.position[0],
    joint.position[1],
    joint.position[2],
  );
  let best: Candidate | null = null;

  for (const p of pieces) {
    const profile = getProfile(p.profileId);
    if (!profile) continue;
    const half: [number, number, number] = [
      profile.width / 2,
      profile.height / 2,
      p.length / 2,
    ];
    const pmat = pieceMatrix(p);
    const pinv = pmat.clone().invert();
    const localJp = jp.clone().applyMatrix4(pinv);

    const faces: { axis: 0 | 1 | 2; sign: -1 | 1 }[] = [];
    if (align.prefer === 'ends') {
      faces.push({ axis: 2, sign: -1 }, { axis: 2, sign: 1 });
    } else {
      for (let a = 0; a < 3; a++) {
        faces.push({ axis: a as 0 | 1 | 2, sign: -1 });
        faces.push({ axis: a as 0 | 1 | 2, sign: 1 });
      }
    }

    for (const f of faces) {
      const closestLocal = new THREE.Vector3(
        f.axis === 0
          ? f.sign * half[0]
          : THREE.MathUtils.clamp(localJp.x, -half[0], half[0]),
        f.axis === 1
          ? f.sign * half[1]
          : THREE.MathUtils.clamp(localJp.y, -half[1], half[1]),
        f.axis === 2
          ? f.sign * half[2]
          : THREE.MathUtils.clamp(localJp.z, -half[2], half[2]),
      );
      const closestWorld = closestLocal.clone().applyMatrix4(pmat);
      const dist = closestWorld.distanceTo(jp);
      const normalLocal = new THREE.Vector3(
        f.axis === 0 ? f.sign : 0,
        f.axis === 1 ? f.sign : 0,
        f.axis === 2 ? f.sign : 0,
      );
      const faceNormalWorld = normalLocal
        .clone()
        .transformDirection(pmat)
        .normalize();
      const pieceLongWorld = new THREE.Vector3(0, 0, 1)
        .transformDirection(pmat)
        .normalize();

      if (!best || dist < best.dist) {
        best = {
          piece: p,
          closestWorld,
          faceNormalWorld,
          pieceLongWorld,
          dist,
        };
      }
    }
  }

  if (!best || best.dist > JOINT_MAGNET_THRESHOLD) return null;

  // 1) Pozice = bod na ploše + posun po normále.
  const targetPos = best.closestWorld
    .clone()
    .add(best.faceNormalWorld.clone().multiplyScalar(align.offset));

  // 2) Orientace v world: vyrobíme target frame (up, long, side) a source frame z lokálních os.
  const upTarget = best.faceNormalWorld.clone().normalize();
  let longTarget = best.pieceLongWorld.clone();
  longTarget.sub(upTarget.clone().multiplyScalar(longTarget.dot(upTarget)));
  if (longTarget.lengthSq() < 1e-4) {
    // dlouhá osa prvku je rovnoběžná s normálou plochy (např. čelo) → vezmeme +X prvku
    const pmat = pieceMatrix(best.piece);
    longTarget = new THREE.Vector3(1, 0, 0).transformDirection(pmat);
    longTarget.sub(upTarget.clone().multiplyScalar(longTarget.dot(upTarget)));
    if (longTarget.lengthSq() < 1e-4) {
      longTarget = pickPerpendicular(upTarget);
    }
  }
  longTarget.normalize();
  const sideTarget = new THREE.Vector3()
    .crossVectors(upTarget, longTarget)
    .normalize();
  // re-orthogonalizace (longTarget × sideTarget je upTarget, takže to drží)
  longTarget = new THREE.Vector3()
    .crossVectors(sideTarget, upTarget)
    .normalize();

  // Source frame – lokální osy spojky.
  const upLocal = new THREE.Vector3(
    align.awayLocal[0],
    align.awayLocal[1],
    align.awayLocal[2],
  ).normalize();
  let longLocal = new THREE.Vector3(
    align.longLocal[0],
    align.longLocal[1],
    align.longLocal[2],
  );
  longLocal.sub(upLocal.clone().multiplyScalar(longLocal.dot(upLocal)));
  if (longLocal.lengthSq() < 1e-4) {
    longLocal = pickPerpendicular(upLocal);
  }
  longLocal.normalize();
  const sideLocal = new THREE.Vector3()
    .crossVectors(upLocal, longLocal)
    .normalize();
  longLocal = new THREE.Vector3()
    .crossVectors(sideLocal, upLocal)
    .normalize();

  // R = T · S^T  (sloupce T = target axes, sloupce S = source axes)
  const T = new THREE.Matrix4().makeBasis(longTarget, upTarget, sideTarget);
  const S = new THREE.Matrix4().makeBasis(longLocal, upLocal, sideLocal);
  const R = T.clone().multiply(S.clone().transpose());
  const q = new THREE.Quaternion().setFromRotationMatrix(R);
  const e = new THREE.Euler().setFromQuaternion(q, 'XYZ');

  return {
    position: [targetPos.x, targetPos.y, targetPos.z],
    rotation: [
      THREE.MathUtils.radToDeg(e.x),
      THREE.MathUtils.radToDeg(e.y),
      THREE.MathUtils.radToDeg(e.z),
    ],
    connectId: best.piece.id,
  };
}
