import * as THREE from 'three';
import type { Anchor, Piece, Vec3 } from '../types';
import { getProfile } from '../data/lumber';

const _vec = new THREE.Vector3();
const _euler = new THREE.Euler();
const _matrix = new THREE.Matrix4();

/** Vrátí poloviční rozměry prvku (X = šířka/2, Y = výška/2, Z = délka/2). */
export function pieceHalfExtents(piece: Piece): Vec3 | null {
  const profile = getProfile(piece.profileId);
  if (!profile) return null;
  return [profile.width / 2, profile.height / 2, piece.length / 2];
}

/** Vrátí pozici kotvícího bodu prvku ve world space. */
export function worldAnchorPosition(piece: Piece, anchor: Anchor): Vec3 | null {
  const half = pieceHalfExtents(piece);
  if (!half) return null;
  _euler.set(
    THREE.MathUtils.degToRad(piece.rotation[0]),
    THREE.MathUtils.degToRad(piece.rotation[1]),
    THREE.MathUtils.degToRad(piece.rotation[2]),
  );
  _matrix.makeRotationFromEuler(_euler);
  _vec.set(anchor[0] * half[0], anchor[1] * half[1], anchor[2] * half[2]);
  _vec.applyMatrix4(_matrix);
  return [
    _vec.x + piece.position[0],
    _vec.y + piece.position[1],
    _vec.z + piece.position[2],
  ];
}

/** Vrátí všech 27 lokálních kotev (včetně středu). */
export function allAnchors(): Anchor[] {
  const out: Anchor[] = [];
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        out.push([x, y, z]);
      }
    }
  }
  return out;
}

/** Najde nejbližší kotvu prvku ke world bodu. */
export function closestAnchorOfPiece(
  piece: Piece,
  worldPoint: Vec3,
): { anchor: Anchor; position: Vec3 } | null {
  let bestAnchor: Anchor | null = null;
  let bestPos: Vec3 | null = null;
  let bestDist = Infinity;
  for (const a of allAnchors()) {
    const p = worldAnchorPosition(piece, a);
    if (!p) continue;
    const dx = p[0] - worldPoint[0];
    const dy = p[1] - worldPoint[1];
    const dz = p[2] - worldPoint[2];
    const d = dx * dx + dy * dy + dz * dz;
    if (d < bestDist) {
      bestDist = d;
      bestAnchor = a;
      bestPos = p;
    }
  }
  if (!bestAnchor || !bestPos) return null;
  return { anchor: bestAnchor, position: bestPos };
}

export function anchorLabel(anchor: Anchor): string {
  const x = anchor[0] === -1 ? 'L' : anchor[0] === 1 ? 'P' : '·';
  const y = anchor[1] === -1 ? 'D' : anchor[1] === 1 ? 'H' : '·';
  const z = anchor[2] === -1 ? 'Z' : anchor[2] === 1 ? 'V' : '·';
  return `${x}/${y}/${z}`;
}
