import { useMemo, useState } from 'react';
import { useDesignStore } from '../store/designStore';
import { getProfile } from '../data/lumber';
import { getJointType } from '../data/joints';
import { formatLength } from '../utils/units';

import type { Material } from '../types';

type CutRow = {
  key: string;
  profileId: string;
  profileName: string;
  length: number;
  count: number;
  totalLength: number;
  material: Material;
};

const MATERIAL_LABELS: Record<Material, string> = {
  wood: 'dřevo',
  metal: 'kov',
  aluminum: 'hliník',
};

export default function CutList() {
  const pieces = useDesignStore((s) => s.pieces);
  const joints = useDesignStore((s) => s.joints);
  const units = useDesignStore((s) => s.units);
  const [copied, setCopied] = useState(false);

  const rows: CutRow[] = useMemo(() => {
    const map = new Map<string, CutRow>();
    for (const piece of pieces) {
      const profile = getProfile(piece.profileId);
      if (!profile) continue;
      const key = `${piece.profileId}|${Math.round(piece.length)}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        existing.totalLength += piece.length;
      } else {
        map.set(key, {
          key,
          profileId: piece.profileId,
          profileName: profile.name,
          length: piece.length,
          count: 1,
          totalLength: piece.length,
          material: profile.material,
        });
      }
    }
    return Array.from(map.values()).sort(
      (a, b) =>
        a.material.localeCompare(b.material) ||
        a.profileName.localeCompare(b.profileName) ||
        a.length - b.length,
    );
  }, [pieces]);

  const jointRows = useMemo(() => {
    const map = new Map<string, { typeId: string; name: string; count: number }>();
    for (const j of joints) {
      const t = getJointType(j.typeId);
      if (!t) continue;
      const cur = map.get(j.typeId);
      if (cur) cur.count += 1;
      else map.set(j.typeId, { typeId: j.typeId, name: t.name, count: 1 });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [joints]);

  const totals = useMemo(() => {
    const sumOf = (m: Material) =>
      rows.filter((r) => r.material === m).reduce((s, r) => s + r.totalLength, 0);
    return {
      wood: sumOf('wood'),
      metal: sumOf('metal'),
      aluminum: sumOf('aluminum'),
      pieces: pieces.length,
      joints: joints.length,
    };
  }, [rows, pieces.length, joints.length]);

  const copy = async () => {
    const lines: string[] = [];
    lines.push('VÝPIS MATERIÁLU');
    lines.push('================');
    if (rows.length > 0) {
      lines.push('Profily:');
      for (const r of rows) {
        lines.push(
          ` ${r.count}× ${r.profileName} – ${formatLength(r.length, units)} (celkem ${formatLength(r.totalLength, units)})`,
        );
      }
    }
    if (jointRows.length > 0) {
      lines.push('');
      lines.push('Spojky:');
      for (const j of jointRows) {
        lines.push(` ${j.count}× ${j.name}`);
      }
    }
    lines.push('');
    lines.push(
      `Dřevo: ${formatLength(totals.wood, units)} • Kov: ${formatLength(totals.metal, units)} • Hliník: ${formatLength(totals.aluminum, units)}`,
    );
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <span>Výpis materiálu</span>
        <button className="btn-ghost text-[10px]" onClick={copy} disabled={rows.length === 0 && jointRows.length === 0}>
          {copied ? 'Zkopírováno' : 'Kopírovat'}
        </button>
      </div>
      <div className="p-3 space-y-3 max-h-80 overflow-y-auto">
        {rows.length === 0 && jointRows.length === 0 ? (
          <div className="text-xs text-stone-500">
            Zatím žádné prvky. Přidejte z katalogu vlevo.
          </div>
        ) : (
          <>
            {rows.length > 0 && (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-stone-500 text-left">
                    <th className="font-normal pb-1">Ks</th>
                    <th className="font-normal pb-1">Profil</th>
                    <th className="font-normal pb-1 text-right">Délka</th>
                    <th className="font-normal pb-1 text-right">Celkem</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.key} className="border-t border-stone-800">
                      <td className="py-1 text-wood-300 font-medium">{r.count}×</td>
                      <td className="py-1 text-stone-100">
                        {r.profileName}
                        <span className="ml-1 text-[10px] text-stone-500">
                          ({MATERIAL_LABELS[r.material]})
                        </span>
                      </td>
                      <td className="py-1 text-right text-stone-200">
                        {formatLength(r.length, units)}
                      </td>
                      <td className="py-1 text-right text-stone-400">
                        {formatLength(r.totalLength, units)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {jointRows.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-1">
                  Spojky
                </div>
                <ul className="text-xs space-y-0.5">
                  {jointRows.map((j) => (
                    <li
                      key={j.typeId}
                      className="flex justify-between border-t border-stone-800 py-1"
                    >
                      <span className="text-stone-100">{j.name}</span>
                      <span className="text-wood-300 font-medium">{j.count}×</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="text-[10px] text-stone-500 border-t border-stone-800 pt-2 leading-relaxed">
              Dřevo: {formatLength(totals.wood, units)}
              <br />
              Kov: {formatLength(totals.metal, units)}
              <br />
              Hliník: {formatLength(totals.aluminum, units)}
              <br />
              Prvků: {totals.pieces}, spojek: {totals.joints}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
