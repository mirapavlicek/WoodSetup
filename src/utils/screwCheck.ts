import * as THREE from 'three';
import type { Piece, Vec3 } from '../types';
import { getProfile } from '../data/lumber';

const _vec = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _matrix = new THREE.Matrix4();
const _euler = new THREE.Euler();
const _quat = new THREE.Quaternion();

function pieceHalf(piece: Piece): [number, number, number] | null {
  const profile = getProfile(piece.profileId);
  if (!profile) return null;
  return [profile.width / 2, profile.height / 2, piece.length / 2];
}

function pieceInverseMatrix(piece: Piece): THREE.Matrix4 {
  _euler.set(
    THREE.MathUtils.degToRad(piece.rotation[0]),
    THREE.MathUtils.degToRad(piece.rotation[1]),
    THREE.MathUtils.degToRad(piece.rotation[2]),
    'XYZ',
  );
  _quat.setFromEuler(_euler);
  _matrix.compose(
    new THREE.Vector3(piece.position[0], piece.position[1], piece.position[2]),
    _quat,
    new THREE.Vector3(1, 1, 1),
  );
  return _matrix.clone().invert();
}

/** True, pokud world bod leží uvnitř (případně na povrchu) prvku. */
export function isPointInsidePiece(point: Vec3, piece: Piece, tol = 0.5): boolean {
  const half = pieceHalf(piece);
  if (!half) return false;
  const inv = pieceInverseMatrix(piece);
  _vec.set(point[0], point[1], point[2]).applyMatrix4(inv);
  return (
    Math.abs(_vec.x) <= half[0] + tol &&
    Math.abs(_vec.y) <= half[1] + tol &&
    Math.abs(_vec.z) <= half[2] + tol
  );
}

/**
 * Vzdálenost (mm) podél normalizovaného směru `dir`, ve které paprsek opouští prvek.
 * Pokud paprsek prvek vůbec nezasáhne, vrací null.
 * Vzdálenost je měřena od `origin` (paprsek může startovat i mimo prvek).
 */
export function rayExitDistance(origin: Vec3, dir: Vec3, piece: Piece): number | null {
  const half = pieceHalf(piece);
  if (!half) return null;
  const inv = pieceInverseMatrix(piece);
  _origin.set(origin[0], origin[1], origin[2]).applyMatrix4(inv);
  _dir.set(dir[0], dir[1], dir[2]).transformDirection(inv).normalize();

  let tNear = -Infinity;
  let tFar = +Infinity;
  const oa = [_origin.x, _origin.y, _origin.z];
  const da = [_dir.x, _dir.y, _dir.z];
  for (let i = 0; i < 3; i++) {
    const oi = oa[i];
    const di = da[i];
    if (Math.abs(di) < 1e-9) {
      if (Math.abs(oi) > half[i]) return null;
    } else {
      const t1 = (-half[i] - oi) / di;
      const t2 = (half[i] - oi) / di;
      const tMin = Math.min(t1, t2);
      const tMax = Math.max(t1, t2);
      if (tMin > tNear) tNear = tMin;
      if (tMax < tFar) tFar = tMax;
    }
  }
  if (tNear > tFar || tFar < 0) return null;
  return tFar;
}

export type ScrewFit = {
  /** Kolik mm vrut vyčnívá za hranou materiálu (0 = vejde se). */
  protrusion: number;
  /** Konec vrutu (špička) leží uvnitř materiálu. */
  tipInsideMaterial: boolean;
  /** Hloubka, ve které je k dispozici materiál pod hlavou ve směru zašroubování. */
  availableDepth: number;
};

/**
 * Vyhodnotí, zda se vrut dané délky vejde do materiálu, počínaje pozicí hlavy `head`
 * ve směru `axis` (jednotkový vektor směřující dovnitř materiálu).
 */
export function evaluateScrewFit(
  head: Vec3,
  axis: Vec3,
  length: number,
  pieces: Piece[],
): ScrewFit {
  const tip: Vec3 = [
    head[0] + axis[0] * length,
    head[1] + axis[1] * length,
    head[2] + axis[2] * length,
  ];
  let tipInside = false;
  for (const p of pieces) {
    if (isPointInsidePiece(tip, p)) {
      tipInside = true;
      break;
    }
  }
  let maxExit = 0;
  for (const p of pieces) {
    const t = rayExitDistance(head, axis, p);
    if (t !== null && t > maxExit) maxExit = t;
  }
  if (tipInside) {
    return {
      protrusion: 0,
      tipInsideMaterial: true,
      availableDepth: maxExit,
    };
  }
  if (maxExit <= 0) {
    return {
      protrusion: length,
      tipInsideMaterial: false,
      availableDepth: 0,
    };
  }
  return {
    protrusion: Math.max(0, length - maxExit),
    tipInsideMaterial: false,
    availableDepth: maxExit,
  };
}
