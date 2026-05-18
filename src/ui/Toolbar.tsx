import { useEffect, useRef, useState } from 'react';
import type * as THREE from 'three';
import { useDesignStore } from '../store/designStore';
import { exportCanvasPNG, exportJSON, importJSON } from '../utils/export';
import { exportSTL } from '../utils/exportSTL';
import { exportManualPNG } from '../utils/exportManual';
import {
  deleteProject,
  listProjects,
  loadProject,
  saveProject,
} from '../utils/storage';
import type { SavedProject } from '../types';

type Props = {
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>;
};

function HelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="panel max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-header">
          <span>Klávesové zkratky</span>
          <button className="btn-ghost text-xs" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="p-4 text-sm space-y-2 text-stone-200">
          <Row k="G" v="Režim posunu (translate)" />
          <Row k="R" v="Režim rotace (rotate)" />
          <Row k="M" v="Zapnout / vypnout magnet" />
          <Row k="L" v="Zapnout / vypnout skupinu (rigid link)" />
          <Row k="Del / Backspace" v="Smazat vybraný prvek" />
          <Row k="Ctrl/⌘ + D" v="Duplikovat vybraný prvek" />
          <Row k="Ctrl/⌘ + Z" v="Zpět" />
          <Row k="Ctrl/⌘ + Shift + Z" v="Vpřed" />
          <Row k="Ctrl/⌘ + S" v="Uložit projekt" />
          <Row k="Esc" v="Zrušit výběr / zrušit přichycení" />
          <div className="pt-3 text-xs text-stone-400 border-t border-stone-800 space-y-1">
            <p>
              Ovládání kamery: levé tlačítko = otočení, pravé = posun, kolečko =
              přiblížení.
            </p>
            <p>
              <strong>Snap úhlu</strong> řídí krok rotace gizma i magnetu (15° /
              45° / 90°). Výchozí 45° drží prvky osově zarovnané. Přesný úhel
              vždy zadáš ručně v poli Rotace.
            </p>
            <p>
              <strong>Střed otáčení</strong> (Properties panel) umí pivot ve
              středu nebo na libovolné hraně / rohu prvku – kotva zůstane v
              místě a prvek se přetočí kolem ní.
            </p>
            <p>
              <strong>Skupina (⛓)</strong> drží sešroubované prvky pohromadě.
              Posun nebo rotace vybraného prvku se aplikuje na celou skupinu –
              vrutem spojené trámy se hýbou jako jeden objekt. Vypneš ji
              klávesou L, když chceš ladit pozici jednoho dílu zvlášť.
            </p>
            <p>
              <strong>Magnet</strong> po pustění přilepí prvek k nejbližšímu
              sousedovi – v režimu <em>Doraz</em> se boky dotknou, v režimu{' '}
              <em>Překrytí</em> se prvek posadí na druhý. <strong>Spojky</strong>{' '}
              se navíc samy zorientují podle tvaru: plotny / úhelníky / spony /
              vazníkové desky dosednou plochou na nejbližší plochu prvku, botky
              a patky se posadí na čelo a zarovnají dlouhou osu prvku.
            </p>
            <p>
              <strong>Přichytit k bodu</strong> (v Properties panelu) –
              přesně určete zdrojový bod prvku (X/Y/Z) a klikněte ve scéně
              na cíl. Při kliknutí na prvek se přichytí k jeho nejbližšímu
              rohu/středu, při kliknutí na plochu na zvolené místo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <kbd className="px-1.5 py-0.5 rounded bg-stone-800 border border-stone-700 text-stone-100 text-xs font-mono">
        {k}
      </kbd>
      <span className="text-stone-300 text-right flex-1">{v}</span>
    </div>
  );
}

function ProjectsDialog({
  onClose,
  onLoaded,
}: {
  onClose: () => void;
  onLoaded: () => void;
}) {
  const [projects, setProjects] = useState<SavedProject[]>(() => listProjects());
  const loadSnapshot = useDesignStore((s) => s.loadSnapshot);

  const refresh = () => setProjects(listProjects());

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="panel max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-header">
          <span>Uložené projekty</span>
          <button className="btn-ghost text-xs" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="p-3 max-h-96 overflow-y-auto">
          {projects.length === 0 ? (
            <div className="text-xs text-stone-400 p-4 text-center">
              Žádné uložené projekty.
            </div>
          ) : (
            <ul className="space-y-1">
              {projects.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-stone-800"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-stone-100 truncate">
                      {p.name}
                    </div>
                    <div className="text-[10px] text-stone-500">
                      {new Date(p.savedAt).toLocaleString('cs-CZ')} •{' '}
                      {p.data.pieces.length} prvků, {p.data.joints.length} spojek
                    </div>
                  </div>
                  <button
                    className="btn-secondary text-xs"
                    onClick={() => {
                      const proj = loadProject(p.id);
                      if (proj) {
                        loadSnapshot(proj.data, proj.name);
                        onLoaded();
                      }
                    }}
                  >
                    Načíst
                  </button>
                  <button
                    className="btn-ghost text-xs text-red-300 hover:text-red-200"
                    onClick={() => {
                      deleteProject(p.id);
                      refresh();
                    }}
                  >
                    Smazat
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Toolbar({ rendererRef }: Props) {
  const projectName = useDesignStore((s) => s.projectName);
  const setProjectName = useDesignStore((s) => s.setProjectName);
  const units = useDesignStore((s) => s.units);
  const setUnits = useDesignStore((s) => s.setUnits);
  const transformMode = useDesignStore((s) => s.transformMode);
  const setTransformMode = useDesignStore((s) => s.setTransformMode);
  const angleSnap = useDesignStore((s) => s.angleSnap);
  const setAngleSnap = useDesignStore((s) => s.setAngleSnap);
  const magnetEnabled = useDesignStore((s) => s.magnetEnabled);
  const setMagnetEnabled = useDesignStore((s) => s.setMagnetEnabled);
  const overlapMode = useDesignStore((s) => s.overlapMode);
  const setOverlapMode = useDesignStore((s) => s.setOverlapMode);
  const linkConnected = useDesignStore((s) => s.linkConnected);
  const setLinkConnected = useDesignStore((s) => s.setLinkConnected);
  const undo = useDesignStore((s) => s.undo);
  const redo = useDesignStore((s) => s.redo);
  const past = useDesignStore((s) => s.past);
  const future = useDesignStore((s) => s.future);
  const reset = useDesignStore((s) => s.reset);
  const getSnapshot = useDesignStore((s) => s.getSnapshot);
  const loadSnapshot = useDesignStore((s) => s.loadSnapshot);

  const fileRef = useRef<HTMLInputElement>(null);
  const [showProjects, setShowProjects] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const handleSave = () => {
    saveProject(projectName.trim() || 'Nový projekt', getSnapshot());
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  };

  const handleExportPNG = () => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    exportCanvasPNG(renderer.domElement, projectName);
  };

  const handleExportJSON = () => {
    exportJSON(getSnapshot(), projectName);
  };

  const handleExportSTL = (binary: boolean) => {
    exportSTL(getSnapshot(), projectName, { binary });
  };

  const [manualPending, setManualPending] = useState(false);
  const handleExportManual = async () => {
    if (manualPending) return;
    setManualPending(true);
    try {
      await exportManualPNG(getSnapshot(), projectName);
    } catch (err) {
      console.error(err);
      alert('Nepodařilo se vytvořit návod: ' + (err as Error).message);
    } finally {
      setManualPending(false);
    }
  };

  const handleImport = async (file: File) => {
    try {
      const snap = await importJSON(file);
      loadSnapshot(snap, file.name.replace(/\.(woodsetup\.)?json$/i, ''));
    } catch (err) {
      alert(`Soubor se nepodařilo načíst: ${(err as Error).message}`);
    }
  };

  const handleNew = () => {
    if (window.confirm('Začít nový projekt? Neuložené změny budou ztraceny.')) {
      reset();
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (inField) return;

      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
        return;
      }
      if (meta && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        redo();
        return;
      }
      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
        return;
      }
      if (e.key.toLowerCase() === 'g') setTransformMode('translate');
      if (e.key.toLowerCase() === 'r') setTransformMode('rotate');
      if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setMagnetEnabled(!useDesignStore.getState().magnetEnabled);
      }
      if (e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setLinkConnected(!useDesignStore.getState().linkConnected);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, setTransformMode, setMagnetEnabled, setLinkConnected, handleSave]);

  return (
    <>
      <div className="panel flex items-center gap-2 px-3 py-2">
        <div className="flex items-center gap-2 pr-3 border-r border-stone-700/60">
          <span className="text-wood-400 font-bold">WoodSetup</span>
          <input
            className="input text-sm w-40"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Název projektu"
          />
        </div>

        <button className="btn-ghost text-xs" onClick={handleNew} title="Nový">
          Nový
        </button>
        <button
          className={`btn-secondary text-xs ${savedFlash ? 'text-wood-200' : ''}`}
          onClick={handleSave}
          title="Uložit (Ctrl+S)"
        >
          {savedFlash ? 'Uloženo' : 'Uložit'}
        </button>
        <button
          className="btn-ghost text-xs"
          onClick={() => setShowProjects(true)}
        >
          Projekty
        </button>

        <div className="h-6 border-l border-stone-700/60 mx-1" />

        <button
          className="btn-ghost text-xs"
          onClick={undo}
          disabled={past.length === 0}
          title="Zpět (Ctrl+Z)"
        >
          ↶ Zpět
        </button>
        <button
          className="btn-ghost text-xs"
          onClick={redo}
          disabled={future.length === 0}
          title="Vpřed (Ctrl+Shift+Z)"
        >
          ↷ Vpřed
        </button>

        <div className="h-6 border-l border-stone-700/60 mx-1" />

        <div className="flex rounded border border-stone-700 overflow-hidden">
          <button
            className={`px-2 py-1 text-xs ${transformMode === 'translate' ? 'bg-wood-500 text-stone-900' : 'bg-stone-800 text-stone-200'}`}
            onClick={() => setTransformMode('translate')}
            title="Posun (G)"
          >
            Posun
          </button>
          <button
            className={`px-2 py-1 text-xs ${transformMode === 'rotate' ? 'bg-wood-500 text-stone-900' : 'bg-stone-800 text-stone-200'}`}
            onClick={() => setTransformMode('rotate')}
            title="Rotace (R)"
          >
            Rotace
          </button>
        </div>

        <div className="h-6 border-l border-stone-700/60 mx-1" />

        <div
          className="flex rounded border border-stone-700 overflow-hidden"
          title="Krok rotace ve stupních"
        >
          {[15, 45, 90].map((deg) => (
            <button
              key={deg}
              className={`px-2 py-1 text-xs ${angleSnap === deg ? 'bg-wood-500 text-stone-900' : 'bg-stone-800 text-stone-200'}`}
              onClick={() => setAngleSnap(deg)}
            >
              {deg}°
            </button>
          ))}
        </div>

        <button
          className={`btn text-xs border ${
            magnetEnabled
              ? 'bg-wood-500 text-stone-900 border-wood-400'
              : 'bg-stone-800 text-stone-200 border-stone-700 hover:bg-stone-700'
          }`}
          onClick={() => setMagnetEnabled(!magnetEnabled)}
          title="Magnet – po pustění přilepit k sousednímu prvku"
        >
          ⌖ Magnet
        </button>

        <button
          className={`btn text-xs border ${
            linkConnected
              ? 'bg-wood-500 text-stone-900 border-wood-400'
              : 'bg-stone-800 text-stone-200 border-stone-700 hover:bg-stone-700'
          }`}
          onClick={() => setLinkConnected(!linkConnected)}
          title="Skupina – sešroubované prvky se hýbou společně (klávesa L)"
        >
          ⛓ Skupina
        </button>

        <div
          className="flex rounded border border-stone-700 overflow-hidden"
          title="Doraz: boky se dotýkají • Překrytí: prvek se posadí na druhý (lap joint)"
        >
          <button
            className={`px-2 py-1 text-xs ${!overlapMode ? 'bg-wood-500 text-stone-900' : 'bg-stone-800 text-stone-200'}`}
            onClick={() => setOverlapMode(false)}
            disabled={!magnetEnabled}
          >
            Doraz
          </button>
          <button
            className={`px-2 py-1 text-xs ${overlapMode ? 'bg-wood-500 text-stone-900' : 'bg-stone-800 text-stone-200'}`}
            onClick={() => setOverlapMode(true)}
            disabled={!magnetEnabled}
          >
            Překrytí
          </button>
        </div>

        <div className="h-6 border-l border-stone-700/60 mx-1" />

        <div className="flex rounded border border-stone-700 overflow-hidden">
          <button
            className={`px-2 py-1 text-xs ${units === 'mm' ? 'bg-wood-500 text-stone-900' : 'bg-stone-800 text-stone-200'}`}
            onClick={() => setUnits('mm')}
          >
            mm
          </button>
          <button
            className={`px-2 py-1 text-xs ${units === 'cm' ? 'bg-wood-500 text-stone-900' : 'bg-stone-800 text-stone-200'}`}
            onClick={() => setUnits('cm')}
          >
            cm
          </button>
        </div>

        <div className="flex-1" />

        <button className="btn-ghost text-xs" onClick={handleExportPNG}>
          Export PNG
        </button>
        <button className="btn-ghost text-xs" onClick={handleExportJSON}>
          Export JSON
        </button>
        <button
          className="btn-ghost text-xs"
          onClick={(e) => handleExportSTL(!e.shiftKey)}
          title="Export 3D modelu (binary STL). Shift+klik = ASCII STL."
        >
          Export STL
        </button>
        <button
          className="btn-ghost text-xs"
          onClick={handleExportManual}
          disabled={manualPending}
          title="Vyrenderuje IKEA-style návod na stavbu (PNG) – rozpis + kroky."
        >
          {manualPending ? 'Generuji…' : 'Export návod'}
        </button>
        <button
          className="btn-ghost text-xs"
          onClick={() => fileRef.current?.click()}
        >
          Import JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImport(file);
            e.target.value = '';
          }}
        />
        <button
          className="btn-ghost text-xs"
          onClick={() => setShowHelp(true)}
          title="Nápověda"
        >
          ?
        </button>
      </div>

      {showHelp && <HelpDialog onClose={() => setShowHelp(false)} />}
      {showProjects && (
        <ProjectsDialog
          onClose={() => setShowProjects(false)}
          onLoaded={() => setShowProjects(false)}
        />
      )}
    </>
  );
}
