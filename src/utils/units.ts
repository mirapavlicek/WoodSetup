import type { Units } from '../types';

export function formatLength(mm: number, units: Units): string {
  if (units === 'cm') {
    return `${(mm / 10).toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} cm`;
  }
  return `${Math.round(mm).toLocaleString('cs-CZ')} mm`;
}

export function formatPosition(value: number, units: Units): string {
  if (units === 'cm') {
    return (value / 10).toLocaleString('cs-CZ', { maximumFractionDigits: 1 });
  }
  return Math.round(value).toLocaleString('cs-CZ');
}

export function parseLengthInput(value: string, units: Units): number {
  const cleaned = value.replace(',', '.').trim();
  const n = parseFloat(cleaned);
  if (Number.isNaN(n)) return 0;
  return units === 'cm' ? n * 10 : n;
}

export function snap(value: number, step: number): number {
  if (step <= 0) return value;
  return Math.round(value / step) * step;
}
