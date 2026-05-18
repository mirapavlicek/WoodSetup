import { useEffect, useRef } from 'react';
import type * as THREE from 'three';
import Scene from './scene/Scene';
import CatalogPanel from './ui/CatalogPanel';
import PropertiesPanel from './ui/PropertiesPanel';
import CutList from './ui/CutList';
import Toolbar from './ui/Toolbar';
import SceneSettings from './ui/SceneSettings';
import SurfaceWarning from './ui/SurfaceWarning';
import AttachBanner from './ui/AttachBanner';
import ScrewWarning from './ui/ScrewWarning';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useDesignStore } from './store/designStore';

export default function App() {
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  useKeyboardShortcuts();
  const piecesCount = useDesignStore((s) => s.pieces.length);
  const jointsCount = useDesignStore((s) => s.joints.length);
  const magnetEnabled = useDesignStore((s) => s.magnetEnabled);
  const overlapMode = useDesignStore((s) => s.overlapMode);
  const angleSnap = useDesignStore((s) => s.angleSnap);
  const setOrbitEnabled = useDesignStore((s) => s.setOrbitEnabled);

  useEffect(() => {
    const onUp = () => setOrbitEnabled(true);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [setOrbitEnabled]);

  return (
    <div className="h-full w-full flex flex-col p-2 gap-2 bg-stone-950">
      <Toolbar rendererRef={rendererRef} />

      <div className="flex-1 grid grid-cols-[260px_1fr_320px] gap-2 min-h-0">
        {/* Left: Catalog */}
        <div className="min-h-0">
          <CatalogPanel />
        </div>

        {/* Middle: 3D Canvas */}
        <div className="relative min-h-0 panel overflow-hidden">
          <Scene rendererRef={rendererRef} />
          <SurfaceWarning />
          <AttachBanner />
          <ScrewWarning />
          <div className="absolute top-2 left-2 text-[11px] text-stone-400 bg-stone-900/80 px-2 py-1 rounded border border-stone-800 pointer-events-none">
            Prvků: {piecesCount} • Spojek: {jointsCount} • Úhel: {angleSnap}°
            {magnetEnabled && (
              <span className="ml-1 text-wood-300">
                • Magnet ({overlapMode ? 'překrytí' : 'doraz'})
              </span>
            )}
          </div>
          <div className="absolute bottom-2 left-2 text-[11px] text-stone-500 bg-stone-900/80 px-2 py-1 rounded border border-stone-800 pointer-events-none">
            LMB otáčet • RMB posun • kolečko zoom • klávesy G/R/M, Del, Ctrl+D
          </div>
        </div>

        {/* Right: Properties + Cut list + Scene settings */}
        <div className="min-h-0 flex flex-col gap-2 overflow-y-auto">
          <PropertiesPanel />
          <CutList />
          <SceneSettings />
        </div>
      </div>
    </div>
  );
}
