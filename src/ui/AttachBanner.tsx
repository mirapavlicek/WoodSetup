import { useDesignStore } from '../store/designStore';
import { getProfile } from '../data/lumber';
import { getJointType } from '../data/joints';
import { anchorLabel } from '../utils/anchor';

export default function AttachBanner() {
  const attachPicking = useDesignStore((s) => s.attachPicking);
  const holeAttach = useDesignStore((s) => s.holeAttach);
  const pieces = useDesignStore((s) => s.pieces);
  const joints = useDesignStore((s) => s.joints);
  const cancelAttach = useDesignStore((s) => s.cancelAttachPicking);
  const cancelHole = useDesignStore((s) => s.cancelHoleAttach);

  if (holeAttach) {
    const screw = joints.find((j) => j.id === holeAttach.sourceJointId);
    const type = screw ? getJointType(screw.typeId) : null;
    return (
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
        <div className="panel border border-pink-400/60 shadow-xl flex items-center gap-3 px-3 py-2 max-w-lg">
          <div className="text-pink-400 text-xl leading-none" aria-hidden>
            ✱
          </div>
          <div className="flex-1 text-sm">
            <div className="text-stone-100">
              Klikněte na díru ve spojce nebo přímo do dřeva.
            </div>
            <div className="text-[11px] text-stone-400">
              Šroubuji: <span className="text-pink-300">{type?.name ?? 'Spojka'}</span>
              <span className="text-stone-500"> · varuji, pokud vyleze ven</span>
            </div>
          </div>
          <button className="btn-ghost text-xs" onClick={cancelHole}>
            Zrušit (Esc)
          </button>
        </div>
      </div>
    );
  }

  if (!attachPicking) return null;

  const piece = pieces.find((p) => p.id === attachPicking.pieceId);
  if (!piece) return null;
  const profile = getProfile(piece.profileId);
  const name = piece.label || profile?.name || 'Prvek';

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
      <div className="panel border border-pink-400/60 shadow-xl flex items-center gap-3 px-3 py-2 max-w-lg">
        <div className="text-pink-400 text-xl leading-none" aria-hidden>
          ◎
        </div>
        <div className="flex-1 text-sm">
          <div className="text-stone-100">
            Klikněte ve scéně na cílový bod{' '}
            <span className="text-stone-400">– prvek, díru nebo plochu.</span>
          </div>
          <div className="text-[11px] text-stone-400">
            Přichycuji: <span className="text-pink-300">{name}</span>{' '}
            <span className="text-stone-500">·</span> bod kotvy{' '}
            <span className="text-pink-300 font-mono">
              {anchorLabel(attachPicking.anchor)}
            </span>
          </div>
        </div>
        <button className="btn-ghost text-xs" onClick={cancelAttach}>
          Zrušit (Esc)
        </button>
      </div>
    </div>
  );
}
