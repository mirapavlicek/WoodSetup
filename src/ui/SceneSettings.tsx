import { useDesignStore } from '../store/designStore';
import { GROUND_PRESETS, groundBounds } from '../utils/ground';
import { formatLength, parseLengthInput } from '../utils/units';
import type { Vec2 } from '../types';

const CORNER_LABELS = ['1 (-X,-Z)', '2 (+X,-Z)', '3 (+X,+Z)', '4 (-X,+Z)'];

export default function SceneSettings() {
  const corners = useDesignStore((s) => s.groundCorners);
  const setCorner = useDesignStore((s) => s.setGroundCorner);
  const setCorners = useDesignStore((s) => s.setGroundCorners);
  const gridSize = useDesignStore((s) => s.gridSize);
  const setGridSize = useDesignStore((s) => s.setGridSize);
  const units = useDesignStore((s) => s.units);

  const bounds = groundBounds(corners);
  const gridDisplay = units === 'cm' ? gridSize / 10 : gridSize;

  const dispCoord = (v: number) => (units === 'cm' ? v / 10 : v);

  const onCornerChange = (idx: 0 | 1 | 2 | 3, axis: 0 | 1, value: string) => {
    const n = parseFloat(value.replace(',', '.'));
    if (Number.isNaN(n)) return;
    const mm = units === 'cm' ? n * 10 : n;
    const next = [...corners[idx]] as Vec2;
    next[axis] = mm;
    setCorner(idx, next);
  };

  return (
    <div className="panel">
      <div className="panel-header">Plocha a rastr</div>
      <div className="p-3 space-y-3">
        <div>
          <div className="label">Předvolby tvaru</div>
          <div className="grid grid-cols-2 gap-1">
            {GROUND_PRESETS.map((p) => (
              <button
                key={p.id}
                className="btn-secondary text-[11px]"
                onClick={() => setCorners(p.corners)}
                title={p.name}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="label">Rohy plochy ({units})</div>
          <div className="space-y-1.5">
            {corners.map((c, i) => (
              <div key={i} className="grid grid-cols-[auto_1fr_1fr] gap-1.5 items-center">
                <div className="text-[10px] text-stone-400 font-mono w-12">
                  Roh {i + 1}
                </div>
                <input
                  type="number"
                  className="input text-xs"
                  value={dispCoord(c[0])}
                  step={units === 'cm' ? 10 : 100}
                  onChange={(e) => onCornerChange(i as 0 | 1 | 2 | 3, 0, e.target.value)}
                  title="X souřadnice"
                />
                <input
                  type="number"
                  className="input text-xs"
                  value={dispCoord(c[1])}
                  step={units === 'cm' ? 10 : 100}
                  onChange={(e) => onCornerChange(i as 0 | 1 | 2 | 3, 1, e.target.value)}
                  title="Z souřadnice"
                />
              </div>
            ))}
            <div className="grid grid-cols-[auto_1fr_1fr] gap-1.5 text-[10px] text-stone-500 px-1">
              <span className="w-12">popis</span>
              <span>X (mm)</span>
              <span>Z (mm)</span>
            </div>
          </div>
          <div className="text-[10px] text-stone-500 mt-1">
            Rozměr bbox: {formatLength(bounds.width, units)} ×{' '}
            {formatLength(bounds.depth, units)}.
          </div>
        </div>

        <label className="block">
          <div className="label flex justify-between">
            <span>Krok rastru (snap)</span>
            <span className="text-stone-500">{units}</span>
          </div>
          <input
            type="number"
            className="input text-sm"
            value={gridDisplay}
            step={units === 'cm' ? 0.5 : 5}
            min={units === 'cm' ? 0.1 : 1}
            onChange={(e) => {
              const n = parseFloat(e.target.value);
              if (Number.isNaN(n)) return;
              setGridSize(parseLengthInput(String(n), units));
            }}
          />
        </label>
        <div className="text-[10px] text-stone-500 leading-snug">
          Plocha je polygon ze 4 bodů. Pořadí rohů určuje tvar – pro pravidelný čtyřúhelník zachovejte CCW pořadí kolem středu.
        </div>
      </div>
    </div>
  );
}
