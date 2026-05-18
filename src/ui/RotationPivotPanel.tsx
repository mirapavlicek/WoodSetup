import { useDesignStore } from '../store/designStore';
import type { Anchor } from '../types';

type AxisVal = -1 | 0 | 1;

const AXIS_OPTS: { v: AxisVal; label: string }[] = [
  { v: -1, label: '−' },
  { v: 0, label: 'střed' },
  { v: 1, label: '+' },
];

type Preset = { name: string; anchor: Anchor };
const PRESETS: Preset[] = [
  { name: 'Střed', anchor: [0, 0, 0] },
  { name: 'Spodní hrana', anchor: [0, -1, 0] },
  { name: 'Horní hrana', anchor: [0, 1, 0] },
  { name: 'Levý konec', anchor: [0, 0, -1] },
  { name: 'Pravý konec', anchor: [0, 0, 1] },
  { name: 'Spodní levý roh', anchor: [0, -1, -1] },
  { name: 'Spodní pravý roh', anchor: [0, -1, 1] },
];

function AxisRow({
  title,
  value,
  onChange,
}: {
  title: string;
  value: AxisVal;
  onChange: (v: AxisVal) => void;
}) {
  return (
    <div>
      <div className="label">{title}</div>
      <div className="flex rounded border border-stone-700 overflow-hidden">
        {AXIS_OPTS.map((o) => (
          <button
            key={o.v}
            className={`flex-1 py-1 text-xs ${value === o.v ? 'bg-wood-500 text-stone-900 font-semibold' : 'bg-stone-800 text-stone-200 hover:bg-stone-700'}`}
            onClick={() => onChange(o.v)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function RotationPivotPanel() {
  const rotationPivot = useDesignStore((s) => s.rotationPivot);
  const setRotationPivot = useDesignStore((s) => s.setRotationPivot);

  const set = (i: 0 | 1 | 2) => (v: AxisVal) => {
    const next = [...rotationPivot] as Anchor;
    next[i] = v;
    setRotationPivot(next);
  };

  const isCenter =
    rotationPivot[0] === 0 && rotationPivot[1] === 0 && rotationPivot[2] === 0;

  return (
    <div className="border-t border-stone-800 pt-3 mt-2 space-y-2">
      <div className="text-[10px] uppercase tracking-wider text-stone-500">
        Střed otáčení (pivot)
      </div>
      <div className="text-[10px] text-stone-400 leading-snug">
        Určuje, kolem kterého bodu se prvek otáčí v gizmu. Pozice se po rotaci
        dopočítá tak, aby pivot zůstal stát.
      </div>
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((p) => {
          const sel =
            p.anchor[0] === rotationPivot[0] &&
            p.anchor[1] === rotationPivot[1] &&
            p.anchor[2] === rotationPivot[2];
          return (
            <button
              key={p.name}
              className={`text-[10px] px-2 py-1 rounded border ${sel ? 'bg-wood-500 text-stone-900 border-wood-400' : 'bg-stone-800 text-stone-200 border-stone-700 hover:bg-stone-700'}`}
              onClick={() => setRotationPivot(p.anchor)}
            >
              {p.name}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <AxisRow
          title="X"
          value={rotationPivot[0] as AxisVal}
          onChange={set(0)}
        />
        <AxisRow
          title="Y"
          value={rotationPivot[1] as AxisVal}
          onChange={set(1)}
        />
        <AxisRow
          title="Z"
          value={rotationPivot[2] as AxisVal}
          onChange={set(2)}
        />
      </div>
      {!isCenter && (
        <button
          className="btn-ghost text-[10px] w-full"
          onClick={() => setRotationPivot([0, 0, 0])}
        >
          Vrátit na střed
        </button>
      )}
    </div>
  );
}
