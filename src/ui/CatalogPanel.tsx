import { useMemo, useState } from 'react';
import { LUMBER_PROFILES } from '../data/lumber';
import { JOINT_TYPES } from '../data/joints';
import { useDesignStore } from '../store/designStore';
import type { LumberCategory, JointCategory } from '../types';

const LUMBER_LABELS: Record<LumberCategory, string> = {
  hranol: 'Hranoly',
  prkno: 'Prkna a fošny',
  lat: 'Latě',
  jekl: 'Kovové jekly',
  trubka: 'Trubky',
  deska: 'Desky (OSB, překližka)',
  lprofil: 'L-profily',
  uprofil: 'U-profily',
};

const JOINT_LABELS: Record<JointCategory, string> = {
  vrut: 'Vruty',
  uhelnik: 'Úhelníky',
  plotna: 'Plotny',
  cep: 'Dřevěné čepy',
  zavit: 'Závitové tyče',
  hrebik: 'Hřebíky',
  hmozdinka: 'Hmoždinky a kotvy',
  botka: 'Trámové botky',
  patka: 'Patní kotvy sloupů',
  spona: 'Krokvové spony / pásky',
  'vaznikova-deska': 'Vazníkové desky',
};

type Tab = 'profiles' | 'joints';

export default function CatalogPanel() {
  const [tab, setTab] = useState<Tab>('profiles');
  const [query, setQuery] = useState('');
  const addPiece = useDesignStore((s) => s.addPieceFromProfile);
  const addJointBetween = useDesignStore((s) => s.addJointBetweenSelected);
  const addJoint = useDesignStore((s) => s.addJoint);
  const selectedId = useDesignStore((s) => s.selectedId);
  const pieces = useDesignStore((s) => s.pieces);

  const filteredProfiles = useMemo(
    () =>
      LUMBER_PROFILES.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [query],
  );
  const filteredJoints = useMemo(
    () =>
      JOINT_TYPES.filter((j) =>
        j.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [query],
  );

  const groupedProfiles = useMemo(() => {
    const map = new Map<LumberCategory, typeof LUMBER_PROFILES>();
    for (const p of filteredProfiles) {
      const arr = map.get(p.category) ?? [];
      arr.push(p);
      map.set(p.category, arr);
    }
    return map;
  }, [filteredProfiles]);

  const groupedJoints = useMemo(() => {
    const map = new Map<JointCategory, typeof JOINT_TYPES>();
    for (const j of filteredJoints) {
      const arr = map.get(j.category) ?? [];
      arr.push(j);
      map.set(j.category, arr);
    }
    return map;
  }, [filteredJoints]);

  const selectedPiece = pieces.find((p) => p.id === selectedId);

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <span>Katalog</span>
      </div>
      <div className="px-3 pt-2 pb-1 flex gap-1">
        <button
          className={`btn-ghost text-xs flex-1 ${tab === 'profiles' ? 'bg-stone-800 text-wood-200' : ''}`}
          onClick={() => setTab('profiles')}
        >
          Profily
        </button>
        <button
          className={`btn-ghost text-xs flex-1 ${tab === 'joints' ? 'bg-stone-800 text-wood-200' : ''}`}
          onClick={() => setTab('joints')}
        >
          Spojky
        </button>
      </div>
      <div className="px-3 pb-2">
        <input
          className="input text-xs"
          placeholder="Hledat..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="overflow-y-auto flex-1 px-2 pb-2 space-y-3">
        {tab === 'profiles' &&
          Array.from(groupedProfiles.entries()).map(([cat, profiles]) => (
            <div key={cat}>
              <div className="text-[10px] uppercase tracking-wider text-stone-500 px-1 mb-1">
                {LUMBER_LABELS[cat]}
              </div>
              <div className="space-y-1">
                {profiles.map((p) => (
                  <button
                    key={p.id}
                    className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded hover:bg-stone-800 transition-colors group"
                    onClick={() => addPiece(p.id)}
                    title={p.description}
                  >
                    <span
                      className="block w-6 h-6 rounded border border-stone-700 shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm text-stone-100 truncate">
                        {p.name}
                      </span>
                      <span className="block text-[10px] text-stone-400">
                        {p.width}×{p.height} mm •{' '}
                        {p.material === 'wood'
                          ? 'dřevo'
                          : p.material === 'aluminum'
                            ? 'hliník'
                            : 'kov'}
                      </span>
                    </span>
                    <span className="text-wood-300 opacity-0 group-hover:opacity-100">
                      +
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}

        {tab === 'joints' && (
          <>
            <div className="text-[10px] text-stone-400 px-2 mb-1 leading-snug">
              {selectedPiece
                ? `Vybrán prvek • spojku připojím k němu.`
                : 'Tip: označte prvek pro přiřazení spojky.'}
            </div>
            {Array.from(groupedJoints.entries()).map(([cat, list]) => (
              <div key={cat}>
                <div className="text-[10px] uppercase tracking-wider text-stone-500 px-1 mb-1">
                  {JOINT_LABELS[cat]}
                </div>
                <div className="space-y-1">
                  {list.map((j) => (
                    <button
                      key={j.id}
                      className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded hover:bg-stone-800 transition-colors group"
                      onClick={() => {
                        if (selectedPiece) {
                          addJointBetween(j.id);
                        } else {
                          addJoint(j.id, [0, 0, 0]);
                        }
                      }}
                      title={j.description}
                    >
                      <span
                        className="block w-6 h-6 rounded border border-stone-700 shrink-0"
                        style={{ backgroundColor: j.color }}
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm text-stone-100 truncate">
                          {j.name}
                        </span>
                        <span className="block text-[10px] text-stone-400">
                          {j.length} mm • Ø/š {j.size} mm
                        </span>
                      </span>
                      <span className="text-wood-300 opacity-0 group-hover:opacity-100">
                        +
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
