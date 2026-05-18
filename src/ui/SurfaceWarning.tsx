import { useDesignStore } from '../store/designStore';
import { getProfile } from '../data/lumber';
import { formatLength } from '../utils/units';

export default function SurfaceWarning() {
  const warning = useDesignStore((s) => s.surfaceWarning);
  const pieces = useDesignStore((s) => s.pieces);
  const units = useDesignStore((s) => s.units);
  const liftPieceToSurface = useDesignStore((s) => s.liftPieceToSurface);
  const dismissSurfaceWarning = useDesignStore((s) => s.dismissSurfaceWarning);
  const selectPiece = useDesignStore((s) => s.selectPiece);

  if (!warning) return null;

  const piece = pieces.find((p) => p.id === warning.pieceId);
  if (!piece) return null;
  const profile = getProfile(piece.profileId);
  const name = piece.label || profile?.name || 'Prvek';

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
      <div className="panel border border-wood-500/70 shadow-xl flex items-center gap-3 px-3 py-2 max-w-md">
        <div className="text-wood-300 text-xl leading-none" aria-hidden>
          ⚠
        </div>
        <div className="flex-1 min-w-0 text-sm">
          <div className="text-stone-100">
            <span className="font-semibold">{name}</span> zasahuje{' '}
            <span className="text-wood-300 font-semibold">
              {formatLength(warning.depth, units)}
            </span>{' '}
            pod plochu.
          </div>
          <div className="text-[11px] text-stone-400">
            Mám ho položit zpět na povrch?
          </div>
        </div>
        <button
          className="btn-primary text-xs"
          onClick={() => liftPieceToSurface(warning.pieceId)}
        >
          Položit
        </button>
        <button
          className="btn-ghost text-xs"
          onClick={() => {
            selectPiece(warning.pieceId);
            dismissSurfaceWarning();
          }}
        >
          Ponechat
        </button>
      </div>
    </div>
  );
}
