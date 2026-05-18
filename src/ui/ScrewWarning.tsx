import { useDesignStore } from '../store/designStore';
import { getJointType } from '../data/joints';
import { formatLength } from '../utils/units';

export default function ScrewWarning() {
  const warning = useDesignStore((s) => s.screwWarning);
  const joints = useDesignStore((s) => s.joints);
  const units = useDesignStore((s) => s.units);
  const dismissScrewWarning = useDesignStore((s) => s.dismissScrewWarning);
  const swapScrewToFit = useDesignStore((s) => s.swapScrewToFit);
  const selectPiece = useDesignStore((s) => s.selectPiece);

  if (!warning) return null;
  const screw = joints.find((j) => j.id === warning.jointId);
  if (!screw) return null;
  const type = getJointType(screw.typeId);
  if (!type) return null;
  const suggested = warning.suggestedTypeId
    ? getJointType(warning.suggestedTypeId)
    : null;

  return (
    <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
      <div className="panel border border-red-500/60 shadow-xl flex items-center gap-3 px-3 py-2 max-w-xl">
        <div className="text-red-400 text-xl leading-none" aria-hidden>
          ⚠
        </div>
        <div className="flex-1 min-w-0 text-sm">
          <div className="text-stone-100">
            <span className="font-semibold">{type.name}</span>{' '}
            {warning.availableDepth <= 0 ? (
              <>míří mimo materiál.</>
            ) : (
              <>
                vyleze ven o{' '}
                <span className="text-red-300 font-semibold">
                  {formatLength(warning.protrusion, units)}
                </span>
                .
              </>
            )}
          </div>
          <div className="text-[11px] text-stone-400">
            Dostupná hloubka:{' '}
            <span className="text-stone-300">
              {formatLength(warning.availableDepth, units)}
            </span>
            {suggested ? (
              <>
                {' '}
                · doporučeno{' '}
                <span className="text-red-300">{suggested.name}</span>
              </>
            ) : (
              <span className="text-stone-500"> · kratší vrut nenalezen</span>
            )}
          </div>
        </div>
        {suggested && (
          <button
            className="btn-primary text-xs whitespace-nowrap"
            onClick={() => {
              swapScrewToFit();
              selectPiece(warning.jointId);
            }}
          >
            Použít {suggested.name}
          </button>
        )}
        <button
          className="btn-ghost text-xs"
          onClick={() => {
            selectPiece(warning.jointId);
            dismissScrewWarning();
          }}
        >
          Ponechat
        </button>
      </div>
    </div>
  );
}
