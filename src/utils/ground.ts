import type { GroundCorners, Vec2 } from '../types';

export type GroundBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  width: number;
  depth: number;
  /** Větší ze stran (pro kameru a světla). */
  size: number;
  /** Střed bbox. */
  center: Vec2;
};

export function groundBounds(corners: GroundCorners): GroundBounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const [x, z] of corners) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  const width = maxX - minX;
  const depth = maxZ - minZ;
  return {
    minX,
    maxX,
    minZ,
    maxZ,
    width,
    depth,
    size: Math.max(width, depth, 500),
    center: [(minX + maxX) / 2, (minZ + maxZ) / 2],
  };
}

/** Předdefinované tvary plochy. */
export const GROUND_PRESETS: { id: string; name: string; corners: GroundCorners }[] = [
  {
    id: 'square-4',
    name: 'Čtverec 4 × 4 m',
    corners: [
      [-2000, -2000],
      [2000, -2000],
      [2000, 2000],
      [-2000, 2000],
    ],
  },
  {
    id: 'square-6',
    name: 'Čtverec 6 × 6 m',
    corners: [
      [-3000, -3000],
      [3000, -3000],
      [3000, 3000],
      [-3000, 3000],
    ],
  },
  {
    id: 'rect-6x4',
    name: 'Obdélník 6 × 4 m',
    corners: [
      [-3000, -2000],
      [3000, -2000],
      [3000, 2000],
      [-3000, 2000],
    ],
  },
  {
    id: 'rect-8x4',
    name: 'Obdélník 8 × 4 m',
    corners: [
      [-4000, -2000],
      [4000, -2000],
      [4000, 2000],
      [-4000, 2000],
    ],
  },
  {
    id: 'trapezoid',
    name: 'Lichoběžník',
    corners: [
      [-2500, -2000],
      [2500, -2000],
      [1500, 2000],
      [-1500, 2000],
    ],
  },
  {
    id: 'diamond',
    name: 'Kosočtverec',
    corners: [
      [0, -2500],
      [2000, 0],
      [0, 2500],
      [-2000, 0],
    ],
  },
];
