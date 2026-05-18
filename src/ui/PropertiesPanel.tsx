import { useDesignStore } from '../store/designStore';
import { getProfile, LUMBER_PROFILES } from '../data/lumber';
import { getJointType, JOINT_TYPES } from '../data/joints';
import { parseLengthInput, formatPosition } from '../utils/units';
import type { Joint, Vec3 } from '../types';
import ClonePanel from './ClonePanel';
import AttachPanel from './AttachPanel';
import JointAttachPanel from './JointAttachPanel';
import RotationPivotPanel from './RotationPivotPanel';

const SCREW_CATS = new Set<string>(['vrut', 'hrebik', 'cep', 'zavit']);

function countScrewsAttachedTo(targetId: string, joints: Joint[]): number {
  return joints.filter((j) => {
    if (!j.connects) return false;
    const t = getJointType(j.typeId);
    if (!t || !SCREW_CATS.has(t.category)) return false;
    return j.connects.some((id) => id === targetId);
  }).length;
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  suffix?: string;
}) {
  return (
    <label className="block">
      <div className="label flex justify-between">
        <span>{label}</span>
        {suffix && <span className="text-stone-500">{suffix}</span>}
      </div>
      <input
        type="number"
        className="input text-sm"
        value={Number.isFinite(value) ? value : 0}
        step={step}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          if (!Number.isNaN(n)) onChange(n);
        }}
      />
    </label>
  );
}

export default function PropertiesPanel() {
  const selectedId = useDesignStore((s) => s.selectedId);
  const pieces = useDesignStore((s) => s.pieces);
  const joints = useDesignStore((s) => s.joints);
  const units = useDesignStore((s) => s.units);
  const updatePiece = useDesignStore((s) => s.updatePiece);
  const updateJoint = useDesignStore((s) => s.updateJoint);
  const removePiece = useDesignStore((s) => s.removePiece);
  const removeJoint = useDesignStore((s) => s.removeJoint);
  const duplicatePiece = useDesignStore((s) => s.duplicatePiece);
  const checkPieceBelowSurface = useDesignStore((s) => s.checkPieceBelowSurface);
  const removeScrewsFrom = useDesignStore((s) => s.removeScrewsFrom);

  const piece = pieces.find((p) => p.id === selectedId);
  const joint = !piece ? joints.find((j) => j.id === selectedId) : undefined;

  if (!piece && !joint) {
    return (
      <div className="panel">
        <div className="panel-header">Vlastnosti</div>
        <div className="p-3 text-xs text-stone-400 leading-relaxed">
          Vyberte prvek nebo spojku ve scéně pro editaci. Z katalogu vlevo můžete
          přidávat nové prvky kliknutím.
        </div>
      </div>
    );
  }

  if (piece) {
    const profile = getProfile(piece.profileId);

    const setPos = (idx: number) => (n: number) => {
      const value = units === 'cm' ? n * 10 : n;
      const next = [...piece.position] as Vec3;
      next[idx] = value;
      updatePiece(piece.id, { position: next });
      checkPieceBelowSurface(piece.id);
    };
    const setRot = (idx: number) => (n: number) => {
      const next = [...piece.rotation] as Vec3;
      next[idx] = n;
      updatePiece(piece.id, { rotation: next });
      checkPieceBelowSurface(piece.id);
    };

    const posDisplay = (idx: number) =>
      units === 'cm' ? piece.position[idx] / 10 : piece.position[idx];

    return (
      <div className="panel">
        <div className="panel-header">
          <span>Vlastnosti prvku</span>
          <span className="text-[10px] text-stone-500 normal-case tracking-normal">
            {profile?.name}
          </span>
        </div>
        <div className="p-3 space-y-3">
          <label className="block">
            <div className="label">Profil</div>
            <select
              className="input text-sm"
              value={piece.profileId}
              onChange={(e) => {
                updatePiece(piece.id, { profileId: e.target.value });
                checkPieceBelowSurface(piece.id);
              }}
            >
              {LUMBER_PROFILES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <NumberField
            label="Délka"
            suffix={units}
            value={units === 'cm' ? piece.length / 10 : piece.length}
            step={units === 'cm' ? 0.5 : 5}
            onChange={(n) => {
              updatePiece(piece.id, {
                length: parseLengthInput(String(n), units),
              });
              checkPieceBelowSurface(piece.id);
            }}
          />

          <label className="block">
            <div className="label">Označení (volitelné)</div>
            <input
              className="input text-sm"
              type="text"
              placeholder="např. „noha A"
              value={piece.label ?? ''}
              onChange={(e) => updatePiece(piece.id, { label: e.target.value })}
            />
          </label>

          <label className="block">
            <div className="label">Barva</div>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={piece.color ?? profile?.color ?? '#b88a4a'}
                onChange={(e) => updatePiece(piece.id, { color: e.target.value })}
                className="h-8 w-12 bg-stone-950 border border-stone-700 rounded cursor-pointer"
              />
              {piece.color && (
                <button
                  className="btn-ghost text-xs"
                  onClick={() => updatePiece(piece.id, { color: undefined })}
                >
                  Reset
                </button>
              )}
            </div>
          </label>

          <div>
            <div className="label">Pozice ({units})</div>
            <div className="grid grid-cols-3 gap-1.5">
              {(['X', 'Y', 'Z'] as const).map((axis, i) => (
                <NumberField
                  key={axis}
                  label={axis}
                  value={posDisplay(i)}
                  step={units === 'cm' ? 0.5 : 5}
                  onChange={setPos(i)}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="label">Rotace (°)</div>
            <div className="grid grid-cols-3 gap-1.5">
              {(['X', 'Y', 'Z'] as const).map((axis, i) => (
                <NumberField
                  key={axis}
                  label={axis}
                  value={piece.rotation[i]}
                  step={15}
                  onChange={setRot(i)}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              className="btn-secondary flex-1 text-xs"
              onClick={() => duplicatePiece(piece.id)}
            >
              Duplikovat
            </button>
            <button
              className="btn-secondary flex-1 text-xs text-red-300 hover:text-red-200 border-red-900/40"
              onClick={() => removePiece(piece.id)}
            >
              Smazat
            </button>
          </div>

          {(() => {
            const n = countScrewsAttachedTo(piece.id, joints);
            if (n === 0) return null;
            return (
              <button
                className="btn-secondary w-full text-xs text-red-300 hover:text-red-200 border-red-900/40"
                onClick={() => {
                  if (
                    window.confirm(
                      `Opravdu odstranit ${n} šroub${n === 1 ? '' : n < 5 ? 'y' : 'ů'} z tohoto prvku?`,
                    )
                  ) {
                    removeScrewsFrom(piece.id);
                  }
                }}
                title="Smaže všechny vruty/hřebíky/čepy/závity připojené k tomuto prvku."
              >
                Odstranit šrouby z prvku ({n})
              </button>
            );
          })()}

          <RotationPivotPanel />

          <AttachPanel piece={piece} />

          <ClonePanel piece={piece} />

          <div className="text-[10px] text-stone-500 pt-1 leading-snug">
            Snap: pozice se zarovnává na rastr, rotace po nastavené hodnotě
            (default 45° = osově zarovnané polohy).
            <br />
            Aktuálně: ({formatPosition(piece.position[0], units)},{' '}
            {formatPosition(piece.position[1], units)},{' '}
            {formatPosition(piece.position[2], units)}) {units}
          </div>
        </div>
      </div>
    );
  }

  if (joint) {
    const type = getJointType(joint.typeId);
    const setPos = (idx: number) => (n: number) => {
      const value = units === 'cm' ? n * 10 : n;
      const next = [...joint.position] as Vec3;
      next[idx] = value;
      updateJoint(joint.id, { position: next });
    };
    const setRot = (idx: number) => (n: number) => {
      const next = [...joint.rotation] as Vec3;
      next[idx] = n;
      updateJoint(joint.id, { rotation: next });
    };
    const posDisplay = (idx: number) =>
      units === 'cm' ? joint.position[idx] / 10 : joint.position[idx];

    return (
      <div className="panel">
        <div className="panel-header">
          <span>Vlastnosti spojky</span>
          <span className="text-[10px] text-stone-500 normal-case tracking-normal">
            {type?.name}
          </span>
        </div>
        <div className="p-3 space-y-3">
          <label className="block">
            <div className="label">Typ</div>
            <select
              className="input text-sm"
              value={joint.typeId}
              onChange={(e) => updateJoint(joint.id, { typeId: e.target.value })}
            >
              {JOINT_TYPES.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name}
                </option>
              ))}
            </select>
          </label>

          <div>
            <div className="label">Pozice ({units})</div>
            <div className="grid grid-cols-3 gap-1.5">
              {(['X', 'Y', 'Z'] as const).map((axis, i) => (
                <NumberField
                  key={axis}
                  label={axis}
                  value={posDisplay(i)}
                  step={units === 'cm' ? 0.5 : 5}
                  onChange={setPos(i)}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="label">Rotace (°)</div>
            <div className="grid grid-cols-3 gap-1.5">
              {(['X', 'Y', 'Z'] as const).map((axis, i) => (
                <NumberField
                  key={axis}
                  label={axis}
                  value={joint.rotation[i]}
                  step={15}
                  onChange={setRot(i)}
                />
              ))}
            </div>
          </div>

          <button
            className="btn-secondary w-full text-xs text-red-300 hover:text-red-200 border-red-900/40"
            onClick={() => removeJoint(joint.id)}
          >
            Smazat spojku
          </button>

          {(() => {
            const n = countScrewsAttachedTo(joint.id, joints);
            if (n === 0) return null;
            return (
              <button
                className="btn-secondary w-full text-xs text-red-300 hover:text-red-200 border-red-900/40"
                onClick={() => {
                  if (
                    window.confirm(
                      `Opravdu odstranit ${n} šroub${n === 1 ? '' : n < 5 ? 'y' : 'ů'} z tohoto spoje?`,
                    )
                  ) {
                    removeScrewsFrom(joint.id);
                  }
                }}
                title="Smaže všechny vruty/hřebíky/čepy/závity připojené k tomuto spoji."
              >
                Odstranit šrouby ze spoje ({n})
              </button>
            );
          })()}

          <JointAttachPanel joint={joint} />
        </div>
      </div>
    );
  }

  return null;
}
