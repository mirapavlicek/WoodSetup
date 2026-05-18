import { useEffect } from 'react';
import { useDesignStore } from '../store/designStore';

/** Globální klávesové zkratky pro práci s výběrem. */
export function useKeyboardShortcuts() {
  const selectedId = useDesignStore((s) => s.selectedId);
  const removePiece = useDesignStore((s) => s.removePiece);
  const removeJoint = useDesignStore((s) => s.removeJoint);
  const duplicatePiece = useDesignStore((s) => s.duplicatePiece);
  const selectPiece = useDesignStore((s) => s.selectPiece);
  const cancelAttachPicking = useDesignStore((s) => s.cancelAttachPicking);
  const cancelHoleAttach = useDesignStore((s) => s.cancelHoleAttach);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (inField) return;

      if (e.key === 'Escape') {
        const state = useDesignStore.getState();
        if (state.holeAttach) {
          cancelHoleAttach();
        } else if (state.attachPicking) {
          cancelAttachPicking();
        } else {
          selectPiece(null);
        }
        return;
      }
      if (!selectedId) return;
      const state = useDesignStore.getState();
      const isPiece = state.pieces.some((p) => p.id === selectedId);
      const isJoint = state.joints.some((j) => j.id === selectedId);

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (isPiece) removePiece(selectedId);
        else if (isJoint) removeJoint(selectedId);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (isPiece) duplicatePiece(selectedId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    selectedId,
    removePiece,
    removeJoint,
    duplicatePiece,
    selectPiece,
    cancelAttachPicking,
    cancelHoleAttach,
  ]);
}
