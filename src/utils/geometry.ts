import * as THREE from 'three';
import type { Piece, Vec3 } from '../types';
import { getProfile } from '../data/lumber';

const _euler = new THREE.Euler();
const _matrix = new THREE.Matrix4();
const _corner = new THREE.Vector3();

/** Vrátí nejnižší Y souřadnici (mm) rotovaného prvku ve world space. */
export function pieceLowestY(piece: Piece): number {
  const profile = getProfile(piece.profileId);
  if (!profile) return piece.position[1];

  const hw = profile.width / 2;
  const hh = profile.height / 2;
  const hl = piece.length / 2;

  _euler.set(
    THREE.MathUtils.degToRad(piece.rotation[0]),
    THREE.MathUtils.degToRad(piece.rotation[1]),
    THREE.MathUtils.degToRad(piece.rotation[2]),
  );
  _matrix.makeRotationFromEuler(_euler);

  const corners: Vec3[] = [
    [-hw, -hh, -hl],
    [hw, -hh, -hl],
    [-hw, hh, -hl],
    [hw, hh, -hl],
    [-hw, -hh, hl],
    [hw, -hh, hl],
    [-hw, hh, hl],
    [hw, hh, hl],
  ];

  let minY = Infinity;
  for (const c of corners) {
    _corner.set(c[0], c[1], c[2]).applyMatrix4(_matrix);
    const y = _corner.y + piece.position[1];
    if (y < minY) minY = y;
  }
  return minY;
}

/** Kolik mm je nejnižší roh prvku pod plochou (kladné číslo). 0 = na ploše. */
export function pieceBelowSurfaceBy(piece: Piece): number {
  const minY = pieceLowestY(piece);
  return minY < 0 ? -minY : 0;
}
