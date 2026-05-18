import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type {
  Anchor,
  DesignSnapshot,
  GroundCorners,
  Joint,
  Piece,
  Units,
  Vec2,
  Vec3,
} from '../types';
import { getProfile } from '../data/lumber';
import { getJointType, JOINT_TYPES } from '../data/joints';
import { pieceBelowSurfaceBy } from '../utils/geometry';
import { snapPieceToNeighbor } from '../utils/snap';
import { snapJointToPiece } from '../utils/jointSnap';
import { closestAnchorOfPiece, worldAnchorPosition } from '../utils/anchor';
import * as THREE from 'three';
import { getHoles } from '../data/holes';
import { evaluateScrewFit } from '../utils/screwCheck';

export type TransformMode = 'translate' | 'rotate';

export type SurfaceWarning = {
  pieceId: string;
  /** Hloubka v mm, o kterou se prvek noří pod plochu. */
  depth: number;
};

export type AttachPicking = {
  /** Prvek, který se bude přichycovat. */
  pieceId: string;
  /** Zvolený zdrojový bod (lokálně). */
  anchor: Anchor;
};

/** Režim „přišroubuj do díry" – zdrojem je spojka (vrut, hřebík, závit, čep). */
export type HoleAttach = {
  sourceJointId: string;
};

/** Upozornění, že vrut vystupuje ven z materiálu. */
export type ScrewWarning = {
  jointId: string;
  /** Délka vrutu, která čouhá ven (mm). */
  protrusion: number;
  /** Dostupná hloubka materiálu pod hlavou (mm). 0 = ve vzduchu. */
  availableDepth: number;
  /** Doporučený kratší vrut z katalogu (id). */
  suggestedTypeId: string | null;
};

const HISTORY_LIMIT = 80;

type State = {
  pieces: Piece[];
  joints: Joint[];
  selectedId: string | null;
  units: Units;
  /** Velikost snap rastru v mm. */
  gridSize: number;
  /** 4 rohy pracovní plochy ([X, Z] mm). */
  groundCorners: GroundCorners;
  transformMode: TransformMode;
  /** Krok rotace ve stupních pro gizmo i snap k sousedovi. */
  angleSnap: number;
  /** Magnetické přichycení k nejbližšímu prvku po skončení tažení. */
  magnetEnabled: boolean;
  /** Při magnetu místo dorazu prvek položí na druhý (lap joint). */
  overlapMode: boolean;
  /** Pokud true, sešroubované (přes joint.connects) prvky se hýbou společně. */
  linkConnected: boolean;
  projectName: string;
  past: DesignSnapshot[];
  future: DesignSnapshot[];
  surfaceWarning: SurfaceWarning | null;
  /** Aktivní režim ručního přichycení bod-k-bodu. */
  attachPicking: AttachPicking | null;
  /** Aktivní režim „přišroubuj do díry". */
  holeAttach: HoleAttach | null;
  /** Upozornění, že nedávno usazený vrut vyčnívá z materiálu. */
  screwWarning: ScrewWarning | null;
  /** Když je false, kamera (OrbitControls) je zamknutá – brání pohybu při kliknutí na prvek. */
  orbitEnabled: boolean;
  /** True, když uživatel právě táhne za gizmo (pro zobrazení snap pomocníku). */
  gizmoDragging: boolean;
  /**
   * Kotva (X/Y/Z ∈ {-1, 0, 1}), kolem které se prvek otáčí v gizmu.
   * Default [0,0,0] = střed. Hodnoty -1/+1 umístí pivot na hranu / roh.
   */
  rotationPivot: Anchor;
};

type Actions = {
  setProjectName: (name: string) => void;
  setUnits: (units: Units) => void;
  setGridSize: (size: number) => void;
  setGroundCorners: (corners: GroundCorners) => void;
  setGroundCorner: (index: 0 | 1 | 2 | 3, value: Vec2) => void;
  setTransformMode: (mode: TransformMode) => void;
  setAngleSnap: (deg: number) => void;
  setMagnetEnabled: (v: boolean) => void;
  setOverlapMode: (v: boolean) => void;
  setLinkConnected: (v: boolean) => void;
  selectPiece: (id: string | null) => void;

  addPieceFromProfile: (profileId: string) => string;
  updatePiece: (id: string, patch: Partial<Omit<Piece, 'id'>>) => void;
  duplicatePiece: (id: string) => string | null;
  removePiece: (id: string) => void;
  /** Klonuje prvek do pole o `count` kopiích podél zvolené světové osy. */
  cloneArrayPiece: (
    pieceId: string,
    options: {
      count: number;
      axis: 'x+' | 'x-' | 'y+' | 'y-' | 'z+' | 'z-';
      spacing: number;
    },
  ) => string[];

  addJoint: (typeId: string, position?: Vec3, connects?: [string, string?]) => string;
  updateJoint: (id: string, patch: Partial<Omit<Joint, 'id'>>) => void;
  removeJoint: (id: string) => void;
  addJointBetweenSelected: (typeId: string, otherPieceId?: string) => string | null;

  undo: () => void;
  redo: () => void;
  reset: () => void;
  loadSnapshot: (snapshot: DesignSnapshot, name?: string) => void;
  getSnapshot: () => DesignSnapshot;

  /** Zkontroluje prvek po transformaci – pokud zasahuje pod plochu, nastaví surfaceWarning. */
  checkPieceBelowSurface: (pieceId: string) => void;
  /** Posune prvek tak, aby nejnižší roh ležel na ploše. */
  liftPieceToSurface: (pieceId: string) => void;
  dismissSurfaceWarning: () => void;
  /** Magneticky přichytí prvek k nejbližšímu sousedovi (volá se po commitu transformace). */
  magnetSnapPiece: (pieceId: string) => void;
  /** Magneticky přichytí spojku k nejbližší ploše prvku podle jejího tvaru. */
  magnetSnapJoint: (jointId: string) => void;

  setOrbitEnabled: (v: boolean) => void;
  setGizmoDragging: (v: boolean) => void;

  /** Spustí ruční režim „bod k bodu" pro daný prvek a kotvu. */
  startAttachPicking: (pieceId: string, anchor: Anchor) => void;
  cancelAttachPicking: () => void;
  /** Aplikuje ruční přichycení: pokud je `targetPieceId`, použije se jeho nejbližší kotva ke `targetWorld`. */
  applyAttachAtPoint: (targetPieceId: string | null, targetWorld: Vec3) => void;

  /** Spustí režim „přišroubuj do díry" pro vybranou spojku. */
  startHoleAttach: (sourceJointId: string) => void;
  cancelHoleAttach: () => void;
  /** Přichytí vrut k díře cílové spojky (orientace podle normály díry). */
  snapJointToHole: (targetJointId: string, holeIndex: number) => void;
  /**
   * Obecná operace: usadí vrut tak, aby měl hlavu ve `worldPos` a dřík směřoval proti `worldNormal`.
   * Funguje i pro klik do dřevěné plochy (face normal).
   */
  snapJointAtWorldPoint: (
    worldPos: Vec3,
    worldNormal: Vec3,
    connectId?: string,
  ) => void;
  dismissScrewWarning: () => void;
  /** Vymění vrut za kratší doporučený typ (suggestedTypeId) a opět ho usadí. */
  swapScrewToFit: () => void;

  /** Nastaví kotvu, kolem které se prvek otáčí v gizmu. */
  setRotationPivot: (anchor: Anchor) => void;

  /** Hromadně aplikuje pozici a rotaci na seznam prvků a spojek (jedna položka v historii). */
  applyGroupTransform: (updates: {
    pieces?: { id: string; position: Vec3; rotation: Vec3 }[];
    joints?: { id: string; position: Vec3; rotation: Vec3 }[];
  }) => void;

  /** Spočítá vruty/hřebíky/čepy/závity, které jsou připojené k danému prvku nebo spojce. */
  countScrewsAttachedTo: (targetId: string) => number;
  /** Odstraní všechny šrouby/hřebíky/čepy/závity připojené k danému prvku nebo spojce. */
  removeScrewsFrom: (targetId: string) => number;
};

export type DesignStore = State & Actions;

const initialState: State = {
  pieces: [],
  joints: [],
  selectedId: null,
  units: 'mm',
  gridSize: 10,
  groundCorners: [
    [-2000, -2000],
    [2000, -2000],
    [2000, 2000],
    [-2000, 2000],
  ],
  transformMode: 'translate',
  angleSnap: 45,
  magnetEnabled: false,
  overlapMode: false,
  linkConnected: true,
  projectName: 'Nový projekt',
  past: [],
  future: [],
  surfaceWarning: null,
  attachPicking: null,
  holeAttach: null,
  screwWarning: null,
  orbitEnabled: true,
  rotationPivot: [0, 0, 0],
  gizmoDragging: false,
};

/** Práh v mm – noření menší než tahle hodnota se ignoruje (numerický šum při snapu). */
const BELOW_SURFACE_THRESHOLD = 0.5;

function snapshotOf(state: State): DesignSnapshot {
  return {
    pieces: state.pieces.map((p) => ({
      ...p,
      position: [...p.position] as Vec3,
      rotation: [...p.rotation] as Vec3,
    })),
    joints: state.joints.map((j) => ({
      ...j,
      position: [...j.position] as Vec3,
      rotation: [...j.rotation] as Vec3,
      connects: j.connects ? ([...j.connects] as [string, string?]) : undefined,
    })),
  };
}

/** Wrapper, který před změnou zaznamená snapshot do history a vyprázdní future. */
function withHistory<T extends Partial<State>>(
  state: State,
  next: T,
): Partial<State> {
  const snap = snapshotOf(state);
  const past = [...state.past, snap];
  if (past.length > HISTORY_LIMIT) past.shift();
  return { ...next, past, future: [] };
}

function midpoint(a: Vec3, b: Vec3): Vec3 {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}

const SCREW_LIKE_CATEGORIES = new Set(['vrut', 'hrebik', 'cep', 'zavit']);

/** True, pokud spojka je vrut/hřebík/čep/závit a je připojena k `targetId`. */
function isScrewAttachedTo(joint: Joint, targetId: string): boolean {
  if (!joint.connects) return false;
  const type = getJointType(joint.typeId);
  if (!type || !SCREW_LIKE_CATEGORIES.has(type.category)) return false;
  return joint.connects.some((id) => id === targetId);
}

/**
 * Najde nejdelší vrut/hřebík ze stejné kategorie a průměru, který se vejde do `maxLength`.
 * Když takový neexistuje, vrátí null.
 */
function findShorterScrewType(
  currentTypeId: string,
  maxLength: number,
): string | null {
  const current = getJointType(currentTypeId);
  if (!current) return null;
  if (maxLength <= 0) return null;
  const candidates = JOINT_TYPES.filter(
    (t) =>
      t.category === current.category &&
      Math.abs(t.size - current.size) < 0.6 &&
      t.length <= maxLength &&
      t.id !== current.id,
  );
  if (candidates.length === 0) {
    // fallback: any same-category candidate that fits
    const fallback = JOINT_TYPES.filter(
      (t) =>
        t.category === current.category &&
        t.length <= maxLength &&
        t.id !== current.id,
    );
    if (fallback.length === 0) return null;
    fallback.sort((a, b) => b.length - a.length);
    return fallback[0].id;
  }
  candidates.sort((a, b) => b.length - a.length);
  return candidates[0].id;
}

export const useDesignStore = create<DesignStore>((set, get) => ({
  ...initialState,

  setProjectName: (name) => set({ projectName: name }),
  setUnits: (units) => set({ units }),
  setGridSize: (size) => set({ gridSize: Math.max(1, size) }),
  setGroundCorners: (corners) => set({ groundCorners: corners }),
  setGroundCorner: (index, value) => {
    set((state) => {
      const next = [...state.groundCorners] as GroundCorners;
      next[index] = value;
      return { groundCorners: next };
    });
  },
  setTransformMode: (mode) => set({ transformMode: mode }),
  setAngleSnap: (deg) => set({ angleSnap: Math.max(1, deg) }),
  setMagnetEnabled: (v) => set({ magnetEnabled: v }),
  setOverlapMode: (v) => set({ overlapMode: v }),
  setLinkConnected: (v) => set({ linkConnected: v }),
  setOrbitEnabled: (v) => set({ orbitEnabled: v }),
  setGizmoDragging: (v) => set({ gizmoDragging: v }),
  setRotationPivot: (anchor) => set({ rotationPivot: anchor }),

  applyGroupTransform: (updates) => {
    set((state) => {
      const piecesById = new Map(state.pieces.map((p) => [p.id, p]));
      const jointsById = new Map(state.joints.map((j) => [j.id, j]));
      for (const u of updates.pieces ?? []) {
        const cur = piecesById.get(u.id);
        if (!cur) continue;
        piecesById.set(u.id, {
          ...cur,
          position: u.position,
          rotation: u.rotation,
        });
      }
      for (const u of updates.joints ?? []) {
        const cur = jointsById.get(u.id);
        if (!cur) continue;
        jointsById.set(u.id, {
          ...cur,
          position: u.position,
          rotation: u.rotation,
        });
      }
      return withHistory(state, {
        pieces: state.pieces.map((p) => piecesById.get(p.id) ?? p),
        joints: state.joints.map((j) => jointsById.get(j.id) ?? j),
      });
    });
  },

  countScrewsAttachedTo: (targetId) =>
    get().joints.filter((j) => isScrewAttachedTo(j, targetId)).length,

  removeScrewsFrom: (targetId) => {
    const before = get().joints;
    const removed = before.filter((j) => isScrewAttachedTo(j, targetId));
    if (removed.length === 0) return 0;
    const removedIds = new Set(removed.map((j) => j.id));
    set((state) =>
      withHistory(state, {
        joints: state.joints.filter((j) => !removedIds.has(j.id)),
        selectedId:
          state.selectedId && removedIds.has(state.selectedId)
            ? null
            : state.selectedId,
        holeAttach:
          state.holeAttach && removedIds.has(state.holeAttach.sourceJointId)
            ? null
            : state.holeAttach,
        screwWarning:
          state.screwWarning && removedIds.has(state.screwWarning.jointId)
            ? null
            : state.screwWarning,
      }),
    );
    return removed.length;
  },

  selectPiece: (id) => set({ selectedId: id }),

  addPieceFromProfile: (profileId) => {
    const profile = getProfile(profileId);
    if (!profile) return '';
    const id = uuid();
    const piece: Piece = {
      id,
      profileId,
      length: profile.defaultLength,
      // umístíme tak, aby spodek seděl na ploše (Y = výška/2)
      position: [0, profile.height / 2, 0],
      rotation: [0, 0, 0],
    };
    set((state) =>
      withHistory(state, {
        pieces: [...state.pieces, piece],
        selectedId: id,
      }),
    );
    return id;
  },

  updatePiece: (id, patch) => {
    set((state) => {
      const idx = state.pieces.findIndex((p) => p.id === id);
      if (idx === -1) return {};
      const next = [...state.pieces];
      next[idx] = { ...next[idx], ...patch } as Piece;
      return withHistory(state, { pieces: next });
    });
  },

  duplicatePiece: (id) => {
    const orig = get().pieces.find((p) => p.id === id);
    if (!orig) return null;
    const profile = getProfile(orig.profileId);
    const offset = profile ? Math.max(profile.width, profile.height) + 50 : 100;
    const newId = uuid();
    const copy: Piece = {
      ...orig,
      id: newId,
      position: [
        orig.position[0] + offset,
        orig.position[1],
        orig.position[2],
      ],
    };
    set((state) =>
      withHistory(state, {
        pieces: [...state.pieces, copy],
        selectedId: newId,
      }),
    );
    return newId;
  },

  removePiece: (id) => {
    set((state) =>
      withHistory(state, {
        pieces: state.pieces.filter((p) => p.id !== id),
        joints: state.joints.filter(
          (j) => !(j.connects && (j.connects[0] === id || j.connects[1] === id)),
        ),
        selectedId: state.selectedId === id ? null : state.selectedId,
        surfaceWarning:
          state.surfaceWarning?.pieceId === id ? null : state.surfaceWarning,
        attachPicking:
          state.attachPicking?.pieceId === id ? null : state.attachPicking,
      }),
    );
  },

  cloneArrayPiece: (id, { count, axis, spacing }) => {
    const orig = get().pieces.find((p) => p.id === id);
    if (!orig) return [];
    const n = Math.max(0, Math.min(50, Math.floor(count)));
    if (n === 0) return [];
    const sign = axis.endsWith('+') ? 1 : -1;
    const axisIdx = axis.startsWith('x') ? 0 : axis.startsWith('y') ? 1 : 2;
    const newIds: string[] = [];
    const clones: Piece[] = [];
    for (let i = 1; i <= n; i++) {
      const pos = [...orig.position] as Vec3;
      pos[axisIdx] += sign * spacing * i;
      const newId = uuid();
      newIds.push(newId);
      clones.push({
        ...orig,
        id: newId,
        position: pos,
      });
    }
    set((state) =>
      withHistory(state, {
        pieces: [...state.pieces, ...clones],
        selectedId: newIds[newIds.length - 1] ?? state.selectedId,
      }),
    );
    return newIds;
  },

  addJoint: (typeId, position, connects) => {
    const type = getJointType(typeId);
    if (!type) return '';
    const id = uuid();
    const joint: Joint = {
      id,
      typeId,
      position: position ?? [0, 0, 0],
      rotation: [0, 0, 0],
      connects,
    };
    set((state) =>
      withHistory(state, { joints: [...state.joints, joint] }),
    );
    return id;
  },

  updateJoint: (id, patch) => {
    set((state) => {
      const idx = state.joints.findIndex((j) => j.id === id);
      if (idx === -1) return {};
      const next = [...state.joints];
      next[idx] = { ...next[idx], ...patch } as Joint;
      return withHistory(state, { joints: next });
    });
  },

  removeJoint: (id) => {
    set((state) =>
      withHistory(state, {
        joints: state.joints.filter((j) => j.id !== id),
        selectedId: state.selectedId === id ? null : state.selectedId,
        holeAttach:
          state.holeAttach?.sourceJointId === id ? null : state.holeAttach,
        screwWarning:
          state.screwWarning?.jointId === id ? null : state.screwWarning,
      }),
    );
  },

  addJointBetweenSelected: (typeId, otherPieceId) => {
    const state = get();
    const a = state.pieces.find((p) => p.id === state.selectedId);
    if (!a) return null;
    if (otherPieceId) {
      const b = state.pieces.find((p) => p.id === otherPieceId);
      if (b) {
        return get().addJoint(typeId, midpoint(a.position, b.position), [a.id, b.id]);
      }
    }
    // Bez druhého prvku umístíme spojku jen k vybranému prvku
    return get().addJoint(typeId, [...a.position] as Vec3, [a.id]);
  },

  undo: () => {
    set((state) => {
      if (state.past.length === 0) return {};
      const previous = state.past[state.past.length - 1];
      const current = snapshotOf(state);
      return {
        pieces: previous.pieces,
        joints: previous.joints,
        past: state.past.slice(0, -1),
        future: [current, ...state.future].slice(0, HISTORY_LIMIT),
        selectedId: previous.pieces.some((p) => p.id === state.selectedId)
          ? state.selectedId
          : null,
        screwWarning: null,
      };
    });
  },

  redo: () => {
    set((state) => {
      if (state.future.length === 0) return {};
      const next = state.future[0];
      const current = snapshotOf(state);
      return {
        pieces: next.pieces,
        joints: next.joints,
        past: [...state.past, current].slice(-HISTORY_LIMIT),
        future: state.future.slice(1),
        selectedId: next.pieces.some((p) => p.id === state.selectedId)
          ? state.selectedId
          : null,
        screwWarning: null,
      };
    });
  },

  reset: () => {
    set(() => ({ ...initialState, past: [], future: [] }));
  },

  loadSnapshot: (snapshot, name) => {
    set(() => ({
      ...initialState,
      pieces: snapshot.pieces,
      joints: snapshot.joints,
      projectName: name ?? 'Načtený projekt',
    }));
  },

  getSnapshot: () => snapshotOf(get()),

  checkPieceBelowSurface: (pieceId) => {
    const piece = get().pieces.find((p) => p.id === pieceId);
    if (!piece) return;
    const depth = pieceBelowSurfaceBy(piece);
    if (depth > BELOW_SURFACE_THRESHOLD) {
      set({ surfaceWarning: { pieceId, depth } });
    } else {
      const cur = get().surfaceWarning;
      if (cur && cur.pieceId === pieceId) {
        set({ surfaceWarning: null });
      }
    }
  },

  liftPieceToSurface: (pieceId) => {
    set((state) => {
      const idx = state.pieces.findIndex((p) => p.id === pieceId);
      if (idx === -1) return { surfaceWarning: null };
      const piece = state.pieces[idx];
      const depth = pieceBelowSurfaceBy(piece);
      if (depth <= 0) return { surfaceWarning: null };
      const nextPiece = {
        ...piece,
        position: [
          piece.position[0],
          piece.position[1] + depth,
          piece.position[2],
        ] as Vec3,
      };
      const pieces = [...state.pieces];
      pieces[idx] = nextPiece;
      return withHistory(state, {
        pieces,
        surfaceWarning: null,
      });
    });
  },

  dismissSurfaceWarning: () => set({ surfaceWarning: null }),

  startAttachPicking: (pieceId, anchor) => {
    set({ attachPicking: { pieceId, anchor }, holeAttach: null });
  },

  cancelAttachPicking: () => {
    set({ attachPicking: null });
  },

  applyAttachAtPoint: (targetPieceId, targetWorld) => {
    const state = get();
    const picking = state.attachPicking;
    if (!picking) return;
    const source = state.pieces.find((p) => p.id === picking.pieceId);
    if (!source) {
      set({ attachPicking: null });
      return;
    }
    // Zdrojový bod kotvy ve world
    const srcAnchorWorld = worldAnchorPosition(source, picking.anchor);
    if (!srcAnchorWorld) {
      set({ attachPicking: null });
      return;
    }
    // Cílový bod – pokud je cílem prvek, vezmeme jeho nejbližší kotvu, jinak přímo klik.
    let target: Vec3 = targetWorld;
    if (targetPieceId && targetPieceId !== source.id) {
      const targetPiece = state.pieces.find((p) => p.id === targetPieceId);
      if (targetPiece) {
        const closest = closestAnchorOfPiece(targetPiece, targetWorld);
        if (closest) target = closest.position;
      }
    }
    const delta: Vec3 = [
      target[0] - srcAnchorWorld[0],
      target[1] - srcAnchorWorld[1],
      target[2] - srcAnchorWorld[2],
    ];
    set((s) => {
      const idx = s.pieces.findIndex((p) => p.id === source.id);
      if (idx === -1) return { attachPicking: null };
      const next = [...s.pieces];
      next[idx] = {
        ...next[idx],
        position: [
          next[idx].position[0] + delta[0],
          next[idx].position[1] + delta[1],
          next[idx].position[2] + delta[2],
        ] as Vec3,
      };
      return withHistory(s, { pieces: next, attachPicking: null });
    });
  },

  startHoleAttach: (sourceJointId) => {
    set({ holeAttach: { sourceJointId }, attachPicking: null });
  },

  cancelHoleAttach: () => {
    set({ holeAttach: null });
  },

  snapJointToHole: (targetJointId, holeIndex) => {
    const state = get();
    const ha = state.holeAttach;
    if (!ha) return;
    const target = state.joints.find((j) => j.id === targetJointId);
    if (!target || ha.sourceJointId === targetJointId) {
      set({ holeAttach: null });
      return;
    }
    const targetType = getJointType(target.typeId);
    if (!targetType) {
      set({ holeAttach: null });
      return;
    }
    const holes = getHoles(targetType);
    const hole = holes[holeIndex];
    if (!hole) {
      set({ holeAttach: null });
      return;
    }

    // World pozice a normála díry s ohledem na rotaci cílové spojky.
    const targetEuler = new THREE.Euler(
      THREE.MathUtils.degToRad(target.rotation[0]),
      THREE.MathUtils.degToRad(target.rotation[1]),
      THREE.MathUtils.degToRad(target.rotation[2]),
      'XYZ',
    );
    const m = new THREE.Matrix4().makeRotationFromEuler(targetEuler);
    const localPos = new THREE.Vector3(
      hole.position[0],
      hole.position[1],
      hole.position[2],
    );
    const worldPos = localPos.clone().applyMatrix4(m);
    worldPos.x += target.position[0];
    worldPos.y += target.position[1];
    worldPos.z += target.position[2];

    const localN = new THREE.Vector3(
      hole.normal[0],
      hole.normal[1],
      hole.normal[2],
    );
    const worldN = localN.clone().applyMatrix4(m).normalize();

    get().snapJointAtWorldPoint(
      [worldPos.x, worldPos.y, worldPos.z],
      [worldN.x, worldN.y, worldN.z],
      target.id,
    );
  },

  snapJointAtWorldPoint: (worldPos, worldNormal, connectId) => {
    const state = get();
    const ha = state.holeAttach;
    if (!ha) return;
    const screw = state.joints.find((j) => j.id === ha.sourceJointId);
    if (!screw) {
      set({ holeAttach: null });
      return;
    }
    const screwType = getJointType(screw.typeId);
    if (!screwType) {
      set({ holeAttach: null });
      return;
    }

    const worldN = new THREE.Vector3(
      worldNormal[0],
      worldNormal[1],
      worldNormal[2],
    ).normalize();
    if (worldN.lengthSq() < 1e-8) {
      set({ holeAttach: null });
      return;
    }

    // Rotace: lokální osa vrutu (+Z) -> worldN
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      worldN,
    );
    const e = new THREE.Euler().setFromQuaternion(q, 'XYZ');
    const newRotation: Vec3 = [
      THREE.MathUtils.radToDeg(e.x),
      THREE.MathUtils.radToDeg(e.y),
      THREE.MathUtils.radToDeg(e.z),
    ];

    // Hlava vrutu sedí ve worldPos, dřík směřuje proti normále (dovnitř materiálu).
    const half = screwType.length / 2;
    const newPosition: Vec3 = [
      worldPos[0] - half * worldN.x,
      worldPos[1] - half * worldN.y,
      worldPos[2] - half * worldN.z,
    ];

    // Vyhodnocení, jestli vrut vyleze ven.
    const axis: Vec3 = [-worldN.x, -worldN.y, -worldN.z];
    const fit = evaluateScrewFit(worldPos, axis, screwType.length, state.pieces);
    const screwWarning: ScrewWarning | null = SCREW_LIKE_CATEGORIES.has(
      screwType.category,
    )
      ? fit.protrusion > 0.5
        ? {
            jointId: screw.id,
            protrusion: fit.protrusion,
            availableDepth: fit.availableDepth,
            suggestedTypeId: findShorterScrewType(
              screw.typeId,
              fit.availableDepth,
            ),
          }
        : null
      : null;

    set((s) => {
      const idx = s.joints.findIndex((j) => j.id === screw.id);
      if (idx === -1) return { holeAttach: null };
      const next = [...s.joints];
      next[idx] = {
        ...next[idx],
        position: newPosition,
        rotation: newRotation,
        connects: connectId ? [connectId] : next[idx].connects,
      };
      return withHistory(s, {
        joints: next,
        holeAttach: null,
        screwWarning,
      });
    });
  },

  dismissScrewWarning: () => set({ screwWarning: null }),

  swapScrewToFit: () => {
    const state = get();
    const warning = state.screwWarning;
    if (!warning || !warning.suggestedTypeId) return;
    const screw = state.joints.find((j) => j.id === warning.jointId);
    if (!screw) {
      set({ screwWarning: null });
      return;
    }
    const oldType = getJointType(screw.typeId);
    const newType = getJointType(warning.suggestedTypeId);
    if (!oldType || !newType) {
      set({ screwWarning: null });
      return;
    }
    // Vrut udržíme hlavou na stejném místě – stačí posunout těžiště podle rozdílu délek.
    // head_world = center + (L/2) * axis  ⇒  newCenter = oldCenter + (Lold - Lnew)/2 * axis
    const shift = (oldType.length - newType.length) / 2;
    const eul = new THREE.Euler(
      THREE.MathUtils.degToRad(screw.rotation[0]),
      THREE.MathUtils.degToRad(screw.rotation[1]),
      THREE.MathUtils.degToRad(screw.rotation[2]),
      'XYZ',
    );
    // Osa vrutu (+Z v lokále) ve world space směřuje od dříku k hlavě.
    const axisVec = new THREE.Vector3(0, 0, 1).applyEuler(eul);
    const newPosition: Vec3 = [
      screw.position[0] + axisVec.x * shift,
      screw.position[1] + axisVec.y * shift,
      screw.position[2] + axisVec.z * shift,
    ];
    set((s) => {
      const idx = s.joints.findIndex((j) => j.id === warning.jointId);
      if (idx === -1) return { screwWarning: null };
      const next = [...s.joints];
      next[idx] = {
        ...next[idx],
        typeId: newType.id,
        position: newPosition,
      };
      return withHistory(s, { joints: next, screwWarning: null });
    });
  },

  magnetSnapPiece: (pieceId) => {
    const state = get();
    if (!state.magnetEnabled) return;
    const piece = state.pieces.find((p) => p.id === pieceId);
    if (!piece) return;
    const others = state.pieces.filter((p) => p.id !== pieceId);
    const result = snapPieceToNeighbor(
      piece,
      others,
      state.angleSnap,
      state.overlapMode,
    );
    if (!result) return;
    // Aplikujeme přes withHistory, aby šel snap vrátit zpět.
    set((s) => {
      const idx = s.pieces.findIndex((p) => p.id === pieceId);
      if (idx === -1) return {};
      const next = [...s.pieces];
      next[idx] = {
        ...next[idx],
        position: result.position,
        rotation: result.rotation,
      };
      return withHistory(s, { pieces: next });
    });
  },

  magnetSnapJoint: (jointId) => {
    const state = get();
    if (!state.magnetEnabled) return;
    const joint = state.joints.find((j) => j.id === jointId);
    if (!joint) return;
    const type = getJointType(joint.typeId);
    if (!type) return;
    // Šrouby/hřebíky/čepy/závity/hmoždinky řeší snap do díry, ne tvarový magnet.
    if (
      SCREW_LIKE_CATEGORIES.has(type.category) ||
      type.category === 'hmozdinka'
    )
      return;
    const result = snapJointToPiece(joint, type, state.pieces);
    if (!result) return;
    set((s) => {
      const idx = s.joints.findIndex((j) => j.id === jointId);
      if (idx === -1) return {};
      const next = [...s.joints];
      const existing = next[idx];
      // Doplníme connects o cílový prvek, aby ho pak skupinová logika (link) zachytila.
      let connects = existing.connects;
      if (!connects || !connects.includes(result.connectId)) {
        const first = result.connectId;
        const second = connects && connects[0] && connects[0] !== first
          ? connects[0]
          : undefined;
        connects = second ? [first, second] : [first];
      }
      next[idx] = {
        ...existing,
        position: result.position,
        rotation: result.rotation,
        connects,
      };
      return withHistory(s, { joints: next });
    });
  },
}));
