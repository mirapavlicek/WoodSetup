import { useMemo, useState } from 'react';
import { useDesignStore } from '../store/designStore';
import { getProfile } from '../data/lumber';
import type { Piece } from '../types';
import { parseLengthInput, formatLength } from '../utils/units';

type Axis = 'x+' | 'x-' | 'y+' | 'y-' | 'z+' | 'z-';

const AXIS_OPTIONS: { value: Axis; label: string; hint: string }[] = [
  { value: 'x+', label: '→ Vpravo (+X)', hint: 'šířka prvku' },
  { value: 'x-', label: '← Vlevo (−X)', hint: 'šířka prvku' },
  { value: 'z+', label: '↑ Dopředu (+Z)', hint: 'délka prvku' },
  { value: 'z-', label: '↓ Dozadu (−Z)', hint: 'délka prvku' },
  { value: 'y+', label: '⤒ Nahoru (+Y)', hint: 'výška prvku' },
  { value: 'y-', label: '⤓ Dolů (−Y)', hint: 'výška prvku' },
];

function defaultSpacingFor(axis: Axis, piece: Piece): number {
  const profile = getProfile(piece.profileId);
  if (!profile) return 100;
  if (axis === 'x+' || axis === 'x-') return profile.width;
  if (axis === 'y+' || axis === 'y-') return profile.height;
  return piece.length;
}

export default function ClonePanel({ piece }: { piece: Piece }) {
  const units = useDesignStore((s) => s.units);
  const cloneArrayPiece = useDesignStore((s) => s.cloneArrayPiece);

  const [axis, setAxis] = useState<Axis>('x+');
  const [count, setCount] = useState(3);
  const [spacing, setSpacing] = useState<number>(() => defaultSpacingFor('x+', piece));
  const [autoSpacing, setAutoSpacing] = useState(true);

  const computedSpacing = autoSpacing ? defaultSpacingFor(axis, piece) : spacing;
  const spacingDisplay = units === 'cm' ? computedSpacing / 10 : computedSpacing;

  const totalDistance = useMemo(() => computedSpacing * count, [computedSpacing, count]);

  const onAxisChange = (a: Axis) => {
    setAxis(a);
    if (autoSpacing) setSpacing(defaultSpacingFor(a, piece));
  };

  const handleClone = () => {
    cloneArrayPiece(piece.id, { count, axis, spacing: computedSpacing });
  };

  return (
    <div className="border-t border-stone-800 pt-3 mt-2 space-y-2">
      <div className="text-[10px] uppercase tracking-wider text-stone-500">
        Klonovat pole
      </div>

      <label className="block">
        <div className="label">Strana</div>
        <select
          className="input text-sm"
          value={axis}
          onChange={(e) => onAxisChange(e.target.value as Axis)}
        >
          {AXIS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <div className="label">Počet kopií</div>
          <input
            type="number"
            min={1}
            max={50}
            step={1}
            className="input text-sm"
            value={count}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              if (!Number.isNaN(n)) setCount(Math.max(1, Math.min(50, n)));
            }}
          />
        </label>
        <label className="block">
          <div className="label flex justify-between">
            <span>Rozteč</span>
            <span className="text-stone-500">{units}</span>
          </div>
          <input
            type="number"
            className="input text-sm disabled:opacity-50"
            value={spacingDisplay}
            step={units === 'cm' ? 0.5 : 5}
            disabled={autoSpacing}
            onChange={(e) => {
              const n = parseFloat(e.target.value);
              if (!Number.isNaN(n)) setSpacing(parseLengthInput(String(n), units));
            }}
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-xs text-stone-300 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={autoSpacing}
          onChange={(e) => setAutoSpacing(e.target.checked)}
          className="accent-wood-500"
        />
        Automatická rozteč (podle rozměru prvku)
      </label>

      <div className="text-[10px] text-stone-500 leading-snug">
        Vznikne {count}× kopie • celková délka pole{' '}
        {formatLength(totalDistance, units)}.
      </div>

      <button
        className="btn-primary w-full text-xs"
        onClick={handleClone}
        disabled={count <= 0 || computedSpacing === 0}
      >
        Klonovat {count}× {AXIS_OPTIONS.find((o) => o.value === axis)?.label}
      </button>
    </div>
  );
}
