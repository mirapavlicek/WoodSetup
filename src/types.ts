export type Vec2 = [number, number];
export type Vec3 = [number, number, number];

/** 4 rohy pracovní plochy ve formátu [X, Z] (mm). Pořadí by mělo být CW nebo CCW kolem polygonu. */
export type GroundCorners = [Vec2, Vec2, Vec2, Vec2];

/**
 * Kotvící bod prvku v lokálním prostoru.
 * Každá hodnota je z {-1, 0, 1}; (0,0,0) = střed.
 * -1 = záporná strana osy, +1 = kladná, 0 = střed.
 */
export type Anchor = [number, number, number];

export type Material = 'wood' | 'metal' | 'aluminum';

export type LumberCategory =
  | 'hranol'
  | 'prkno'
  | 'lat'
  | 'jekl'
  | 'trubka'
  | 'deska'
  | 'lprofil'
  | 'uprofil';

export type LumberProfile = {
  id: string;
  name: string;
  category: LumberCategory;
  material: Material;
  /** šířka v mm (X osa) */
  width: number;
  /** výška v mm (Y osa – tloušťka při položení na plocho) */
  height: number;
  /** výchozí délka při vložení v mm (Z osa) */
  defaultLength: number;
  /** barva ve scéně */
  color: string;
  description?: string;
};

export type JointCategory =
  | 'vrut'
  | 'uhelnik'
  | 'plotna'
  | 'cep'
  | 'zavit'
  | 'hrebik'
  | 'hmozdinka'
  | 'botka'
  | 'patka'
  | 'spona'
  | 'vaznikova-deska';

export type JointType = {
  id: string;
  name: string;
  category: JointCategory;
  material: Material;
  /** délka spojky v mm */
  length: number;
  /** průměr/tloušťka v mm */
  size: number;
  color: string;
  description?: string;
};

export type Piece = {
  id: string;
  profileId: string;
  /** Vlastní délka prvku v mm – přepisuje defaultLength */
  length: number;
  position: Vec3;
  /** Rotace ve stupních */
  rotation: Vec3;
  /** Volitelné přepsání barvy z profilu */
  color?: string;
  /** Volitelné označení (např. „noha A"). */
  label?: string;
};

export type Joint = {
  id: string;
  typeId: string;
  position: Vec3;
  rotation: Vec3;
  /** Volitelné ID prvků, které spojka spojuje (pro cut list). */
  connects?: [string, string?];
  label?: string;
};

export type Units = 'mm' | 'cm';

export type DesignSnapshot = {
  pieces: Piece[];
  joints: Joint[];
};

export type SavedProject = {
  id: string;
  name: string;
  savedAt: number;
  data: DesignSnapshot;
};
