import type { JointType, Vec3 } from '../types';

export type Hole = {
  /** Lokální pozice díry vůči středu spojky. */
  position: Vec3;
  /** Vnější normála (kam směřuje hlava vrutu po zašroubování). */
  normal: Vec3;
  /** Průměr díry v mm – řídí vykreslení. */
  diameter: number;
};

/**
 * Spočítá rozložení děr pro danou spojku.
 * Cílem je odhad pro vizualizaci, ne přesné repliky výrobků.
 */
export function getHoles(type: JointType): Hole[] {
  const sz = type.size;
  const len = type.length;
  const diameter = type.category === 'vaznikova-deska' ? 4 : 5;

  switch (type.category) {
    case 'uhelnik': {
      const xs = [-len * 0.33, 0, len * 0.33];
      const holes: Hole[] = [];
      // horizontální plotna (top)
      for (const x of xs) {
        holes.push({ position: [x, 2, 0], normal: [0, 1, 0], diameter });
      }
      // vertikální plotna (front)
      for (const x of xs) {
        holes.push({ position: [x, 0, 2], normal: [0, 0, 1], diameter });
      }
      return holes;
    }

    case 'plotna':
    case 'vaznikova-deska': {
      const cols = Math.max(2, Math.floor(len / 30));
      const rows = Math.max(1, Math.floor(sz / 30));
      const holes: Hole[] = [];
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x =
            cols === 1 ? 0 : (i / (cols - 1) - 0.5) * (len - 20);
          const z =
            rows === 1 ? 0 : (j / (rows - 1) - 0.5) * (sz - 20);
          holes.push({ position: [x, 2, z], normal: [0, 1, 0], diameter });
        }
      }
      return holes;
    }

    case 'botka': {
      const holes: Hole[] = [];
      // dno
      holes.push({ position: [-sz * 0.3, 2, 0], normal: [0, 1, 0], diameter });
      holes.push({ position: [sz * 0.3, 2, 0], normal: [0, 1, 0], diameter });
      // postranní křidélka (na zadní hraně)
      const wy = [len * 0.15, len * 0.45, len * 0.75];
      for (const y of wy) {
        holes.push({
          position: [-sz / 2 - sz * 0.25, y, len / 2 + 3],
          normal: [0, 0, 1],
          diameter,
        });
        holes.push({
          position: [sz / 2 + sz * 0.25, y, len / 2 + 3],
          normal: [0, 0, 1],
          diameter,
        });
      }
      // čelní stěny – uvnitř U
      for (const y of [len * 0.3, len * 0.6]) {
        holes.push({
          position: [-sz / 2 - 3, y, 0],
          normal: [-1, 0, 0],
          diameter,
        });
        holes.push({
          position: [sz / 2 + 3, y, 0],
          normal: [1, 0, 0],
          diameter,
        });
      }
      return holes;
    }

    case 'patka': {
      const holes: Hole[] = [];
      const ext = sz + 60;
      const off = ext / 2 - 18;
      // 4 otvory na patní desce (do betonu)
      holes.push({ position: [-off, 4, -off], normal: [0, 1, 0], diameter: 12 });
      holes.push({ position: [off, 4, -off], normal: [0, 1, 0], diameter: 12 });
      holes.push({ position: [-off, 4, off], normal: [0, 1, 0], diameter: 12 });
      holes.push({ position: [off, 4, off], normal: [0, 1, 0], diameter: 12 });
      // průchozí otvory ve svislých plotnách (pro průchozí šroub do sloupu)
      for (const y of [len * 0.3, len * 0.7]) {
        holes.push({
          position: [-sz / 2 - 3, y, 0],
          normal: [-1, 0, 0],
          diameter: 10,
        });
        holes.push({
          position: [sz / 2 + 3, y, 0],
          normal: [1, 0, 0],
          diameter: 10,
        });
      }
      return holes;
    }

    case 'spona': {
      const cols = Math.max(3, Math.floor(len / 25));
      const holes: Hole[] = [];
      for (let i = 0; i < cols; i++) {
        const x = cols === 1 ? 0 : (i / (cols - 1) - 0.5) * (len - 16);
        holes.push({ position: [x, 2, 0], normal: [0, 1, 0], diameter });
      }
      return holes;
    }

    default:
      return [];
  }
}
