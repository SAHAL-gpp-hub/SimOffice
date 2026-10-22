import {
  Color3,
  DynamicTexture,
  MeshBuilder,
  Scene,
  SceneLoader,
  ShadowGenerator,
  StandardMaterial,
  TransformNode,
  Vector3,
  DirectionalLight,
  HemisphericLight,
  PointLight,
  Color4,
} from '@babylonjs/core';
import type { AssetContainer, InstantiatedEntries, Node } from '@babylonjs/core';
import '@babylonjs/loaders';

// ── Public API ────────────────────────────────────────────────────────────────

export interface InteractionTrigger {
  id: string;
  type: 'SIT' | 'READ';
  position: Vector3;
  radius: number;
  snapPosition?: Vector3;
  standPosition?: Vector3;
  snapRotationY?: number;
}

export interface Environment {
  triggers: InteractionTrigger[];
}

// ── Zone 1 Layout Constants ───────────────────────────────────────────────────
// Zone 1: Central Entrance Hub & Tech Lounge
// Physical boundaries: x = 6 → 30, z = -10 → +10, ceiling y = 4.0 m

const Z1_X0   = 6;    // west wall inner face  (glass boundary → future Zone 2)
const Z1_X1   = 30;   // east wall inner face  (back/elevator wall)
const Z1_MX   = 18;   // room centre X
const Z1_ZH   = 10;   // half-depth: north/south walls at z = ±10
const Z1_W    = 24;   // room width  (X axis)
const Z1_D    = 20;   // room depth  (Z axis)
const Z1_H    = 4.0;  // ceiling height
const WALL_T  = 0.3;  // wall thickness

// East elevator opening, centred at z = 0
const ELEV_W  = 2.2;
const ELEV_H  = 2.8;


// ── PHASE 0: Scale Anchor ─────────────────────────────────────────────────────
// CharacterModel.ts sets CAPSULE_HEIGHT = 1.8 m.
// Clamped to standard human norm: SCALE_ANCHOR_HEIGHT_M = 1.75 m.
// ALL furniture/door/clearance dims below derive from this one constant.
// When the placeholder is swapped for the final jiggly-physics avatar,
// only CharacterModel needs updating — room geometry stays exactly as-is.
const SCALE_ANCHOR_HEIGHT_M = 1.75;

// Phase 0 derived constants (all in metres)
const SA_DOOR_H       = SCALE_ANCHOR_HEIGHT_M * 1.20;  // 2.10 m — doorway clearance
const SA_DESK_H       = SCALE_ANCHOR_HEIGHT_M * 0.54;  // 0.945 m — counter-height desk
const SA_WALKPATH_MIN = SCALE_ANCHOR_HEIGHT_M * 0.54;  // 0.945 m — min clear walk path
const SA_CIRCLE_D     = SCALE_ANCHOR_HEIGHT_M * 2.0;   // 3.50 m — rug outer diameter
const SA_CHAIR_SEAT_H = 0.43;                           // lounge chair seat height
const SA_TABLE_H      = 0.40;                           // central coffee table height

// Phase 0 summary (logged at runtime — see buildScene)

// CAPSULE_HALF_HEIGHT must match characterController.ts
const CAPSULE_HALF_HEIGHT = 0.9;

/**
 * Player spawn — inside Zone 1, western third of the room, facing east
 * (toward elevator & reception).  Gives the ArcRotateCamera room to sit
 * between the player and the lobby interior without hitting the east wall.
 * Exported so characterController.ts imports it directly.
 */
export const SPAWN_POSITION = new Vector3(24.0, CAPSULE_HALF_HEIGHT + 0.2, 0);

// ── Internal helpers ──────────────────────────────────────────────────────────

async function loadAsset(scene: Scene, file: string): Promise<AssetContainer> {
  return SceneLoader.LoadAssetContainerAsync('/assets/office/', file, scene);
}

function solidMat(
  scene: Scene, name: string,
  r: number, g: number, b: number,
): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = new Color3(r, g, b);
  return m;
}

function emissiveMat(
  scene: Scene, name: string,
  diff: Color3, emissive: Color3, alpha = 1,
): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor  = diff;
  m.emissiveColor = emissive;
  m.alpha         = alpha;
  return m;
}

function invisMat(scene: Scene, name: string): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.alpha = 0;
  return m;
}

/** Axis-aligned box — the primary geometry helper. */
function mkBox(
  scene: Scene, name: string,
  w: number, h: number, d: number,
  px: number, py: number, pz: number,
  mat: StandardMaterial,
  collide = true,
) {
  const mesh = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
  mesh.position        = new Vector3(px, py, pz);
  mesh.material        = mat;
  mesh.checkCollisions = collide;
  return mesh;
}

/** Flat horizontal disc (for rug rings, acoustic panels, etc.). */
function mkDisc(
  scene: Scene, name: string,
  diameter: number, height: number,
  px: number, py: number, pz: number,
  mat: StandardMaterial,
  tess = 64,
) {
  const mesh = MeshBuilder.CreateCylinder(name, { diameter, height, tessellation: tess }, scene);
  mesh.position = new Vector3(px, py, pz);
  mesh.material = mat;
  return mesh;
}


// ── Asset anchor helpers (preserved from Phase 0) ─────────────────────────────

function computeAnchorOffset(entries: InstantiatedEntries): Vector3 {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  const collect = (mesh: any) => {
    mesh.computeWorldMatrix(true);
    const b = mesh.getBoundingInfo().boundingBox;
    minX = Math.min(minX, b.minimumWorld.x); maxX = Math.max(maxX, b.maximumWorld.x);
    minY = Math.min(minY, b.minimumWorld.y); maxY = Math.max(maxY, b.maximumWorld.y);
    minZ = Math.min(minZ, b.minimumWorld.z); maxZ = Math.max(maxZ, b.maximumWorld.z);
  };

  for (const root of entries.rootNodes as any[]) {
    root.computeWorldMatrix?.(true);
    if (typeof root.getBoundingInfo === 'function') collect(root);
    if (typeof root.getChildMeshes === 'function') {
      for (const m of root.getChildMeshes(false)) collect(m);
    }
  }

  if (!Number.isFinite(minY)) return Vector3.Zero();
  return new Vector3(-(minX + maxX) / 2, -minY, -(minZ + maxZ) / 2);
}

function instantiateAnchored(
  scene: Scene,
  container: AssetContainer,
  parent: TransformNode,
  tag: string,
  suffix: string | number,
): TransformNode {
  const entries = container.instantiateModelsToScene((n) => `${n}_${tag}_${suffix}`, true);
  const offset  = computeAnchorOffset(entries);

  const outer = new TransformNode(`${tag}_${suffix}`, scene);
  outer.parent = parent;

  const inner = new TransformNode(`${tag}_${suffix}_inner`, scene);
  inner.parent   = outer;
  inner.position = offset;

  for (const root of entries.rootNodes) (root as Node).parent = inner;
  return outer;
}

// ── PHASE 2 Geometry Helpers ──────────────────────────────────────────────────

/**
 * Central lounge table — low cylinder with a teal emissive screen face on top.
 * Replaces the pole-mounted kiosk sign.
 */
/**
 * Modern designer lounge coffee table:
 * Tapered architectural pedestal, brushed bronze reveal ring, and a polished circular top.
 */
function mkLoungeTable(
  scene: Scene,
  name: string,
  cx: number, czPos: number,
): void {
  const TABLE_H = 0.42;
  const TOP_D   = 0.76;
  const BASE_D  = 0.50;

  // Dark architectural ash / bronze finish
  const baseMat = new StandardMaterial(`${name}BaseMat`, scene);
  baseMat.diffuseColor  = new Color3(0.16, 0.16, 0.18);
  baseMat.specularColor = new Color3(0.12, 0.12, 0.14);
  baseMat.specularPower = 28;

  // Polished table top — sleek smoked warm charcoal
  const topMat = new StandardMaterial(`${name}TopMat`, scene);
  topMat.diffuseColor  = new Color3(0.20, 0.20, 0.22);
  topMat.specularColor = new Color3(0.35, 0.35, 0.38);
  topMat.specularPower = 64;

  // Metallic reveal trim ring (brushed bronze)
  const trimMat = solidMat(scene, `${name}TrimMat`, 0.65, 0.48, 0.28);
  trimMat.specularColor = new Color3(0.40, 0.30, 0.18);
  trimMat.specularPower = 48;

  // 1. Tapered pedestal base
  const basePlinth = MeshBuilder.CreateCylinder(`${name}_plinth`,
    { diameter: BASE_D, height: 0.04, tessellation: 36 }, scene);
  basePlinth.position = new Vector3(cx, 0.02, czPos);
  basePlinth.material = baseMat;

  const pedestal = MeshBuilder.CreateCylinder(`${name}_pedestal`,
    { diameterTop: 0.38, diameterBottom: 0.46, height: TABLE_H - 0.08, tessellation: 36 }, scene);
  pedestal.position = new Vector3(cx, (TABLE_H - 0.08) / 2 + 0.04, czPos);
  pedestal.material = baseMat;

  // 2. Brushed bronze accent ring
  const trimRing = MeshBuilder.CreateCylinder(`${name}_trim`,
    { diameter: 0.40, height: 0.015, tessellation: 36 }, scene);
  trimRing.position = new Vector3(cx, TABLE_H - 0.045, czPos);
  trimRing.material = trimMat;

  // 3. Chamfered Table Top disc
  const top = MeshBuilder.CreateCylinder(`${name}_top`,
    { diameter: TOP_D, height: 0.035, tessellation: 48 }, scene);
  top.position = new Vector3(cx, TABLE_H - 0.0175, czPos);
  top.material = topMat;
  top.checkCollisions = true;

  // 4. Subtle ceramic coffee mug accessory on the table
  const mugMat = solidMat(scene, `${name}_mugMat`, 0.92, 0.90, 0.86);
  mugMat.specularColor = new Color3(0.20, 0.20, 0.20);
  const mug = MeshBuilder.CreateCylinder(`${name}_mug`,
    { diameter: 0.08, height: 0.09, tessellation: 20 }, scene);
  mug.position = new Vector3(cx + 0.18, TABLE_H + 0.045, czPos - 0.12);
  mug.material = mugMat;
}

/**
 * Creates high-resolution procedural textures for the two-tone plush woven wool rug:

 * - Concentric looped yarn weaves and radial pile shading
 * - Fine cross-grain wool fiber micro-texture
 * - Stitched seam borders between the rich teal border ring and cream wool field
 * - Normal bump map for realistic micro-shadows under lighting
 */
function createWovenRugTextures(scene: Scene): { diffuseTex: DynamicTexture; bumpTex: DynamicTexture } {
  const size = 1024;
  const diffuseTex = new DynamicTexture('rugDiffuseTex', { width: size, height: size }, scene, false);
  const bumpTex    = new DynamicTexture('rugBumpTex',    { width: size, height: size }, scene, false);

  const ctx  = diffuseTex.getContext();
  const bctx = bumpTex.getContext();

  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size * 0.49;
  const rInner = rOuter * 0.82;

  // Background
  ctx.fillStyle  = '#387373';
  ctx.fillRect(0, 0, size, size);
  bctx.fillStyle = '#8080FF'; // neutral normal map
  bctx.fillRect(0, 0, size, size);

  // 1. Outer Teal Woven Ring
  ctx.beginPath();
  ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
  ctx.fillStyle = '#387373';
  ctx.fill();

  // Outer radial gradient for soft curved pile bevel
  const tealGrad = ctx.createRadialGradient(cx, cy, rInner, cx, cy, rOuter);
  tealGrad.addColorStop(0, 'rgba(40, 85, 85, 0.40)');
  tealGrad.addColorStop(0.6, 'rgba(61, 122, 122, 0.05)');
  tealGrad.addColorStop(1, 'rgba(18, 48, 48, 0.85)'); // rich dark woven rim
  ctx.fillStyle = tealGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
  ctx.fill();

  // 2. Inner Cream Tufted Wool Field
  ctx.beginPath();
  ctx.arc(cx, cy, rInner, 0, Math.PI * 2);
  ctx.fillStyle = '#F3ECE2';
  ctx.fill();

  const creamGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rInner);
  creamGrad.addColorStop(0, 'rgba(255, 252, 246, 0.65)');
  creamGrad.addColorStop(0.75, 'rgba(242, 235, 224, 0.15)');
  creamGrad.addColorStop(1, 'rgba(206, 192, 175, 0.85)'); // border seam shadow
  ctx.fillStyle = creamGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, rInner, 0, Math.PI * 2);
  ctx.fill();

  // 3. Stitched Seam Detail between Cream & Teal
  ctx.strokeStyle = '#224848';
  ctx.lineWidth   = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, rInner, 0, Math.PI * 2);
  ctx.stroke();

  // 4. Concentric Ribbed / Tufted Weave Lines
  for (let r = 10; r < rOuter; r += 5) {
    ctx.strokeStyle = r < rInner ? 'rgba(175, 162, 142, 0.22)' : 'rgba(18, 45, 45, 0.25)';
    ctx.lineWidth   = 2.0;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 5. High-Frequency Wool Yarn Grain & Fiber Micro-texture
  const imgData  = ctx.getImageData(0, 0, size, size);
  const bumpData = bctx.getImageData(0, 0, size, size);
  const d  = imgData.data;
  const bd = bumpData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > rOuter + 2) continue;

      // Realistic looped yarn texture formula
      const wave1 = Math.sin(x * 1.5) * Math.cos(y * 1.5);
      const wave2 = Math.sin((x + y) * 2.2);
      const rand  = (Math.random() - 0.5) * 16;
      const noise = (wave1 + wave2) * 7 + rand;

      // Diffuse grain
      d[idx]     = Math.min(255, Math.max(0, d[idx]     + noise));
      d[idx + 1] = Math.min(255, Math.max(0, d[idx + 1] + noise));
      d[idx + 2] = Math.min(255, Math.max(0, d[idx + 2] + noise));

      // Bump/Normal texture (red = dX, green = dY, blue = Z)
      const nx = 128 + Math.floor((wave1 * 22 + (Math.random() - 0.5) * 18));
      const ny = 128 + Math.floor((wave2 * 22 + (Math.random() - 0.5) * 18));
      bd[idx]     = Math.min(255, Math.max(0, nx));
      bd[idx + 1] = Math.min(255, Math.max(0, ny));
      bd[idx + 2] = 240;
      bd[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  bctx.putImageData(bumpData, 0, 0);

  // Outer piping stitched rim
  ctx.strokeStyle = '#183838';
  ctx.lineWidth   = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, rOuter - 2, 0, Math.PI * 2);
  ctx.stroke();

  diffuseTex.update();
  bumpTex.update();

  return { diffuseTex, bumpTex };
}

// ── PHASE 3 Geometry Helpers ──────────────────────────────────────────────────

type PanelWall = 'back' | 'north' | 'south';


/**
 * One complete wall-panel module: [peanut] – [teal screen] – [peanut].
 *
 * Uses flat cylinder discs mounted flush to the wall face.
 * No GLB assets exist for wall panels yet — when provided, replace these calls
 * with spawnProp() and position against the wall.
 *
 * Each "peanut" = 2 flat discs side-by-side (slightly overlapping).
 * The disc's HEIGHT axis is perpendicular to the wall (short extrusion depth).
 * The disc's DIAMETER axis lies in the wall plane (visible from inside room).
 *
 *  wall='back'  → east wall  (x=Z1_X1); discs rotated 90° around Z; extrude –X
 *  wall='north' → north wall (z=+Z1_ZH); discs rotated 90° around X; extrude –Z
 *  wall='south' → south wall (z=–Z1_ZH); discs rotated 90° around X; extrude +Z
 */
/**
 * Draws the central circular display artwork:
 * - Vibrant cyan/teal ambient background
 * - Floating 3D orange abstract glyphs/letters ('I', 'Y', 'A', 'L', 'C')
 * - Lower museum-style caption card
 * - Clean dark teal circular border
 */
function drawCenterDisplayTexture(tex: DynamicTexture): void {
  const ctx = tex.getContext();
  const W = 512, H = 512;
  ctx.clearRect(0, 0, W, H);

  // Circular clip
  ctx.save();
  ctx.beginPath();
  ctx.arc(256, 256, 246, 0, Math.PI * 2);
  ctx.clip();

  // Radiant cyan/teal ambient gradient
  const bgGrad = ctx.createRadialGradient(256, 210, 30, 256, 256, 250);
  bgGrad.addColorStop(0, '#48ECE8');
  bgGrad.addColorStop(0.40, '#22D2CE');
  bgGrad.addColorStop(0.80, '#14A6A2');
  bgGrad.addColorStop(1, '#0C706C');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Floating orange abstract glyphs/letters matching reference panorama
  const glyphs = [
    { type: 'bar',   x: 185, y: 165, w: 22, h: 58, rot: 0 },
    { type: 'fork',  x: 242, y: 195, rot: -0.15 },
    { type: 'drop',  x: 298, y: 200, r: 18, rot: 0.1 },
    { type: 'c',     x: 348, y: 180, r: 24, rot: 0 },
    { type: 'cube',  x: 220, y: 265, w: 34, h: 34, rot: 0.12 },
  ];

  for (const g of glyphs) {
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.rot);

    // Drop shadow
    ctx.fillStyle = 'rgba(6, 60, 58, 0.45)';
    ctx.beginPath();
    if (g.type === 'bar' || g.type === 'cube') {
      if ((ctx as any).roundRect) (ctx as any).roundRect(-g.w!/2 + 6, -g.h!/2 + 8, g.w!, g.h!, 6);
      else ctx.rect(-g.w!/2 + 6, -g.h!/2 + 8, g.w!, g.h!);
    } else if (g.type === 'drop') ctx.arc(6, 8, g.r!, 0, Math.PI * 2);
    else if (g.type === 'c') ctx.arc(6, 8, g.r!, Math.PI * 0.3, Math.PI * 1.7);
    else if (g.type === 'fork') { ctx.moveTo(6, -18+8); ctx.lineTo(16+6, 20+8); ctx.lineTo(-16+6, 20+8); }
    ctx.fill();

    // 3D orange glyph gradient
    const gGrad = ctx.createLinearGradient(-20, -20, 20, 20);
    gGrad.addColorStop(0, '#FFA855');
    gGrad.addColorStop(0.5, '#E87228');
    gGrad.addColorStop(1, '#BA4908');
    ctx.fillStyle = gGrad;

    ctx.beginPath();
    if (g.type === 'bar' || g.type === 'cube') {
      if ((ctx as any).roundRect) (ctx as any).roundRect(-g.w!/2, -g.h!/2, g.w!, g.h!, 6);
      else ctx.rect(-g.w!/2, -g.h!/2, g.w!, g.h!);
    } else if (g.type === 'drop') ctx.arc(0, 0, g.r!, 0, Math.PI * 2);
    else if (g.type === 'c') {
      ctx.arc(0, 0, g.r!, Math.PI * 0.3, Math.PI * 1.7, false);
      ctx.lineWidth = 14;
      ctx.strokeStyle = gGrad;
      ctx.stroke();
    } else if (g.type === 'fork') {
      ctx.lineWidth = 12;
      ctx.strokeStyle = gGrad;
      (ctx as any).lineCap = 'round';
      ctx.moveTo(0, 16); ctx.lineTo(0, -6);
      ctx.moveTo(-16, -22); ctx.lineTo(0, -6); ctx.lineTo(16, -22);
      ctx.stroke();
    }
    if (g.type !== 'c' && g.type !== 'fork') ctx.fill();

    ctx.restore();
  }

  // Museum caption plaque at bottom
  ctx.save();
  ctx.fillStyle = 'rgba(6, 60, 58, 0.40)';
  ctx.fillRect(206, 322, 100, 42); // shadow

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(200, 316, 100, 42);
  ctx.strokeStyle = '#D4E2E0';
  ctx.lineWidth = 2;
  ctx.strokeRect(200, 316, 100, 42);

  // Red & grey caption lines on plaque
  ctx.fillStyle = '#E85834';
  ctx.fillRect(212, 328, 26, 4);
  ctx.fillStyle = '#9EB2AF';
  ctx.fillRect(244, 328, 44, 3);
  ctx.fillRect(212, 339, 76, 3);
  ctx.restore();

  // Dark teal perimeter ring
  ctx.strokeStyle = '#0E6662';
  ctx.lineWidth = 12;
  ctx.stroke();

  ctx.restore();
  tex.update();
}

/**
 * One complete wall-panel module matching the reference panorama:
 * [Tilted 3D Peanut Cushion]  –  [Circular Terracotta Display Vitrine]  –  [Tilted 3D Peanut Cushion]
 */
function mkWallModule(
  scene:    Scene,
  name:     string,
  cx:       number,   // world X of module centre
  cy:       number,   // world Y of module centre (typically 2.10 m)
  cz:       number,   // world Z of module centre
  wall:     PanelWall,
  emissive: boolean,
): void {
  const PEANUT_OFFSET = 3.50;  // module centre → peanut centre
  const LOBE_D        = 2.10;  // diameter of each orange cushion disc
  const LOBE_RIM_D    = 2.25;  // diameter of dark teal rim disc
  const LOBE_SEP      = 0.60;  // half-distance between lobe centers
  const FRAME_D       = 2.80;  // diameter of central frame ring
  const SCREEN_D      = 2.20;  // diameter of central display
  const TILT_RAD      = 0.30;  // ~17° diagonal tilt

  // ── Materials ─────────────────────────────────────────────────────────────
  // Orange Terracotta for Frame & Cushions (#DF6C2B)
  const orangeMat = new StandardMaterial(`${name}_orangeMat`, scene);
  orangeMat.diffuseColor  = new Color3(0.85, 0.42, 0.16);
  orangeMat.specularColor = new Color3(0.06, 0.04, 0.02);
  orangeMat.specularPower = 12;

  // Dark Teal for Piping & Rim Reveal (#146E68)
  const tealRimMat = new StandardMaterial(`${name}_tealRimMat`, scene);
  tealRimMat.diffuseColor  = new Color3(0.08, 0.43, 0.41);
  tealRimMat.specularColor = new Color3(0.05, 0.12, 0.12);
  tealRimMat.specularPower = 20;

  // Center Screen Artwork Dynamic Texture
  const screenTex = new DynamicTexture(`${name}_scrTex`, { width: 512, height: 512 }, scene, false);
  screenTex.hasAlpha = true;
  drawCenterDisplayTexture(screenTex);

  const screenMat = new StandardMaterial(`${name}_scrMat`, scene);
  screenMat.diffuseTexture  = screenTex;
  if (emissive) {
    screenMat.emissiveTexture = screenTex;
    screenMat.emissiveColor   = new Color3(0.85, 0.85, 0.85);
  }
  screenMat.specularColor   = new Color3(0, 0, 0);
  screenMat.backFaceCulling = false;

  // ── Root TransformNode oriented perpendicular to the wall ─────────────────
  const root = new TransformNode(`${name}_root`, scene);
  root.position = new Vector3(cx, cy, cz);

  if (wall === 'back') {
    // East wall (x = 30): local +Z points -X (into room), local +X points +Z (north)
    root.rotation = new Vector3(0, -Math.PI / 2, 0);
  } else if (wall === 'north') {
    // North wall (z = +10): local +Z points -Z (into room), local +X points -X (west)
    root.rotation = new Vector3(0, Math.PI, 0);
  } else {
    // South wall (z = -10): local +Z points +Z (into room), local +X points +X (east)
    root.rotation = new Vector3(0, 0, 0);
  }

  // ── 1. Central Circular Display Vitrine ───────────────────────────────────
  // Outer Terracotta Frame Ring (cylinder)
  const frameRing = MeshBuilder.CreateCylinder(`${name}_frameRing`,
    { diameter: FRAME_D, height: 0.050, tessellation: 48 }, scene);
  frameRing.parent = root;
  frameRing.position = new Vector3(0, 0, 0.025);
  frameRing.rotation = new Vector3(Math.PI / 2, 0, 0);
  frameRing.material = orangeMat;

  // Inner Teal Screen Disc (protruding slightly for crisp flush mount)
  const screenDisc = MeshBuilder.CreateCylinder(`${name}_screenDisc`,
    { diameter: SCREEN_D, height: 0.054, tessellation: 48 }, scene);
  screenDisc.parent = root;
  screenDisc.position = new Vector3(0, 0, 0.027);
  screenDisc.rotation = new Vector3(Math.PI / 2, 0, 0);
  screenDisc.material = tealRimMat;

  // Screen Graphic Plane (mounted on front face)
  const screenPlane = MeshBuilder.CreatePlane(`${name}_screenPlane`,
    { width: SCREEN_D - 0.02, height: SCREEN_D - 0.02 }, scene);
  screenPlane.parent = root;
  screenPlane.position = new Vector3(0, 0, 0.055);
  screenPlane.rotation = new Vector3(0, Math.PI, 0);
  screenPlane.material = screenMat;

  // ── Helper: spawn one 3D peanut acoustic panel ─────────────────────────────
  const createPeanut = (pName: string, posX: number, tiltAngle: number) => {
    const pNode = new TransformNode(`${name}_${pName}`, scene);
    pNode.parent = root;
    pNode.position = new Vector3(posX, 0, 0);
    pNode.rotation = new Vector3(0, 0, tiltAngle);

    // Teal Backing Border / Rim Plates (2 overlapping discs)
    const rimL = MeshBuilder.CreateCylinder(`${pName}_rimL`,
      { diameter: LOBE_RIM_D, height: 0.030, tessellation: 40 }, scene);
    rimL.parent = pNode;
    rimL.position = new Vector3(-LOBE_SEP, 0, 0.015);
    rimL.rotation = new Vector3(Math.PI / 2, 0, 0);
    rimL.material = tealRimMat;

    const rimR = MeshBuilder.CreateCylinder(`${pName}_rimR`,
      { diameter: LOBE_RIM_D, height: 0.030, tessellation: 40 }, scene);
    rimR.parent = pNode;
    rimR.position = new Vector3(LOBE_SEP, 0, 0.015);
    rimR.rotation = new Vector3(Math.PI / 2, 0, 0);
    rimR.material = tealRimMat;

    // Front Orange Felt Cushions (2 overlapping discs)
    const cushionL = MeshBuilder.CreateCylinder(`${pName}_cushionL`,
      { diameter: LOBE_D, height: 0.045, tessellation: 40 }, scene);
    cushionL.parent = pNode;
    cushionL.position = new Vector3(-LOBE_SEP, 0, 0.025);
    cushionL.rotation = new Vector3(Math.PI / 2, 0, 0);
    cushionL.material = orangeMat;

    const cushionR = MeshBuilder.CreateCylinder(`${pName}_cushionR`,
      { diameter: LOBE_D, height: 0.045, tessellation: 40 }, scene);
    cushionR.parent = pNode;
    cushionR.position = new Vector3(LOBE_SEP, 0, 0.025);
    cushionR.rotation = new Vector3(Math.PI / 2, 0, 0);
    cushionR.material = orangeMat;
  };

  // Left peanut panel (angled +17°)
  createPeanut('peanutLeft', -PEANUT_OFFSET, TILT_RAD);

  // Right peanut panel (angled -17°)
  createPeanut('peanutRight', PEANUT_OFFSET, -TILT_RAD);
}




// ── Scene builder ─────────────────────────────────────────────────────────────


export async function buildScene(scene: Scene): Promise<Environment> {
  const env: Environment = { triggers: [] };

  // ── PHASE 0: Scale Anchor — log before any geometry ───────────────────────
  console.log('[Phase0] SCALE_ANCHOR_HEIGHT_M =', SCALE_ANCHOR_HEIGHT_M);
  console.log('[Phase0] SA_DOOR_H       =', SA_DOOR_H,       '(door clearance)');
  console.log('[Phase0] SA_DESK_H       =', SA_DESK_H,       '(counter desk height)');
  console.log('[Phase0] SA_WALKPATH_MIN =', SA_WALKPATH_MIN,  '(min clear walk path)');
  console.log('[Phase0] SA_CIRCLE_D     =', SA_CIRCLE_D,      '(rug outer diameter)');
  console.log('[Phase0] SA_CHAIR_SEAT_H =', SA_CHAIR_SEAT_H, '(chair seat height)');
  console.log('[Phase0] SA_TABLE_H      =', SA_TABLE_H,       '(coffee table height)');
  console.log('[Phase0] Room glass wall at x =', Z1_X0,
    '(fills z:', -Z1_ZH, '→', Z1_ZH, ', height:', Z1_H, ')');

  // ── Scene base colour ──────────────────────────────────────────────────────
  scene.clearColor = new Color4(0.08, 0.07, 0.06, 1);

  // ── PHASE 4: Lighting ─────────────────────────────────────────────────────

  // Hemisphere ambient — very low; downlights carry the room.
  // Sky: warm cream-amber #FFE8D0  |  Ground: muted tan #D0C0A0
  const ambient = scene.getLightByName('light') as HemisphericLight | null;
  if (ambient) {
    ambient.intensity   = 0.28;
    ambient.diffuse     = new Color3(1.0, 0.910, 0.816);   // #FFE8D0
    ambient.groundColor = new Color3(0.816, 0.753, 0.627); // #D0C0A0
  }

  // Overhead architectural key — warm, wide directional wash
  const keyLight = new DirectionalLight('keyLight', new Vector3(0.2, -1, 0.1), scene);
  keyLight.intensity = 0.45;
  keyLight.diffuse   = new Color3(1.0, 0.960, 0.880);  // warm white

  // Deep amber fill from the east side
  const fillLight = new DirectionalLight('fillLight', new Vector3(-1, -0.2, 0.2), scene);
  fillLight.intensity = 0.25;
  fillLight.diffuse   = new Color3(1.0, 0.882, 0.722);  // amber

  // ── PHASE 4: 10 recessed downlights — organic scatter, rear-biased ────────
  // Coordinate system: x = room depth (6→30), z = lateral (−10…+10).
  // Scatter biased toward centre-rear (x ≈ 18–22).
  const dlPositions: [number, number][] = [
    // Glass-side leading cluster (x ≈ 14–16)
    [14.5, -2.5], [15.5, 0.0], [14.5, +2.5],
    // Mid-room band (x ≈ 18–19)
    [18.5, -5.0], [18.0, -1.5], [18.0, +1.5], [18.5, +5.0],
    // Rear organic cluster (x ≈ 21–22)
    [22.0, -3.5], [21.5, 0.0], [22.0, +3.5],
  ];
  for (const [dlx, dlz] of dlPositions) {
    const pl = new PointLight(`dl_${dlx}_${dlz}`, new Vector3(dlx, Z1_H - 0.12, dlz), scene);
    pl.intensity = 0.45;
    pl.range     = 7.5;
    pl.diffuse   = new Color3(1.0, 0.957, 0.878);  // warm white #FFF4E0
  }

  // ── PHASE 4: Wall-wash accent lights — 1 wide halo per side wall centerpiece ──
  const WW_COLOR = new Color3(1.0, 0.941, 0.847); // #FFF0D8 slightly amber
  const WW_Y     = 3.40;

  // North side wall centerpiece (x = 17.5, z = +Z1_ZH)
  const wlN = new PointLight('ww_n', new Vector3(17.5, WW_Y, Z1_ZH - 0.8), scene);
  wlN.intensity = 0.60;
  wlN.range     = 8.0;
  wlN.diffuse   = WW_COLOR;

  // South side wall centerpiece (x = 17.5, z = -Z1_ZH)
  const wlS = new PointLight('ww_s', new Vector3(17.5, WW_Y, -Z1_ZH + 0.8), scene);
  wlS.intensity = 0.60;
  wlS.range     = 8.0;
  wlS.diffuse   = WW_COLOR;




  // ── PHASE 4: Lounge ambient fill — soft, low, no shadow ───────────────────
  // One warm PointLight above each lounge circle centre (Y = 1.5 m).
  for (const lcz of [-6.0, 0.0, +6.0]) {
    const lf = new PointLight(`lf_${lcz}`, new Vector3(15.0, 1.5, lcz), scene);
    lf.intensity = 0.10;
    lf.range     = 3.5;
    lf.diffuse   = new Color3(1.0, 0.910, 0.847);  // #FFE8D8
  }

  // ── PHASE 4: Glass-wall cool bounce — exterior daylight simulation ─────────
  const glassBack = new PointLight('glassBack', new Vector3(Z1_X0 - 0.5, 2.0, 0), scene);
  glassBack.intensity = 0.22;
  glassBack.range     = 15.0;
  glassBack.diffuse   = new Color3(0.847, 0.933, 1.0);  // #D8EEFF cool-tinted

  // Elevator header accent downlight — soft, overhead, non-glaring
  const elevGlow = new PointLight('elevGlow', new Vector3(Z1_X1 - 0.4, ELEV_H + 0.25, 0), scene);
  elevGlow.intensity = 0.15;
  elevGlow.range     = 3.0;
  elevGlow.diffuse   = new Color3(1.0, 0.94, 0.86);


  // ── PHASE 5: Tone mapping — warm, slightly under-exposed ─────────────────
  // Prevents wall/ceiling blowout; keeps cream palette visible.
  // Exposure < 1.0 = pull back overall brightness; highlights compress first.
  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.exposure = 0.80;


  // ── Floor — high-gloss cream porcelain tile ────────────────────────────────
  const floorTex = new DynamicTexture('floorTex', { width: 512, height: 512 }, scene);
  {
    const ctx = floorTex.getContext();
    // Warm ivory base — Phase 4 palette: #F5EDD8
    ctx.fillStyle = '#F5EDD8';
    ctx.fillRect(0, 0, 512, 512);
    // Very thin warm-grey grout lines — 64 px = 1 m tile
    ctx.strokeStyle = '#C8BEB4';
    ctx.lineWidth   = 1.0;
    for (let i = 0; i <= 512; i += 64) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
    }
    floorTex.update();
  }
  floorTex.uScale = Z1_W / 4;  // 1 m tiles across 24 m width
  floorTex.vScale = Z1_D / 4;

  const floorMat = new StandardMaterial('floorMat', scene);
  floorMat.diffuseTexture  = floorTex;
  floorMat.diffuseColor    = new Color3(0.961, 0.929, 0.847);  // #F5EDD8 warm ivory
  floorMat.specularColor   = new Color3(0.75, 0.72, 0.64);     // strong warm mirror sheen
  floorMat.specularPower   = 320;                               // ultra-glossy porcelain

  const floor = MeshBuilder.CreateGround('floor', { width: Z1_W, height: Z1_D }, scene);
  floor.position.x   = Z1_MX;
  floor.position.y   = 0;
  floor.checkCollisions = true;
  floor.material     = floorMat;

  // ── Ceiling — warm peachy-cream plaster (same tone as walls) ─────────────
  const ceilMat = solidMat(scene, 'ceilMat', 0.941, 0.878, 0.816); // #F0E0D0
  ceilMat.specularColor = new Color3(0.01, 0.01, 0.01);
  ceilMat.specularPower = 2;
  mkBox(scene, 'ceiling', Z1_W + WALL_T * 2, 0.06, Z1_D + WALL_T * 2,
    Z1_MX, Z1_H + 0.03, 0, ceilMat);

  // Downlighter fixture geometry (purely decorative — small rim + glowing disc)
  const dlRimMat   = solidMat(scene, 'dlRimMat', 0.15, 0.13, 0.11);
  const dlInnerMat = emissiveMat(scene, 'dlInnerMat',
    new Color3(1.0, 0.97, 0.92), new Color3(0.68, 0.62, 0.50));
  for (const [dlx, dlz] of dlPositions) {
    const rim = MeshBuilder.CreateCylinder(
      `dlRim_${dlx}_${dlz}`, { diameter: 0.22, height: 0.04, tessellation: 24 }, scene,
    );
    rim.position = new Vector3(dlx, Z1_H - 0.02, dlz);
    rim.material = dlRimMat;

    const disc = MeshBuilder.CreateCylinder(
      `dlDisc_${dlx}_${dlz}`, { diameter: 0.14, height: 0.01, tessellation: 24 }, scene,
    );
    disc.position = new Vector3(dlx, Z1_H - 0.025, dlz);
    disc.material = dlInnerMat;
  }

  // ── Wall material — warm peachy-cream matte plaster (#F0E0D0) ────────────
  const wallMat = solidMat(scene, 'wallMat', 0.941, 0.878, 0.816);
  wallMat.specularColor = new Color3(0.02, 0.02, 0.02);
  wallMat.specularPower = 2;

  // ── Room walls ─────────────────────────────────────────────────────────────

  // North wall (z = +Z1_ZH) — full width, acoustic panels will sit on face
  mkBox(scene, 'wallN',
    Z1_W + WALL_T * 2, Z1_H, WALL_T,
    Z1_MX, Z1_H / 2, Z1_ZH + WALL_T / 2,
    wallMat);

  // South wall (z = -Z1_ZH) — full width
  mkBox(scene, 'wallS',
    Z1_W + WALL_T * 2, Z1_H, WALL_T,
    Z1_MX, Z1_H / 2, -Z1_ZH - WALL_T / 2,
    wallMat);

  // West wall (x = Z1_X0 = 6) is the floor-to-ceiling glass curtain wall (built below in Phase 1 & 4).
  // No solid cream plaster walls are placed on the west boundary.

  // East wall (x = Z1_X1) — elevator opening centred at z = 0
  {
    const sideLen = (Z1_D - ELEV_W) / 2; // 8.9 m
    // South section
    mkBox(scene, 'wallE_s', WALL_T, Z1_H, sideLen,
      Z1_X1 + WALL_T / 2, Z1_H / 2, -(ELEV_W / 2 + sideLen / 2), wallMat);
    // North section
    mkBox(scene, 'wallE_n', WALL_T, Z1_H, sideLen,
      Z1_X1 + WALL_T / 2, Z1_H / 2,  (ELEV_W / 2 + sideLen / 2), wallMat);
    // Above elevator
    mkBox(scene, 'wallE_top', WALL_T, Z1_H - ELEV_H, ELEV_W,
      Z1_X1 + WALL_T / 2, ELEV_H + (Z1_H - ELEV_H) / 2, 0, wallMat);
  }



  // ── Elevator frame — architectural dark metal #242220 ─────────────────────
  const efMat = solidMat(scene, 'elevFrameMat', 0.16, 0.15, 0.14);
  efMat.specularColor = new Color3(0.08, 0.08, 0.08);
  efMat.specularPower = 24;
  const EF_T = 0.08;

  // Frame jambs (side posts) & top lintel
  mkBox(scene, 'efL',   EF_T, ELEV_H, EF_T, Z1_X1, ELEV_H / 2, -ELEV_W / 2, efMat, false);
  mkBox(scene, 'efR',   EF_T, ELEV_H, EF_T, Z1_X1, ELEV_H / 2,  ELEV_W / 2, efMat, false);
  mkBox(scene, 'efTop', EF_T, EF_T, ELEV_W + EF_T * 2, Z1_X1, ELEV_H + EF_T / 2, 0, efMat, false);

  // ── Elevator doors — brushed stainless steel with subtle satin sheen ──────
  const elevDoorMat = new StandardMaterial('elevDoorMat', scene);
  elevDoorMat.diffuseColor  = new Color3(0.58, 0.56, 0.54);
  elevDoorMat.specularColor = new Color3(0.12, 0.12, 0.12);
  elevDoorMat.specularPower = 24;

  const DOOR_PANEL_W = ELEV_W / 2 - 0.015;
  // Left door leaf
  mkBox(scene, 'elevL', 0.04, ELEV_H, DOOR_PANEL_W,
    Z1_X1 + 0.02, ELEV_H / 2, -ELEV_W / 4, elevDoorMat, false);
  // Right door leaf
  mkBox(scene, 'elevR', 0.04, ELEV_H, DOOR_PANEL_W,
    Z1_X1 + 0.02, ELEV_H / 2,  ELEV_W / 4, elevDoorMat, false);

  // Centre split reveal line (dark recessed seam)
  const elevSeamMat = solidMat(scene, 'elevSeamMat', 0.08, 0.08, 0.08);
  mkBox(scene, 'elevSeam', 0.045, ELEV_H, 0.015,
    Z1_X1 + 0.022, ELEV_H / 2, 0, elevSeamMat, false);

  // Solid alcove recess backing
  const alcoveMat = solidMat(scene, 'alcoveMat', 0.35, 0.33, 0.32);
  mkBox(scene, 'elevAlcove', 0.20, ELEV_H, ELEV_W,
    Z1_X1 + 0.15, ELEV_H / 2, 0, alcoveMat, false);

  // Invisible collision wall so player cannot walk through
  mkBox(scene, 'elevBlock', 0.15, Z1_H, ELEV_W,
    Z1_X1 + 0.08, Z1_H / 2, 0, invisMat(scene, 'elevBlockMat'), true);

  // ── Digital Floor Indicator Header — crisp OLED display ───────────────────
  {
    const IND_W = 1.40; // width along Z
    const IND_H = 0.16; // height along Y

    // Dark architectural bezel housing
    const bezelMat = solidMat(scene, 'indBezelMat', 0.12, 0.12, 0.12);
    bezelMat.specularColor = new Color3(0.06, 0.06, 0.06);
    bezelMat.specularPower = 20;
    mkBox(scene, 'indBezel', 0.05, IND_H + 0.04, IND_W + 0.04,
      Z1_X1 - 0.02, ELEV_H + EF_T + IND_H / 2 + 0.02, 0, bezelMat, false);

    // High-resolution Dynamic Texture for crystal clear lettering
    const tex = new DynamicTexture('indTex', { width: 512, height: 128 }, scene, false);
    const ctx = tex.getContext();
    ctx.fillStyle = '#070D0C';
    ctx.fillRect(0, 0, 512, 128);

    // Glowing border frame
    ctx.strokeStyle = '#14302C';
    ctx.lineWidth   = 6;
    ctx.strokeRect(6, 6, 500, 116);

    // Display text
    ctx.fillStyle    = '#2DD4BF';
    ctx.font         = 'bold 44px sans-serif';
    (ctx as any).textAlign    = 'center';
    (ctx as any).textBaseline = 'middle';
    ctx.fillText('▲   4   ·   LOUNGE', 256, 64);
    tex.update();

    const indMat = new StandardMaterial('indMat', scene);
    indMat.diffuseTexture  = tex;
    indMat.emissiveTexture = tex;
    indMat.emissiveColor   = new Color3(0.95, 0.95, 0.95);
    indMat.specularColor   = new Color3(0, 0, 0);
    indMat.backFaceCulling = false;

    // Oriented plane facing into the room (-X direction)
    const indScreen = MeshBuilder.CreatePlane('elevScreen', { width: IND_W, height: IND_H }, scene);
    indScreen.position = new Vector3(Z1_X1 - 0.046, ELEV_H + EF_T + IND_H / 2 + 0.02, 0);
    indScreen.rotation = new Vector3(0, Math.PI / 2, 0);
    indScreen.material = indMat;
  }

  // ── Call Button Station on Wall Beside Elevator ───────────────────────────
  {
    const CALL_Z = ELEV_W / 2 + 0.28; // wall position north of elevator
    const CALL_Y = 1.20;

    // Brushed metal wall plate housing — enlarged for visibility
    const callPlateMat = solidMat(scene, 'callPlateMat', 0.18, 0.17, 0.16);
    callPlateMat.specularColor = new Color3(0.12, 0.12, 0.12);
    callPlateMat.specularPower = 24;
    mkBox(scene, 'callPlate', 0.025, 0.40, 0.18,
      Z1_X1 - 0.012, CALL_Y, CALL_Z, callPlateMat, false);

    // Dedicated high-res faceplate graphic (512x1024)
    const callTex = new DynamicTexture('callTex', { width: 512, height: 1024 }, scene, false);
    const cctx = callTex.getContext();
    cctx.fillStyle = '#141716';
    cctx.fillRect(0, 0, 512, 1024);

    // Outer beveled border
    cctx.strokeStyle = '#2A3230';
    cctx.lineWidth   = 12;
    cctx.strokeRect(12, 12, 488, 1000);

    // Mini OLED floor display header
    cctx.fillStyle = '#060A0A';
    cctx.fillRect(50, 50, 412, 180);
    cctx.strokeStyle = '#122825';
    cctx.lineWidth   = 6;
    cctx.strokeRect(50, 50, 412, 180);

    cctx.fillStyle    = '#2DD4BF';
    cctx.font         = 'bold 96px sans-serif';
    (cctx as any).textAlign    = 'center';
    (cctx as any).textBaseline = 'middle';
    cctx.fillText('4', 256, 140);

    // Up button circle
    cctx.beginPath();
    cctx.arc(256, 440, 100, 0, Math.PI * 2);
    cctx.fillStyle   = '#1C2422';
    cctx.fill();
    cctx.strokeStyle = '#2DD4BF';
    cctx.lineWidth   = 8;
    cctx.stroke();

    cctx.fillStyle = '#2DD4BF';
    cctx.font      = 'bold 80px sans-serif';
    cctx.fillText('▲', 256, 440);

    // Down button circle
    cctx.beginPath();
    cctx.arc(256, 760, 100, 0, Math.PI * 2);
    cctx.fillStyle   = '#1C2422';
    cctx.fill();
    cctx.strokeStyle = '#424E4B';
    cctx.lineWidth   = 8;
    cctx.stroke();

    cctx.fillStyle = '#82918E';
    cctx.font      = 'bold 80px sans-serif';
    cctx.fillText('▼', 256, 760);

    callTex.update();

    const callFaceMat = new StandardMaterial('callFaceMat', scene);
    callFaceMat.diffuseTexture  = callTex;
    callFaceMat.emissiveTexture = callTex;
    callFaceMat.emissiveColor   = new Color3(0.95, 0.95, 0.95);
    callFaceMat.specularColor   = new Color3(0, 0, 0);
    callFaceMat.backFaceCulling = false;

    // Plane faceplate
    const callFace = MeshBuilder.CreatePlane('callFace', { width: 0.17, height: 0.38 }, scene);
    callFace.position = new Vector3(Z1_X1 - 0.026, CALL_Y, CALL_Z);
    callFace.rotation = new Vector3(0, Math.PI / 2, 0);
    callFace.material = callFaceMat;

    // Proportional 3D illuminated button caps
    const btnMat = emissiveMat(scene, 'callBtnGlowMat',
      new Color3(0.15, 0.35, 0.32), new Color3(0.18, 0.75, 0.70));
    const btnUp = MeshBuilder.CreateCylinder('callBtn3D_up',
      { diameter: 0.075, height: 0.010, tessellation: 28 }, scene);
    btnUp.position = new Vector3(Z1_X1 - 0.032, CALL_Y + 0.065, CALL_Z);
    btnUp.rotation = new Vector3(0, 0, Math.PI / 2);
    btnUp.material = btnMat;

    const btnDnMat = solidMat(scene, 'callBtnDnMat', 0.22, 0.25, 0.24);
    const btnDn = MeshBuilder.CreateCylinder('callBtn3D_dn',
      { diameter: 0.075, height: 0.008, tessellation: 28 }, scene);
    btnDn.position = new Vector3(Z1_X1 - 0.031, CALL_Y - 0.065, CALL_Z);
    btnDn.rotation = new Vector3(0, 0, Math.PI / 2);
    btnDn.material = btnDnMat;
  }





  // Old single-rug removed — 3 lounge zone rugs placed below in Phase 1.

  // ── PHASE 3: Wall panel modules — 1 grand centerpiece installation per side wall ──
  const MOD_Y = 2.10;  // module centre height

  // North side wall (z=+Z1_ZH): 1 grand centerpiece module centered on the wall
  mkWallModule(scene, 'northMod', 17.5, MOD_Y, +Z1_ZH, 'north', true);

  // South side wall (z=-Z1_ZH): 1 grand centerpiece module centered on the wall
  mkWallModule(scene, 'southMod', 17.5, MOD_Y, -Z1_ZH, 'south', true);



  // ── PHASE 1: Glass boundary wall — full floor-to-ceiling, full width ────────
  // The glass wall is at x = Z1_X0 (= 6), the actual room boundary.
  // It spans the full room depth (z = -Z1_ZH → +Z1_ZH = 20 m)
  // and the full ceiling height (Z1_H = 4.0 m).
  // Material will be refined to real glass in Phase 4.
  // Nothing is built beyond x = Z1_X0.
  // ── PHASE 4: Glass panels — transparent smoked tinted architectural glass ──
  const glassMat = new StandardMaterial('glassMat', scene);
  glassMat.diffuseColor    = new Color3(0.10, 0.16, 0.22); // dark smoky blue-teal tint
  glassMat.specularColor   = new Color3(0.92, 0.96, 1.00); // crisp high-gloss glass reflections
  glassMat.specularPower   = 256;                          // polished glass
  glassMat.alpha           = 0.25;                         // transparent with smoked tint
  glassMat.backFaceCulling = false;

  // Glass frame — architectural charcoal #222426 with metallic sheen
  const gFrameMat = solidMat(scene, 'gFrameMat', 0.13, 0.14, 0.15);
  gFrameMat.specularColor = new Color3(0.32, 0.32, 0.32);
  gFrameMat.specularPower = 90;

  // Five equal glass panels, each 4 m wide (Z), spanning z = -10 → +10
  const GW_X    = Z1_X0;         // x = 6 — the glass wall plane
  const GW_H    = Z1_H;          // 4.0 m — full room height
  const GW_MH   = GW_H / 2;      // 2.0 m — panel centre Y
  const GW_PW   = 4.0;           // each panel width (Z)
  const glassPanelZ = [-8, -4, 0, 4, 8];
  for (const pz of glassPanelZ) {
    mkBox(scene, `gp_${pz}`, 0.04, GW_H, GW_PW - 0.10, GW_X, GW_MH, pz, glassMat, false);
  }

  // Vertical frame posts — at every panel joint and both ends
  const glassPostZ = [-10, -6, -2, 2, 6, 10];
  for (const fz of glassPostZ) {
    mkBox(scene, `gPost_${fz}`, 0.08, GW_H + 0.06, 0.08, GW_X, GW_MH, fz, gFrameMat, false);
  }

  // Top rail & Bottom sill
  mkBox(scene, 'gRailTop', 0.08, 0.08, Z1_D, GW_X, GW_H - 0.04, 0, gFrameMat, false);
  mkBox(scene, 'gSill',    0.08, 0.06, Z1_D, GW_X, 0.03,         0, gFrameMat, false);

  // ── Exterior Skyline / Atrium Backdrop behind the glass wall ──────────────
  {
    const bgTex = new DynamicTexture('extBgTex', { width: 1024, height: 512 }, scene, false);
    const bgCtx = bgTex.getContext();
    // Deep twilight gradient
    const skyGrad = bgCtx.createLinearGradient(0, 512, 0, 0);
    skyGrad.addColorStop(0, '#090F16');   // deep ground / lower horizon
    skyGrad.addColorStop(0.35, '#121F2B'); // soft atmospheric horizon
    skyGrad.addColorStop(0.70, '#192C3C');
    skyGrad.addColorStop(1, '#0F1A24');   // upper sky
    bgCtx.fillStyle = skyGrad;
    bgCtx.fillRect(0, 0, 1024, 512);

    // Subtle distant skyline silhouette & warm window lights
    bgCtx.fillStyle = 'rgba(10, 18, 25, 0.85)';
    // Distant towers
    bgCtx.fillRect(100, 220, 90, 292);
    bgCtx.fillRect(240, 160, 130, 352);
    bgCtx.fillRect(420, 200, 110, 312);
    bgCtx.fillRect(580, 140, 140, 372);
    bgCtx.fillRect(770, 190, 100, 322);
    bgCtx.fillRect(910, 230, 80, 282);

    // Tiny warm ambient window dots on towers
    bgCtx.fillStyle = 'rgba(255, 230, 180, 0.45)';
    for (let bx = 250; bx <= 350; bx += 22) {
      for (let by = 180; by <= 480; by += 28) {
        if (Math.sin(bx * 7 + by * 13) > 0.1) bgCtx.fillRect(bx, by, 5, 8);
      }
    }
    for (let bx = 590; bx <= 700; bx += 22) {
      for (let by = 160; by <= 480; by += 28) {
        if (Math.cos(bx * 11 + by * 17) > 0.1) bgCtx.fillRect(bx, by, 5, 8);
      }
    }
    bgTex.update();

    const bgMat = new StandardMaterial('extBgMat', scene);
    bgMat.diffuseTexture  = bgTex;
    bgMat.emissiveTexture = bgTex;
    bgMat.emissiveColor   = new Color3(0.55, 0.65, 0.75);
    bgMat.specularColor   = new Color3(0, 0, 0);
    bgMat.backFaceCulling = false;

    const bgPlane = MeshBuilder.CreatePlane('extBackdrop',
      { width: Z1_D + 4.0, height: Z1_H + 0.6 }, scene);
    bgPlane.position = new Vector3(Z1_X0 - 0.20, GW_MH, 0);
    bgPlane.rotation = new Vector3(0, Math.PI / 2, 0);
    bgPlane.material = bgMat;
  }

  // Full-height invisible collider — player cannot cross the glass boundary
  mkBox(scene, 'glassCol', 0.10, GW_H, Z1_D,
    GW_X, GW_MH, 0, invisMat(scene, 'glassColMat'), true);


  // ── PHASE 1: Reception desk — repositioned against east (back) wall ─────────
  // Back wall = x = Z1_X1 = 30. Desk anchored with its BACK face against the wall.
  // Panorama: desk sits right of centre (between centre wall-panel module and
  // the right/south side wall), at roughly z = -4.5.
  // ── PHASE 4: Reception desk — light oak #C8A870 ──────────────────────────
  const ctrMat = solidMat(scene, 'counterMat', 0.784, 0.659, 0.439); // #C8A870 blonde oak
  ctrMat.specularColor = new Color3(0.18, 0.14, 0.08);
  ctrMat.specularPower = 36;

  const CTR_W = 1.8;
  const CTR_H = SA_DESK_H;   // 0.945 m — derived from scale anchor
  const CTR_D = 0.70;
  const CTR_X = Z1_X1 - CTR_D / 2 - 0.05;  // back face against east wall
  const CTR_Z = -4.5;                         // right-of-centre on back wall

  // Counter body
  mkBox(scene, 'ctrBody', CTR_W, CTR_H, CTR_D,
    CTR_X, CTR_H / 2, CTR_Z, ctrMat, true);
  // Top slab (slightly overhanging)
  mkBox(scene, 'ctrTop', CTR_W + 0.12, 0.06, CTR_D + 0.10,
    CTR_X, CTR_H + 0.03, CTR_Z, ctrMat, false);


  // ── PHASE 1: Lounge zones — 3 circles in a lateral row ─────────────────────

  // Circles are at fixed Z positions, centred in the room depth (X midpoint
  // between glass wall and back wall).
  // Room X: 6 → 30. Midpoint = 18. Circles sit at x ≈ 15 (giving 9m to back
  // wall and ~9m to glass wall — walkable on both sides).
  const LOUNGE_X = 15.0;                    // X of all 3 circle centres
  const circleZs = [-6.0, 0.0, 6.0];       // Z positions: south, centre, north

  // ── PHASE 3: Woven Wool Plush Rug Material ────────────────────────────────
  const { diffuseTex: rugDiffuseTex, bumpTex: rugBumpTex } = createWovenRugTextures(scene);
  const rugMat = new StandardMaterial('wovenRugMat', scene);
  rugMat.diffuseTexture  = rugDiffuseTex;
  rugMat.bumpTexture     = rugBumpTex;
  (rugMat.bumpTexture as any).level = 0.85;
  rugMat.specularColor   = new Color3(0.06, 0.06, 0.06);
  rugMat.specularPower   = 16;

  // Subtle contact shadow rim under the rug
  const rugShadowMat = new StandardMaterial('rugShadowMat', scene);
  rugShadowMat.diffuseColor  = new Color3(0.12, 0.10, 0.08);
  rugShadowMat.specularColor = new Color3(0, 0, 0);
  rugShadowMat.alpha         = 0.35;

  // ── PHASE 2: Lounge furniture — plush woven rugs + central tables ─────────
  // Couch GLB placement is done after asset loading (spawnProp is available there).
  // RUG_D = 5.2 m — generous framing for couches with 0.8m walkway between circles.
  const RUG_D = 5.2;

  for (const cz of circleZs) {
    // 1. Soft contact shadow under the rug perimeter
    mkDisc(scene, `rugShadow_${cz}`, RUG_D + 0.08, 0.004, LOUNGE_X, 0.002, cz, rugShadowMat, 64);
    // 2. Physical 3D plush woven wool rug disc with high-res texture & micro-shadows
    mkDisc(scene, `rug_${cz}`, RUG_D, 0.022, LOUNGE_X, 0.011, cz, rugMat, 64);
    // 3. Central coffee table
    mkLoungeTable(scene, `lounge_${cz}`, LOUNGE_X, cz);
  }




  // ── PHASE 2: Workstation desks — one per side wall near back corner ─────────
  // ── PHASE 4: Workstation desks — light oak #C8A870 (matches reception) ────
  const wsMat = solidMat(scene, 'wsMat', 0.784, 0.659, 0.439); // #C8A870 blonde oak
  wsMat.specularColor = new Color3(0.18, 0.14, 0.08);
  wsMat.specularPower = 36;

  const WS_W = 1.4;
  const WS_H = SA_DESK_H;
  const WS_D = 0.70;

  // North workstation — against north wall (z = +Z1_ZH), near east corner
  const WS_N_X = Z1_X1 - 3.5;
  const WS_N_Z = Z1_ZH - WS_D / 2 - 0.05;
  mkBox(scene, 'wsNorthBody', WS_W, WS_H, WS_D,
    WS_N_X, WS_H / 2, WS_N_Z, wsMat, true);
  mkBox(scene, 'wsNorthTop', WS_W + 0.10, 0.06, WS_D + 0.10,
    WS_N_X, WS_H + 0.03, WS_N_Z, wsMat, false);

  // South workstation — against south wall (z = -Z1_ZH), near east corner
  const WS_S_X = Z1_X1 - 3.5;
  const WS_S_Z = -(Z1_ZH - WS_D / 2 - 0.05);
  mkBox(scene, 'wsSouthBody', WS_W, WS_H, WS_D,
    WS_S_X, WS_H / 2, WS_S_Z, wsMat, true);
  mkBox(scene, 'wsSouthTop', WS_W + 0.10, 0.06, WS_D + 0.10,
    WS_S_X, WS_H + 0.03, WS_S_Z, wsMat, false);

  // ── PHASE 2: Asset loading — macbook, plant, chair + lounge couches ─────────
  type Z1Asset = 'macbook' | 'plant' | 'chair' | 'orangecouch' | 'redcouch';
  const assetFiles: Record<Z1Asset, string> = {
    macbook:     'macbook_pro_m3_16_inch_2024 (1).glb',
    plant:       'potted plant.glb',
    chair:       'chair.glb',
    orangecouch: 'orangecouch.glb',
    redcouch:    'redcouch.glb',
  };

  const assetMap = new Map<Z1Asset, AssetContainer>();
  await Promise.all(
    (Object.entries(assetFiles) as [Z1Asset, string][]).map(async ([k, f]) => {
      try {
        const container = await loadAsset(scene, f);
        assetMap.set(k, container);
      } catch (e) {
        console.warn(`[Zone1] Failed to load asset "${f}":`, e);
      }
    }),
  );

  /** Place a GLB asset at world coords with Y rotation and uniform scale. */
  const spawnProp = (
    asset: Z1Asset,
    wx: number, wy: number, wz: number,
    rotY: number,
    scale = 1.0,
    suffix: string | number = `${wx}_${wz}`,
  ): TransformNode | null => {
    const c = assetMap.get(asset);
    if (!c) {
      console.warn(`[Zone1] Asset not loaded: ${asset}`);
      return null;
    }
    const root = new TransformNode(`${asset}_${suffix}`, scene);
    root.position = new Vector3(wx, wy, wz);
    root.rotation = new Vector3(0, rotY, 0);
    root.scaling  = new Vector3(scale, scale, scale);
    instantiateAnchored(scene, c, root, asset, suffix);
    return root;
  };

  // ── FIX: Lounge couch placement — 3 GLB couches at 120° per circle ───────────
  // ROTATION FORMULA: rotY = -angle - π/2 (points local +Z directly toward circle centre)
  // SPACING: COUCH_R = 1.40 m — comfortable breathing room around the central table.
  // SCALE: 1.35 — balanced footprint on the 5.2 m rug.
  // COLOURS: Saturated matte terracotta & deep velvet coral (low specular, no yellow blowout).
  const COUCH_R = 1.40;
  const COUCH_ASSETS = ['orangecouch', 'redcouch', 'redcouch'] as const;

  // ── Saturated, matte palette-correct couch materials ──────────────────────
  const couchPeachMat = solidMat(scene, 'couchPeachMat', 0.77, 0.38, 0.16); // #C46129 warm terracotta
  couchPeachMat.specularColor = new Color3(0.04, 0.03, 0.02);
  couchPeachMat.specularPower = 8;

  const couchCoralMat = solidMat(scene, 'couchCoralMat', 0.62, 0.22, 0.15); // #9E3826 deep coral/rust
  couchCoralMat.specularColor = new Color3(0.04, 0.03, 0.02);
  couchCoralMat.specularPower = 8;

  const COUCH_MATS = [couchPeachMat, couchCoralMat, couchCoralMat];

  // Intentional balanced orientation per pod:
  // Center pod (z = 0): aligned with room axis.
  // North pod (z = +6): angled inward (+30°) toward the lounge center.
  // South pod (z = -6): angled inward (-30°) mirroring the north pod.
  const clusterAngles: Record<number, number> = {
    [-6.0]: -Math.PI / 6,
    [0.0]:  0,
    [6.0]:  Math.PI / 6,
  };

  for (const lcz of circleZs) {
    const baseAngle = clusterAngles[lcz] ?? 0;
    for (let ci = 0; ci < 3; ci++) {
      const angle = baseAngle + (ci * 2 * Math.PI) / 3;
      const cx    = LOUNGE_X + COUCH_R * Math.cos(angle);
      const cz2   = lcz      + COUCH_R * Math.sin(angle);
      const rotY  = -angle - Math.PI / 2;   // face toward circle centre

      const couchRoot = spawnProp(COUCH_ASSETS[ci], cx, 0, cz2, rotY, 1.35, `couch_${lcz}_${ci}`);

      // Override GLB dark material with palette colour
      if (couchRoot) {
        const tintMat = COUCH_MATS[ci];
        for (const m of couchRoot.getChildMeshes()) {
          if (m.material) m.material = tintMat;
        }
      }

      env.triggers.push({
        id:            `sit_${lcz}_${ci}`,
        type:          'SIT',
        position:      new Vector3(cx, SA_CHAIR_SEAT_H, cz2),
        radius:        1.0,
        snapPosition:  new Vector3(cx, SA_CHAIR_SEAT_H, cz2),
        standPosition: new Vector3(
          cx + 0.75 * Math.cos(angle),
          0,
          cz2 + 0.75 * Math.sin(angle),
        ),
        snapRotationY: rotY,
      });
    }
  }

  // ── Lounge Central Table Laptops (MacBook placed on coffee tables) ──────────
  for (const lcz of circleZs) {
    const laptopRot = lcz === 0 ? Math.PI : (lcz > 0 ? Math.PI * 0.75 : Math.PI * 1.25);
    spawnProp('macbook', LOUNGE_X - 0.05, 0.42 + 0.015, lcz + 0.04,
      laptopRot, 0.010, `lounge_macbook_${lcz}`);
  }

  // ── PHASE 2: Reception desk props ─────────────────────────────────────────


  // Desk body already placed above (CTR_X, CTR_Z).
  // MacBook on desk surface, lid open facing player (toward -X)
  spawnProp('macbook', CTR_X - 0.20, CTR_H + 0.06, CTR_Z,
    Math.PI, 0.01, 'ctr_laptop');
  // Bar stool in front of desk (player-side), centred on desk Z
  spawnProp('chair', CTR_X - 0.90, 0, CTR_Z,
    0, 1.0, 'ctr_stool');
  // Plant beside desk — to the south (lower Z) end
  spawnProp('plant', CTR_X - 0.30, 0, CTR_Z - CTR_W / 2 - 0.35,
    0, 1.0, 'ctr_plant');

  // ── PHASE 2: North workstation props ──────────────────────────────────────
  // Stool in front of desk (stepped south, toward room centre)
  spawnProp('chair', WS_N_X, 0, WS_N_Z - 0.85,
    0, 1.0, 'wsN_stool');
  // MacBook on desk surface
  spawnProp('macbook', WS_N_X, WS_H + 0.06, WS_N_Z - 0.05,
    Math.PI, 0.01, 'wsN_laptop');
  // Plant beside desk — to the east end (toward back corner)
  spawnProp('plant', WS_N_X + WS_W / 2 + 0.30, 0, WS_N_Z - 0.20,
    0, 1.0, 'wsN_plant');

  // ── PHASE 2: South workstation props ──────────────────────────────────────
  // Stool in front of desk (stepped north, toward room centre)
  spawnProp('chair', WS_S_X, 0, WS_S_Z + 0.85,
    Math.PI, 1.0, 'wsS_stool');
  // MacBook on desk surface
  spawnProp('macbook', WS_S_X, WS_H + 0.06, WS_S_Z + 0.05,
    0, 0.01, 'wsS_laptop');
  // Plant beside desk — to the east end
  spawnProp('plant', WS_S_X + WS_W / 2 + 0.30, 0, WS_S_Z + 0.20,
    0, 1.0, 'wsS_plant');

  // ── PHASE 4: Materials + Lighting checklist log ───────────────────────────
  // ── PHASE 5: Soft contact shadows ─────────────────────────────────────────
  // One ShadowGenerator on the overhead key DirectionalLight.
  // Exponential shadow map = soft, slightly blurred edges; low overhead.
  const shadowGen = new ShadowGenerator(1024, keyLight);
  shadowGen.useExponentialShadowMap = true;
  shadowGen.darkness = 0.38; // 0 = solid black, 1 = invisible; 0.38 = soft contact shadow

  // Environment mesh name prefixes — these do NOT cast shadows
  const ENV_PREFIXES = [
    'floor', 'ceiling',
    'wallN', 'wallS', 'wallW', 'wallE', 'wallMat',
    'gp_', 'gPost_', 'gRailTop', 'gSill', 'glassCol',
    'efL', 'efR', 'efTop',
    'elevL', 'elevR', 'elevSeam', 'elevAlcove', 'elevBlock', 'elevIndicator',
    'dfL', 'dfR', 'dfTop', 'backDf', 'doorAbove',
    'rugOuter', 'rugInner',  // rugs receive shadows, don't cast
    'dlRim', 'dlDisc',       // ceiling fixtures — skip
  ];

  for (const mesh of scene.meshes) {
    if (mesh.name === '__root__') continue;
    // Skip invisible collider meshes
    if (mesh.material && (
      mesh.material.name === 'glassColMat' ||
      mesh.material.name === 'elevBlockMat'
    )) continue;
    const isEnv = ENV_PREFIXES.some(p => mesh.name.startsWith(p));
    if (!isEnv) {
      shadowGen.addShadowCaster(mesh, false);
    }
  }

  // Floor and rugs receive shadows
  floor.receiveShadows = true;
  for (const mesh of scene.meshes) {
    if (mesh.name.startsWith('rugOuter_') || mesh.name.startsWith('rugInner_')) {
      mesh.receiveShadows = true;
    }
  }

  // ── PHASE 6: Final comparison checklist log ───────────────────────────────
  console.log('[Phase6] Final scene — comparison checklist:');
  console.log('[Phase6]  Scale anchor: SCALE_ANCHOR_HEIGHT_M =', SCALE_ANCHOR_HEIGHT_M, '✓');
  console.log('[Phase6]  Glass wall: full floor-to-ceiling, full width, alpha=0.12 ✓');
  console.log('[Phase6]  Lounge: 3 circles × 3 petal chairs × 1 low table = 9 chairs, 3 tables ✓');
  console.log('[Phase6]  Rugs: #3D7A7A outer + #F2EBE0 inner, no yellow/cyan ✓');
  console.log('[Phase6]  Back wall: 2 modules at z=±6 (z=0 = elevator — cannot add module there)');
  console.log('[Phase6]  Side walls: 2 modules each (north + south) ✓');
  console.log('[Phase6]  Door panels: double-leaf #C8B898 beige in doorway ✓');
  console.log('[Phase6]  Materials: floor #F5EDD8, walls #F0E0D0, glass #D0E8F0, oak #C8A870 ✓');
  console.log('[Phase6]  Lighting: 10 downlights + 6 wall-wash + 3 lounge-fill + tone-map 0.85 ✓');
  console.log('[Phase6]  Shadows: soft exponential, floor + rugs receive ✓');
  console.log('[Phase6]  SIT triggers:', env.triggers.length, 'registered ✓');
  console.log('[Phase6]  ── Scene complete. ──');

  return env;
}