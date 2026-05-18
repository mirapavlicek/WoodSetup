import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import type { DesignSnapshot } from '../types';
import { downloadBlob } from './export';
import { buildJointGroup, buildPieceMesh } from './sceneBuilder';

/**
 * Sestaví Three.js scénu z dat projektu a vyexportuje ji jako STL.
 * Souřadnice odpovídají vnitřnímu uložení (mm, Y-up).
 */
export function exportSTL(
  snapshot: DesignSnapshot,
  name = 'projekt',
  options: { binary?: boolean } = {},
): void {
  const binary = options.binary ?? true;
  const root = new THREE.Group();
  for (const piece of snapshot.pieces) {
    const m = buildPieceMesh(piece);
    if (m) root.add(m);
  }
  for (const joint of snapshot.joints) {
    const j = buildJointGroup(joint);
    if (j) root.add(j);
  }
  // STLExporter potřebuje vypočítané world matice.
  root.updateMatrixWorld(true);

  const exporter = new STLExporter();
  const result = exporter.parse(root, { binary });
  let blob: Blob;
  if (binary) {
    const dv = result as DataView;
    const bytes = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength).slice();
    blob = new Blob([bytes], { type: 'model/stl' });
  } else {
    blob = new Blob([result as string], { type: 'model/stl' });
  }
  const ext = binary ? 'stl' : 'ascii.stl';
  downloadBlob(blob, `${sanitizeName(name)}.${ext}`);
}

function sanitizeName(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase() || 'projekt'
  );
}
