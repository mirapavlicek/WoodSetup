import { useState } from 'react';
import { useDesignStore } from '../store/designStore';
import type { Anchor, Piece } from '../types';

type AxisVal = -1 | 0 | 1;

const X_LABELS: { v: AxisVal; label: string; short: string }[] = [
  { v: -1, label: 'Vlevo', short: 'L' },
  { v: 0, label: 'Střed', short: '·' },
  { v: 1, label: 'Vpravo', short: 'P' },
];
const Y_LABELS: { v: AxisVal; label: string; short: string }[] = [
  { v: -1, label: 'Dole', short: 'D' },
  { v: 0, label: 'Střed', short: '·' },
  { v: 1, label: 'Nahoře', short: 'H' },
];
const Z_LABELS: { v: AxisVal; label: string; short: string }[] = [
  { v: -1, label: 'Vzadu', short: 'Z' },
  { v: 0, label: 'Střed', short: '·' },
  { v: 1, label: 'Vepředu', short: 'V' },
];

function AxisRow({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: { v: AxisVal; label: string; short: string }[];
  value: AxisVal;
  onChange: (v: AxisVal) => void;
}) {
  return (
    <div>
      <div className="label">{title}</div>
      <div className="flex rounded border border-stone-700 overflow-hidden">
        {options.map((o) => (
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

export default function AttachPanel({ piece }: { piece: Piece }) {
  const attachPicking = useDesignStore((s) => s.attachPicking);
  const startAttachPicking = useDesignStore((s) => s.startAttachPicking);
  const cancelAttachPicking = useDesignStore((s) => s.cancelAttachPicking);

  // Lokální výběr kotvy – default: spodek prvku, střed.
  const initial: Anchor =
    attachPicking?.pieceId === piece.id ? attachPicking.anchor : [0, -1, 0];
  const [ax, setAx] = useState<AxisVal>(initial[0] as AxisVal);
  const [ay, setAy] = useState<AxisVal>(initial[1] as AxisVal);
  const [az, setAz] = useState<AxisVal>(initial[2] as AxisVal);

  const active =
    attachPicking?.pieceId === piece.id &&
    attachPicking.anchor[0] === ax &&
    attachPicking.anchor[1] === ay &&
    attachPicking.anchor[2] === az;

  const handleStart = () => {
    if (active) {
      cancelAttachPicking();
    } else {
      startAttachPicking(piece.id, [ax, ay, az]);
    }
  };

  return (
    <div className="border-t border-stone-800 pt-3 mt-2 space-y-2">
      <div className="text-[10px] uppercase tracking-wider text-stone-500">
        Přichytit bod k bodu
      </div>

      <AxisRow title="X osa (šířka)" options={X_LABELS} value={ax} onChange={setAx} />
      <AxisRow title="Y osa (výška)" options={Y_LABELS} value={ay} onChange={setAy} />
      <AxisRow title="Z osa (délka)" options={Z_LABELS} value={az} onChange={setAz} />

      <div className="text-[10px] text-stone-500">
        Zvolený bod prvku: <span className="text-wood-300 font-mono">
          {X_LABELS.find((o) => o.v === ax)?.label} ·{' '}
          {Y_LABELS.find((o) => o.v === ay)?.label} ·{' '}
          {Z_LABELS.find((o) => o.v === az)?.label}
        </span>
      </div>

      <button
        className={`w-full text-xs ${active ? 'btn-secondary border-wood-400 text-wood-200' : 'btn-primary'}`}
        onClick={handleStart}
      >
        {active ? 'Zrušit přichycení' : 'Přichytit k bodu…'}
      </button>

      {active && (
        <div className="text-[10px] text-stone-400 leading-snug">
          Klikněte ve scéně na cílový prvek nebo plochu. Pro zrušení stiskněte Esc.
        </div>
      )}
    </div>
  );
}
