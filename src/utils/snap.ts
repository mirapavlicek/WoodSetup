import type { Piece, Vec3 } from '../types';
import { getProfile } from '../data/lumber';

/** Vzdálenost (mm), ve které ještě magnet zabírá. */
export const MAGNET_THRESHOLD = 1200;

export type AABB = {
  min: Vec3;
  max: Vec3;
  /** poloviční rozměry */
  half: Vec3;
};

/**
 * Spočítá AABB prvku v world space.
 * Pro úhel Y mimo násobky 90° vrací konzervativní obal (osově zarovnaný).
 */
export function pieceAABB(piece: Piece): AABB | null {
  const profile = getProfile(piece.profileId);
  if (!profile) return null;
  const lx = profile.width / 2;
  const ly = profile.height / 2;
  const lz = piece.length / 2;
  const ry = (piece.rotation[1] * Math.PI) / 180;
  const c = Math.abs(Math.cos(ry));
  const s = Math.abs(Math.sin(ry));
  const hx = c * lx + s * lz;
  const hz = s * lx + c * lz;
  const hy = ly;
  const p = piece.position;
  return {
    min: [p[0] - hx, p[1] - hy, p[2] - hz],
    max: [p[0] + hx, p[1] + hy, p[2] + hz],
    half: [hx, hy, hz],
  };
}

function dist2D(a: Piece, b: Piece): number {
  const dx = a.position[0] - b.position[0];
  const dz = a.position[2] - b.position[2];
  return Math.hypot(dx, dz);
}

/** Normalizuje úhel ve stupních do intervalu (-180, 180]. */
function normalizeAngle(deg: number): number {
  let a = deg % 360;
  if (a > 180) a -= 360;
  if (a <= -180) a += 360;
  return a;
}

/** Najde nejbližší úhel z množiny `baseRot + k * step` k aktuálnímu úhlu. */
function nearestAngle(current: number, base: number, step: number): number {
  const steps = Math.max(1, Math.round(360 / step));
  let best = current;
  let bestDelta = Infinity;
  for (let i = 0; i < steps; i++) {
    const target = base + i * step;
    const delta = Math.abs(normalizeAngle(current - target));
    if (delta < bestDelta) {
      bestDelta = delta;
      best = target;
    }
  }
  return ((best % 360) + 360) % 360;
}

export type SnapResult = {
  position: Vec3;
  rotation: Vec3;
};

/**
 * Snaží se přichytit `piece` k nejbližšímu prvku z `others`.
 * Vrací nové position/rotation, nebo null pokud žádný soused není dostatečně blízko.
 *
 * @param overlap pokud true, prvek se posadí na souseda (lap joint).
 * @param angleStep krok rotace ve stupních (typicky 15/45/90).
 */
export function snapPieceToNeighbor(
  piece: Piece,
  others: Piece[],
  angleStep: number,
  overlap: boolean,
): SnapResult | null {
  if (others.length === 0) return null;

  // 1) nejbližší soused (2D vzdálenost v rovině X-Z)
  let nearest: Piece | null = null;
  let nearestDist = Infinity;
  for (const o of others) {
    const d = dist2D(piece, o);
    if (d < nearestDist) {
      nearest = o;
      nearestDist = d;
    }
  }
  if (!nearest) return null;
  if (nearestDist > MAGNET_THRESHOLD) return null;

  // 2) srovnání rotace Y na násobek angleStep relativně k sousedovi
  const newRotY = nearestAngle(piece.rotation[1], nearest.rotation[1], angleStep);
  const newRotation: Vec3 = [piece.rotation[0], newRotY, piece.rotation[2]];

  // 3) AABB s nově srovnanou rotací
  const movingProbe: Piece = { ...piece, rotation: newRotation };
  const a = pieceAABB(movingProbe);
  const b = pieceAABB(nearest);
  if (!a || !b) return null;

  const dx = piece.position[0] - nearest.position[0];
  const dy = piece.position[1] - nearest.position[1];
  const dz = piece.position[2] - nearest.position[2];

  if (overlap) {
    // Lap joint: zarovnáme středy v X-Z a posadíme na souseda v Y
    const sign = dy >= 0 ? 1 : -1;
    const newY = nearest.position[1] + sign * (b.half[1] + a.half[1]);
    return {
      rotation: newRotation,
      position: [nearest.position[0], newY, nearest.position[2]],
    };
  }

  // Doraz: vybereme dominantní osu (X vs Z) podle větší odchylky středů.
  // Tu osu zarovnáme tak, aby se boky dotýkaly, druhou srovnáme na střed souseda.
  const absX = Math.abs(dx);
  const absZ = Math.abs(dz);

  let nx = piece.position[0];
  let nz = piece.position[2];
  let ny = piece.position[1];

  if (absX >= absZ) {
    const signX = dx >= 0 ? 1 : -1;
    nx = nearest.position[0] + signX * (b.half[0] + a.half[0]);
    nz = nearest.position[2];
  } else {
    const signZ = dz >= 0 ? 1 : -1;
    nz = nearest.position[2] + signZ * (b.half[2] + a.half[2]);
    nx = nearest.position[0];
  }

  // Y zarovnáme na střed souseda (typický T-spoj v rovině)
  ny = nearest.position[1];

  return {
    rotation: newRotation,
    position: [nx, ny, nz],
  };
}
