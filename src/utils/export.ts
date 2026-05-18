import type { DesignSnapshot } from '../types';

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportJSON(data: DesignSnapshot, name = 'projekt'): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  downloadBlob(blob, `${sanitize(name)}.woodsetup.json`);
}

export async function importJSON(file: File): Promise<DesignSnapshot> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !Array.isArray(parsed.pieces) ||
    !Array.isArray(parsed.joints)
  ) {
    throw new Error('Soubor nemá očekávanou strukturu projektu.');
  }
  return parsed as DesignSnapshot;
}

export function exportCanvasPNG(canvas: HTMLCanvasElement, name = 'projekt'): void {
  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `${sanitize(name)}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function sanitize(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'projekt';
}
