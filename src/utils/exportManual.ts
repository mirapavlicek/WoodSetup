import * as THREE from 'three';
import type { DesignSnapshot, Joint, Piece } from '../types';
import { getProfile } from '../data/lumber';
import { getJointType } from '../data/joints';
import { downloadBlob } from './export';
import { buildJointGroup, buildPieceMesh } from './sceneBuilder';

const PAGE_W = 1240;
const PADDING = 40;
const HEADER_H = 180;
const SECTION_GAP = 28;
const COLS = 3;
const STEP_SIZE = 360;
const CARD_W = (PAGE_W - PADDING * (COLS + 1)) / COLS;
const CARD_H = CARD_W + 86;

// Palette inspired by the rest of the app (wood + stone + accent)
const COLOR_BG = '#fffaf2';
const COLOR_INK = '#1c1917';
const COLOR_MUTED = '#57534e';
const COLOR_ACCENT = '#a16207';
const COLOR_HIGHLIGHT = '#dc2626';
const COLOR_DIM = '#cfcbc4';
const COLOR_CARD_BG = '#fff';
const COLOR_CARD_BORDER = '#e7e5e4';
const COLOR_TABLE_HEAD = '#fde8c4';
const COLOR_TABLE_ROW_ALT = '#fef9ee';

type StepInfo = {
  number: number;
  title: string;
  desc: string[];
  image: HTMLCanvasElement;
};

function sanitizeFile(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase() || 'projekt'
  );
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const words = text.split(' ');
  let line = '';
  let lines = 0;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = w;
      y += lineHeight;
      lines++;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, y);
    lines++;
  }
  return lines;
}

function formatDims(width: number, height: number, length: number): string {
  return `${width}×${height}×${length} mm`;
}

function pieceKey(p: Piece): string {
  return `${p.profileId}__${p.length}`;
}

function jointKey(j: Joint): string {
  return j.typeId;
}

type CutRow = {
  profileName: string;
  width: number;
  height: number;
  length: number;
  count: number;
  totalLengthMM: number;
  material: string;
};

function aggregatePieces(snapshot: DesignSnapshot): CutRow[] {
  const byKey = new Map<string, CutRow>();
  for (const p of snapshot.pieces) {
    const profile = getProfile(p.profileId);
    if (!profile) continue;
    const k = pieceKey(p);
    const existing = byKey.get(k);
    if (existing) {
      existing.count++;
      existing.totalLengthMM += p.length;
    } else {
      byKey.set(k, {
        profileName: profile.name,
        width: profile.width,
        height: profile.height,
        length: p.length,
        count: 1,
        totalLengthMM: p.length,
        material: profile.material,
      });
    }
  }
  return Array.from(byKey.values()).sort((a, b) =>
    a.profileName.localeCompare(b.profileName, 'cs'),
  );
}

type JointRow = {
  name: string;
  count: number;
  material: string;
};

function aggregateJoints(snapshot: DesignSnapshot): JointRow[] {
  const byKey = new Map<string, JointRow>();
  for (const j of snapshot.joints) {
    const type = getJointType(j.typeId);
    if (!type) continue;
    const k = jointKey(j);
    const existing = byKey.get(k);
    if (existing) {
      existing.count++;
    } else {
      byKey.set(k, {
        name: type.name,
        count: 1,
        material: type.material,
      });
    }
  }
  return Array.from(byKey.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'cs'),
  );
}

/** Assigns a colored standard material based on highlight flag. */
function styleMesh(
  obj: THREE.Object3D,
  baseColor: string,
  highlight: boolean,
  metallic: boolean,
) {
  obj.traverse((m) => {
    if (m instanceof THREE.Mesh) {
      m.material = new THREE.MeshStandardMaterial({
        color: highlight ? COLOR_HIGHLIGHT : baseColor,
        roughness: metallic ? 0.35 : 0.8,
        metalness: metallic ? 0.7 : 0.1,
      });
      m.castShadow = false;
      m.receiveShadow = false;
    }
  });
}

/** Setup a fresh three.js scene with the given accumulated state. */
function buildStepScene(
  allPieces: Piece[],
  allJoints: Joint[],
  highlightId: string,
  bbox: THREE.Box3,
): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLOR_BG);

  scene.add(new THREE.AmbientLight(0xffffff, 0.65));
  const sun = new THREE.DirectionalLight(0xffffff, 0.85);
  sun.position.set(1, 1.7, 1);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xffffff, 0.25);
  fill.position.set(-1, 0.5, -0.4);
  scene.add(fill);

  // Soft floor reference
  const size = bbox.getSize(new THREE.Vector3());
  const center = bbox.getCenter(new THREE.Vector3());
  const floorMat = new THREE.MeshBasicMaterial({ color: '#efe8da' });
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(size.length() * 1.8, size.length() * 1.8),
    floorMat,
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(center.x, bbox.min.y - 2, center.z);
  scene.add(floor);

  for (const p of allPieces) {
    const mesh = buildPieceMesh(p);
    if (!mesh) continue;
    const profile = getProfile(p.profileId);
    const baseColor = p.color ?? profile?.color ?? '#b88a4a';
    const metallic =
      profile?.material === 'metal' || profile?.material === 'aluminum';
    const isHighlight = p.id === highlightId;
    styleMesh(mesh, isHighlight ? baseColor : dim(baseColor), isHighlight, metallic);
    if (isHighlight) addOutline(mesh, p);
    scene.add(mesh);
  }
  for (const j of allJoints) {
    const group = buildJointGroup(j);
    if (!group) continue;
    const type = getJointType(j.typeId);
    const baseColor = type?.color ?? '#bdbdbd';
    const metallic = type?.material === 'metal';
    const isHighlight = j.id === highlightId;
    styleMesh(
      group,
      isHighlight ? baseColor : dim(baseColor),
      isHighlight,
      metallic,
    );
    scene.add(group);
  }
  return scene;
}

/** Snižuje saturaci a jas barvy pro „šedý" stav už postavených dílů. */
function dim(hex: string): string {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  hsl.s *= 0.3;
  hsl.l = 0.7 + hsl.l * 0.1;
  c.setHSL(hsl.h, hsl.s, Math.min(hsl.l, 0.85));
  return '#' + c.getHexString();
}

/** Přidá výrazný drátový obrys nového dílu (čitelnější v IKEA stylu). */
function addOutline(mesh: THREE.Mesh, piece: Piece) {
  const profile = getProfile(piece.profileId);
  if (!profile) return;
  const out = new THREE.LineSegments(
    new THREE.EdgesGeometry(
      new THREE.BoxGeometry(
        profile.width + 4,
        profile.height + 4,
        piece.length + 4,
      ),
    ),
    new THREE.LineBasicMaterial({ color: COLOR_HIGHLIGHT, linewidth: 2 }),
  );
  mesh.add(out);
}

function computeBoundingBox(
  pieces: Piece[],
  joints: Joint[],
): THREE.Box3 | null {
  const tmp = new THREE.Scene();
  for (const p of pieces) {
    const m = buildPieceMesh(p);
    if (m) tmp.add(m);
  }
  for (const j of joints) {
    const g = buildJointGroup(j);
    if (g) tmp.add(g);
  }
  tmp.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(tmp);
  if (!isFinite(box.min.x)) return null;
  return box;
}

function setupCamera(
  bbox: THREE.Box3,
  aspect: number,
): THREE.PerspectiveCamera {
  const size = bbox.getSize(new THREE.Vector3());
  const center = bbox.getCenter(new THREE.Vector3());
  const radius = Math.max(size.length() / 2, 50);
  const fov = 30;
  const dist = (radius / Math.sin((fov * Math.PI) / 180 / 2)) * 1.15;
  const cam = new THREE.PerspectiveCamera(fov, aspect, 1, dist * 10);
  // mírně shora, isometric-ish
  cam.position.set(
    center.x + dist * 0.75,
    center.y + dist * 0.55,
    center.z + dist * 0.75,
  );
  cam.lookAt(center);
  return cam;
}

/**
 * Vyrendruje sérii kroků: každý prvek a každou spojku jako jeden krok.
 * Vrací pole „karet" pro layout.
 */
function renderSteps(snapshot: DesignSnapshot): StepInfo[] {
  if (snapshot.pieces.length === 0 && snapshot.joints.length === 0) return [];

  const bbox = computeBoundingBox(snapshot.pieces, snapshot.joints);
  if (!bbox) return [];
  // Trochu nafoukneme box, ať díly nesedí přesně u okraje obrazu.
  bbox.expandByScalar(40);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(STEP_SIZE, STEP_SIZE);
  renderer.setPixelRatio(2);
  renderer.setClearColor(COLOR_BG, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const camera = setupCamera(bbox, 1);

  const steps: StepInfo[] = [];
  let stepNum = 0;

  for (let i = 0; i < snapshot.pieces.length; i++) {
    stepNum++;
    const piece = snapshot.pieces[i];
    const profile = getProfile(piece.profileId);
    const scene = buildStepScene(
      snapshot.pieces.slice(0, i + 1),
      [],
      piece.id,
      bbox,
    );
    renderer.render(scene, camera);
    const c = document.createElement('canvas');
    c.width = STEP_SIZE;
    c.height = STEP_SIZE;
    c.getContext('2d')!.drawImage(renderer.domElement, 0, 0, STEP_SIZE, STEP_SIZE);
    const titleParts = [
      `${profile?.name ?? 'Prvek'}`,
      piece.label ? `„${piece.label}"` : '',
    ]
      .filter(Boolean)
      .join(' ');
    const desc: string[] = [];
    if (profile)
      desc.push(`Rozměr: ${formatDims(profile.width, profile.height, piece.length)}`);
    const matLabel =
      profile?.material === 'metal'
        ? 'kov'
        : profile?.material === 'aluminum'
          ? 'hliník'
          : profile?.material === 'concrete'
            ? 'beton'
            : 'dřevo';
    desc.push(`Materiál: ${matLabel}`);
    steps.push({
      number: stepNum,
      title: titleParts,
      desc,
      image: c,
    });
  }

  for (let i = 0; i < snapshot.joints.length; i++) {
    stepNum++;
    const j = snapshot.joints[i];
    const type = getJointType(j.typeId);
    const scene = buildStepScene(
      snapshot.pieces,
      snapshot.joints.slice(0, i + 1),
      j.id,
      bbox,
    );
    renderer.render(scene, camera);
    const c = document.createElement('canvas');
    c.width = STEP_SIZE;
    c.height = STEP_SIZE;
    c.getContext('2d')!.drawImage(renderer.domElement, 0, 0, STEP_SIZE, STEP_SIZE);
    const desc: string[] = [];
    if (type) {
      desc.push(`Typ: ${type.name}`);
      desc.push(`Rozměr: ${type.length}×Ø${type.size} mm`);
    }
    steps.push({
      number: stepNum,
      title: type?.name ?? 'Spojka',
      desc,
      image: c,
    });
  }

  renderer.dispose();
  return steps;
}

function paintHeader(
  ctx: CanvasRenderingContext2D,
  name: string,
  stats: string,
) {
  ctx.fillStyle = COLOR_ACCENT;
  ctx.fillRect(0, 0, PAGE_W, 8);

  ctx.fillStyle = COLOR_INK;
  ctx.font = '600 14px sans-serif';
  ctx.fillText('NÁVOD NA STAVBU · WoodSetup', PADDING, 50);

  ctx.font = '700 38px sans-serif';
  ctx.fillStyle = COLOR_ACCENT;
  ctx.fillText(name, PADDING, 95);

  ctx.font = '14px sans-serif';
  ctx.fillStyle = COLOR_MUTED;
  ctx.fillText(stats, PADDING, 122);
  ctx.fillText(new Date().toLocaleDateString('cs-CZ'), PADDING, 144);

  // dělící čára
  ctx.strokeStyle = COLOR_CARD_BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PADDING, HEADER_H - 10);
  ctx.lineTo(PAGE_W - PADDING, HEADER_H - 10);
  ctx.stroke();
}

function paintTableHeader(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cols: { label: string; width: number }[],
) {
  const totalW = cols.reduce((a, c) => a + c.width, 0);
  ctx.fillStyle = COLOR_TABLE_HEAD;
  ctx.fillRect(x, y, totalW, 28);
  ctx.fillStyle = COLOR_INK;
  ctx.font = '600 12px sans-serif';
  let cx = x + 12;
  for (const col of cols) {
    ctx.fillText(col.label.toUpperCase(), cx, y + 19);
    cx += col.width;
  }
}

function paintTableRow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cols: { width: number; text: string; right?: boolean }[],
  rowIdx: number,
) {
  const totalW = cols.reduce((a, c) => a + c.width, 0);
  ctx.fillStyle = rowIdx % 2 === 0 ? '#ffffff' : COLOR_TABLE_ROW_ALT;
  ctx.fillRect(x, y, totalW, 26);
  ctx.fillStyle = COLOR_INK;
  ctx.font = '13px sans-serif';
  let cx = x + 12;
  for (const col of cols) {
    if (col.right) {
      ctx.textAlign = 'right';
      ctx.fillText(col.text, cx + col.width - 24, y + 18);
      ctx.textAlign = 'left';
    } else {
      ctx.fillText(col.text, cx, y + 18);
    }
    cx += col.width;
  }
}

function paintSection(
  ctx: CanvasRenderingContext2D,
  title: string,
  x: number,
  y: number,
): number {
  ctx.fillStyle = COLOR_ACCENT;
  ctx.font = '700 18px sans-serif';
  ctx.fillText(title, x, y + 14);
  return y + 28;
}

function paintCutList(
  ctx: CanvasRenderingContext2D,
  rows: CutRow[],
  startY: number,
): number {
  if (rows.length === 0) return startY;
  let y = paintSection(ctx, 'Materiál k nařezání', PADDING, startY);
  const cols = [
    { label: 'Profil', width: 320 },
    { label: 'Materiál', width: 130 },
    { label: 'Rozměr', width: 190 },
    { label: 'Délka kus', width: 130 },
    { label: 'Kusů', width: 80 },
    { label: 'Celkem délka', width: 310 },
  ];
  paintTableHeader(ctx, PADDING, y, cols);
  y += 28;
  rows.forEach((r, i) => {
    paintTableRow(
      ctx,
      PADDING,
      y,
      [
        { width: cols[0].width, text: r.profileName },
        { width: cols[1].width, text: r.material },
        { width: cols[2].width, text: `${r.width}×${r.height} mm` },
        { width: cols[3].width, text: `${r.length} mm` },
        { width: cols[4].width, text: `${r.count}×`, right: true },
        {
          width: cols[5].width,
          text: `${(r.totalLengthMM / 1000).toFixed(2)} m`,
          right: true,
        },
      ],
      i,
    );
    y += 26;
  });
  return y + SECTION_GAP;
}

function paintJointList(
  ctx: CanvasRenderingContext2D,
  rows: JointRow[],
  startY: number,
): number {
  if (rows.length === 0) return startY;
  let y = paintSection(ctx, 'Spojovací materiál', PADDING, startY);
  const cols = [
    { label: 'Typ', width: 560 },
    { label: 'Materiál', width: 200 },
    { label: 'Kusů', width: 400 },
  ];
  paintTableHeader(ctx, PADDING, y, cols);
  y += 28;
  rows.forEach((r, i) => {
    paintTableRow(
      ctx,
      PADDING,
      y,
      [
        { width: cols[0].width, text: r.name },
        { width: cols[1].width, text: r.material },
        { width: cols[2].width, text: `${r.count}×`, right: true },
      ],
      i,
    );
    y += 26;
  });
  return y + SECTION_GAP;
}

function paintStepsGrid(
  ctx: CanvasRenderingContext2D,
  steps: StepInfo[],
  startY: number,
): number {
  if (steps.length === 0) return startY;
  let y = paintSection(ctx, 'Postup montáže', PADDING, startY);
  const rows = Math.ceil(steps.length / COLS);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < COLS; c++) {
      const idx = r * COLS + c;
      if (idx >= steps.length) break;
      const step = steps[idx];
      const x = PADDING + c * (CARD_W + PADDING);
      paintStepCard(ctx, step, x, y);
    }
    y += CARD_H + 24;
  }
  return y;
}

function paintStepCard(
  ctx: CanvasRenderingContext2D,
  step: StepInfo,
  x: number,
  y: number,
) {
  // Card frame
  ctx.fillStyle = COLOR_CARD_BG;
  ctx.fillRect(x, y, CARD_W, CARD_H);
  ctx.strokeStyle = COLOR_CARD_BORDER;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, CARD_W - 1, CARD_H - 1);

  // Number badge
  ctx.fillStyle = COLOR_ACCENT;
  ctx.beginPath();
  ctx.arc(x + 26, y + 26, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = '700 16px sans-serif';
  ctx.fillText(String(step.number), x + 26, y + 32);
  ctx.textAlign = 'left';

  // Image
  const imgY = y + 50;
  const imgSize = CARD_W - 24;
  ctx.drawImage(step.image, x + 12, imgY, imgSize, imgSize);
  ctx.strokeStyle = COLOR_CARD_BORDER;
  ctx.strokeRect(x + 12 + 0.5, imgY + 0.5, imgSize - 1, imgSize - 1);

  // Title
  ctx.fillStyle = COLOR_INK;
  ctx.font = '700 14px sans-serif';
  const titleY = imgY + imgSize + 22;
  wrapText(ctx, step.title, x + 12, titleY, CARD_W - 24, 16);

  // Description lines
  ctx.fillStyle = COLOR_MUTED;
  ctx.font = '12px sans-serif';
  let dy = titleY + 18;
  for (const line of step.desc) {
    ctx.fillText(line, x + 12, dy);
    dy += 15;
  }
}

function paintFooter(ctx: CanvasRenderingContext2D, y: number) {
  ctx.strokeStyle = COLOR_CARD_BORDER;
  ctx.beginPath();
  ctx.moveTo(PADDING, y);
  ctx.lineTo(PAGE_W - PADDING, y);
  ctx.stroke();
  ctx.fillStyle = COLOR_MUTED;
  ctx.font = '11px sans-serif';
  ctx.fillText(
    'Vygenerováno aplikací WoodSetup · rozměry v mm, není-li uvedeno jinak.',
    PADDING,
    y + 22,
  );
}

/**
 * Vyrendruje IKEA-style návod na stavbu jako jeden vysoký PNG soubor.
 */
export async function exportManualPNG(
  snapshot: DesignSnapshot,
  name = 'projekt',
): Promise<void> {
  if (snapshot.pieces.length === 0 && snapshot.joints.length === 0) {
    alert('Projekt je prázdný – přidejte nejprve nějaký prvek.');
    return;
  }

  const cuts = aggregatePieces(snapshot);
  const jointRows = aggregateJoints(snapshot);
  const steps = renderSteps(snapshot);

  // Dynamický výpočet výšky stránky.
  const TABLE_ROW_H = 26;
  const CUT_H =
    cuts.length > 0 ? 28 + 28 + cuts.length * TABLE_ROW_H + SECTION_GAP : 0;
  const JOINT_H =
    jointRows.length > 0
      ? 28 + 28 + jointRows.length * TABLE_ROW_H + SECTION_GAP
      : 0;
  const stepsRows = Math.ceil(steps.length / COLS);
  const STEPS_H = steps.length > 0 ? 28 + stepsRows * (CARD_H + 24) : 0;
  const FOOTER_H = 60;
  const pageH = HEADER_H + CUT_H + JOINT_H + STEPS_H + FOOTER_H + PADDING;

  const page = document.createElement('canvas');
  page.width = PAGE_W;
  page.height = pageH;
  const ctx = page.getContext('2d');
  if (!ctx) {
    alert('Nepodařilo se vytvořit plátno pro tisk.');
    return;
  }

  ctx.fillStyle = COLOR_BG;
  ctx.fillRect(0, 0, PAGE_W, pageH);

  paintHeader(
    ctx,
    name,
    `${snapshot.pieces.length} prvků · ${snapshot.joints.length} spojek · ${cuts.length} typů profilů`,
  );

  let y = HEADER_H;
  y = paintCutList(ctx, cuts, y);
  y = paintJointList(ctx, jointRows, y);
  y = paintStepsGrid(ctx, steps, y);
  paintFooter(ctx, pageH - FOOTER_H);

  await new Promise<void>((resolve) => {
    page.toBlob((blob) => {
      if (blob) downloadBlob(blob, `${sanitizeFile(name)}-navod.png`);
      resolve();
    }, 'image/png');
  });
}
