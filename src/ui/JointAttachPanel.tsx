import { useDesignStore } from '../store/designStore';
import type { Joint, JointType } from '../types';
import { getJointType } from '../data/joints';

const SCREW_CATEGORIES: JointType['category'][] = ['vrut', 'hrebik', 'cep', 'zavit'];

export default function JointAttachPanel({ joint }: { joint: Joint }) {
  const type = getJointType(joint.typeId);
  const holeAttach = useDesignStore((s) => s.holeAttach);
  const startHoleAttach = useDesignStore((s) => s.startHoleAttach);
  const cancelHoleAttach = useDesignStore((s) => s.cancelHoleAttach);

  if (!type) return null;
  if (!SCREW_CATEGORIES.includes(type.category)) return null;

  const active = holeAttach?.sourceJointId === joint.id;

  return (
    <div className="border-t border-stone-800 pt-3 mt-2 space-y-2">
      <div className="text-[10px] uppercase tracking-wider text-stone-500">
        Přišroubovat / zatlouct
      </div>
      <div className="text-[10px] text-stone-400 leading-snug">
        Klikněte na díru kovové spojky, nebo přímo na plochu prvku – {type.name.toLowerCase()}{' '}
        se kolmo orientuje na plochu. Pokud by čouhal ven, zobrazí se varování.
      </div>
      <button
        className={`w-full text-xs ${active ? 'btn-secondary border-pink-400 text-pink-200' : 'btn-primary'}`}
        onClick={() => (active ? cancelHoleAttach() : startHoleAttach(joint.id))}
      >
        {active ? 'Zrušit šroubování' : 'Šroubovat do plochy / díry…'}
      </button>
    </div>
  );
}
