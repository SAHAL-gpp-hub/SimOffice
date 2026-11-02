/**
 * sceneBuilder.ts
 *
 * SimOffice Zone 1 — Architectural Contemporary Corporate Workspace Redesign
 *
 * Implements a professionally architect-designed executive lounge and tech workspace:
 * - Spatial Envelope: Floor-to-ceiling curtain wall (West), structural pilaster bays (North/South),
 *   elevator portal & executive reception (East), perimeter cove drop-ceiling.
 * - Layered Lighting: Natural daylight, directional shadows, ceiling downlights with modeled trims,
 *   indirect perimeter cove wash, and ACES tone mapping.
 * - Materials: Large-format French honed limestone/terrazzo, American walnut slats, fluted acoustic slate,
 *   dark bronze anodized trims, woven wool boucle rugs, and realistic glass.
 * - Hospitality Zones:
 *     * Zone A (North): Executive linear collaborative suite.
 *     * Zone B (Center): Signature 3-couch collaboration island.
 *     * Zone C (South): Informal touchdown meeting lounge.
 *     * East: Corporate reception & ergonomic workstations.
 * - Game Integration: Full WASD collision boundaries, 9 calibrated SIT triggers (couches & chairs),
 *   and seamless workstation code editor overlay trigger.
 */

import {
  Scene,
  Vector3,
  Color3,
  StandardMaterial,
  DynamicTexture,
  MeshBuilder,
  TransformNode,
  SceneLoader,
  DirectionalLight,
  HemisphericLight,
  ShadowGenerator,
  PointLight,
  Color4,
  Texture,
  AbstractMesh,
  RenderTargetTexture,
} from '@babylonjs/core';
import type { AssetContainer, Node } from '@babylonjs/core';
import '@babylonjs/loaders';
import { buildCitySkyline } from './skyline/CitySkylineBuilder';
import { buildFloor2 } from './sceneBuilderFloor2';
import { ElevatorManager } from './elevator/ElevatorManager';

// ── Public API ────────────────────────────────────────────────────────────────

export interface InteractionTrigger {
  id: string;
  type: string;
  position: Vector3;
  radius: number;
  snapPosition?: Vector3;
  standPosition?: Vector3;
  snapRotationY?: number;
  promptText?: string;
}

export interface Environment {
  triggers: InteractionTrigger[];
  elevatorManager?: ElevatorManager;
}

export type Z1Asset =
  | 'macbook'
  | 'plant'
  | 'chair'
  | 'orangecouch'
  | 'redcouch'
  | 'desk'
  | 'deskCorner'
  | 'chairDesk'
  | 'computerScreen'
  | 'computerKeyboard'
  | 'computerMouse'
  | 'trashcan'
  | 'lamp'
  | 'modernChair'
  | 'minimalistDesk'
  | 'modernComputer';

export type SpawnPropFn = (
  asset: Z1Asset,
  wx: number,
  wy: number,
  wz: number,
  rotY?: number,
  scale?: number | Vector3,
  suffix?: string | number,
) => TransformNode | null;

// ── Room Layout Constants ─────────────────────────────────────────────────────
// Room 1 (Executive Lounge): x = 6 → 30 (width = 24 m), z = -10 → +10 (depth = 20 m), ceiling = 4.0 m
const Z1_X0   = 6;    // portal wall inner face (dividing Room 1 and Room 2)
const Z1_X1   = 30;   // east wall inner face (elevator & reception wall)
const Z1_MX   = 18;   // room 1 centre X
const Z1_ZH   = 10;   // half-depth (north wall at +10, south wall at -10)
const Z1_W    = 24;   // room 1 width (X axis)
const Z1_D    = 20;   // room depth (Z axis)
const Z1_H    = 4.0;  // ceiling height
const WALL_T  = 0.3;  // solid wall thickness

// East elevator portal opening, centred at z = 0
const ELEV_W  = 2.2;
const ELEV_H  = 2.8;

// Room 2 (Student Hardcore Engineering Lab): x = -14 → 6 (width = 20 m), z = -10 → +10 (depth = 20 m)
const R2_X0   = -14;  // room 2 west exterior wall (panoramic skyline curtain wall)
const R2_W    = 20;   // room 2 width (X axis)
const R2_MX   = -4;   // room 2 centre X
const PORTAL_W = 3.2; // double door portal opening width (centred at z = 0, z = -1.6 to +1.6)
const PORTAL_H = 2.8; // doorway opening height

// CAPSULE_HALF_HEIGHT matches characterController.ts (1.8m capsule)
const CAPSULE_HALF_HEIGHT = 0.9;

/** Player spawn — inside Zone 1, eastern third of room, facing east toward reception */
export const SPAWN_POSITION = new Vector3(24.0, CAPSULE_HALF_HEIGHT + 0.2, 0);

// ── Asset loading & mesh helper utilities ─────────────────────────────────────

async function loadAsset(scene: Scene, file: string): Promise<AssetContainer> {
  return SceneLoader.LoadAssetContainerAsync('/assets/office/', file, scene);
}

export function solidMat(
  scene: Scene, name: string,
  r: number, g: number, b: number,
  specularPower = 24,
  specularColor = new Color3(0.08, 0.08, 0.08),
): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = new Color3(r, g, b);
  m.specularColor = specularColor;
  m.specularPower = specularPower;
  return m;
}

export function invisMat(scene: Scene, name: string): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.alpha = 0;
  return m;
}

/** Axis-aligned box helper with optional collision and shadow properties. */
export function mkBox(
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
  mesh.isPickable      = false;
  mesh.freezeWorldMatrix();
  mesh.doNotSyncBoundingInfo = true;
  mesh.cullingStrategy = AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY;
  return mesh;
}

/** Flat horizontal cylinder disc helper. */
export function mkDisc(
  scene: Scene, name: string,
  diameter: number, height: number,
  px: number, py: number, pz: number,
  mat: StandardMaterial,
  tess = 24,
  collide = false,
) {
  const mesh = MeshBuilder.CreateCylinder(name, { diameter, height, tessellation: tess }, scene);
  mesh.position = new Vector3(px, py, pz);
  mesh.material = mat;
  mesh.checkCollisions = collide;
  mesh.isPickable = false;
  mesh.freezeWorldMatrix();
  mesh.doNotSyncBoundingInfo = true;
  mesh.cullingStrategy = AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY;
  return mesh;
}

function computeAnchorOffset(entries: any): Vector3 {
  let minX = Number.POSITIVE_INFINITY, maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY, maxY = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY, maxZ = Number.NEGATIVE_INFINITY;

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
  // Share materials across instances (do NOT clone materials to save VRAM and draw calls)
  const entries = container.instantiateModelsToScene((n) => `${n}_${tag}_${suffix}`, false);
  const offset  = computeAnchorOffset(entries);

  const outer = new TransformNode(`${tag}_${suffix}`, scene);
  outer.parent = parent;

  const inner = new TransformNode(`${tag}_${suffix}_inner`, scene);
  inner.parent   = outer;
  inner.position = offset;

  const isSolidObstacle =
    tag === 'orangecouch' ||
    tag === 'redcouch' ||
    tag === 'chair' ||
    tag === 'plant' ||
    tag === 'chairDesk' ||
    tag === 'desk' ||
    tag === 'deskCorner' ||
    tag === 'minimalistDesk' ||
    tag === 'modernChair';

  for (const root of entries.rootNodes) {
    (root as Node).parent = inner;
    if (typeof (root as any).getChildMeshes === 'function') {
      for (const m of (root as any).getChildMeshes(false)) {
        m.isPickable = false;
        m.cullingStrategy = AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY;
        if (isSolidObstacle) {
          m.checkCollisions = true;
        } else {
          m.checkCollisions = false;
        }
        // Micro-props distance culling (skip rendering beyond 22 meters)
        if (tag === 'macbook' || tag === 'computerKeyboard' || tag === 'computerMouse') {
          m.maxDistance = 22.0;
        }
      }
    }
  }
  return outer;
}

// ── Procedural Architectural Textures ─────────────────────────────────────────

/**
 * Large-format French honed limestone / terrazzo floor tiles (1.0m x 1.0m module).
 * Warm natural stone base with realistic grout joints, subtle edge bevels, and micro-mineral flecks.
 */
export function createLimestoneFloorTexture(scene: Scene): DynamicTexture {
  const size = 1024;
  const tex = new DynamicTexture('limestoneFloorTex', { width: size, height: size }, scene, false);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;

  // Base warm limestone stone
  ctx.fillStyle = '#E8E1D5';
  ctx.fillRect(0, 0, size, size);

  // Micro stone flecks and organic mineral mottling
  const imgData = ctx.getImageData(0, 0, size, size);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const grain = (Math.random() - 0.5) * 16;
    d[i]     = Math.min(255, Math.max(0, d[i] + grain));
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + grain * 0.92));
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + grain * 0.82));
  }
  ctx.putImageData(imgData, 0, 0);

  // Architectural stone tile grid (256px = 1.0 m stone slabs)
  const tileSize = 256;
  for (let y = 0; y < size; y += tileSize) {
    for (let x = 0; x < size; x += tileSize) {
      // Subtle stone slab tonal variation
      const tint = ((x * 17 + y * 31) % 5 - 2) * 2;
      ctx.fillStyle = tint > 0 ? `rgba(255, 255, 255, ${tint * 0.015})` : `rgba(0, 0, 0, ${-tint * 0.015})`;
      ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

      // 3D Bevel highlight on top & left
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.40)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 2, y + tileSize - 3);
      ctx.lineTo(x + 2, y + 2);
      ctx.lineTo(x + tileSize - 3, y + 2);
      ctx.stroke();

      // Grout shadow on bottom & right
      ctx.strokeStyle = 'rgba(95, 85, 75, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + tileSize - 2, y + 2);
      ctx.lineTo(x + tileSize - 2, y + tileSize - 2);
      ctx.lineTo(x + 2, y + tileSize - 2);
      ctx.stroke();
    }
  }

  // Dark architectural recessed grout lines
  ctx.strokeStyle = 'rgba(105, 96, 84, 0.85)';
  ctx.lineWidth = 3.5;
  for (let i = 0; i <= size; i += tileSize) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
  }

  tex.update();
  return tex;
}

/**
 * Natural American Walnut architectural wood slat texture with realistic multi-stop grain.
 */
export function createWalnutSlatTexture(scene: Scene): DynamicTexture {
  const size = 512;
  const tex = new DynamicTexture('walnutSlatTex', { width: size, height: size }, scene, false);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;

  // Dark rich walnut base
  ctx.fillStyle = '#3E2419';
  ctx.fillRect(0, 0, size, size);

  // Vertical wood slat panels with dark recessed reveal shadows
  const slatWidth = 32;
  const gapWidth = 6;
  const total = slatWidth + gapWidth;

  for (let x = 0; x < size; x += total) {
    // Slat face gradient (curved 3D architectural lighting)
    const slatGrad = ctx.createLinearGradient(x, 0, x + slatWidth, 0);
    slatGrad.addColorStop(0, '#5C3827');
    slatGrad.addColorStop(0.25, '#6D4431');
    slatGrad.addColorStop(0.85, '#563526');
    slatGrad.addColorStop(1, '#3A2016');
    ctx.fillStyle = slatGrad;
    ctx.fillRect(x, 0, slatWidth, size);

    // Subtle natural wood grain streaks
    ctx.fillStyle = 'rgba(35, 18, 12, 0.30)';
    for (let gx = x + 4; gx < x + slatWidth; gx += 7) {
      ctx.fillRect(gx, 0, 1.5, size);
    }

    // Shadow in recess reveal
    ctx.fillStyle = '#160B08';
    ctx.fillRect(x + slatWidth, 0, gapWidth, size);
  }

  tex.update();
  return tex;
}

/**
 * Architectural acoustic fluted felt panel texture (warm neutral charcoal / slate).
 */
export function createAcousticFeltTexture(scene: Scene): DynamicTexture {
  const size = 512;
  const tex = new DynamicTexture('acousticFeltTex', { width: size, height: size }, scene, false);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;

  ctx.fillStyle = '#24272A';
  ctx.fillRect(0, 0, size, size);

  const fluteW = 24;
  for (let x = 0; x < size; x += fluteW) {
    const grad = ctx.createLinearGradient(x, 0, x + fluteW, 0);
    grad.addColorStop(0, '#383D42');
    grad.addColorStop(0.5, '#484D53');
    grad.addColorStop(1, '#1A1C1E');
    ctx.fillStyle = grad;
    ctx.fillRect(x, 0, fluteW - 3, size);

    // Shadow seam
    ctx.fillStyle = '#101213';
    ctx.fillRect(x + fluteW - 3, 0, 3, size);
  }

  tex.update();
  return tex;
}

/**
 * Premium woven wool boucle rug texture with warm oat center and tailored charcoal border.
 */
export function createWovenRugTexture(scene: Scene, isRound = false): DynamicTexture {
  const size = 512;
  const tex = new DynamicTexture(`rugTex_${isRound ? 'round' : 'rect'}`, { width: size, height: size }, scene, false);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;

  if (isRound) {
    // Charcoal outer boundary
    ctx.fillStyle = '#2D3136';
    ctx.beginPath();
    ctx.arc(256, 256, 252, 0, Math.PI * 2);
    ctx.fill();

    // Warm oatmeal woven center
    ctx.fillStyle = '#EDE7DF';
    ctx.beginPath();
    ctx.arc(256, 256, 215, 0, Math.PI * 2);
    ctx.fill();

    // Inner slate accent ring
    ctx.strokeStyle = '#64707D';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(256, 256, 215, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // Rectangular wool rug: Charcoal border + Warm Oat center
    ctx.fillStyle = '#2D3136';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#EDE7DF';
    ctx.fillRect(36, 36, size - 72, size - 72);

    ctx.strokeStyle = '#64707D';
    ctx.lineWidth = 3;
    ctx.strokeRect(36, 36, size - 72, size - 72);
  }

  // Micro-weave herringbone grain
  ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
  for (let i = 40; i < size - 40; i += 6) {
    ctx.fillRect(i, 40, 2, size - 80);
    ctx.fillRect(40, i, size - 80, 2);
  }

  tex.update();
  return tex;
}

/**
 * Contemporary Minimalist Architectural Wall Art (Gallery Canvas).
 */
export function createAbstractArtTexture(scene: Scene, variant: number): DynamicTexture {
  const size = 512;
  const tex = new DynamicTexture(`artTex_${variant}`, { width: size, height: size }, scene, false);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;

  // Primed off-white gallery canvas
  ctx.fillStyle = '#F5F2EB';
  ctx.fillRect(0, 0, size, size);

  if (variant === 1) {
    // Architectural Bauhaus / Brutalist geometric composition
    ctx.fillStyle = '#BA6446'; // terracotta circle
    ctx.beginPath();
    ctx.arc(200, 260, 140, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2B313A'; // charcoal arch
    ctx.fillRect(240, 140, 160, 280);

    ctx.fillStyle = '#C8A359'; // warm ochre disc
    ctx.beginPath();
    ctx.arc(360, 180, 70, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#1F242B';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(80, 420);
    ctx.lineTo(440, 420);
    ctx.stroke();
  } else {
    // Minimalist organic flow composition
    ctx.fillStyle = '#34495E'; // deep slate wave
    ctx.beginPath();
    ctx.ellipse(260, 220, 180, 120, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#D9825B'; // warm terracotta arch
    ctx.beginPath();
    ctx.arc(280, 310, 100, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#E5C07B'; // ochre orb
    ctx.beginPath();
    ctx.arc(150, 160, 50, 0, Math.PI * 2);
    ctx.fill();
  }

  tex.update();
  return tex;
}



// ── Architectural Furniture Builders ──────────────────────────────────────────

/**
 * Tech-grade mineral architectural floor tiles for Student Hardcore Engineering Lab (Room 2).
 * Refined medium slate tone with subtle anti-static floor grid and crisp architectural joints.
 */
export function createTechBasaltFloorTexture(scene: Scene): DynamicTexture {
  const size = 1024;
  const tex = new DynamicTexture('techBasaltFloorTex', { width: size, height: size }, scene, false);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;

  // Medium mineral slate base (bright, clean, architectural tone)
  ctx.fillStyle = '#383D48';
  ctx.fillRect(0, 0, size, size);

  // Micro-mineral texture flecks
  const imgData = ctx.getImageData(0, 0, size, size);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const grain = (Math.random() - 0.5) * 14;
    d[i]     = Math.min(255, Math.max(0, d[i] + grain));
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + grain * 1.04));
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + grain * 1.10));
  }
  ctx.putImageData(imgData, 0, 0);

  // 1.0m tile grid (256px) with clean recessed architectural joints
  ctx.strokeStyle = '#282C35';
  ctx.lineWidth = 3;
  for (let p = 0; p <= size; p += 256) {
    ctx.beginPath();
    ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke();
  }

  // Subtle inset high-tech floor marker accents
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.20)';
  ctx.lineWidth = 1;
  ctx.strokeRect(32, 32, size - 64, size - 64);

  tex.update();
  return tex;
}

/**
 * Creates an ultra-crisp procedural mechanical keyboard texture (75% compact ANSI layout).
 * Inspired by custom enthusiast keyboards (Keychron Q1 / NuPhy) with cyan Esc and amber Enter.
 */
export function createMechanicalKeyboardTexture(scene: Scene): DynamicTexture {
  const w = 1024;
  const h = 512;
  const tex = new DynamicTexture('mechKbTex', { width: w, height: h }, scene, false);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;

  // Space gray CNC aluminum base chassis
  ctx.fillStyle = '#1A1E26';
  ctx.fillRect(0, 0, w, h);

  // Chamfered chassis bezel highlight
  ctx.strokeStyle = '#323946';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, w - 8, h - 8);

  // Keycap Bed Inset
  ctx.fillStyle = '#101318';
  ctx.fillRect(18, 18, w - 36, h - 36);

  // Row configurations for 75% mechanical ANSI keyboard layout
  const rows = [
    // Function Row
    { y: 28, h: 54, keys: ['ESC', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'DEL'] },
    // Number Row
    { y: 92, h: 62, keys: ['~', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'BACKSPACE'] },
    // QWERTY Row
    { y: 166, h: 62, keys: ['TAB', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'] },
    // Home Row
    { y: 240, h: 62, keys: ['CAPS', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'ENTER'] },
    // Bottom Shift Row
    { y: 314, h: 62, keys: ['SHIFT', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'SHIFT', '▲'] },
    // Modifiers Row
    { y: 388, h: 64, keys: ['CTRL', 'OPT', 'CMD', 'SPACEBAR', 'CMD', 'OPT', '◄', '▼', '►'] },
  ];

  for (const row of rows) {
    const totalW = w - 54;
    const keyCount = row.keys.length;
    let curX = 27;

    for (let i = 0; i < keyCount; i++) {
      const k = row.keys[i];
      let kw = Math.floor(totalW / keyCount) - 6;

      // Proportional keycap widths
      if (k === 'SPACEBAR') kw = 310;
      else if (k === 'BACKSPACE' || k === 'SHIFT' || k === 'ENTER') kw = 110;
      else if (k === 'TAB' || k === 'CAPS') kw = 84;
      else if (k === 'CTRL' || k === 'OPT' || k === 'CMD') kw = 60;

      if (curX + kw > w - 27) kw = w - 27 - curX;

      // Color scheme
      let keyColor = '#252B36';
      let legendColor = '#E2E8F0';

      if (k === 'ESC') {
        keyColor = '#0EA5E9'; // Electric Cyan
        legendColor = '#FFFFFF';
      } else if (k === 'ENTER') {
        keyColor = '#F59E0B'; // Warm Amber
        legendColor = '#FFFFFF';
      } else if (['CTRL', 'OPT', 'CMD', 'SHIFT', 'TAB', 'CAPS', 'BACKSPACE', 'DEL'].includes(k)) {
        keyColor = '#1B202A'; // Dark slate modifier keycaps
        legendColor = '#94A3B8';
      }

      // Keycap drop shadow
      ctx.fillStyle = '#090B0F';
      ctx.fillRect(curX, row.y + 4, kw, row.h);

      // Keycap top body
      ctx.fillStyle = keyColor;
      ctx.fillRect(curX + 1, row.y, kw - 2, row.h - 3);

      // Keycap perimeter bevel highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
      ctx.lineWidth = 1;
      ctx.strokeRect(curX + 2, row.y + 1, kw - 4, row.h - 5);

      // Laser legend
      ctx.fillStyle = legendColor;
      ctx.font = k.length > 3 ? 'bold 12px -apple-system, sans-serif' : 'bold 16px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (k !== 'SPACEBAR') {
        ctx.fillText(k, curX + kw / 2, row.y + row.h / 2 - 1);
      }

      curX += kw + 6;
    }
  }

  tex.update();
  return tex;
}

/**
 * Charcoal leather / felt desk mat texture with stitched border and lab typography.
 */
export function createDeskPadTexture(scene: Scene): DynamicTexture {
  const w = 512;
  const h = 256;
  const tex = new DynamicTexture('deskPadTex', { width: w, height: h }, scene, false);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;

  // Charcoal felt / leather base
  ctx.fillStyle = '#181B22';
  ctx.fillRect(0, 0, w, h);

  // Micro-leather grain
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const grain = (Math.random() - 0.5) * 8;
    d[i]     = Math.min(255, Math.max(0, d[i] + grain));
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + grain));
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + grain));
  }
  ctx.putImageData(imgData, 0, 0);

  // Perimeter stitched border
  ctx.strokeStyle = '#2F3542';
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, w - 20, h - 20);

  // Corner brand deboss
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('SIMOFFICE // DEV-MAT 80', w - 20, h - 18);

  tex.update();
  return tex;
}

/**
 * Scandinavian Blonde Oak Vertical Slat Paneling Texture.
 * Natural white oak woodgrain ribs with dark acoustic felt backing.
 */
export function createBlondeOakSlatTexture(scene: Scene): DynamicTexture {
  const size = 512;
  const tex = new DynamicTexture('blondeOakSlatTex', { width: size, height: size }, scene, false);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;

  // Deep acoustic felt backing
  ctx.fillStyle = '#16181D';
  ctx.fillRect(0, 0, size, size);

  // Blonde Oak slats (32px wide slats with 16px felt gap = 48px repeat)
  const slatW = 32;
  const gapW = 16;
  const pitch = slatW + gapW;

  for (let x = 8; x < size; x += pitch) {
    // Slat base blonde oak gradient
    const oakGrad = ctx.createLinearGradient(x, 0, x + slatW, 0);
    oakGrad.addColorStop(0, '#D4BFA4');
    oakGrad.addColorStop(0.3, '#E2D0BA');
    oakGrad.addColorStop(0.7, '#DFCDAF');
    oakGrad.addColorStop(1, '#C9B194');
    ctx.fillStyle = oakGrad;
    ctx.fillRect(x, 0, slatW, size);

    // Edge bevels & drop shadows
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.fillRect(x + slatW - 2, 0, 2, size);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(x, 0, 2, size);

    // Subtle natural woodgrain fibers
    ctx.fillStyle = 'rgba(120, 85, 45, 0.08)';
    for (let y = 0; y < size; y += 4) {
      if (Math.sin(x * 11 + y * 7) > 0.3) {
        ctx.fillRect(x + 3, y, slatW - 6, 2);
      }
    }
  }

  tex.update();
  return tex;
}

/**
 * Large format Agile Sprint Kanban Whiteboard Texture.
 * Displays user stories, burndown telemetry, and team sprint velocity.
 */
function createAgileSprintBoardTexture(scene: Scene): DynamicTexture {
  const w = 1024;
  const h = 512;
  const tex = new DynamicTexture('agileSprintTex', { width: w, height: h }, scene, false);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;

  // Pristine magnetic glass whiteboard
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, w, h);

  // Subtle dot matrix grid on whiteboard
  ctx.fillStyle = '#E2E8F0';
  for (let gx = 20; gx < w; gx += 32) {
    for (let gy = 70; gy < h; gy += 32) {
      ctx.fillRect(gx, gy, 2, 2);
    }
  }

  // Header Bar (Frosted glass gradient)
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, w, 56);

  // Sprint Title
  ctx.fillStyle = '#38BDF8';
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('⚡ SPRINT 42 // OMNICART HIGH-CONCURRENCY ARCHITECTURE', 24, 36);

  ctx.fillStyle = '#10B981';
  ctx.font = 'bold 13px monospace';
  ctx.fillText('VELOCITY: 94 PTS  ·  DAYS REMAINING: 4', w - 340, 36);

  // Columns: Backlog, Active Dev, Code Review, Staging QA, Prod
  const cols = [
    { name: 'BACKLOG (4)', color: '#64748B', x: 20, w: 185 },
    { name: 'IN PROGRESS (3)', color: '#0284C7', x: 215, w: 185 },
    { name: 'CODE REVIEW (2)', color: '#7C3AED', x: 410, w: 185 },
    { name: 'STAGING QA (2)', color: '#D97706', x: 605, w: 185 },
    { name: 'PROD DEPLOYED (4)', color: '#059669', x: 800, w: 204 },
  ];

  for (const c of cols) {
    // Column Header pill
    ctx.fillStyle = c.color;
    ctx.fillRect(c.x, 68, c.w, 28);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(c.name, c.x + 12, 87);

    // Subtle column divider line
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.strokeRect(c.x, 102, c.w, h - 114);
  }

  // Kanban Sticky Note Cards
  const cards = [
    // Backlog
    { col: 0, y: 114, title: 'Multi-Region DB Sharding', tag: 'OPS-209', bg: '#FEF08A', color: '#854D0E' },
    { col: 0, y: 184, title: 'WebAssembly Crypto Hashing', tag: 'CORE-114', bg: '#FFEDD5', color: '#9A3412' },
    { col: 0, y: 254, title: 'Rate Limiter Leaky Bucket', tag: 'API-884', bg: '#E0E7FF', color: '#3730A3' },
    { col: 0, y: 324, title: 'Distributed Tracing Exporter', tag: 'OBS-420', bg: '#FCE7F3', color: '#9D174D' },

    // In Progress
    { col: 1, y: 114, title: 'Patch Inventory Underflow', tag: 'INC-8942', bg: '#BAE6FD', color: '#0369A1' },
    { col: 1, y: 184, title: 'Redis Redlock Distributed Mutex', tag: 'ENG-301', bg: '#FEF08A', color: '#854D0E' },
    { col: 1, y: 254, title: 'Dynamic Mesh Instancing 60FPS', tag: '3D-601', bg: '#BBF7D0', color: '#166534' },

    // Code Review
    { col: 2, y: 114, title: 'PR #1042: Fast Checkout Hook', tag: 'REVIEW', bg: '#DDD6FE', color: '#5B21B6' },
    { col: 2, y: 184, title: 'PR #1045: ACES Tonemapping', tag: 'REVIEW', bg: '#DDD6FE', color: '#5B21B6' },

    // Staging QA
    { col: 3, y: 114, title: 'Load Test: 50,000 req/sec', tag: 'LOAD', bg: '#FED7AA', color: '#C2410C' },
    { col: 3, y: 184, title: 'Chaos Monkey Pod Kill Test', tag: 'CHAOS', bg: '#FED7AA', color: '#C2410C' },

    // Prod Deployed
    { col: 4, y: 114, title: '✔ VRAM Budget Optimization', tag: 'PROD', bg: '#A7F3D0', color: '#065F46' },
    { col: 4, y: 184, title: '✔ Grand Double Portal Corridor', tag: 'PROD', bg: '#A7F3D0', color: '#065F46' },
    { col: 4, y: 254, title: '✔ Headless Chrome Benchmark', tag: 'PROD', bg: '#A7F3D0', color: '#065F46' },
    { col: 4, y: 324, title: '✔ 75% Mechanical Keyboard Suite', tag: 'PROD', bg: '#A7F3D0', color: '#065F46' },
  ];

  for (const card of cards) {
    const colX = cols[card.col].x + 8;
    const cardW = cols[card.col].w - 16;
    const cardH = 58;

    // Sticky note shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.fillRect(colX + 3, card.y + 3, cardW, cardH);

    // Sticky note body
    ctx.fillStyle = card.bg;
    ctx.fillRect(colX, card.y, cardW, cardH);

    // Top color strip
    ctx.fillStyle = card.color;
    ctx.fillRect(colX, card.y, cardW, 4);

    // Card tag pill
    ctx.fillStyle = card.color;
    ctx.font = 'bold 10px monospace';
    ctx.fillText(card.tag, colX + 8, card.y + 18);

    // Card Title
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(card.title, colX + 8, card.y + 36);

    // Avatar dot
    ctx.fillStyle = card.color;
    ctx.beginPath();
    ctx.arc(colX + cardW - 14, card.y + 44, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  tex.update();
  return tex;
}

/**
 * Realistic modern dark IDE code editor display texture for developer workstation monitors.
 * Displays syntax-highlighted code for OmniCart inventory fix, test results, and minimap.
 */
function createIdeCodeTexture(scene: Scene, podName: string): DynamicTexture {
  const w = 1024;
  const h = 512;
  const tex = new DynamicTexture(`ideCodeTex_${podName}`, { width: w, height: h }, scene, false);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;

  // 1. VS Code editor background
  ctx.fillStyle = '#181A1F';
  ctx.fillRect(0, 0, w, h);

  // 2. Editor tab bar
  ctx.fillStyle = '#1E222B';
  ctx.fillRect(0, 0, w, 40);

  // Active Tab: src/index.js (OmniCart Inventory)
  ctx.fillStyle = '#181A1F';
  ctx.fillRect(0, 0, 320, 40);
  ctx.fillStyle = '#38BDF8';
  ctx.fillRect(0, 0, 320, 3); // top accent line

  // Tab Icon (JS yellow)
  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold 15px monospace';
  ctx.fillText('JS', 16, 26);

  ctx.fillStyle = '#E2E8F0';
  ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('src/index.js (Inventory Worker)', 42, 25);

  ctx.fillStyle = '#10B981';
  ctx.fillText('● [Saved]', 255, 25);

  // Inactive Tab
  ctx.fillStyle = '#64748B';
  ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('tests/checkout.test.js', 345, 25);

  // 3. Line numbers gutter
  ctx.fillStyle = '#13151A';
  ctx.fillRect(0, 40, 52, 360);
  ctx.fillStyle = '#475569';
  ctx.font = '13px monospace';
  for (let i = 1; i <= 14; i++) {
    ctx.fillText(`${i}`.padStart(2, ' '), 16, 68 + (i - 1) * 24);
  }

  // 4. Code text area
  const codeLines = [
    { text: '// OmniCart Core Worker — INC-8942 Inventory Underflow Hotfix', color: '#6A9955' },
    { text: 'export async function deductStock(itemId, quantity) {', color: '#569CD6' },
    { text: '  const stock = await inventoryDb.getAvailable(itemId);', color: '#D4D4D4' },
    { text: '  if (stock - quantity < 0) {', color: '#C586C0' },
    { text: '    throw new Error("INSUFFICIENT_STOCK: Negative inventory prevented");', color: '#CE9178' },
    { text: '  }', color: '#C586C0' },
    { text: '  const updated = await inventoryDb.decrement(itemId, quantity);', color: '#D4D4D4' },
    { text: '  telemetry.logEvent("stock_deducted", { itemId, remaining: updated });', color: '#DCDCAA' },
    { text: '  return { success: true, remaining: updated };', color: '#C586C0' },
    { text: '}', color: '#569CD6' },
  ];

  ctx.font = '15px monospace';
  for (let i = 0; i < codeLines.length; i++) {
    ctx.fillStyle = codeLines[i].color;
    ctx.fillText(codeLines[i].text, 68, 68 + i * 24);
  }

  // 5. Code Minimap on right edge
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.fillRect(w - 70, 40, 70, 360);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  for (let i = 0; i < 18; i++) {
    const lw = 20 + Math.sin(i * 1.5) * 18;
    ctx.fillRect(w - 60, 52 + i * 16, lw, 3);
  }

  // 6. Integrated Terminal Drawer (bottom)
  ctx.fillStyle = '#0F1117';
  ctx.fillRect(0, 395, w, 88);
  ctx.strokeStyle = '#262D3D';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 395, w, 88);

  ctx.fillStyle = '#38BDF8';
  ctx.font = 'bold 12px monospace';
  ctx.fillText('TERMINAL (bash) · test-runner', 18, 414);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '13px monospace';
  ctx.fillText('$ npm test -- -t "should prevent negative stock underflow"', 18, 436);

  ctx.fillStyle = '#10B981';
  ctx.fillText('✔ PASS  tests/inventory.spec.ts (4 tests passed, 0 failed, 12ms)', 18, 458);

  ctx.fillStyle = '#38BDF8';
  ctx.fillText('✔ All integration constraints satisfied. Ready for deployment.', 18, 474);

  // 7. Status bar (bottom line)
  ctx.fillStyle = '#0284C7';
  ctx.fillRect(0, 483, w, 29);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(`⚡ SIMOFFICE DEV OPS  ·  ${podName}  ·  main*  ·  Node v20.12  ·  UTF-8`, 16, 502);

  tex.update();
  return tex;
}

/**
 * Enterprise 42U Datacenter Server Rack Telemetry Display.
 * Renders server blade chassis slots with illuminated status LEDs and diagnostics.
 */
function createServerRackTexture(scene: Scene, rackId: number): DynamicTexture {
  const w = 512;
  const h = 1024;
  const tex = new DynamicTexture(`serverRackTex_${rackId}`, { width: w, height: h }, scene, false);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;

  // Dark brushed chassis
  ctx.fillStyle = '#080C12';
  ctx.fillRect(0, 0, w, h);

  // Side rack rail columns
  ctx.fillStyle = '#141A24';
  ctx.fillRect(0, 0, 36, h);
  ctx.fillRect(w - 36, 0, 36, h);

  // Top header status display
  ctx.fillStyle = '#0D1520';
  ctx.fillRect(40, 20, w - 80, 60);
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 20, w - 80, 60);

  ctx.fillStyle = '#38BDF8';
  ctx.font = 'bold 18px monospace';
  ctx.fillText(`SIMOFFICE CLUSTER // RACK 0${rackId}`, 56, 46);

  ctx.fillStyle = '#10B981';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('STATUS: ONLINE  ·  TEMP: 19.4°C  ·  LOAD: 18%', 56, 68);

  // 1U/2U Blade Server Units (18 slots)
  const slotH = 46;
  for (let s = 0; s < 18; s++) {
    const sy = 96 + s * (slotH + 4);

    // Blade chassis unit
    ctx.fillStyle = s % 2 === 0 ? '#101722' : '#0E141D';
    ctx.fillRect(40, sy, w - 80, slotH);

    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;
    ctx.strokeRect(40, sy, w - 80, slotH);

    // Ventilation honeycomb grill
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let gx = 52; gx < w - 180; gx += 8) {
      ctx.fillRect(gx, sy + 12, 4, slotH - 24);
    }

    // Drive bay sleds
    ctx.fillStyle = '#1A2332';
    ctx.fillRect(w - 170, sy + 8, 48, slotH - 16);
    ctx.fillRect(w - 116, sy + 8, 48, slotH - 16);

    // Blinking status LEDs (Green, Cyan, Amber)
    const ledColor = (s + rackId) % 7 === 0 ? '#F59E0B' : (s % 3 === 0 ? '#06B6D4' : '#10B981');
    ctx.fillStyle = ledColor;
    ctx.shadowColor = ledColor;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(w - 55, sy + 16, 4, 0, Math.PI * 2);
    ctx.fill();

    // Activity flicker LED
    ctx.fillStyle = '#38BDF8';
    ctx.shadowColor = '#38BDF8';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(w - 55, sy + 30, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0; // reset
  }

  tex.update();
  return tex;
}

/**
 * Incident War-Room Architecture & System Health Wall Display.
 * Large format digital board displaying microservice topology, health charts, and live incident telemetry.
 */
function createIncidentBoardTexture(scene: Scene): DynamicTexture {
  const w = 1024;
  const h = 512;
  const tex = new DynamicTexture('incidentBoardTex', { width: w, height: h }, scene, false);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;

  // Dark slate navy background
  ctx.fillStyle = '#080E18';
  ctx.fillRect(0, 0, w, h);

  // Header Bar
  ctx.fillStyle = '#0F1A2C';
  ctx.fillRect(0, 0, w, 56);
  ctx.strokeStyle = '#1E3A5F';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, w, 56);

  // Red Incident Pulse Indicator
  ctx.fillStyle = '#EF4444';
  ctx.shadowColor = '#EF4444';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(28, 28, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('SIMOFFICE WAR ROOM // INCIDENT INC-8942 ARCHITECTURE TOPOLOGY', 50, 36);

  ctx.fillStyle = '#F87171';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('CRITICAL PRIORITY: P1', w - 210, 36);

  // Left Section: Microservice Topology
  ctx.fillStyle = 'rgba(15, 26, 44, 0.6)';
  ctx.fillRect(24, 76, 480, 260);
  ctx.strokeStyle = '#1E3A5F';
  ctx.lineWidth = 1;
  ctx.strokeRect(24, 76, 480, 260);

  ctx.fillStyle = '#38BDF8';
  ctx.font = 'bold 15px monospace';
  ctx.fillText('SERVICE DEPENDENCY GRAPH', 42, 106);

  // Nodes: Client -> API Gateway -> Stock Service -> Inventory DB
  const nodes = [
    { name: 'OmniCart Client', x: 50, y: 150, col: '#10B981' },
    { name: 'Checkout API',    x: 175, y: 150, col: '#10B981' },
    { name: 'Stock Worker',    x: 300, y: 150, col: '#EF4444' }, // faulting node
    { name: 'Inventory DB',    x: 300, y: 240, col: '#F59E0B' },
  ];

  for (const n of nodes) {
    ctx.fillStyle = '#142236';
    ctx.fillRect(n.x, n.y, 105, 50);
    ctx.strokeStyle = n.col;
    ctx.lineWidth = 2;
    ctx.strokeRect(n.x, n.y, 105, 50);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px -apple-system, sans-serif';
    ctx.fillText(n.name, n.x + 8, n.y + 30);
  }

  // Connecting arrows
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 2;
  // Client -> API
  ctx.beginPath(); ctx.moveTo(155, 175); ctx.lineTo(175, 175); ctx.stroke();
  // API -> Stock
  ctx.beginPath(); ctx.moveTo(280, 175); ctx.lineTo(300, 175); ctx.stroke();
  // Stock -> DB
  ctx.beginPath(); ctx.moveTo(352, 200); ctx.lineTo(352, 240); ctx.stroke();

  // Right Section: Telemetry Charts
  ctx.fillStyle = 'rgba(15, 26, 44, 0.6)';
  ctx.fillRect(524, 76, 476, 260);
  ctx.strokeStyle = '#1E3A5F';
  ctx.lineWidth = 1;
  ctx.strokeRect(524, 76, 476, 260);

  ctx.fillStyle = '#38BDF8';
  ctx.font = 'bold 15px monospace';
  ctx.fillText('TRAFFIC VOLUME & ERROR SPIKE (10-SEC SLIDING WINDOW)', 542, 106);

  // Draw chart axes
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(560, 290); ctx.lineTo(960, 290); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(560, 130); ctx.lineTo(560, 290); ctx.stroke();

  // Traffic line (Cyan)
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= 400; x += 20) {
    const y = 250 - Math.sin(x * 0.02) * 45;
    if (x === 0) ctx.moveTo(560 + x, y);
    else ctx.lineTo(560 + x, y);
  }
  ctx.stroke();

  // Error spike line (Red)
  ctx.strokeStyle = '#EF4444';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 0; x <= 400; x += 20) {
    const y = x < 240 ? 285 : 285 - ((x - 240) / 160) * 110;
    if (x === 0) ctx.moveTo(560 + x, y);
    else ctx.lineTo(560 + x, y);
  }
  ctx.stroke();

  ctx.fillStyle = '#94A3B8';
  ctx.font = '11px monospace';
  ctx.fillText('— Traffic Volume (req/s)', 560, 315);
  ctx.fillStyle = '#EF4444';
  ctx.fillText('— Underflow Error Spike (500)', 740, 315);

  // Bottom Callout Banner
  ctx.fillStyle = 'rgba(239, 68, 68, 0.16)';
  ctx.fillRect(24, 356, 976, 130);
  ctx.strokeStyle = '#EF4444';
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 356, 976, 130);

  ctx.fillStyle = '#FCA5A5';
  ctx.font = 'bold 17px monospace';
  ctx.fillText('🎯 WAR-ROOM MISSION DIRECTIVE:', 48, 392);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('Workstation desks are loaded with live cluster source code.', 48, 428);
  ctx.fillText('Sit down at any developer workstation, press [E], and patch inventory logic in src/index.js.', 48, 460);

  tex.update();
  return tex;
}

/**
 * Dual High-Precision Analog Pressure Gauges (Pump 0-16 BAR / Steam 0-3 BAR).
 */
function createEspressoGaugeTexture(scene: Scene, type: 'pump' | 'steam'): DynamicTexture {
  const size = 512;
  const tex = new DynamicTexture(`espressoGauge_${type}`, { width: size, height: size }, scene, false);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.44;

  // Outer bezel gradient (brushed stainless / bronze)
  const outerGrad = ctx.createRadialGradient(cx, cy, radius * 0.85, cx, cy, radius);
  outerGrad.addColorStop(0, '#ECEFF1');
  outerGrad.addColorStop(0.7, '#CFD8DC');
  outerGrad.addColorStop(1, '#90A4AE');
  ctx.fillStyle = outerGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // Dark inner shadow rim
  ctx.strokeStyle = '#37474F';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Dial face background (creamy vintage instrument white)
  const dialGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, radius * 0.88);
  dialGrad.addColorStop(0, '#FFFFFF');
  dialGrad.addColorStop(0.85, '#F4F6F7');
  dialGrad.addColorStop(1, '#E0E4E7');
  ctx.fillStyle = dialGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.88, 0, Math.PI * 2);
  ctx.fill();

  // Operating ranges
  const startAngle = Math.PI * 0.75; // -135 deg from bottom-left
  const endAngle = Math.PI * 2.25;   // +135 deg to bottom-right
  const totalSweep = endAngle - startAngle;

  if (type === 'pump') {
    // 0 to 16 BAR scale
    // Optimal 8.5 to 10.5 BAR green zone
    const gStart = startAngle + (8.5 / 16) * totalSweep;
    const gEnd = startAngle + (10.5 / 16) * totalSweep;
    ctx.strokeStyle = '#22C55E';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.72, gStart, gEnd);
    ctx.stroke();

    // Red warning zone 14 to 16 BAR
    const rStart = startAngle + (13.5 / 16) * totalSweep;
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.72, rStart, endAngle);
    ctx.stroke();

    // Scale tick marks
    for (let bar = 0; bar <= 16; bar++) {
      const angle = startAngle + (bar / 16) * totalSweep;
      const isMajor = bar % 2 === 0;
      const len = isMajor ? 20 : 10;
      const rInner = radius * 0.80 - len;
      const rOuter = radius * 0.80;

      ctx.strokeStyle = isMajor ? '#1E293B' : '#64748B';
      ctx.lineWidth = isMajor ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * rInner, cy + Math.sin(angle) * rInner);
      ctx.lineTo(cx + Math.cos(angle) * rOuter, cy + Math.sin(angle) * rOuter);
      ctx.stroke();

      if (isMajor) {
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 22px "SF Pro Display", -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const numR = radius * 0.58;
        ctx.fillText(bar.toString(), cx + Math.cos(angle) * numR, cy + Math.sin(angle) * numR);
      }
    }

    // Dial text
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 20px "SF Pro Display", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PUMP PRESSURE', cx, cy - 40);
    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('BAR / 9.2 OPTIMAL', cx, cy - 18);
    ctx.font = '13px sans-serif';
    ctx.fillText('SIMOFFICE FIRENZE', cx, cy + 62);

    // Indicator Needle pointing to 9.2 BAR
    const needleAngle = startAngle + (9.2 / 16) * totalSweep;
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - Math.cos(needleAngle) * 20, cy - Math.sin(needleAngle) * 20);
    ctx.lineTo(cx + Math.cos(needleAngle) * (radius * 0.76), cy + Math.sin(needleAngle) * (radius * 0.76));
    ctx.stroke();
  } else {
    // 0 to 3.0 BAR steam boiler scale
    // Optimal 1.1 to 1.6 BAR green zone
    const gStart = startAngle + (1.1 / 3.0) * totalSweep;
    const gEnd = startAngle + (1.6 / 3.0) * totalSweep;
    ctx.strokeStyle = '#22C55E';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.72, gStart, gEnd);
    ctx.stroke();

    // Red warning zone 2.2 to 3.0 BAR
    const rStart = startAngle + (2.2 / 3.0) * totalSweep;
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.72, rStart, endAngle);
    ctx.stroke();

    for (let barTenth = 0; barTenth <= 30; barTenth += 2) {
      const bar = barTenth / 10;
      const angle = startAngle + (bar / 3.0) * totalSweep;
      const isMajor = barTenth % 5 === 0;
      const len = isMajor ? 20 : 10;
      const rInner = radius * 0.80 - len;
      const rOuter = radius * 0.80;

      ctx.strokeStyle = isMajor ? '#1E293B' : '#64748B';
      ctx.lineWidth = isMajor ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * rInner, cy + Math.sin(angle) * rInner);
      ctx.lineTo(cx + Math.cos(angle) * rOuter, cy + Math.sin(angle) * rOuter);
      ctx.stroke();

      if (isMajor) {
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 22px "SF Pro Display", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const numR = radius * 0.58;
        ctx.fillText(bar.toFixed(1), cx + Math.cos(angle) * numR, cy + Math.sin(angle) * numR);
      }
    }

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 20px "SF Pro Display", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('STEAM BOILER', cx, cy - 40);
    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('BAR / 1.35 VAPOR', cx, cy - 18);
    ctx.font = '13px sans-serif';
    ctx.fillText('SIMOFFICE FIRENZE', cx, cy + 62);

    // Needle pointing to 1.35 BAR
    const needleAngle = startAngle + (1.35 / 3.0) * totalSweep;
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - Math.cos(needleAngle) * 20, cy - Math.sin(needleAngle) * 20);
    ctx.lineTo(cx + Math.cos(needleAngle) * (radius * 0.76), cy + Math.sin(needleAngle) * (radius * 0.76));
    ctx.stroke();
  }

  // Center chrome pivot cap
  const capGrad = ctx.createRadialGradient(cx - 3, cy - 3, 2, cx, cy, 18);
  capGrad.addColorStop(0, '#FFFFFF');
  capGrad.addColorStop(0.5, '#B0BEC5');
  capGrad.addColorStop(1, '#37474F');
  ctx.fillStyle = capGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#263238';
  ctx.lineWidth = 2;
  ctx.stroke();

  tex.update();
  return tex;
}

/**
 * Dual Group Shot Timer & PID Digital OLED Display.
 */
function createEspressoPidDisplayTexture(scene: Scene): DynamicTexture {
  const w = 512;
  const h = 128;
  const tex = new DynamicTexture('espressoPidTex', { width: w, height: h }, scene, false);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;

  // Ultra-deep black obsidian OLED bezel
  ctx.fillStyle = '#05070A';
  ctx.fillRect(0, 0, w, h);

  // Subtle glass highlight
  const glassGrad = ctx.createLinearGradient(0, 0, 0, h);
  glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
  glassGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.02)');
  glassGrad.addColorStop(1, 'rgba(0, 0, 0, 0.40)');
  ctx.fillStyle = glassGrad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, w - 4, h - 4);

  // Center Divider
  ctx.strokeStyle = '#15202E';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w / 2, 8);
  ctx.lineTo(w / 2, h - 8);
  ctx.stroke();

  // LEFT GROUP (ACTIVE EXTRACTION: 26s, 9.2 BAR, 93.4°C)
  ctx.fillStyle = '#38BDF8'; // Glowing Cyan
  ctx.font = 'bold 36px monospace';
  ctx.fillText('00:26s', 24, 52);

  ctx.fillStyle = '#22C55E'; // Green extraction status
  ctx.font = 'bold 15px monospace';
  ctx.fillText('● FLOW 2.1 ml/s', 24, 82);

  ctx.fillStyle = '#E2E8F0';
  ctx.font = '14px monospace';
  ctx.fillText('9.2 BAR  •  93.4°C', 24, 108);

  // RIGHT GROUP (STANDBY: READY, 93.5°C)
  ctx.fillStyle = '#F59E0B'; // Warm amber standby
  ctx.font = 'bold 34px monospace';
  ctx.fillText('READY', w / 2 + 32, 52);

  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 15px monospace';
  ctx.fillText('○ PRE-INFUSE IDLE', w / 2 + 32, 82);

  ctx.fillStyle = '#E2E8F0';
  ctx.font = '14px monospace';
  ctx.fillText('0.0 BAR  •  93.5°C', w / 2 + 32, 108);

  tex.update();
  return tex;
}

/**
 * Commercial Laser-Cut Stainless Steel Slotted Drip Grate.
 */
function createEspressoDripGrateTexture(scene: Scene): DynamicTexture {
  const w = 512;
  const h = 256;
  const tex = new DynamicTexture('espressoGrateTex', { width: w, height: h }, scene, false);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;

  // Brushed stainless steel metallic base
  const bgGrad = ctx.createLinearGradient(0, 0, w, 0);
  bgGrad.addColorStop(0, '#B0B5BD');
  bgGrad.addColorStop(0.2, '#D2D6DC');
  bgGrad.addColorStop(0.5, '#A8ADB6');
  bgGrad.addColorStop(0.8, '#D8DCE2');
  bgGrad.addColorStop(1, '#B0B5BD');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Fine linear brushing lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  for (let y = 0; y < h; y += 4) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Laser-cut drainage slots (dark rounded oval slots)
  ctx.fillStyle = '#111317';
  const slotW = 12;
  const slotH = 34;
  const gapX = 22;
  const gapY = 48;

  for (let y = 20; y < h - 20; y += gapY) {
    const isOdd = Math.floor(y / gapY) % 2 === 1;
    const startX = isOdd ? 28 : 16;
    for (let x = startX; x < w - 24; x += gapX) {
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, slotW, slotH, 5);
      } else {
        ctx.rect(x, y, slotW, slotH);
      }
      ctx.fill();
    }
  }

  // Circular cup placement indicator rings under group 1 (x ~ 140) and group 2 (x ~ 372)
  for (const cx of [140, 372]) {
    ctx.strokeStyle = '#4B5563';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, h / 2, 48, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#6B7280';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, h / 2, 34, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Perimeter bevel
  ctx.strokeStyle = '#4A4E57';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, w - 6, h - 6);

  tex.update();
  return tex;
}

/**
 * Specialty Roasted Espresso Coffee Beans Pattern for Grinder Hopper.
 */
function createCoffeeBeansTexture(scene: Scene): DynamicTexture {
  const size = 512;
  const tex = new DynamicTexture('coffeeBeansTex', { width: size, height: size }, scene, false);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;

  // Dark roasted coffee background
  ctx.fillStyle = '#1A0E08';
  ctx.fillRect(0, 0, size, size);

  // Draw roasted coffee beans with varied orientations and highlights
  const beanColors = ['#2B1408', '#381B0C', '#452210', '#1F0C05', '#331709'];
  const rng = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  for (let i = 0; i < 280; i++) {
    const bx = rng(i * 12.3) * size;
    const by = rng(i * 45.6) * size;
    const rot = rng(i * 78.9) * Math.PI;
    const bw = 10 + rng(i * 3.1) * 8;
    const bh = 18 + rng(i * 9.7) * 10;
    const col = beanColors[Math.floor(rng(i * 5.5) * beanColors.length)];

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(rot);

    // Bean oval body
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(0, 0, bw, bh, 0, 0, Math.PI * 2);
    ctx.fill();

    // Roasted bean oily sheen highlight
    ctx.fillStyle = 'rgba(255, 200, 150, 0.14)';
    ctx.beginPath();
    ctx.ellipse(-bw * 0.35, -bh * 0.2, bw * 0.35, bh * 0.5, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Characteristic wavy center crease / split line
    ctx.strokeStyle = '#0D0502';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, -bh + 2);
    ctx.bezierCurveTo(bw * 0.3, -bh * 0.3, -bw * 0.3, bh * 0.3, 0, bh - 2);
    ctx.stroke();

    ctx.restore();
  }

  tex.update();
  return tex;
}

/**
 * Rich Golden-Hazelnut Espresso Crema Texture with Microfoam Marbling.
 */
function createCremaTexture(scene: Scene): DynamicTexture {
  const size = 256;
  const tex = new DynamicTexture('cremaTex', { width: size, height: size }, scene, false);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;

  // Base hazelnut gold crema gradient
  const grad = ctx.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, size / 2);
  grad.addColorStop(0, '#D4944C');
  grad.addColorStop(0.4, '#B36D2A');
  grad.addColorStop(0.8, '#874A1A');
  grad.addColorStop(1, '#4A230B');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Tiger-striping swirls & microfoam bubbles
  ctx.fillStyle = '#612D10';
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 2 + Math.random() * 5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Warm microfoam highlight rosetta swirls
  ctx.strokeStyle = 'rgba(255, 235, 200, 0.45)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 45, 0.5, 2.8);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(size / 2 - 8, size / 2 + 10, 25, 3.2, 5.8);
  ctx.stroke();

  tex.update();
  return tex;
}

/**
 * Grinder Digital Dosing & Micron Scale OLED Screen Texture.
 */
function createCoffeeGrinderTexture(scene: Scene): DynamicTexture {
  const w = 256;
  const h = 256;
  const tex = new DynamicTexture('coffeeGrinderTex', { width: w, height: h }, scene, false);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;

  ctx.fillStyle = '#080B10';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, w - 8, h - 8);

  ctx.fillStyle = '#38BDF8';
  ctx.font = 'bold 44px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('18.5g', w / 2, 72);

  ctx.fillStyle = '#22C55E';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('DOUBLE DOSE', w / 2, 116);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '16px monospace';
  ctx.fillText('TIME: 4.25s', w / 2, 154);
  ctx.fillText('BURR: 64mm FLAT', w / 2, 186);

  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold 15px monospace';
  ctx.fillText('★ ESPRESSO #2.4', w / 2, 222);

  tex.update();
  return tex;
}

/**
 * Modern Dual 27-inch 4K Monitor Assembly with Articulating Arm & IDE Code Texture.
 */
export function mkDualMonitorSetup(
  scene: Scene,
  name: string,
  px: number,
  py: number,
  pz: number,
  rotY: number,
  ideTex: DynamicTexture,
  bronzeMat: StandardMaterial,
): void {
  const root = new TransformNode(`${name}_root`, scene);
  root.position = new Vector3(px, py, pz);
  root.rotation = new Vector3(0, rotY, 0);

  // Monitor desk clamp stand pole
  const standPole = MeshBuilder.CreateCylinder(`${name}_pole`, { diameter: 0.04, height: 0.42 }, scene);
  standPole.parent = root;
  standPole.position = new Vector3(0, 0.21, 0);
  standPole.material = bronzeMat;

  // Crossbar mount
  const arm = MeshBuilder.CreateBox(`${name}_arm`, { width: 0.85, height: 0.03, depth: 0.03 }, scene);
  arm.parent = root;
  arm.position = new Vector3(0, 0.32, 0);
  arm.material = bronzeMat;

  // Screen material with code texture
  const screenMat = new StandardMaterial(`${name}_screenMat`, scene);
  screenMat.diffuseTexture = ideTex;
  screenMat.emissiveTexture = ideTex;
  screenMat.emissiveColor = new Color3(0.95, 0.95, 0.95);
  screenMat.backFaceCulling = false;

  const bezelMat = solidMat(scene, `${name}_bezelMat`, 0.08, 0.08, 0.10, 48);

  const MON_W = 0.58;
  const MON_H = 0.34;
  const MON_D = 0.02;
  const TILT = 0.14; // gentle inward ergonomic curve

  // Left Monitor (Bezel + Screen)
  const monL = new TransformNode(`${name}_monL`, scene);
  monL.parent = root;
  monL.position = new Vector3(-0.30, 0.32, 0.03);
  monL.rotation = new Vector3(0, TILT, 0);

  const bezelL = MeshBuilder.CreateBox(`${name}_bezelL`, { width: MON_W, height: MON_H, depth: MON_D }, scene);
  bezelL.parent = monL;
  bezelL.material = bezelMat;

  const screenL = MeshBuilder.CreatePlane(`${name}_screenL`, { width: MON_W - 0.02, height: MON_H - 0.02 }, scene);
  screenL.parent = monL;
  screenL.position = new Vector3(0, 0, -MON_D / 2 - 0.002);
  screenL.rotation = new Vector3(0, Math.PI, 0);
  screenL.material = screenMat;

  // Right Monitor (Bezel + Screen)
  const monR = new TransformNode(`${name}_monR`, scene);
  monR.parent = root;
  monR.position = new Vector3(0.30, 0.32, 0.03);
  monR.rotation = new Vector3(0, -TILT, 0);

  const bezelR = MeshBuilder.CreateBox(`${name}_bezelR`, { width: MON_W, height: MON_H, depth: MON_D }, scene);
  bezelR.parent = monR;
  bezelR.material = bezelMat;

  const screenR = MeshBuilder.CreatePlane(`${name}_screenR`, { width: MON_W - 0.02, height: MON_H - 0.02 }, scene);
  screenR.parent = monR;
  screenR.position = new Vector3(0, 0, -MON_D / 2 - 0.002);
  screenR.rotation = new Vector3(0, Math.PI, 0);
  screenR.material = screenMat;
}

/**
 * Ergonomic precision wireless mouse (Logitech MX Master 3S style).
 * Features sculpted thumb rest, metal MagSpeed knurled scroll wheel, and LED indicator.
 */
export function mkErgonomicMouse(
  scene: Scene,
  name: string,
  parent: TransformNode | null,
  px: number,
  py: number,
  pz: number,
  graphiteMat: StandardMaterial,
  aluminumMat: StandardMaterial,
): TransformNode {
  const root = new TransformNode(`${name}_root`, scene);
  if (parent) root.parent = parent;
  root.position = new Vector3(px, py, pz);

  const ledMat = new StandardMaterial(`${name}_ledMat`, scene);
  ledMat.emissiveColor = new Color3(0.12, 0.85, 0.45); // crisp green battery indicator LED

  // Sculpted ergonomic mouse palm dome (width 0.064m, height 0.026m, length 0.108m)
  const body = MeshBuilder.CreateBox(`${name}_body`, { width: 0.064, height: 0.026, depth: 0.108 }, scene);
  body.parent = root;
  body.position = new Vector3(0, 0.013, 0);
  body.material = graphiteMat;

  // Ergonomic flared thumb wing (left side)
  const thumbWing = MeshBuilder.CreateBox(`${name}_thumbWing`, { width: 0.018, height: 0.012, depth: 0.06 }, scene);
  thumbWing.parent = root;
  thumbWing.position = new Vector3(-0.034, 0.007, -0.01);
  thumbWing.material = graphiteMat;

  // Primary button divider groove
  const groove = MeshBuilder.CreateBox(`${name}_groove`, { width: 0.002, height: 0.004, depth: 0.046 }, scene);
  groove.parent = root;
  groove.position = new Vector3(0, 0.027, 0.03);
  groove.material = graphiteMat;

  // Precision MagSpeed knurled scroll wheel (aluminum cylinder)
  const wheel = MeshBuilder.CreateCylinder(`${name}_wheel`, { diameter: 0.015, height: 0.008, tessellation: 16 }, scene);
  wheel.parent = root;
  wheel.rotation = new Vector3(0, 0, Math.PI / 2);
  wheel.position = new Vector3(0, 0.028, 0.028);
  wheel.material = aluminumMat;

  // Battery status LED indicator dot
  const led = MeshBuilder.CreatePlane(`${name}_led`, { width: 0.004, height: 0.004 }, scene);
  led.parent = root;
  led.position = new Vector3(-0.016, 0.027, 0.008);
  led.rotation = new Vector3(Math.PI / 2, 0, 0);
  led.material = ledMat;

  return root;
}

/**
 * Custom 75% mechanical keyboard with CNC aluminum chassis, laser legends, and incline.
 */
export function mkMechanicalKeyboard(
  scene: Scene,
  name: string,
  parent: TransformNode | null,
  px: number,
  py: number,
  pz: number,
  kbMat: StandardMaterial,
  aluminumMat: StandardMaterial,
): TransformNode {
  const root = new TransformNode(`${name}_root`, scene);
  if (parent) root.parent = parent;
  root.position = new Vector3(px, py, pz);
  root.rotation = new Vector3(-0.05, 0, 0); // 3° ergonomic typing angle

  const KB_W = 0.34;
  const KB_D = 0.13;
  const KB_H = 0.014;

  // CNC Machined Aluminum Base Chassis
  const chassis = MeshBuilder.CreateBox(`${name}_chassis`, { width: KB_W, height: KB_H, depth: KB_D }, scene);
  chassis.parent = root;
  chassis.position = new Vector3(0, KB_H / 2, 0);
  chassis.material = aluminumMat;

  // Top Face with 75% Keycaps Dynamic Texture
  const keybed = MeshBuilder.CreatePlane(`${name}_keybed`, { width: KB_W - 0.006, height: KB_D - 0.006 }, scene);
  keybed.parent = root;
  keybed.position = new Vector3(0, KB_H + 0.001, 0);
  keybed.rotation = new Vector3(Math.PI / 2, 0, 0);
  keybed.material = kbMat;

  return root;
}

/**
 * Space-gray aluminum laptop riser stand with angled support plate.
 */
export function mkLaptopRiserStand(
  scene: Scene,
  name: string,
  parent: TransformNode | null,
  px: number,
  py: number,
  pz: number,
  rotY: number,
  aluminumMat: StandardMaterial,
): TransformNode {
  const root = new TransformNode(`${name}_root`, scene);
  if (parent) root.parent = parent;
  root.position = new Vector3(px, py, pz);
  root.rotation = new Vector3(0, rotY, 0);

  // Heavy aluminum base plate on desk
  const base = MeshBuilder.CreateBox(`${name}_base`, { width: 0.22, height: 0.006, depth: 0.18 }, scene);
  base.parent = root;
  base.position = new Vector3(0, 0.003, 0);
  base.material = aluminumMat;

  // Dual angled elevator arms
  for (const armX of [-0.075, 0.075]) {
    const arm = MeshBuilder.CreateBox(`${name}_arm_${armX}`, { width: 0.02, height: 0.08, depth: 0.16 }, scene);
    arm.parent = root;
    arm.position = new Vector3(armX, 0.045, -0.01);
    arm.rotation = new Vector3(-0.18, 0, 0); // incline rising toward the back
    arm.material = aluminumMat;
  }

  return root;
}

/**
 * Ceramic matte black coffee tumbler with silicone sleeve and drinking lid.
 */
export function mkCoffeeTumbler(
  scene: Scene,
  name: string,
  parent: TransformNode | null,
  px: number,
  py: number,
  pz: number,
  ceramicMat: StandardMaterial,
  sleeveMat: StandardMaterial,
): TransformNode {
  const root = new TransformNode(`${name}_root`, scene);
  if (parent) root.parent = parent;
  root.position = new Vector3(px, py, pz);

  const coffeeLiquidMat = solidMat(scene, `${name}_coffeeMat`, 0.15, 0.08, 0.04, 80);

  // Tumbler Body
  const mug = MeshBuilder.CreateCylinder(`${name}_mug`, { diameter: 0.075, height: 0.12, tessellation: 20 }, scene);
  mug.parent = root;
  mug.position = new Vector3(0, 0.06, 0);
  mug.material = ceramicMat;

  // Silicone Grip Sleeve
  const sleeve = MeshBuilder.CreateCylinder(`${name}_sleeve`, { diameter: 0.078, height: 0.05, tessellation: 20 }, scene);
  sleeve.parent = root;
  sleeve.position = new Vector3(0, 0.055, 0);
  sleeve.material = sleeveMat;

  // Coffee liquid surface inside
  const liquid = MeshBuilder.CreateDisc(`${name}_liquid`, { radius: 0.034, tessellation: 20 }, scene);
  liquid.parent = root;
  liquid.rotation = new Vector3(Math.PI / 2, 0, 0);
  liquid.position = new Vector3(0, 0.115, 0);
  liquid.material = coffeeLiquidMat;

  return root;
}

/**
 * High-end architectural bar stool with leather cushion and bronze pedestal base.
 */
export function mkModernBarStool(
  scene: Scene,
  name: string,
  px: number,
  pz: number,
  rotY: number,
  seatH: number,
  leatherMat: StandardMaterial,
  bronzeMat: StandardMaterial,
  py: number = 0,
): TransformNode {
  const root = new TransformNode(`${name}_root`, scene);
  root.position = new Vector3(px, py, pz);
  root.rotation = new Vector3(0, rotY, 0);

  // Cast bronze circular base plate
  const base = MeshBuilder.CreateCylinder(`${name}_base`, { diameter: 0.42, height: 0.02, tessellation: 24 }, scene);
  base.parent = root;
  base.position = new Vector3(0, 0.01, 0);
  base.material = bronzeMat;

  // Central column
  const col = MeshBuilder.CreateCylinder(`${name}_col`, { diameter: 0.05, height: seatH - 0.08, tessellation: 20 }, scene);
  col.parent = root;
  col.position = new Vector3(0, (seatH - 0.08) / 2 + 0.01, 0);
  col.material = bronzeMat;

  // Circular footrest ring
  const ring = MeshBuilder.CreateTorus(`${name}_footrest`, { diameter: 0.32, thickness: 0.016, tessellation: 24 }, scene);
  ring.parent = root;
  ring.position = new Vector3(0, 0.28, 0);
  ring.material = bronzeMat;

  // 4 Radial bronze support spokes connecting central column to footrest ring
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const spoke = MeshBuilder.CreateCylinder(`${name}_spoke_${i}`, { diameter: 0.014, height: 0.13, tessellation: 12 }, scene);
    spoke.parent = root;
    spoke.rotation = new Vector3(0, 0, Math.PI / 2);
    spoke.rotation.y = angle;
    spoke.position = new Vector3(Math.cos(angle) * 0.08, 0.28, Math.sin(angle) * 0.08);
    spoke.material = bronzeMat;
  }

  // Round stitched leather seat cushion
  const seat = MeshBuilder.CreateCylinder(`${name}_seat`, { diameter: 0.38, height: 0.07, tessellation: 24 }, scene);
  seat.parent = root;
  seat.position = new Vector3(0, seatH - 0.035, 0);
  seat.material = leatherMat;

  // Dual vertical bronze support struts connecting seat to lumbar backrest
  for (const sx of [-0.09, 0.09]) {
    const strut = MeshBuilder.CreateCylinder(`${name}_strut_${sx < 0 ? 'l' : 'r'}`, { diameter: 0.016, height: 0.16, tessellation: 16 }, scene);
    strut.parent = root;
    strut.position = new Vector3(sx, seatH + 0.05, -0.16);
    strut.material = bronzeMat;
  }

  // Low ergonomic curved lumbar backrest
  const back = MeshBuilder.CreateBox(`${name}_back`, { width: 0.32, height: 0.14, depth: 0.04 }, scene);
  back.parent = root;
  back.position = new Vector3(0, seatH + 0.12, -0.16);
  back.material = leatherMat;

  return root;
}

/**
 * Commercial 2-Group Head Chrome & Walnut Espresso Machine.
 * Complete with dual saturated group heads, portafilters, analog manometers,
 * digital PID shot timers, steam wands, cup warming rack with ceramic demitasse cups,
 * milk frothing pitcher, live espresso extraction, and barista tamping station.
 */
export function mkEspressoMachine(
  scene: Scene,
  name: string,
  parent: TransformNode | null,
  px: number,
  py: number,
  pz: number,
  chromeMat: StandardMaterial,
  bronzeMat: StandardMaterial,
  walnutMat?: StandardMaterial,
): TransformNode {
  const root = new TransformNode(`${name}_root`, scene);
  if (parent) root.parent = parent;
  root.position = new Vector3(px, py, pz);

  // Materials
  const blackMat = solidMat(scene, `${name}_blkMat`, 0.08, 0.08, 0.09, 32);
  const darkChassisMat = solidMat(scene, `${name}_chassisMat`, 0.12, 0.13, 0.15, 48);
  const brushedSteelMat = solidMat(scene, `${name}_brushedSteel`, 0.72, 0.74, 0.78, 64, new Color3(0.5, 0.5, 0.55));
  const accentWood = walnutMat || solidMat(scene, `${name}_wood`, 0.28, 0.17, 0.10, 24);
  const goldTrimMat = solidMat(scene, `${name}_goldTrim`, 0.85, 0.68, 0.32, 80, new Color3(0.9, 0.75, 0.4));
  const porcelainWhiteMat = solidMat(scene, `${name}_porcelainWhite`, 0.95, 0.95, 0.94, 64);
  const porcelainMatteBlk = solidMat(scene, `${name}_porcelainBlk`, 0.12, 0.12, 0.13, 40);
  const porcelainTerra = solidMat(scene, `${name}_porcelainTerra`, 0.68, 0.35, 0.22, 28);
  const espressoLiquidMat = solidMat(scene, `${name}_espressoLiq`, 0.10, 0.05, 0.02, 90);

  const glassMat = new StandardMaterial(`${name}_glassMat`, scene);
  glassMat.diffuseColor = new Color3(0.85, 0.92, 0.98);
  glassMat.specularColor = new Color3(0.95, 0.95, 0.98);
  glassMat.specularPower = 128;
  glassMat.alpha = 0.38;

  // Dynamic Textures
  const pumpGaugeTex = createEspressoGaugeTexture(scene, 'pump');
  const pumpGaugeMat = new StandardMaterial(`${name}_pumpGaugeMat`, scene);
  pumpGaugeMat.diffuseTexture = pumpGaugeTex;
  pumpGaugeMat.emissiveColor = new Color3(0.3, 0.3, 0.3);

  const steamGaugeTex = createEspressoGaugeTexture(scene, 'steam');
  const steamGaugeMat = new StandardMaterial(`${name}_steamGaugeMat`, scene);
  steamGaugeMat.diffuseTexture = steamGaugeTex;
  steamGaugeMat.emissiveColor = new Color3(0.3, 0.3, 0.3);

  const pidTex = createEspressoPidDisplayTexture(scene);
  const pidMat = new StandardMaterial(`${name}_pidMat`, scene);
  pidMat.diffuseTexture = pidTex;
  pidMat.emissiveColor = new Color3(0.85, 0.88, 0.92);

  const grateTex = createEspressoDripGrateTexture(scene);
  const grateMat = new StandardMaterial(`${name}_grateMat`, scene);
  grateMat.diffuseTexture = grateTex;
  grateMat.specularPower = 64;

  const cremaTex = createCremaTexture(scene);
  const cremaMat = new StandardMaterial(`${name}_cremaMat`, scene);
  cremaMat.diffuseTexture = cremaTex;
  cremaMat.specularPower = 48;

  // 1. Isolation Feet (4 corners)
  for (const fx of [-0.26, 0.26]) {
    for (const fz of [-0.15, 0.15]) {
      const foot = MeshBuilder.CreateCylinder(`${name}_foot_${fx}_${fz}`, { diameter: 0.038, height: 0.025, tessellation: 18 }, scene);
      foot.parent = root;
      foot.position = new Vector3(fx, 0.022, fz);
      foot.material = chromeMat;

      const pad = MeshBuilder.CreateCylinder(`${name}_pad_${fx}_${fz}`, { diameter: 0.044, height: 0.010, tessellation: 18 }, scene);
      pad.parent = root;
      pad.position = new Vector3(fx, 0.005, fz);
      pad.material = blackMat;
    }
  }

  // 2. Base Chassis Sub-frame
  const baseFrame = MeshBuilder.CreateBox(`${name}_baseFrame`, { width: 0.58, height: 0.025, depth: 0.38 }, scene);
  baseFrame.parent = root;
  baseFrame.position = new Vector3(0, 0.045, -0.01);
  baseFrame.material = darkChassisMat;

  // 3. Main Central Boiler Body & Top Deck Housing
  const mainBoiler = MeshBuilder.CreateBox(`${name}_mainBoiler`, { width: 0.58, height: 0.22, depth: 0.32 }, scene);
  mainBoiler.parent = root;
  mainBoiler.position = new Vector3(0, 0.165, -0.04);
  mainBoiler.material = brushedSteelMat;

  const topHousing = MeshBuilder.CreateBox(`${name}_topHousing`, { width: 0.58, height: 0.08, depth: 0.36 }, scene);
  topHousing.parent = root;
  topHousing.position = new Vector3(0, 0.315, -0.02);
  topHousing.material = brushedSteelMat;

  // 4. Contoured Side Cheeks (with walnut wood inserts & chrome bolts)
  for (const sx of [-0.30, 0.30]) {
    const cheekFrame = MeshBuilder.CreateBox(`${name}_cheekFrame_${sx}`, { width: 0.02, height: 0.32, depth: 0.40 }, scene);
    cheekFrame.parent = root;
    cheekFrame.position = new Vector3(sx, 0.20, 0.01);
    cheekFrame.material = chromeMat;

    const cheekInsert = MeshBuilder.CreateBox(`${name}_cheekInsert_${sx}`, { width: 0.024, height: 0.26, depth: 0.34 }, scene);
    cheekInsert.parent = root;
    cheekInsert.position = new Vector3(sx, 0.20, 0.01);
    cheekInsert.material = accentWood;

    // 4 chrome decorative bolts per side
    for (const bx of [-0.13, 0.13]) {
      for (const by of [-0.10, 0.10]) {
        const bolt = MeshBuilder.CreateCylinder(`${name}_bolt_${sx}_${bx}_${by}`, { diameter: 0.012, height: 0.006, tessellation: 6 }, scene);
        bolt.parent = root;
        bolt.rotation = new Vector3(0, 0, Math.PI / 2);
        bolt.position = new Vector3(sx + (sx < 0 ? -0.013 : 0.013), 0.20 + by, 0.01 + bx);
        bolt.material = chromeMat;
      }
    }
  }

  // 5. Overhang Canopy (protrudes over group heads)
  const canopy = MeshBuilder.CreateBox(`${name}_canopy`, { width: 0.58, height: 0.065, depth: 0.18 }, scene);
  canopy.parent = root;
  canopy.position = new Vector3(0, 0.322, 0.10);
  canopy.material = brushedSteelMat;

  // Underside task light strip & LED downlight pucks
  const taskLightPanel = MeshBuilder.CreateBox(`${name}_taskLightPanel`, { width: 0.54, height: 0.006, depth: 0.14 }, scene);
  taskLightPanel.parent = root;
  taskLightPanel.position = new Vector3(0, 0.286, 0.10);
  taskLightPanel.material = darkChassisMat;

  const ledMat = new StandardMaterial(`${name}_ledMat`, scene);
  ledMat.diffuseColor = new Color3(1.0, 0.95, 0.85);
  ledMat.emissiveColor = new Color3(1.0, 0.95, 0.85);

  for (const lx of [-0.15, 0.15]) {
    const ledPuck = MeshBuilder.CreateCylinder(`${name}_ledPuck_${lx}`, { diameter: 0.028, height: 0.005, tessellation: 16 }, scene);
    ledPuck.parent = root;
    ledPuck.position = new Vector3(lx, 0.284, 0.13);
    ledPuck.material = ledMat;
  }

  // Recessed mirror chrome backsplash wall behind group heads
  const backSplash = MeshBuilder.CreateBox(`${name}_backSplash`, { width: 0.56, height: 0.17, depth: 0.008 }, scene);
  backSplash.parent = root;
  backSplash.position = new Vector3(0, 0.175, 0.01);
  backSplash.material = chromeMat;

  // Horizontal ventilation slots in back splash
  for (let vy = 0.12; vy <= 0.20; vy += 0.035) {
    const slot = MeshBuilder.CreateBox(`${name}_slot_${vy}`, { width: 0.44, height: 0.008, depth: 0.01 }, scene);
    slot.parent = root;
    slot.position = new Vector3(0, vy, 0.012);
    slot.material = darkChassisMat;
  }

  // 6. Slanted Front Control Fascia
  const fascia = MeshBuilder.CreateBox(`${name}_fascia`, { width: 0.58, height: 0.075, depth: 0.02 }, scene);
  fascia.parent = root;
  fascia.position = new Vector3(0, 0.332, 0.19);
  fascia.rotation = new Vector3(-0.20, 0, 0);
  fascia.material = darkChassisMat;

  // Center PID OLED Display Screen
  const pidScreen = MeshBuilder.CreateBox(`${name}_pidScreen`, { width: 0.20, height: 0.046, depth: 0.006 }, scene);
  pidScreen.parent = root;
  pidScreen.position = new Vector3(0, 0.342, 0.20);
  pidScreen.rotation = new Vector3(-0.20, 0, 0);
  pidScreen.material = pidMat;

  // Backlit volumetric touch button keypads for each group
  for (const kx of [-0.17, 0.17]) {
    const keyStrip = MeshBuilder.CreateBox(`${name}_keyStrip_${kx}`, { width: 0.11, height: 0.024, depth: 0.005 }, scene);
    keyStrip.parent = root;
    keyStrip.position = new Vector3(kx, 0.342, 0.20);
    keyStrip.rotation = new Vector3(-0.20, 0, 0);
    keyStrip.material = solidMat(scene, `${name}_keyStripMat_${kx}`, 0.20, 0.22, 0.26, 64);

    for (let bi = -1.5; bi <= 1.5; bi += 1) {
      const btn = MeshBuilder.CreateCylinder(`${name}_btn_${kx}_${bi}`, { diameter: 0.013, height: 0.004, tessellation: 12 }, scene);
      btn.parent = root;
      btn.rotation = new Vector3(Math.PI / 2 - 0.20, 0, 0);
      btn.position = new Vector3(kx + bi * 0.024, 0.342, 0.204);
      btn.material = chromeMat;
    }
  }

  // 7. Dual Precision Analog Manometers (Pump & Steam)
  const gaugeConfigs = [
    { x: -0.052, mat: pumpGaugeMat, label: 'pump' },
    { x:  0.052, mat: steamGaugeMat, label: 'steam' },
  ];
  for (const gc of gaugeConfigs) {
    const bezel = MeshBuilder.CreateCylinder(`${name}_bezel_${gc.label}`, { diameter: 0.052, height: 0.012, tessellation: 24 }, scene);
    bezel.parent = root;
    bezel.rotation = new Vector3(Math.PI / 2 - 0.20, 0, 0);
    bezel.position = new Vector3(gc.x, 0.288, 0.185);
    bezel.material = bronzeMat;

    const dial = MeshBuilder.CreateCylinder(`${name}_dial_${gc.label}`, { diameter: 0.046, height: 0.004, tessellation: 24 }, scene);
    dial.parent = root;
    dial.rotation = new Vector3(Math.PI / 2 - 0.20, 0, 0);
    dial.position = new Vector3(gc.x, 0.288, 0.191);
    dial.material = gc.mat;

    const lens = MeshBuilder.CreateCylinder(`${name}_lens_${gc.label}`, { diameter: 0.047, height: 0.003, tessellation: 24 }, scene);
    lens.parent = root;
    lens.rotation = new Vector3(Math.PI / 2 - 0.20, 0, 0);
    lens.position = new Vector3(gc.x, 0.288, 0.193);
    lens.material = glassMat;
  }

  // 8. Dual Saturated Commercial E61 Group Heads (x = -0.15, +0.15)
  for (const gx of [-0.15, 0.15]) {
    // Upper mounting neck
    const flange = MeshBuilder.CreateBox(`${name}_flange_${gx}`, { width: 0.08, height: 0.03, depth: 0.07 }, scene);
    flange.parent = root;
    flange.position = new Vector3(gx, 0.272, 0.115);
    flange.material = chromeMat;

    // Saturated brew group bell housing
    const bell = MeshBuilder.CreateCylinder(`${name}_bell_${gx}`, {
      diameterTop: 0.084,
      diameterBottom: 0.092,
      height: 0.065,
      tessellation: 24,
    }, scene);
    bell.parent = root;
    bell.position = new Vector3(gx, 0.23, 0.135);
    bell.material = chromeMat;

    // Chrome top dome cap
    const cap = MeshBuilder.CreateCylinder(`${name}_cap_${gx}`, { diameter: 0.055, height: 0.012, tessellation: 20 }, scene);
    cap.parent = root;
    cap.position = new Vector3(gx, 0.268, 0.135);
    cap.material = chromeMat;

    // Manual walnut/chrome brew paddle actuation lever on top
    const paddleBase = MeshBuilder.CreateCylinder(`${name}_pBase_${gx}`, { diameter: 0.018, height: 0.014, tessellation: 14 }, scene);
    paddleBase.parent = root;
    paddleBase.position = new Vector3(gx, 0.280, 0.135);
    paddleBase.material = chromeMat;

    const paddleArm = MeshBuilder.CreateCylinder(`${name}_pArm_${gx}`, { diameterTop: 0.014, diameterBottom: 0.010, height: 0.055, tessellation: 14 }, scene);
    paddleArm.parent = root;
    paddleArm.rotation = new Vector3(0.40, 0, 0);
    paddleArm.position = new Vector3(gx, 0.300, 0.150);
    paddleArm.material = accentWood;

    // Bayonet collar ring
    const collar = MeshBuilder.CreateCylinder(`${name}_collar_${gx}`, { diameter: 0.095, height: 0.018, tessellation: 24 }, scene);
    collar.parent = root;
    collar.position = new Vector3(gx, 0.192, 0.135);
    collar.material = chromeMat;

    // Shower screen underneath
    const screen = MeshBuilder.CreateCylinder(`${name}_screen_${gx}`, { diameter: 0.064, height: 0.005, tessellation: 20 }, scene);
    screen.parent = root;
    screen.position = new Vector3(gx, 0.180, 0.135);
    screen.material = brushedSteelMat;

    // Commercial Portafilter Assembly
    const pfBasket = MeshBuilder.CreateCylinder(`${name}_pfBasket_${gx}`, { diameter: 0.076, height: 0.030, tessellation: 24 }, scene);
    pfBasket.parent = root;
    pfBasket.position = new Vector3(gx, 0.174, 0.135);
    pfBasket.material = chromeMat;

    const pfNeck = MeshBuilder.CreateCylinder(`${name}_pfNeck_${gx}`, { diameter: 0.018, height: 0.040, tessellation: 16 }, scene);
    pfNeck.parent = root;
    pfNeck.rotation = new Vector3(Math.PI / 2, 0, 0);
    pfNeck.position = new Vector3(gx, 0.170, 0.180);
    pfNeck.material = chromeMat;

    const pfFerrule = MeshBuilder.CreateCylinder(`${name}_pfFerrule_${gx}`, { diameter: 0.022, height: 0.014, tessellation: 16 }, scene);
    pfFerrule.parent = root;
    pfFerrule.rotation = new Vector3(Math.PI / 2, 0, 0);
    pfFerrule.position = new Vector3(gx, 0.168, 0.205);
    pfFerrule.material = chromeMat;

    // Turned walnut wood handle with ergonomic contour
    const pfHandle = MeshBuilder.CreateCylinder(`${name}_pfHandle_${gx}`, {
      diameterTop: 0.022,
      diameterBottom: 0.026,
      height: 0.135,
      tessellation: 18,
    }, scene);
    pfHandle.parent = root;
    pfHandle.rotation = new Vector3(Math.PI / 2 + 0.12, 0, 0);
    pfHandle.position = new Vector3(gx, 0.158, 0.278);
    pfHandle.material = accentWood;

    // Chrome counterweight end-cap
    const pfCap = MeshBuilder.CreateCylinder(`${name}_pfCap_${gx}`, { diameter: 0.024, height: 0.016, tessellation: 16 }, scene);
    pfCap.parent = root;
    pfCap.rotation = new Vector3(Math.PI / 2 + 0.12, 0, 0);
    pfCap.position = new Vector3(gx, 0.148, 0.345);
    pfCap.material = chromeMat;

    // Dual dispensing spouts underneath portafilter
    const spoutBase = MeshBuilder.CreateBox(`${name}_spoutBase_${gx}`, { width: 0.028, height: 0.014, depth: 0.024 }, scene);
    spoutBase.parent = root;
    spoutBase.position = new Vector3(gx, 0.154, 0.135);
    spoutBase.material = chromeMat;

    for (const sx of [-0.012, 0.012]) {
      const spoutNozzle = MeshBuilder.CreateCylinder(`${name}_spoutNoz_${gx}_${sx}`, { diameter: 0.009, height: 0.024, tessellation: 14 }, scene);
      spoutNozzle.parent = root;
      spoutNozzle.rotation = new Vector3(0.15, 0, sx < 0 ? -0.2 : 0.2);
      spoutNozzle.position = new Vector3(gx + sx, 0.138, 0.135);
      spoutNozzle.material = chromeMat;
    }
  }

  // 9. Dual Articulated Commercial Cool-Touch Steam Wands (sx = -0.27, +0.27)
  for (const sx of [-0.27, 0.27]) {
    // Swivel knuckle
    const knuckle = MeshBuilder.CreateSphere(`${name}_knuckle_${sx}`, { diameter: 0.026, segments: 14 }, scene);
    knuckle.parent = root;
    knuckle.position = new Vector3(sx, 0.245, 0.15);
    knuckle.material = chromeMat;

    // Hex locknut collar
    const locknut = MeshBuilder.CreateCylinder(`${name}_locknut_${sx}`, { diameter: 0.032, height: 0.008, tessellation: 6 }, scene);
    locknut.parent = root;
    locknut.position = new Vector3(sx, 0.245, 0.14);
    locknut.material = chromeMat;

    // Upper wand pipe angled outward & forward
    const upperPipe = MeshBuilder.CreateCylinder(`${name}_upperPipe_${sx}`, { diameter: 0.011, height: 0.08, tessellation: 14 }, scene);
    upperPipe.parent = root;
    upperPipe.rotation = new Vector3(0.40, 0, sx < 0 ? 0.35 : -0.35);
    upperPipe.position = new Vector3(sx * 1.05, 0.225, 0.18);
    upperPipe.material = chromeMat;

    // Lower wand pipe descending toward drip tray
    const lowerPipe = MeshBuilder.CreateCylinder(`${name}_lowerPipe_${sx}`, { diameter: 0.011, height: 0.13, tessellation: 14 }, scene);
    lowerPipe.parent = root;
    lowerPipe.rotation = new Vector3(0.25, 0, sx < 0 ? -0.15 : 0.15);
    lowerPipe.position = new Vector3(sx * 1.15, 0.145, 0.22);
    lowerPipe.material = chromeMat;

    // Black silicone rubber heat-resistant burn grip
    const burnGrip = MeshBuilder.CreateCylinder(`${name}_burnGrip_${sx}`, { diameter: 0.018, height: 0.045, tessellation: 14 }, scene);
    burnGrip.parent = root;
    burnGrip.rotation = new Vector3(0.25, 0, sx < 0 ? -0.15 : 0.15);
    burnGrip.position = new Vector3(sx * 1.15, 0.145, 0.22);
    burnGrip.material = blackMat;

    // 4-hole precision chrome steam tip
    const steamTip = MeshBuilder.CreateCylinder(`${name}_steamTip_${sx}`, { diameter: 0.015, height: 0.018, tessellation: 14 }, scene);
    steamTip.parent = root;
    steamTip.rotation = new Vector3(0.25, 0, sx < 0 ? -0.15 : 0.15);
    steamTip.position = new Vector3(sx * 1.18, 0.082, 0.24);
    steamTip.material = chromeMat;

    // Upper rotary steam valve knob with walnut insert
    const valveBezel = MeshBuilder.CreateCylinder(`${name}_vBezel_${sx}`, { diameter: 0.038, height: 0.012, tessellation: 18 }, scene);
    valveBezel.parent = root;
    valveBezel.rotation = new Vector3(Math.PI / 2, 0, 0);
    valveBezel.position = new Vector3(sx, 0.335, 0.185);
    valveBezel.material = chromeMat;

    const valveKnob = MeshBuilder.CreateCylinder(`${name}_vKnob_${sx}`, { diameter: 0.032, height: 0.016, tessellation: 18 }, scene);
    valveKnob.parent = root;
    valveKnob.rotation = new Vector3(Math.PI / 2, 0, 0);
    valveKnob.position = new Vector3(sx, 0.335, 0.195);
    valveKnob.material = accentWood;
  }

  // 10. Central Hot Water Dispenser Tap
  const hwPipe = MeshBuilder.CreateCylinder(`${name}_hwPipe`, { diameter: 0.013, height: 0.065, tessellation: 14 }, scene);
  hwPipe.parent = root;
  hwPipe.rotation = new Vector3(Math.PI / 2, 0, 0);
  hwPipe.position = new Vector3(0, 0.245, 0.08);
  hwPipe.material = chromeMat;

  const hwSpout = MeshBuilder.CreateCylinder(`${name}_hwSpout`, { diameter: 0.015, height: 0.032, tessellation: 14 }, scene);
  hwSpout.parent = root;
  hwSpout.position = new Vector3(0, 0.225, 0.115);
  hwSpout.material = chromeMat;

  // 11. Barista Drip Tray & Laser-Cut Slotted Grate
  const dripCatch = MeshBuilder.CreateBox(`${name}_dripCatch`, { width: 0.62, height: 0.042, depth: 0.24 }, scene);
  dripCatch.parent = root;
  dripCatch.position = new Vector3(0, 0.021, 0.21);
  dripCatch.material = darkChassisMat;

  const dripGrate = MeshBuilder.CreateBox(`${name}_dripGrate`, { width: 0.60, height: 0.006, depth: 0.22 }, scene);
  dripGrate.parent = root;
  dripGrate.position = new Vector3(0, 0.044, 0.21);
  dripGrate.material = grateMat;

  // Front chrome lip & brand badge
  const frontLip = MeshBuilder.CreateBox(`${name}_frontLip`, { width: 0.624, height: 0.044, depth: 0.012 }, scene);
  frontLip.parent = root;
  frontLip.position = new Vector3(0, 0.022, 0.332);
  frontLip.material = chromeMat;

  const brandBadge = MeshBuilder.CreateBox(`${name}_badge`, { width: 0.20, height: 0.018, depth: 0.003 }, scene);
  brandBadge.parent = root;
  brandBadge.position = new Vector3(0, 0.022, 0.339);
  brandBadge.material = goldTrimMat;

  // 12. Top Cup Warming Deck & Perimeter Wire Rail
  const warmingDeck = MeshBuilder.CreateBox(`${name}_warmDeck`, { width: 0.56, height: 0.008, depth: 0.32 }, scene);
  warmingDeck.parent = root;
  warmingDeck.position = new Vector3(0, 0.362, -0.02);
  warmingDeck.material = brushedSteelMat;

  // Wire guardrails around warming deck
  const railPosts = [
    [-0.27, 0.13], [0.27, 0.13],
    [-0.27, -0.17], [0.27, -0.17],
    [-0.27, -0.02], [0.27, -0.02],
  ];
  for (let i = 0; i < railPosts.length; i++) {
    const [rx, rz] = railPosts[i];
    const post = MeshBuilder.CreateCylinder(`${name}_post_${i}`, { diameter: 0.006, height: 0.044, tessellation: 12 }, scene);
    post.parent = root;
    post.position = new Vector3(rx, 0.384, rz);
    post.material = chromeMat;
  }

  // Horizontal perimeter rails
  // Left side rail
  const railL = MeshBuilder.CreateCylinder(`${name}_railL`, { diameter: 0.005, height: 0.30, tessellation: 12 }, scene);
  railL.parent = root;
  railL.rotation = new Vector3(Math.PI / 2, 0, 0);
  railL.position = new Vector3(-0.27, 0.405, -0.02);
  railL.material = chromeMat;

  // Right side rail
  const railR = MeshBuilder.CreateCylinder(`${name}_railR`, { diameter: 0.005, height: 0.30, tessellation: 12 }, scene);
  railR.parent = root;
  railR.rotation = new Vector3(Math.PI / 2, 0, 0);
  railR.position = new Vector3(0.27, 0.405, -0.02);
  railR.material = chromeMat;

  // Back rail
  const railB = MeshBuilder.CreateCylinder(`${name}_railB`, { diameter: 0.005, height: 0.54, tessellation: 12 }, scene);
  railB.parent = root;
  railB.rotation = new Vector3(0, 0, Math.PI / 2);
  railB.position = new Vector3(0, 0.405, -0.17);
  railB.material = chromeMat;

  // 13. Authentic Ceramic Cafe Cups on Warming Deck
  const mkDemitasse = (id: string, cx: number, cz: number, cMat: StandardMaterial, inverted = false, hasLiquid = true) => {
    const saucer = MeshBuilder.CreateCylinder(`${name}_saucer_${id}`, { diameter: 0.082, height: 0.006, tessellation: 20 }, scene);
    saucer.parent = root;
    saucer.position = new Vector3(cx, 0.370, cz);
    saucer.material = cMat;

    const cup = MeshBuilder.CreateCylinder(`${name}_cup_${id}`, {
      diameterTop: inverted ? 0.038 : 0.054,
      diameterBottom: inverted ? 0.054 : 0.038,
      height: 0.046,
      tessellation: 20,
    }, scene);
    cup.parent = root;
    cup.position = new Vector3(cx, 0.395, cz);
    cup.material = cMat;

    // Ceramic loop handle
    const handle = MeshBuilder.CreateTorus(`${name}_handle_${id}`, { diameter: 0.020, thickness: 0.005, tessellation: 16 }, scene);
    handle.parent = root;
    handle.position = new Vector3(cx - 0.030, 0.395, cz);
    handle.rotation = new Vector3(0, 0, Math.PI / 2);
    handle.material = cMat;

    if (!inverted && hasLiquid) {
      const liquid = MeshBuilder.CreateCylinder(`${name}_liq_${id}`, { diameter: 0.046, height: 0.002, tessellation: 16 }, scene);
      liquid.parent = root;
      liquid.position = new Vector3(cx, 0.414, cz);
      liquid.material = cremaMat;
    }
  };

  // Front row cups
  mkDemitasse('w1', -0.18, 0.03, porcelainWhiteMat, false, true);
  mkDemitasse('blk1', -0.06, 0.03, porcelainMatteBlk, false, true);
  mkDemitasse('terra1', 0.06, 0.03, porcelainTerra, false, true);

  // Wide ceramic latte/cappuccino cup on right
  const latSaucer = MeshBuilder.CreateCylinder(`${name}_latSaucer`, { diameter: 0.105, height: 0.007, tessellation: 22 }, scene);
  latSaucer.parent = root;
  latSaucer.position = new Vector3(0.18, 0.370, 0.02);
  latSaucer.material = porcelainWhiteMat;

  const latCup = MeshBuilder.CreateCylinder(`${name}_latCup`, {
    diameterTop: 0.082,
    diameterBottom: 0.048,
    height: 0.054,
    tessellation: 22,
  }, scene);
  latCup.parent = root;
  latCup.position = new Vector3(0.18, 0.398, 0.02);
  latCup.material = porcelainWhiteMat;

  const latHandle = MeshBuilder.CreateTorus(`${name}_latHandle`, { diameter: 0.024, thickness: 0.006, tessellation: 16 }, scene);
  latHandle.parent = root;
  latHandle.position = new Vector3(0.225, 0.398, 0.02);
  latHandle.rotation = new Vector3(0, 0, Math.PI / 2);
  latHandle.material = porcelainWhiteMat;

  const latFoam = MeshBuilder.CreateCylinder(`${name}_latFoam`, { diameter: 0.076, height: 0.002, tessellation: 20 }, scene);
  latFoam.parent = root;
  latFoam.position = new Vector3(0.18, 0.420, 0.02);
  latFoam.material = cremaMat;

  // Rear warming row: 3 stacked inverted demitasse cups
  mkDemitasse('inv1', -0.16, -0.09, porcelainWhiteMat, true, false);
  mkDemitasse('inv2',  0.00, -0.09, porcelainWhiteMat, true, false);
  mkDemitasse('inv3',  0.16, -0.09, porcelainWhiteMat, true, false);

  // 14. Live Double Espresso Extraction (Under Left Group Head at x = -0.15)
  const shotGlassBase = MeshBuilder.CreateCylinder(`${name}_sgBase`, { diameter: 0.046, height: 0.012, tessellation: 20 }, scene);
  shotGlassBase.parent = root;
  shotGlassBase.position = new Vector3(-0.15, 0.053, 0.135);
  shotGlassBase.material = glassMat;

  const shotGlassWall = MeshBuilder.CreateCylinder(`${name}_sgWall`, {
    diameterTop: 0.052,
    diameterBottom: 0.044,
    height: 0.045,
    tessellation: 20,
  }, scene);
  shotGlassWall.parent = root;
  shotGlassWall.position = new Vector3(-0.15, 0.080, 0.135);
  shotGlassWall.material = glassMat;

  const shotLiquid = MeshBuilder.CreateCylinder(`${name}_sgLiq`, { diameter: 0.046, height: 0.026, tessellation: 18 }, scene);
  shotLiquid.parent = root;
  shotLiquid.position = new Vector3(-0.15, 0.075, 0.135);
  shotLiquid.material = espressoLiquidMat;

  const shotCrema = MeshBuilder.CreateCylinder(`${name}_sgCrema`, { diameter: 0.048, height: 0.006, tessellation: 18 }, scene);
  shotCrema.parent = root;
  shotCrema.position = new Vector3(-0.15, 0.090, 0.135);
  shotCrema.material = cremaMat;

  // 15. Brushed Stainless Steel Barista Milk Frothing Pitcher (Beside Right Wand at x = 0.22, z = 0.23)
  const pitcher = MeshBuilder.CreateCylinder(`${name}_pitcher`, {
    diameterTop: 0.066,
    diameterBottom: 0.078,
    height: 0.095,
    tessellation: 22,
  }, scene);
  pitcher.parent = root;
  pitcher.position = new Vector3(0.22, 0.095, 0.23);
  pitcher.material = brushedSteelMat;

  // Pouring spout
  const pitcherSpout = MeshBuilder.CreateCylinder(`${name}_pSpout`, {
    diameterTop: 0.006,
    diameterBottom: 0.026,
    height: 0.022,
    tessellation: 3,
  }, scene);
  pitcherSpout.parent = root;
  pitcherSpout.rotation = new Vector3(0.35, 0, 0);
  pitcherSpout.position = new Vector3(0.22, 0.142, 0.265);
  pitcherSpout.material = brushedSteelMat;

  // Pitcher looped handle
  const pHandle = MeshBuilder.CreateTorus(`${name}_pHandle`, { diameter: 0.052, thickness: 0.007, tessellation: 16 }, scene);
  pHandle.parent = root;
  pHandle.rotation = new Vector3(0, 0, Math.PI / 2);
  pHandle.position = new Vector3(0.22, 0.095, 0.185);
  pHandle.material = brushedSteelMat;

  // 16. Professional Countertop Barista Tamping Station (on counter to the right: x = 0.38)
  const tampMat = MeshBuilder.CreateBox(`${name}_tampMat`, { width: 0.13, height: 0.012, depth: 0.16 }, scene);
  tampMat.parent = root;
  tampMat.position = new Vector3(0.38, 0.006, 0.12);
  tampMat.material = blackMat;

  // 58mm Heavyweight Stainless Tamper with Turned Walnut Handle
  const tamperBase = MeshBuilder.CreateCylinder(`${name}_tamperBase`, { diameter: 0.058, height: 0.016, tessellation: 24 }, scene);
  tamperBase.parent = root;
  tamperBase.position = new Vector3(0.38, 0.020, 0.12);
  tamperBase.material = chromeMat;

  const tamperHandle = MeshBuilder.CreateCylinder(`${name}_tamperH`, {
    diameterTop: 0.034,
    diameterBottom: 0.024,
    height: 0.068,
    tessellation: 20,
  }, scene);
  tamperHandle.parent = root;
  tamperHandle.position = new Vector3(0.38, 0.062, 0.12);
  tamperHandle.material = accentWood;

  const tamperCap = MeshBuilder.CreateCylinder(`${name}_tamperCap`, { diameter: 0.035, height: 0.008, tessellation: 20 }, scene);
  tamperCap.parent = root;
  tamperCap.position = new Vector3(0.38, 0.098, 0.12);
  tamperCap.material = chromeMat;

  return root;
}

/**
 * Commercial On-Demand Burr Coffee Grinder (Matte Black & Stainless Steel).
 * Complete with tinted conical bean hopper, visible roasted beans, digital dosing screen,
 * micrometric grind collar, chrome dispensing chute, portafilter fork, and knock box.
 */
export function mkCommercialCoffeeGrinder(
  scene: Scene,
  name: string,
  px: number,
  py: number,
  pz: number,
  chromeMat: StandardMaterial,
  bronzeMat: StandardMaterial,
  walnutMat?: StandardMaterial,
): TransformNode {
  const root = new TransformNode(`${name}_root`, scene);
  root.position = new Vector3(px, py, pz);

  const blackMat = solidMat(scene, `${name}_blkMat`, 0.10, 0.10, 0.12, 32);
  const darkMetalMat = solidMat(scene, `${name}_darkMetal`, 0.16, 0.17, 0.19, 48);

  // 1. Heavy cast aluminum pedestal base with non-slip pads
  const base = MeshBuilder.CreateBox(`${name}_base`, { width: 0.18, height: 0.035, depth: 0.26 }, scene);
  base.parent = root;
  base.position = new Vector3(0, 0.0175, 0.02);
  base.material = darkMetalMat;

  // Removable magnetic stainless steel catch tray on front base
  const catchTray = MeshBuilder.CreateBox(`${name}_tray`, { width: 0.14, height: 0.008, depth: 0.11 }, scene);
  catchTray.parent = root;
  catchTray.position = new Vector3(0, 0.039, 0.08);
  catchTray.material = chromeMat;

  // 2. Main cylindrical motor chassis
  const motor = MeshBuilder.CreateCylinder(`${name}_motor`, { diameter: 0.15, height: 0.22, tessellation: 28 }, scene);
  motor.parent = root;
  motor.position = new Vector3(0, 0.145, -0.02);
  motor.material = blackMat;

  // Brushed aluminum middle collar band
  const band = MeshBuilder.CreateCylinder(`${name}_band`, { diameter: 0.154, height: 0.012, tessellation: 28 }, scene);
  band.parent = root;
  band.position = new Vector3(0, 0.145, -0.02);
  band.material = chromeMat;

  // 3. Front angled digital dosing touchscreen panel
  const displayBox = MeshBuilder.CreateBox(`${name}_dispBox`, { width: 0.09, height: 0.08, depth: 0.02 }, scene);
  displayBox.parent = root;
  displayBox.position = new Vector3(0, 0.175, 0.055);
  displayBox.rotation = new Vector3(-0.25, 0, 0);

  const dispMat = new StandardMaterial(`${name}_dispMat`, scene);
  dispMat.diffuseTexture = createCoffeeGrinderTexture(scene);
  dispMat.emissiveColor = new Color3(0.85, 0.85, 0.90);
  displayBox.material = dispMat;

  // 4. Hands-free portafilter fork cradle
  for (const fx of [-0.028, 0.028]) {
    const forkProng = MeshBuilder.CreateCylinder(`${name}_fork_${fx}`, { diameter: 0.007, height: 0.065, tessellation: 12 }, scene);
    forkProng.parent = root;
    forkProng.rotation = new Vector3(Math.PI / 2, 0, 0);
    forkProng.position = new Vector3(fx, 0.09, 0.08);
    forkProng.material = chromeMat;
  }

  // Chrome grounds dispensing chute directly above fork
  const chute = MeshBuilder.CreateBox(`${name}_chute`, { width: 0.038, height: 0.045, depth: 0.04 }, scene);
  chute.parent = root;
  chute.position = new Vector3(0, 0.125, 0.055);
  chute.rotation = new Vector3(0.3, 0, 0);
  chute.material = chromeMat;

  // 5. Micrometric grind fineness adjustment collar ring
  const collar = MeshBuilder.CreateCylinder(`${name}_collar`, { diameter: 0.162, height: 0.028, tessellation: 32 }, scene);
  collar.parent = root;
  collar.position = new Vector3(0, 0.265, -0.02);
  collar.material = bronzeMat;

  // 6. Transparent tinted polycarbonate bean hopper
  const hopperGlass = MeshBuilder.CreateCylinder(`${name}_hopperGlass`, {
    diameterTop: 0.155,
    diameterBottom: 0.082,
    height: 0.15,
    tessellation: 28,
  }, scene);
  hopperGlass.parent = root;
  hopperGlass.position = new Vector3(0, 0.35, -0.02);

  const hopperMat = new StandardMaterial(`${name}_hopperGlassMat`, scene);
  hopperMat.diffuseColor = new Color3(0.35, 0.28, 0.20);
  hopperMat.specularColor = new Color3(0.9, 0.9, 0.9);
  hopperMat.specularPower = 120;
  hopperMat.alpha = 0.42;
  hopperMat.backFaceCulling = false;
  hopperGlass.material = hopperMat;

  // Roasted whole coffee beans inside the hopper
  const beansMesh = MeshBuilder.CreateCylinder(`${name}_beans`, {
    diameterTop: 0.146,
    diameterBottom: 0.076,
    height: 0.135,
    tessellation: 24,
  }, scene);
  beansMesh.parent = root;
  beansMesh.position = new Vector3(0, 0.345, -0.02);
  const beansMat = new StandardMaterial(`${name}_beansMat`, scene);
  beansMat.diffuseTexture = createCoffeeBeansTexture(scene);
  beansMat.specularColor = new Color3(0.25, 0.20, 0.15);
  beansMesh.material = beansMat;

  // Hopper lid & grip knob
  const lid = MeshBuilder.CreateCylinder(`${name}_lid`, { diameter: 0.16, height: 0.015, tessellation: 28 }, scene);
  lid.parent = root;
  lid.position = new Vector3(0, 0.43, -0.02);
  lid.material = darkMetalMat;

  const knob = MeshBuilder.CreateCylinder(`${name}_knob`, { diameter: 0.026, height: 0.018, tessellation: 16 }, scene);
  knob.parent = root;
  knob.position = new Vector3(0, 0.445, -0.02);
  knob.material = chromeMat;

  // Hopper shut-off slide gate
  const gate = MeshBuilder.CreateBox(`${name}_gate`, { width: 0.05, height: 0.005, depth: 0.07 }, scene);
  gate.parent = root;
  gate.position = new Vector3(0, 0.278, 0.02);
  gate.material = chromeMat;

  // 7. Compact Barista Knock Box with Walnut Housing right beside grinder
  const knockBoxHousing = MeshBuilder.CreateBox(`${name}_kbHousing`, { width: 0.14, height: 0.088, depth: 0.14 }, scene);
  knockBoxHousing.parent = root;
  knockBoxHousing.position = new Vector3(0.18, 0.044, 0.04);
  knockBoxHousing.material = walnutMat || solidMat(scene, `${name}_kbWood`, 0.28, 0.17, 0.10, 24);

  const knockBox = MeshBuilder.CreateBox(`${name}_knockBox`, { width: 0.12, height: 0.09, depth: 0.12 }, scene);
  knockBox.parent = root;
  knockBox.position = new Vector3(0.18, 0.045, 0.04);
  knockBox.material = blackMat;

  // Rubber strike dampening bar across knock box
  const strikeBar = MeshBuilder.CreateCylinder(`${name}_strikeBar`, { diameter: 0.022, height: 0.125, tessellation: 16 }, scene);
  strikeBar.parent = root;
  strikeBar.rotation = new Vector3(0, 0, Math.PI / 2);
  strikeBar.position = new Vector3(0.18, 0.08, 0.04);
  strikeBar.material = solidMat(scene, `${name}_rubberBar`, 0.05, 0.05, 0.05, 12);

  // Spent coffee puck inside
  const puck = MeshBuilder.CreateCylinder(`${name}_puck`, { diameter: 0.062, height: 0.018, tessellation: 16 }, scene);
  puck.parent = root;
  puck.position = new Vector3(0.18, 0.02, 0.04);
  puck.material = solidMat(scene, `${name}_puckMat`, 0.16, 0.09, 0.05, 8);

  return root;
}

/**
 * Polished Dual Draft Beverage Tap Tower (Cold Brew Nitro & Sparkling Water).
 */
export function mkBeverageDraftTapTower(
  scene: Scene,
  name: string,
  px: number,
  py: number,
  pz: number,
  chromeMat: StandardMaterial,
  bronzeMat: StandardMaterial,
  walnutMat?: StandardMaterial,
): TransformNode {
  const root = new TransformNode(`${name}_root`, scene);
  root.position = new Vector3(px, py, pz);

  const tapWood = walnutMat || solidMat(scene, `${name}_tapWood`, 0.28, 0.17, 0.10, 24);

  // Flanged chrome counter mount
  const baseFlange = MeshBuilder.CreateCylinder(`${name}_flange`, { diameter: 0.14, height: 0.015, tessellation: 24 }, scene);
  baseFlange.parent = root;
  baseFlange.position = new Vector3(0, 0.0075, 0);
  baseFlange.material = chromeMat;

  // Main polished chrome tower cylinder
  const col = MeshBuilder.CreateCylinder(`${name}_col`, { diameter: 0.095, height: 0.38, tessellation: 24 }, scene);
  col.parent = root;
  col.position = new Vector3(0, 0.19, 0);
  col.material = chromeMat;

  // Tower top cap dome
  const topCap = MeshBuilder.CreateCylinder(`${name}_topCap`, { diameter: 0.10, height: 0.015, tessellation: 24 }, scene);
  topCap.parent = root;
  topCap.position = new Vector3(0, 0.385, 0);
  topCap.material = chromeMat;

  // Dual horizontal faucet shanks extending forward
  for (const tx of [-0.055, 0.055]) {
    const shank = MeshBuilder.CreateCylinder(`${name}_shank_${tx}`, { diameter: 0.024, height: 0.07, tessellation: 16 }, scene);
    shank.parent = root;
    shank.rotation = new Vector3(Math.PI / 2, 0, 0);
    shank.position = new Vector3(tx, 0.28, 0.05);
    shank.material = chromeMat;

    // Curved faucet spout pointing downward
    const spout = MeshBuilder.CreateCylinder(`${name}_spout_${tx}`, { diameter: 0.014, height: 0.065, tessellation: 16 }, scene);
    spout.parent = root;
    spout.position = new Vector3(tx, 0.24, 0.08);
    spout.material = chromeMat;

    // Turned walnut wood tap handle
    const handle = MeshBuilder.CreateCylinder(`${name}_handle_${tx}`, { diameterTop: 0.024, diameterBottom: 0.016, height: 0.11, tessellation: 16 }, scene);
    handle.parent = root;
    handle.position = new Vector3(tx, 0.36, 0.05);
    handle.material = tapWood;

    // Chrome ferrule ring
    const ferrule = MeshBuilder.CreateCylinder(`${name}_ferrule_${tx}`, { diameter: 0.022, height: 0.014, tessellation: 16 }, scene);
    ferrule.parent = root;
    ferrule.position = new Vector3(tx, 0.30, 0.05);
    ferrule.material = chromeMat;

    // Tap Medallion badge
    const badge = MeshBuilder.CreateCylinder(`${name}_badge_${tx}`, { diameter: 0.036, height: 0.008, tessellation: 16 }, scene);
    badge.parent = root;
    badge.rotation = new Vector3(Math.PI / 2, 0, 0);
    badge.position = new Vector3(tx, 0.37, 0.065);
    badge.material = tx < 0 ? bronzeMat : chromeMat;
  }

  // Mini stainless steel drip tray under faucets
  const drip = MeshBuilder.CreateBox(`${name}_drip`, { width: 0.22, height: 0.016, depth: 0.14 }, scene);
  drip.parent = root;
  drip.position = new Vector3(0, 0.008, 0.10);
  drip.material = solidMat(scene, `${name}_dripMat`, 0.70, 0.72, 0.75, 64);

  return root;
}

/**
 * Architectural Suspended Linear LED Pendant Trough Fixture.
 */
function mkLinearSuspendedLight(
  scene: Scene,
  name: string,
  px: number,
  py: number,
  pz: number,
  length: number,
  axis: 'X' | 'Z',
  bronzeMat: StandardMaterial,
): void {
  const w = axis === 'X' ? length : 0.16;
  const d = axis === 'Z' ? length : 0.16;
  const h = 0.10;

  // Pendant fixture body
  mkBox(scene, `${name}_body`, w, h, d, px, py, pz, bronzeMat, false);

  // Warm LED diffuser strip on underside
  const diffMat = new StandardMaterial(`${name}_diffMat`, scene);
  diffMat.diffuseColor = new Color3(1.0, 0.94, 0.84);
  diffMat.emissiveColor = new Color3(1.0, 0.94, 0.84);
  const dw = axis === 'X' ? length - 0.08 : 0.10;
  const dd = axis === 'Z' ? length - 0.08 : 0.10;
  mkBox(scene, `${name}_diff`, dw, 0.02, dd, px, py - h / 2 - 0.005, pz, diffMat, false);

  // Suspension wire cables to ceiling (ceiling is at y = 4.0)
  const cableMat = solidMat(scene, `${name}_cableMat`, 0.15, 0.15, 0.15, 64);
  const cableH = 4.0 - py;
  const cableOffset = length / 2 - 0.3;
  if (axis === 'X') {
    mkBox(scene, `${name}_wireL`, 0.015, cableH, 0.015, px - cableOffset, py + cableH / 2, pz, cableMat, false);
    mkBox(scene, `${name}_wireR`, 0.015, cableH, 0.015, px + cableOffset, py + cableH / 2, pz, cableMat, false);
  } else {
    mkBox(scene, `${name}_wireL`, 0.015, cableH, 0.015, px, py + cableH / 2, pz - cableOffset, cableMat, false);
    mkBox(scene, `${name}_wireR`, 0.015, cableH, 0.015, px, py + cableH / 2, pz + cableOffset, cableMat, false);
  }
}

/**
 * Linear Fluted Walnut Planter Credenza Buffer Wall.
 */
function mkPlanterBufferCredenza(
  scene: Scene,
  name: string,
  px: number,
  pz: number,
  depth: number,
  walnutMat: StandardMaterial,
  bronzeMat: StandardMaterial,
): void {
  const w = 0.44;
  const h = 0.74;

  // Fluted walnut credenza base (with solid collision)
  mkBox(scene, `${name}_body`, w, h, depth, px, h / 2, pz, walnutMat, true);

  // Bronze perimeter top sill / rim
  mkBox(scene, `${name}_rim`, w + 0.04, 0.04, depth + 0.04, px, h + 0.02, pz, bronzeMat, false);

  // Soil interior bedding
  const soilMat = solidMat(scene, `${name}_soilMat`, 0.14, 0.11, 0.09, 8);
  mkBox(scene, `${name}_soil`, w - 0.06, 0.02, depth - 0.06, px, h + 0.02, pz, soilMat, false);
}

/**
 * Designer Circular Pedestal Coffee Table (Zone B).
 */
export function mkLoungeTable(scene: Scene, name: string, cx: number, czPos: number, baseY: number = 0): void {
  const TABLE_H = 0.42;
  const TOP_D   = 0.78;
  const BASE_D  = 0.52;

  const baseMat = solidMat(scene, `${name}BaseMat`, 0.16, 0.16, 0.18, 32);
  const topMat = solidMat(scene, `${name}TopMat`, 0.18, 0.19, 0.20, 64, new Color3(0.30, 0.30, 0.32));
  const trimMat = solidMat(scene, `${name}TrimMat`, 0.68, 0.52, 0.30, 48, new Color3(0.45, 0.35, 0.20));

  // Tapered base plinth
  const basePlinth = MeshBuilder.CreateCylinder(`${name}_plinth`,
    { diameter: BASE_D, height: 0.04, tessellation: 36 }, scene);
  basePlinth.position = new Vector3(cx, baseY + 0.02, czPos);
  basePlinth.material = baseMat;
  basePlinth.checkCollisions = true;

  const pedestal = MeshBuilder.CreateCylinder(`${name}_pedestal`,
    { diameterTop: 0.36, diameterBottom: 0.46, height: TABLE_H - 0.08, tessellation: 36 }, scene);
  pedestal.position = new Vector3(cx, baseY + (TABLE_H - 0.08) / 2 + 0.04, czPos);
  pedestal.material = baseMat;
  pedestal.checkCollisions = true;

  // Brushed bronze reveal ring
  const trimRing = MeshBuilder.CreateCylinder(`${name}_trim`,
    { diameter: 0.38, height: 0.015, tessellation: 36 }, scene);
  trimRing.position = new Vector3(cx, baseY + TABLE_H - 0.045, czPos);
  trimRing.material = trimMat;

  // Honed stone table top
  const top = MeshBuilder.CreateCylinder(`${name}_top`,
    { diameter: TOP_D, height: 0.035, tessellation: 48 }, scene);
  top.position = new Vector3(cx, baseY + TABLE_H - 0.0175, czPos);
  top.material = topMat;
  top.checkCollisions = true;

  // Ceramic mug accessory
  const mugMat = solidMat(scene, `${name}_mugMat`, 0.94, 0.92, 0.88, 20);
  const mug = MeshBuilder.CreateCylinder(`${name}_mug`,
    { diameter: 0.08, height: 0.09, tessellation: 20 }, scene);
  mug.position = new Vector3(cx + 0.18, baseY + TABLE_H + 0.045, czPos - 0.12);
  mug.material = mugMat;
}

/**
 * Rectangular Walnut Executive Coffee Table for Zone A.
 */
export function mkExecutiveCoffeeTable(
  scene: Scene, name: string,
  cx: number, czPos: number,
  walnutMat: StandardMaterial,
  bronzeMat: StandardMaterial,
  baseY: number = 0,
): void {
  const W = 1.45;
  const D = 0.72;
  const H = 0.42;

  // Solid walnut slab
  mkBox(scene, `${name}_top`, W, 0.045, D, cx, baseY + H - 0.0225, czPos, walnutMat, true);

  // Recessed dark bronze frame / legs
  const legT = 0.04;
  const legH = H - 0.045;
  mkBox(scene, `${name}_legL`, legT, legH, D - 0.08, cx - W / 2 + 0.08, baseY + legH / 2, czPos, bronzeMat, true);
  mkBox(scene, `${name}_legR`, legT, legH, D - 0.08, cx + W / 2 - 0.08, baseY + legH / 2, czPos, bronzeMat, true);
  mkBox(scene, `${name}_stretcher`, W - 0.20, legT, legT, cx, baseY + 0.08, czPos, bronzeMat, false);
}

/**
 * Modern Architectural Side Table with ceramic planter.
 */
export function mkModernSideTable(
  scene: Scene, name: string,
  cx: number, czPos: number,
  bronzeMat: StandardMaterial,
  baseY: number = 0,
): void {
  const TABLE_H = 0.48;
  const TOP_D = 0.42;

  const topMat = solidMat(scene, `${name}TopMat`, 0.92, 0.88, 0.82, 40);
  mkDisc(scene, `${name}_top`, TOP_D, 0.03, cx, baseY + TABLE_H - 0.015, czPos, topMat, 32, true);

  // Tripod bronze legs
  for (let i = 0; i < 3; i++) {
    const angle = (i * 2 * Math.PI) / 3;
    const lx = cx + 0.15 * Math.cos(angle);
    const lz = czPos + 0.15 * Math.sin(angle);
    mkBox(scene, `${name}_leg_${i}`, 0.025, TABLE_H - 0.03, 0.025, lx, baseY + (TABLE_H - 0.03) / 2, lz, bronzeMat, true);
  }
}

/**
 * Framed Museum-grade Wall Art Panel with top picture light.
 */
export function mkArtworkPanel(
  scene: Scene, name: string,
  px: number, py: number, pz: number,
  rotY: number,
  w: number, h: number,
  artTex: DynamicTexture,
  frameMat: StandardMaterial,
): void {
  const FRAME_T = 0.03;
  const FRAME_D = 0.04;

  // Frame outer border
  mkBox(scene, `${name}_frame`, w + FRAME_T * 2, h + FRAME_T * 2, FRAME_D, px, py, pz, frameMat, false);

  // Canvas plane
  const artMat = new StandardMaterial(`${name}_mat`, scene);
  artMat.diffuseTexture = artTex;
  artMat.specularPower  = 6;

  const canvas = MeshBuilder.CreatePlane(`${name}_canvas`, { width: w, height: h }, scene);
  canvas.position = new Vector3(px, py, pz + (rotY === 0 ? -FRAME_D / 2 - 0.005 : FRAME_D / 2 + 0.005));
  canvas.rotation = new Vector3(0, rotY, 0);
  canvas.material = artMat;

  // Picture light fixture above frame
  const fixtureMat = solidMat(scene, `${name}_picLightMat`, 0.65, 0.50, 0.30, 50);
  const lightBar = MeshBuilder.CreateCylinder(`${name}_lightBar`, { diameter: 0.03, height: w * 0.65 }, scene);
  lightBar.position = new Vector3(px, py + h / 2 + 0.16, pz + (rotY === 0 ? -0.18 : 0.18));
  lightBar.rotation = new Vector3(0, 0, Math.PI / 2);
  lightBar.material = fixtureMat;

  // Small arm
  mkBox(scene, `${name}_arm`, 0.02, 0.02, 0.18, px, py + h / 2 + 0.16, pz + (rotY === 0 ? -0.09 : 0.09), fixtureMat, false);
}

/**
 * Recessed Ceiling Downlight Can Trim with Frosted Lens.
 */
export function mkDownlightFixture(scene: Scene, name: string, px: number, py: number, pz: number): void {
  const bezelMat = solidMat(scene, `${name}_bezelMat`, 0.16, 0.16, 0.18, 40);
  const lensMat  = solidMat(scene, `${name}_lensMat`, 0.98, 0.96, 0.90, 8);
  lensMat.emissiveColor = new Color3(0.92, 0.88, 0.80);

  // Outer bezel ring
  const bezel = MeshBuilder.CreateCylinder(`${name}_bezel`, { diameter: 0.22, height: 0.02, tessellation: 12 }, scene);
  bezel.position = new Vector3(px, py - 0.01, pz);
  bezel.material = bezelMat;
  bezel.isPickable = false;
  bezel.freezeWorldMatrix();

  // Frosted center lens
  const lens = MeshBuilder.CreateCylinder(`${name}_lens`, { diameter: 0.15, height: 0.022, tessellation: 12 }, scene);
  lens.position = new Vector3(px, py - 0.009, pz);
  lens.material = lensMat;
  lens.isPickable = false;
  lens.freezeWorldMatrix();
}

// ── Main Scene Construction ───────────────────────────────────────────────────

export async function buildScene(scene: Scene): Promise<Environment> {
  const env: Environment = { triggers: [] };

  // Base clear color
  scene.clearColor = new Color4(0.06, 0.07, 0.09, 1);

  // ── LAYERED ARCHITECTURAL LIGHTING SETUP ───────────────────────────────────

  // 1. Natural Ambient Hemispheric Light (Sky wash + warm ground bounce)
  const ambient = scene.getLightByName('light') as HemisphericLight | null;
  if (ambient) {
    ambient.intensity   = 0.38;
    ambient.diffuse     = new Color3(0.92, 0.90, 0.86);
    ambient.groundColor = new Color3(0.55, 0.52, 0.48);
  }

  // 2. Exterior Natural Daylight entering through West Glass Curtain Wall (x = 6)
  const windowDaylight = new DirectionalLight('windowDaylight', new Vector3(0.65, -0.60, 0.15), scene);
  windowDaylight.intensity = 0.58;
  windowDaylight.diffuse   = new Color3(0.96, 0.94, 0.90);

  // 3. Soft East Wall Fill (warm bounce toward back wall)
  const eastFill = new DirectionalLight('eastFill', new Vector3(-0.75, -0.40, -0.10), scene);
  eastFill.intensity = 0.18;
  eastFill.diffuse   = new Color3(1.0, 0.94, 0.84);

  // 4. Soft Contact Shadow Generator on Window Daylight
  const shadowGen = new ShadowGenerator(1024, windowDaylight);
  shadowGen.usePoissonSampling = true;
  shadowGen.darkness = 0.25;

  // 5. Architectural Recessed Downlights with visible can trims (emissive lenses)
  const dlPositions: [number, number][] = [
    // Executive Zone A (North)
    [15.0, 7.0], [15.0, 4.6],
    // Central Hub Zone B (Center)
    [15.0, 1.4], [15.0, -1.4],
    // Informal Touchdown Zone C (South)
    [15.0, -4.6], [15.0, -7.0],
    // Circulation Axis & Arrival (x ≈ 21–25)
    [21.0, 4.0], [21.0, 0.0], [21.0, -4.0],
    [25.0, 4.0], [25.0, -4.0],
    // Workstations & Reception
    [26.5, 8.5], [26.5, -8.5], [28.5, -4.5],
    // Glass-Side Hardcore Workstation Pods (West)
    [8.8, 6.4], [8.8, 0.0], [8.8, -6.4],
  ];

  for (let i = 0; i < dlPositions.length; i++) {
    const [dlx, dlz] = dlPositions[i];
    // Visible fixture in ceiling with glowing emissive lens (zero point light overhead)
    mkDownlightFixture(scene, `dlFix_${i}`, dlx, Z1_H, dlz);
  }

  // 6. Broad-Coverage Strategic Room 1 Zone Fill Lights (Technique #9: Baked/Simplified Lighting)
  // Replaces 25 separate point lights with 2 optimized zone lights:
  const loungeZoneLight = new PointLight('loungeZoneLight', new Vector3(15.5, Z1_H - 0.40, 0.0), scene);
  loungeZoneLight.intensity = 0.55;
  loungeZoneLight.range     = 18.0;
  loungeZoneLight.diffuse   = new Color3(1.0, 0.95, 0.88);

  const arrivalZoneLight = new PointLight('arrivalZoneLight', new Vector3(24.0, Z1_H - 0.40, 0.0), scene);
  arrivalZoneLight.intensity = 0.45;
  arrivalZoneLight.range     = 15.0;
  arrivalZoneLight.diffuse   = new Color3(1.0, 0.94, 0.86);

  // Film-grade ACES tone mapping avoids harsh highlight clipping
  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.exposure = 0.92;

  // ── CORE ARCHITECTURAL MATERIALS ──────────────────────────────────────────

  // Large-format Honed Limestone Terrazzo Floor
  const floorTex = createLimestoneFloorTexture(scene);
  floorTex.wrapU  = Texture.WRAP_ADDRESSMODE;
  floorTex.wrapV  = Texture.WRAP_ADDRESSMODE;
  floorTex.uScale = 12; // 12 * 2m tiles = 24m width
  floorTex.vScale = 10; // 10 * 2m tiles = 20m depth

  const floorMat = new StandardMaterial('limestoneFloorMat', scene);
  floorMat.diffuseTexture = floorTex;
  floorMat.specularColor  = new Color3(0.06, 0.06, 0.06); // matte satin sheen
  floorMat.specularPower  = 32;

  // Warm Neutral Plaster Wall Finish
  const wallMat = solidMat(scene, 'plasterWallMat', 0.90, 0.87, 0.82, 10, new Color3(0.02, 0.02, 0.02));

  // Architectural Anodized Charcoal / Bronze Baseboards & Columns
  const bronzeMat = solidMat(scene, 'archBronzeMat', 0.18, 0.17, 0.16, 36, new Color3(0.20, 0.18, 0.16));

  // American Walnut Architectural Slat Panels
  const walnutTex = createWalnutSlatTexture(scene);
  const walnutMat = new StandardMaterial('walnutMat', scene);
  walnutMat.diffuseTexture = walnutTex;
  walnutMat.specularColor  = new Color3(0.18, 0.14, 0.10);
  walnutMat.specularPower  = 24;

  // Fluted Charcoal Acoustic Felt
  const feltTex = createAcousticFeltTexture(scene);
  const feltMat = new StandardMaterial('feltMat', scene);
  feltMat.diffuseTexture = feltTex;
  feltMat.specularColor  = new Color3(0.03, 0.03, 0.03);
  feltMat.specularPower  = 6;

  // Gallery Wall Art Textures
  const artTex1 = createAbstractArtTexture(scene, 1);
  const artTex2 = createAbstractArtTexture(scene, 2);

  // ── ARCHITECTURAL ENVELOPE (Floor, Ceiling, Soffit, Walls, Baseboards) ─────

  // 1. Ground floor plane
  const floor = MeshBuilder.CreateGround('floor', { width: Z1_W, height: Z1_D }, scene);
  floor.position.x      = Z1_MX;
  floor.position.y      = 0;
  floor.position.z      = 0;
  floor.checkCollisions = true;
  floor.material        = floorMat;
  floor.receiveShadows  = true;

  // 2. Ceiling with recessed central coffer / perimeter drop soffit
  const ceilMat = solidMat(scene, 'ceilMat', 0.92, 0.89, 0.85, 4, new Color3(0.01, 0.01, 0.01));
  mkBox(scene, 'ceiling', Z1_W + WALL_T * 2, 0.06, Z1_D + WALL_T * 2,
    Z1_MX, Z1_H + 0.03, 0, ceilMat, true);

  // Ceiling architectural perimeter light trough / soffits
  const soffitMat = solidMat(scene, 'soffitMat', 0.86, 0.83, 0.79, 6);
  mkBox(scene, 'soffit_north', Z1_W - 1.2, 0.14, 0.90, Z1_MX, Z1_H - 0.07, Z1_ZH - 0.45, soffitMat, true);
  mkBox(scene, 'soffit_south', Z1_W - 1.2, 0.14, 0.90, Z1_MX, Z1_H - 0.07, -Z1_ZH + 0.45, soffitMat, true);
  mkBox(scene, 'soffit_east',  0.90, 0.14, Z1_D - 1.2, Z1_X1 - 0.45, Z1_H - 0.07, 0, soffitMat, true);

  // 3. Recessed dark bronze architectural baseboards (0.14m high)
  const BB_H = 0.14;
  const sideLen = (Z1_D - ELEV_W) / 2; // 8.9 m
  mkBox(scene, 'baseboard_north', Z1_W, BB_H, 0.03, Z1_MX, BB_H / 2, Z1_ZH - 0.015, bronzeMat, false);
  mkBox(scene, 'baseboard_south', Z1_W, BB_H, 0.03, Z1_MX, BB_H / 2, -Z1_ZH + 0.015, bronzeMat, false);
  mkBox(scene, 'baseboard_east_n', 0.03, BB_H, sideLen, Z1_X1 - 0.015, BB_H / 2, (ELEV_W / 2 + sideLen / 2), bronzeMat, false);
  mkBox(scene, 'baseboard_east_s', 0.03, BB_H, sideLen, Z1_X1 - 0.015, BB_H / 2, -(ELEV_W / 2 + sideLen / 2), bronzeMat, false);

  // 4. North & South Solid Walls with Structural Pilasters & Architectural Bays
  mkBox(scene, 'wallN', Z1_W + WALL_T * 2, Z1_H, WALL_T, Z1_MX, Z1_H / 2, Z1_ZH + WALL_T / 2, wallMat, true);
  mkBox(scene, 'wallS', Z1_W + WALL_T * 2, Z1_H, WALL_T, Z1_MX, Z1_H / 2, -Z1_ZH - WALL_T / 2, wallMat, true);

  // Structural pilaster columns along North and South walls (every 5.5m)
  for (const px of [11.5, 17.0, 22.5]) {
    mkBox(scene, `pilasterN_${px}`, 0.45, Z1_H, 0.18, px, Z1_H / 2, Z1_ZH - 0.09, bronzeMat, true);
    mkBox(scene, `pilasterS_${px}`, 0.45, Z1_H, 0.18, px, Z1_H / 2, -Z1_ZH + 0.09, bronzeMat, true);
  }

  // North Wall Architectural Features:
  // Bay 1: Walnut Slats (x = 8.5)
  mkBox(scene, 'slatsN_bay1', 4.5, Z1_H - 0.20, 0.05, 8.8, (Z1_H - 0.20) / 2 + 0.10, Z1_ZH - 0.025, walnutMat, false);
  // Bay 2: Gallery Wall Art (x = 14.2)
  mkArtworkPanel(scene, 'artN', 14.2, 2.05, Z1_ZH - 0.03, 0, 2.0, 1.4, artTex1, bronzeMat);
  // Bay 3: Fluted Felt Acoustic Bay (x = 19.8)
  mkBox(scene, 'slatsN_bay3', 4.6, Z1_H - 0.20, 0.05, 19.8, (Z1_H - 0.20) / 2 + 0.10, Z1_ZH - 0.025, feltMat, false);

  // South Wall Architectural Features:
  // Bay 1: Walnut Slats (x = 8.5)
  mkBox(scene, 'slatsS_bay1', 4.5, Z1_H - 0.20, 0.05, 8.8, (Z1_H - 0.20) / 2 + 0.10, -Z1_ZH + 0.025, walnutMat, false);
  // Bay 2: Gallery Wall Art (x = 14.2)
  mkArtworkPanel(scene, 'artS', 14.2, 2.05, -Z1_ZH + 0.03, Math.PI, 2.0, 1.4, artTex2, bronzeMat);
  // Bay 3: Fluted Felt Acoustic Bay (x = 19.8)
  mkBox(scene, 'slatsS_bay3', 4.6, Z1_H - 0.20, 0.05, 19.8, (Z1_H - 0.20) / 2 + 0.10, -Z1_ZH + 0.025, feltMat, false);

  // 5. East Wall with Elevator Portal & Fluted Panels
  mkBox(scene, 'wallE_s', WALL_T, Z1_H, sideLen, Z1_X1 + WALL_T / 2, Z1_H / 2, -(ELEV_W / 2 + sideLen / 2), wallMat, true);
  mkBox(scene, 'wallE_n', WALL_T, Z1_H, sideLen, Z1_X1 + WALL_T / 2, Z1_H / 2, (ELEV_W / 2 + sideLen / 2), wallMat, true);
  mkBox(scene, 'wallE_top', WALL_T, Z1_H - ELEV_H, ELEV_W, Z1_X1 + WALL_T / 2, ELEV_H + (Z1_H - ELEV_H) / 2, 0, wallMat, true);

  // Full-height Walnut Paneling flanking elevator portal across entire East Wall wings
  mkBox(scene, 'slatsE_left', 0.05, Z1_H - 0.20, 6.6, Z1_X1 - 0.025, (Z1_H - 0.20) / 2 + 0.10, 4.5, walnutMat, false);
  mkBox(scene, 'slatsE_right', 0.05, Z1_H - 0.20, 6.6, Z1_X1 - 0.025, (Z1_H - 0.20) / 2 + 0.10, -4.5, walnutMat, false);

  // ── Digital Incident Briefing Wall Monitor (East Wall North Wing at z = +4.5) ─
  {
    const dashTex = new DynamicTexture('dashTex', { width: 1024, height: 512 }, scene, false);
    const dctx = dashTex.getContext() as unknown as CanvasRenderingContext2D;

    // Deep dark cybernetic monitor background
    dctx.fillStyle = '#080D14';
    dctx.fillRect(0, 0, 1024, 512);

    // Subtle carbon grid texture
    dctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
    dctx.lineWidth = 1;
    for (let x = 0; x < 1024; x += 32) {
      dctx.beginPath(); dctx.moveTo(x, 0); dctx.lineTo(x, 512); dctx.stroke();
    }
    for (let y = 0; y < 512; y += 32) {
      dctx.beginPath(); dctx.moveTo(0, y); dctx.lineTo(1024, y); dctx.stroke();
    }

    // Outer bezel with glowing red incident accent border
    dctx.strokeStyle = '#EF4444';
    dctx.lineWidth = 4;
    dctx.strokeRect(6, 6, 1012, 500);

    // 1. Top Header Row: Pulsing beacon + Tag + Priority Pill
    dctx.fillStyle = '#EF4444';
    dctx.beginPath();
    dctx.arc(42, 44, 9, 0, Math.PI * 2);
    dctx.fill();

    dctx.fillStyle = '#F87171';
    dctx.font = 'bold 22px monospace';
    dctx.fillText('INCIDENT BRIEFING // CRITICAL ALERT', 62, 51);

    // Severity Pill
    dctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
    dctx.fillRect(770, 26, 215, 36);
    dctx.strokeStyle = '#EF4444';
    dctx.lineWidth = 2;
    dctx.strokeRect(770, 26, 215, 36);
    dctx.fillStyle = '#FECACA';
    dctx.font = 'bold 17px monospace';
    dctx.fillText('SEVERITY: P1-CRITICAL', 784, 50);

    // Divider line
    dctx.fillStyle = '#334155';
    dctx.fillRect(36, 74, 952, 2);

    // 2. Incident Heading
    dctx.fillStyle = '#FFFFFF';
    dctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    dctx.fillText('OmniCart Inventory Underflow', 38, 122);

    // Sub-service metadata
    dctx.fillStyle = '#38BDF8';
    dctx.font = 'bold 17px monospace';
    dctx.fillText('SERVICE: checkout-api / stock-worker  ·  STATUS: ACTIVE INVESTIGATION', 38, 156);

    // 3. Symptoms / Problem description
    dctx.fillStyle = '#94A3B8';
    dctx.font = 'bold 16px monospace';
    dctx.fillText('REPORTED SYMPTOMS:', 38, 202);

    dctx.fillStyle = '#F1F5F9';
    dctx.font = '22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    dctx.fillText('Customers report negative stock counts during high-traffic surges.', 38, 234);

    // 4. Action Required
    dctx.fillStyle = '#38BDF8';
    dctx.font = 'bold 16px monospace';
    dctx.fillText('ACTION REQUIRED:', 38, 280);

    dctx.fillStyle = '#F8FAFC';
    dctx.font = '22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    dctx.fillText('Approach a computer workstation and press [E] to inspect src/index.js', 38, 312);

    // 5. Objective Highlight Container Card
    dctx.fillStyle = 'rgba(239, 68, 68, 0.14)';
    dctx.fillRect(36, 350, 952, 92);
    dctx.strokeStyle = '#EF4444';
    dctx.lineWidth = 2;
    dctx.strokeRect(36, 350, 952, 92);

    dctx.fillStyle = '#FCA5A5';
    dctx.font = 'bold 18px monospace';
    dctx.fillText('🎯 OBJECTIVE:', 56, 384);

    dctx.fillStyle = '#FFFFFF';
    dctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    dctx.fillText('Fix logic bug so inventory stock never drops below 0.', 56, 420);

    // 6. Footer telemetry
    dctx.fillStyle = '#64748B';
    dctx.font = '15px monospace';
    dctx.fillText('SIMOFFICE INCIDENT OPS // INC-8942 // PRESS [E] NEARBY TO READ', 38, 485);

    dashTex.update();

    const dashMat = new StandardMaterial('dashMat', scene);
    dashMat.diffuseTexture  = dashTex;
    dashMat.emissiveTexture = dashTex;
    dashMat.emissiveColor   = new Color3(0.98, 0.98, 0.98);
    dashMat.backFaceCulling = false;

    // Dark bronze monitor bezel casing
    mkBox(scene, 'dashBezel', 0.04, 1.38, 2.68, Z1_X1 - 0.03, 2.25, 4.5, bronzeMat, false);

    const dashPlane = MeshBuilder.CreatePlane('dashPlane', { width: 2.6, height: 1.3 }, scene);
    dashPlane.position = new Vector3(Z1_X1 - 0.055, 2.25, 4.5);
    dashPlane.rotation = new Vector3(0, Math.PI / 2, 0);
    dashPlane.material = dashMat;

    // Interactive READ trigger for approaching the incident screen
    env.triggers.push({
      id:            'read_incident_wall',
      type:          'READ',
      position:      new Vector3(Z1_X1 - 1.2, 1.2, 4.5),
      radius:        2.4,
      promptText:    '[E] Read Incident Briefing',
    });
  }

  // Elevator Frame & Doors
  const efMat = solidMat(scene, 'elevFrameMat', 0.16, 0.15, 0.14, 28);
  const EF_T = 0.08;
  mkBox(scene, 'efL',   EF_T, ELEV_H, EF_T, Z1_X1, ELEV_H / 2, -ELEV_W / 2, efMat, false);
  mkBox(scene, 'efR',   EF_T, ELEV_H, EF_T, Z1_X1, ELEV_H / 2,  ELEV_W / 2, efMat, false);
  mkBox(scene, 'efTop', EF_T, EF_T, ELEV_W + EF_T * 2, Z1_X1, ELEV_H + EF_T / 2, 0, efMat, false);

  const elevDoorMat = solidMat(scene, 'elevDoorMat', 0.56, 0.54, 0.52, 32);
  const DOOR_PANEL_W = ELEV_W / 2 - 0.015;
  const elevL = mkBox(scene, 'elevL', 0.04, ELEV_H, DOOR_PANEL_W, Z1_X1 + 0.02, ELEV_H / 2, -ELEV_W / 4, elevDoorMat, false);
  const elevR = mkBox(scene, 'elevR', 0.04, ELEV_H, DOOR_PANEL_W, Z1_X1 + 0.02, ELEV_H / 2,  ELEV_W / 4, elevDoorMat, false);

  // Solid alcove recess & collision wall (collision disabled on elevBlock to allow entering elevator cabin)
  mkBox(scene, 'elevAlcove', 0.20, ELEV_H, ELEV_W, Z1_X1 + 0.15, ELEV_H / 2, 0, solidMat(scene, 'alcoveMat', 0.35, 0.33, 0.32), false);
  mkBox(scene, 'elevBlock', 0.15, Z1_H, ELEV_W, Z1_X1 + 0.08, Z1_H / 2, 0, invisMat(scene, 'elevBlockMat'), false);

  // Digital Floor Indicator Header
  {
    const IND_W = 1.40;
    const IND_H = 0.16;
    mkBox(scene, 'indBezel', 0.05, IND_H + 0.04, IND_W + 0.04, Z1_X1 - 0.02, ELEV_H + EF_T + IND_H / 2 + 0.02, 0, bronzeMat, false);

    const indTex = new DynamicTexture('indTex', { width: 512, height: 128 }, scene, false);
    const ictx = indTex.getContext() as unknown as CanvasRenderingContext2D;
    ictx.fillStyle = '#070D0C';
    ictx.fillRect(0, 0, 512, 128);
    ictx.strokeStyle = '#14302C';
    ictx.lineWidth = 4;
    ictx.strokeRect(4, 4, 504, 120);

    ictx.fillStyle = '#2DD4BF';
    ictx.font = 'bold 54px monospace';
    ictx.textAlign = 'center';
    ictx.textBaseline = 'middle';
    ictx.fillText('▲  LEVEL 04  ▲', 256, 64);
    indTex.update();

    const indMat = new StandardMaterial('indMat', scene);
    indMat.diffuseTexture  = indTex;
    indMat.emissiveTexture = indTex;
    indMat.emissiveColor   = new Color3(0.95, 0.95, 0.95);
    indMat.backFaceCulling = false;

    const indScreen = MeshBuilder.CreatePlane('indScreen', { width: IND_W, height: IND_H }, scene);
    indScreen.position = new Vector3(Z1_X1 - 0.046, ELEV_H + EF_T + IND_H / 2 + 0.02, 0);
    indScreen.rotation = new Vector3(0, Math.PI / 2, 0);
    indScreen.material = indMat;
  }

  // ── ARCHITECTURAL PORTAL & DEMISING PARTITION (x = 6.0, dividing Lounge & Lab) ─
  // A grand double-leaf architectural portal centered at z = 0 (w = 3.2m, h = 2.8m).
  // Zero collision in the portal opening to allow smooth player WASD passage.
  // Flanking north and south acoustic glass partitions with dark bronze architectural frames.

  const partGlassMat = new StandardMaterial('partGlassMat', scene);
  partGlassMat.diffuseColor    = new Color3(0.85, 0.92, 0.98);
  partGlassMat.specularColor   = new Color3(0.95, 0.95, 0.95);
  partGlassMat.specularPower   = 128;
  partGlassMat.alpha           = 0.22;
  partGlassMat.backFaceCulling = false;

  const gFrameMat = solidMat(scene, 'gFrameMat', 0.15, 0.16, 0.18, 60, new Color3(0.30, 0.30, 0.30));

  // 1. Grand Portal Frame at x = 6.0, z ∈ [-1.6, +1.6]
  const JAMB_W = 0.16;
  const JAMB_D = 0.24;
  // Left jamb (South side of portal, z = -1.6)
  mkBox(scene, 'portalJamb_S', JAMB_D, PORTAL_H, JAMB_W, Z1_X0, PORTAL_H / 2, -PORTAL_W / 2, bronzeMat, true);
  // Right jamb (North side of portal, z = +1.6)
  mkBox(scene, 'portalJamb_N', JAMB_D, PORTAL_H, JAMB_W, Z1_X0, PORTAL_H / 2,  PORTAL_W / 2, bronzeMat, true);
  // Lintel header beam across the doorway at y = 2.8
  mkBox(scene, 'portalLintel', JAMB_D, 0.14, PORTAL_W + JAMB_W * 2, Z1_X0, PORTAL_H + 0.07, 0, bronzeMat, true);

  // Clear transom glass panel above the doorway from y = 2.87 to y = 4.0
  const TRANSOM_H = Z1_H - (PORTAL_H + 0.14);
  mkBox(scene, 'portalTransomGlass', 0.04, TRANSOM_H, PORTAL_W, Z1_X0, PORTAL_H + 0.14 + TRANSOM_H / 2, 0, partGlassMat, false);

  // Architectural Portal Signage Header (Facing Lounge side + Facing Lab side)
  {
    const signTexLounge = new DynamicTexture('signTexLounge', { width: 512, height: 128 }, scene, false);
    const sctx1 = signTexLounge.getContext() as unknown as CanvasRenderingContext2D;
    sctx1.fillStyle = '#0F172A';
    sctx1.fillRect(0, 0, 512, 128);
    sctx1.strokeStyle = '#38BDF8';
    sctx1.lineWidth = 4;
    sctx1.strokeRect(4, 4, 504, 120);
    sctx1.fillStyle = '#38BDF8';
    sctx1.font = 'bold 22px monospace';
    sctx1.fillText('// ENGINEERING LAB SEC-02 //', 64, 52);
    sctx1.fillStyle = '#94A3B8';
    sctx1.font = 'bold 15px monospace';
    sctx1.fillText('CORE WORKSTATIONS & TELEMETRY', 64, 88);
    signTexLounge.update();

    const signMatLounge = new StandardMaterial('signMatLounge', scene);
    signMatLounge.diffuseTexture = signTexLounge;
    signMatLounge.emissiveTexture = signTexLounge;
    signMatLounge.emissiveColor = new Color3(0.95, 0.95, 0.95);

    const signPlane1 = MeshBuilder.CreatePlane('portalSignLounge', { width: 2.2, height: 0.55 }, scene);
    signPlane1.position = new Vector3(Z1_X0 + 0.13, PORTAL_H + 0.55, 0);
    signPlane1.rotation = new Vector3(0, Math.PI / 2, 0);
    signPlane1.material = signMatLounge;
  }

  // 2. North Flanking Glass Partition (z = +1.6 → +10.0, length = 8.4m, center = 5.8)
  const PART_LEN = (Z1_ZH - PORTAL_W / 2); // 8.4m
  const PART_N_Z = (Z1_ZH + PORTAL_W / 2) / 2; // +5.8m
  const PART_S_Z = -PART_N_Z; // -5.8m

  // Glass panels North & South
  mkBox(scene, 'partGlass_N', 0.04, Z1_H, PART_LEN - 0.12, Z1_X0, Z1_H / 2, PART_N_Z, partGlassMat, false);
  mkBox(scene, 'partGlass_S', 0.04, Z1_H, PART_LEN - 0.12, Z1_X0, Z1_H / 2, PART_S_Z, partGlassMat, false);

  // Vertical bronze mullions along partitions
  for (const pz of [3.7, 5.8, 7.9, -3.7, -5.8, -7.9]) {
    mkBox(scene, `partPost_${pz}`, 0.22, Z1_H, 0.16, Z1_X0, Z1_H / 2, pz, bronzeMat, false);
  }
  // Top and bottom bronze rails
  mkBox(scene, 'partRailTop_N', 0.18, 0.12, PART_LEN, Z1_X0, Z1_H - 0.06, PART_N_Z, gFrameMat, false);
  mkBox(scene, 'partRailTop_S', 0.18, 0.12, PART_LEN, Z1_X0, Z1_H - 0.06, PART_S_Z, gFrameMat, false);
  mkBox(scene, 'partSill_N',    0.22, 0.08, PART_LEN, Z1_X0, 0.04,         PART_N_Z, gFrameMat, false);
  mkBox(scene, 'partSill_S',    0.22, 0.08, PART_LEN, Z1_X0, 0.04,         PART_S_Z, gFrameMat, false);

  // Invisible collision barriers ONLY on the north & south solid partitions (leaving portal at z ∈ [-1.6, 1.6] open!)
  mkBox(scene, 'partCol_N', 0.20, Z1_H, PART_LEN, Z1_X0, Z1_H / 2, PART_N_Z, invisMat(scene, 'partColNMat'), true);
  mkBox(scene, 'partCol_S', 0.20, Z1_H, PART_LEN, Z1_X0, Z1_H / 2, PART_S_Z, invisMat(scene, 'partColSMat'), true);

  // ── CORPORATE RECEPTION & BRAND IDENTITY (East Wall at x ≈ 29.5, z = -4.5) ─

  const oakMat = solidMat(scene, 'oakMat', 0.76, 0.64, 0.42, 32, new Color3(0.18, 0.14, 0.08));
  const stoneTopMat = solidMat(scene, 'recStoneMat', 0.92, 0.90, 0.86, 48, new Color3(0.25, 0.25, 0.25));
  const CTR_W = 2.4;
  const CTR_H = 0.98;
  const CTR_D = 0.85;
  const CTR_X = Z1_X1 - CTR_D / 2 - 0.08;
  const CTR_Z = -4.5;

  // Reception desk counter body & floating stone top
  mkBox(scene, 'ctrBody', CTR_W, CTR_H, CTR_D, CTR_X, CTR_H / 2, CTR_Z, oakMat, true);
  mkBox(scene, 'ctrTop', CTR_W + 0.16, 0.06, CTR_D + 0.14, CTR_X, CTR_H + 0.03, CTR_Z, stoneTopMat, false);
  mkBox(scene, 'ctrPlinth', CTR_W - 0.10, 0.05, CTR_D - 0.10, CTR_X, 0.025, CTR_Z, bronzeMat, false);

  // Backlit Corporate Brand Signage ("SIMOFFICE / ADVANCED RESEARCH LAB")
  {
    const brandTex = new DynamicTexture('brandSignTex', { width: 512, height: 128 }, scene, false);
    const bctx = brandTex.getContext() as unknown as CanvasRenderingContext2D;
    bctx.fillStyle = '#141A20';
    bctx.fillRect(0, 0, 512, 128);

    // Glowing subtle border
    bctx.strokeStyle = '#38BDF8';
    bctx.lineWidth = 4;
    bctx.strokeRect(6, 6, 500, 116);

    // Company logo & title
    bctx.fillStyle = '#FFFFFF';
    bctx.font = 'bold 44px -apple-system, sans-serif';
    bctx.textAlign = 'center';
    bctx.fillText('SIMOFFICE', 256, 58);

    bctx.fillStyle = '#38BDF8';
    bctx.font = 'bold 18px monospace';
    (bctx as any).letterSpacing = '4px';
    bctx.fillText('ADVANCED RESEARCH LAB', 256, 96);
    brandTex.update();

    const brandMat = new StandardMaterial('brandMat', scene);
    brandMat.diffuseTexture  = brandTex;
    brandMat.emissiveTexture = brandTex;
    brandMat.emissiveColor   = new Color3(0.92, 0.92, 0.92);
    brandMat.backFaceCulling = false;

    const brandPlane = MeshBuilder.CreatePlane('brandSignPlane', { width: 2.4, height: 0.70 }, scene);
    brandPlane.position = new Vector3(Z1_X1 - 0.055, 2.45, CTR_Z);
    brandPlane.rotation = new Vector3(0, Math.PI / 2, 0);
    brandPlane.material = brandMat;
  }

  // ── EAST WALL ARCHITECTURAL STORAGE CREDENZAS ─────────────────────────────
  // Refined architectural walnut credenzas flanking the elevator & reception zones
  const ECD_W = 2.40;
  const ECD_H = 0.78;
  const ECD_D = 0.50;
  const ECD_X = Z1_X1 - ECD_D / 2 - 0.04; // flush along east slat wall

  // North East Architectural Credenza (z = +8.2)
  mkBox(scene, 'eastCredenzaNorth_body', ECD_D, ECD_H, ECD_W, ECD_X, ECD_H / 2, 8.2, walnutMat, true);
  mkBox(scene, 'eastCredenzaNorth_top', ECD_D + 0.04, 0.04, ECD_W + 0.04, ECD_X, ECD_H + 0.02, 8.2, bronzeMat, false);

  // South East Architectural Credenza (z = -8.2)
  mkBox(scene, 'eastCredenzaSouth_body', ECD_D, ECD_H, ECD_W, ECD_X, ECD_H / 2, -8.2, walnutMat, true);
  mkBox(scene, 'eastCredenzaSouth_top', ECD_D + 0.04, 0.04, ECD_W + 0.04, ECD_X, ECD_H + 0.02, -8.2, bronzeMat, false);

  // ── ASSET LOADING (MacBook, Plant, Chair, Couches, Workstation Hardware) ───

  const assetFiles: Record<Z1Asset, string> = {
    macbook:          'macbook_pro_m3_16_inch_2024 (1).glb',
    plant:            'potted plant.glb',
    chair:            'chair.glb',
    orangecouch:      'orangecouch.glb',
    redcouch:         'redcouch.glb',
    desk:             'desk.glb',
    deskCorner:       'deskCorner.glb',
    chairDesk:        'chairDesk.glb',
    computerScreen:   'computerScreen.glb',
    computerKeyboard: 'computerKeyboard.glb',
    computerMouse:    'computerMouse.glb',
    trashcan:         'trashcan.glb',
    lamp:             'lamp.glb',
    modernChair:      'modern_ergonomic_chair.glb',
    minimalistDesk:   'minimalist_desk.glb',
    modernComputer:   'modern_computer.glb',
  };

  const assetMap = new Map<Z1Asset, AssetContainer>();
  await Promise.all(
    (Object.entries(assetFiles) as [Z1Asset, string][]).map(async ([key, file]) => {
      try {
        const c = await loadAsset(scene, file);
        assetMap.set(key, c);
      } catch (err) {
        console.error(`[Redesign] Failed to load ${key} (${file}):`, err);
      }
    }),
  );

  const spawnProp = (
    asset: Z1Asset,
    wx: number, wy: number, wz: number,
    rotY = 0,
    scale: number | Vector3 = 1.0,
    suffix: string | number = `${wx}_${wz}`,
  ): TransformNode | null => {
    const c = assetMap.get(asset);
    if (!c) return null;
    const root = new TransformNode(`${asset}_${suffix}`, scene);
    root.position = new Vector3(wx, wy, wz);
    root.rotation = new Vector3(0, rotY, 0);
    if (typeof scale === 'number') {
      root.scaling = new Vector3(scale, scale, scale);
    } else {
      root.scaling = scale;
    }
    instantiateAnchored(scene, c, root, asset, suffix);
    return root;
  };

  // ── HOSPITALITY LOUNGE ZONING ──────────────────────────────────────────────

  // Woven Wool Rug Materials
  const rectRugTex = createWovenRugTexture(scene, false);
  const roundRugTex = createWovenRugTexture(scene, true);

  const rectRugMat = new StandardMaterial('rectRugMat', scene);
  rectRugMat.diffuseTexture = rectRugTex;
  rectRugMat.specularPower  = 6;

  const roundRugMat = new StandardMaterial('roundRugMat', scene);
  roundRugMat.diffuseTexture = roundRugTex;
  roundRugMat.specularPower  = 6;

  // Calibrated sitting constants
  const SEATED_Y = 0.88; // Couch cushion sitting height

  // ────────────────────────────────────────────────────────────────────────────
  // ZONE A: EXECUTIVE COLLABORATIVE SUITE (North: z ≈ +5.6)
  // Linear executive arrangement: 2 facing couches across an elongated walnut table
  // ────────────────────────────────────────────────────────────────────────────
  const ZA_X = 15.0;
  const ZA_Z = 5.6;

  // Zone A Tailored Woven Rug (5.2m X × 4.4m Z)
  const rugA = mkBox(scene, 'rug_zoneA', 5.2, 0.02, 4.4, ZA_X, 0.01, ZA_Z, rectRugMat, false);
  rugA.receiveShadows = true;

  // Couch North: facing South (rotY = Math.PI)
  spawnProp('redcouch', ZA_X, 0, ZA_Z + 1.45, Math.PI, 1.35, 'za_c1');
  env.triggers.push({
    id:            'sit_zoneA_c1',
    type:          'SIT',
    position:      new Vector3(ZA_X, SEATED_Y, ZA_Z + 1.45),
    radius:        1.1,
    snapPosition:  new Vector3(ZA_X, SEATED_Y, ZA_Z + 1.23), // shifted south toward table
    standPosition: new Vector3(ZA_X, 0.90, ZA_Z + 2.10),
    snapRotationY: Math.PI,
  });

  // Couch South: facing North (rotY = 0)
  spawnProp('orangecouch', ZA_X, 0, ZA_Z - 1.45, 0, 1.35, 'za_c2');
  env.triggers.push({
    id:            'sit_zoneA_c2',
    type:          'SIT',
    position:      new Vector3(ZA_X, SEATED_Y, ZA_Z - 1.45),
    radius:        1.1,
    snapPosition:  new Vector3(ZA_X, SEATED_Y, ZA_Z - 1.23), // shifted north toward table
    standPosition: new Vector3(ZA_X, 0.90, ZA_Z - 2.10),
    snapRotationY: 0,
  });

  // Executive walnut coffee table, MacBook & side table with plant
  mkExecutiveCoffeeTable(scene, 'table_zoneA', ZA_X, ZA_Z, walnutMat, bronzeMat);
  spawnProp('macbook', ZA_X - 0.20, 0.42 + 0.015, ZA_Z, Math.PI * 0.9, 0.010, 'za_macbook');
  mkModernSideTable(scene, 'sidetable_zoneA', ZA_X + 2.1, ZA_Z, bronzeMat);
  spawnProp('plant', ZA_X - 2.0, 0, ZA_Z + 1.6, 0, 1.15, 'za_plant');

  // ────────────────────────────────────────────────────────────────────────────
  // ZONE B: CENTRAL COLLABORATION ISLAND (Center: z = 0.0)
  // Signature 3-couch circular island on plush circular woven rug
  // ────────────────────────────────────────────────────────────────────────────
  const ZB_X = 14.8;
  const ZB_Z = 0.0;
  const RUG_D = 5.4;

  const rugB = mkDisc(scene, 'rug_zoneB', RUG_D, 0.02, ZB_X, 0.01, ZB_Z, roundRugMat, 64, false);
  rugB.receiveShadows = true;

  // Central round coffee table with MacBook
  mkLoungeTable(scene, 'table_zoneB', ZB_X, ZB_Z);
  spawnProp('macbook', ZB_X - 0.05, 0.42 + 0.015, ZB_Z + 0.04, Math.PI, 0.010, 'zb_macbook');

  // 3 Couches arranged at 120°
  const COUCH_R = 1.40;
  const ZB_COUCH_ASSETS = ['orangecouch', 'redcouch', 'redcouch'] as const;

  for (let ci = 0; ci < 3; ci++) {
    const angle = (ci * 2 * Math.PI) / 3;
    const cx    = ZB_X + COUCH_R * Math.cos(angle);
    const cz2   = ZB_Z + COUCH_R * Math.sin(angle);
    const rotY  = -angle - Math.PI / 2;

    spawnProp(ZB_COUCH_ASSETS[ci], cx, 0, cz2, rotY, 1.35, `zb_c_${ci}`);

    // Forward facing vector toward table center
    const fwdX = Math.sin(rotY);
    const fwdZ = Math.cos(rotY);
    const snapX = cx + fwdX * 0.22;
    const snapZ = cz2 + fwdZ * 0.22;
    const standX = cx - fwdX * 0.70;
    const standZ = cz2 - fwdZ * 0.70;

    env.triggers.push({
      id:            `sit_zoneB_c${ci}`,
      type:          'SIT',
      position:      new Vector3(cx, SEATED_Y, cz2),
      radius:        1.1,
      snapPosition:  new Vector3(snapX, SEATED_Y, snapZ),
      standPosition: new Vector3(standX, 0.90, standZ),
      snapRotationY: rotY,
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // ZONE C: INFORMAL TOUCHDOWN LOUNGE (South: z ≈ -5.6)
  // Conversational 2-couch arrangement with coffee table & large leafy plant
  // ────────────────────────────────────────────────────────────────────────────
  const ZC_X = 15.0;
  const ZC_Z = -5.6;

  // Zone C Rectangular Rug (5.2m X × 4.4m Z)
  const rugC = mkBox(scene, 'rug_zoneC', 5.2, 0.02, 4.4, ZC_X, 0.01, ZC_Z, rectRugMat, false);
  rugC.receiveShadows = true;

  // Couch North: facing South (rotY = Math.PI)
  spawnProp('redcouch', ZC_X, 0, ZC_Z + 1.45, Math.PI, 1.35, 'zc_c1');
  env.triggers.push({
    id:            'sit_zoneC_c1',
    type:          'SIT',
    position:      new Vector3(ZC_X, SEATED_Y, ZC_Z + 1.45),
    radius:        1.1,
    snapPosition:  new Vector3(ZC_X, SEATED_Y, ZC_Z + 1.23),
    standPosition: new Vector3(ZC_X, 0.90, ZC_Z + 2.10),
    snapRotationY: Math.PI,
  });

  // Couch South: facing North (rotY = 0)
  spawnProp('orangecouch', ZC_X, 0, ZC_Z - 1.45, 0, 1.35, 'zc_c2');
  env.triggers.push({
    id:            'sit_zoneC_c2',
    type:          'SIT',
    position:      new Vector3(ZC_X, SEATED_Y, ZC_Z - 1.45),
    radius:        1.1,
    snapPosition:  new Vector3(ZC_X, SEATED_Y, ZC_Z - 1.23),
    standPosition: new Vector3(ZC_X, 0.90, ZC_Z - 2.10),
    snapRotationY: 0,
  });

  // Coffee table with laptop and potted plant
  mkLoungeTable(scene, 'table_zoneC', ZC_X, ZC_Z);
  spawnProp('macbook', ZC_X + 0.05, 0.42 + 0.015, ZC_Z - 0.04, 0, 0.010, 'zc_macbook');
  mkModernSideTable(scene, 'sidetable_zoneC', ZC_X + 2.1, ZC_Z, bronzeMat);
  spawnProp('plant', ZC_X - 2.0, 0, ZC_Z - 1.6, 0, 1.15, 'zc_plant');

  // ── RECEPTION PROPS & EAST CREDENZAS ─────────────────────────────────────────

  const CHAIR_SEATED_Y = SEATED_Y; // Standard desk chair sitting height (0.88)

  // 1. Reception Desk Laptop & Plant
  spawnProp('macbook', CTR_X, CTR_H + 0.06, CTR_Z, -Math.PI / 2, 0.010, 'reception_macbook');
  spawnProp('plant', CTR_X + 0.60, 0, CTR_Z - CTR_D / 2 - 0.25, 0, 1.1, 'reception_plant');

  // Reception High Stool
  spawnProp('chair', CTR_X - 0.85, 0, CTR_Z, Math.PI / 2, 1.0, 'rec_stool');
  env.triggers.push({
    id:            'sit_rec_stool',
    type:          'SIT',
    position:      new Vector3(CTR_X - 0.85, CHAIR_SEATED_Y, CTR_Z),
    radius:        1.1,
    snapPosition:  new Vector3(CTR_X - 0.77, CHAIR_SEATED_Y, CTR_Z),
    standPosition: new Vector3(CTR_X - 1.50, 0.90, CTR_Z),
    snapRotationY: Math.PI / 2,
  });

  // East Architectural Credenza Plants
  spawnProp('plant', ECD_X - 0.10, ECD_H + 0.04, 8.2, 0, 0.95, 'ecn_plant');
  spawnProp('plant', ECD_X - 0.10, ECD_H + 0.04, -8.2, 0, 0.95, 'ecs_plant');

  // ── RESTORED LOUNGE WEST PROMENADE (Room 1, x = 6.0 → 11.2) ───────────────────
  // Pristine corporate lounge with architectural planter buffer framing the portal corridor.

  // Fluted Walnut Planter Buffers framing the entrance walkway
  mkPlanterBufferCredenza(scene, 'planterBufferN', 10.5, 6.3, 3.8, walnutMat, bronzeMat);
  spawnProp('plant', 10.5, 0.76, 5.2, 0, 0.95, 'bufferN_plant1');
  spawnProp('plant', 10.5, 0.76, 6.3, Math.PI / 3, 1.05, 'bufferN_plant2');
  spawnProp('plant', 10.5, 0.76, 7.4, -Math.PI / 4, 0.95, 'bufferN_plant3');

  mkPlanterBufferCredenza(scene, 'planterBufferS', 10.5, -6.3, 3.8, walnutMat, bronzeMat);
  spawnProp('plant', 10.5, 0.76, -7.4, 0, 0.95, 'bufferS_plant1');
  spawnProp('plant', 10.5, 0.76, -6.3, -Math.PI / 3, 1.05, 'bufferS_plant2');
  spawnProp('plant', 10.5, 0.76, -5.2, Math.PI / 4, 0.95, 'bufferS_plant3');

  // ── ROOM 2: DEDICATED STUDENT HARDCORE ENGINEERING LAB (x: -14 → +6) ────────
  // A luminous 20m x 20m high-performance tech workspace with architectural Scandinavian warmth:
  // - Warm off-white acoustic tile ceiling with linear recessed warm LED channels
  // - Natural Scandinavian blonde oak vertical acoustic slats with dark felt backing
  // - Large-format technical mineral concrete floor + central polished limestone promenade
  // - Pod area acoustic rugs under workstation benches
  // - 8 Developer Battlestations: perfectly oriented 1.6m desks, dual 4K IDE displays,
  //   extended leather desk pads, 75% mechanical keyboards, precision wireless mice,
  //   MacBook Pro M3 on angled aluminum risers, and ceramic coffee tumblers.
  // - Agile Sprint Kanban Whiteboard & Standing Ideation Hub (North-East Wall)
  // - Developer Hydration & Specialty Espresso Coffee Bar (South-East Wall)
  // - Skyline Casual Ideation Lounge (West Window Wall)
  // - Server Telemetry Bay with hazard safety markings & telemetry console

  // 1. Room 2 Base Flooring: Light Technical Mineral Concrete (20m x 20m, centered at x = -4.0, z = 0)
  const r2FloorTex = createTechBasaltFloorTexture(scene);
  r2FloorTex.wrapU  = Texture.WRAP_ADDRESSMODE;
  r2FloorTex.wrapV  = Texture.WRAP_ADDRESSMODE;
  r2FloorTex.uScale = 10;
  r2FloorTex.vScale = 10;

  const r2FloorMat = new StandardMaterial('r2FloorMat', scene);
  r2FloorMat.diffuseTexture = r2FloorTex;
  r2FloorMat.specularColor  = new Color3(0.18, 0.18, 0.22);
  r2FloorMat.specularPower  = 32;

  const r2Floor = mkBox(scene, 'r2_floor', R2_W, 0.10, Z1_D, R2_MX, -0.05, 0, r2FloorMat, true);
  r2Floor.receiveShadows = true;

  // Central Polished Limestone / Terrazzo Promenade (down center aisle from portal to west window)
  const r2PromenadeTex = createLimestoneFloorTexture(scene);
  r2PromenadeTex.wrapU = Texture.WRAP_ADDRESSMODE;
  r2PromenadeTex.wrapV = Texture.WRAP_ADDRESSMODE;
  r2PromenadeTex.uScale = 8;
  r2PromenadeTex.vScale = 2;

  const r2PromenadeMat = new StandardMaterial('r2PromenadeMat', scene);
  r2PromenadeMat.diffuseTexture = r2PromenadeTex;
  r2PromenadeMat.specularColor = new Color3(0.25, 0.25, 0.25);
  r2PromenadeMat.specularPower = 32;

  // 3.2m wide central walkway (z in [-1.6, 1.6], x from -13.6 to 5.8)
  const r2Promenade = mkBox(scene, 'r2_promenade', 19.4, 0.012, 3.2, -3.9, 0.006, 0, r2PromenadeMat, false);
  r2Promenade.receiveShadows = true;

  // Bronze inlay transition trim along promenade edges
  mkBox(scene, 'r2_prom_trim_n', 19.4, 0.015, 0.04, -3.9, 0.008, 1.60, bronzeMat, false);
  mkBox(scene, 'r2_prom_trim_s', 19.4, 0.015, 0.04, -3.9, 0.008, -1.60, bronzeMat, false);

  // Workstation Pod Acoustic Area Rugs (North Pods 1 & 2, South Pods 3 & 4)
  const r2RugTex = createWovenRugTexture(scene, false);
  const r2RugMat = new StandardMaterial('r2RugMat', scene);
  r2RugMat.diffuseTexture = r2RugTex;
  r2RugMat.specularPower = 6;

  const r2RugN = mkBox(scene, 'r2_rug_north', 9.6, 0.015, 4.8, -6.5, 0.008, 4.5, r2RugMat, false);
  r2RugN.receiveShadows = true;
  const r2RugS = mkBox(scene, 'r2_rug_south', 9.6, 0.015, 4.8, -6.5, 0.008, -4.5, r2RugMat, false);
  r2RugS.receiveShadows = true;

  // 2. Room 2 Ceiling: Clean Warm Off-White Architectural Acoustic Ceiling (20m x 20m at y = 4.0)
  const r2CeilingMat = solidMat(scene, 'r2CeilingMat', 0.88, 0.88, 0.86, 12, new Color3(0.12, 0.12, 0.12));
  mkBox(scene, 'r2_ceiling', R2_W, 0.10, Z1_D, R2_MX, Z1_H + 0.05, 0, r2CeilingMat, true);

  // Recessed Linear Warm LED Channels across the ceiling (at z = -4.5, 0.0, +4.5)
  const r2ChannelLensMat = new StandardMaterial('r2ChannelLensMat', scene);
  r2ChannelLensMat.diffuseColor = new Color3(1.0, 0.97, 0.90);
  r2ChannelLensMat.emissiveColor = new Color3(1.0, 0.95, 0.88);

  for (const cz of [-4.5, 0.0, 4.5]) {
    // Recessed bronze trough
    mkBox(scene, `r2_ceil_trough_${cz}`, 18.0, 0.05, 0.28, -4.0, Z1_H - 0.02, cz, bronzeMat, false);
    // Diffuser lens
    mkBox(scene, `r2_ceil_lens_${cz}`, 17.8, 0.02, 0.16, -4.0, Z1_H - 0.04, cz, r2ChannelLensMat, false);
  }

  // 3. Room 2 Demising Walls: Clean Modern Gallery Drywall
  const r2AcousticMat = solidMat(scene, 'r2AcousticMat', 0.86, 0.86, 0.88, 16, new Color3(0.08, 0.08, 0.08));
  mkBox(scene, 'r2_wallN', R2_W, Z1_H, WALL_T, R2_MX, Z1_H / 2, Z1_ZH + WALL_T / 2, r2AcousticMat, true);
  mkBox(scene, 'r2_baseboardN', R2_W, 0.16, 0.04, R2_MX, 0.08, Z1_ZH - 0.02, bronzeMat, false);

  mkBox(scene, 'r2_wallS', R2_W, Z1_H, WALL_T, R2_MX, Z1_H / 2, -Z1_ZH - WALL_T / 2, r2AcousticMat, true);
  mkBox(scene, 'r2_baseboardS', R2_W, 0.16, 0.04, R2_MX, 0.08, -Z1_ZH + 0.02, bronzeMat, false);

  // 4. Blonde Oak Vertical Slat Paneling along Feature Walls
  const blondeOakTex = createBlondeOakSlatTexture(scene);
  blondeOakTex.wrapU = Texture.WRAP_ADDRESSMODE;
  blondeOakTex.wrapV = Texture.WRAP_ADDRESSMODE;
  blondeOakTex.uScale = 6;
  blondeOakTex.vScale = 2;

  const blondeOakMat = new StandardMaterial('blondeOakMat', scene);
  blondeOakMat.diffuseTexture = blondeOakTex;
  blondeOakMat.specularColor = new Color3(0.12, 0.10, 0.08);
  blondeOakMat.specularPower = 20;

  // North Slatted Feature Wall (backing Agile Hub: x in [-1.5, 5.8], z = 9.92)
  mkBox(scene, 'r2_oak_slat_north', 7.3, Z1_H - 0.16, 0.04, 2.15, Z1_H / 2 + 0.08, Z1_ZH - 0.03, blondeOakMat, false);

  // South Slatted Feature Wall (backing Coffee Bar: x in [-1.5, 5.8], z = -9.92)
  mkBox(scene, 'r2_oak_slat_south', 7.3, Z1_H - 0.16, 0.04, 2.15, Z1_H / 2 + 0.08, -Z1_ZH + 0.03, blondeOakMat, false);

  // Incident Board Oak Slat Backing: x in [-7.5, -2.1], z = -9.92
  mkBox(scene, 'r2_oak_slat_incident', 5.4, Z1_H - 0.16, 0.04, -4.8, Z1_H / 2 + 0.08, -Z1_ZH + 0.03, blondeOakMat, false);

  // 5. Room 2 West Exterior Glass Curtain Wall (x = -14.0, z ∈ [-10, +10])
  const r2GlassMat = new StandardMaterial('r2GlassMat', scene);
  r2GlassMat.diffuseColor    = new Color3(0.04, 0.08, 0.14);
  r2GlassMat.specularColor   = new Color3(0.95, 0.95, 0.95);
  r2GlassMat.specularPower   = 128;
  r2GlassMat.alpha           = 0.14;
  r2GlassMat.backFaceCulling = false;

  // Exterior glass panels along west wall (x = -14.0)
  for (let pz = -8; pz <= 8; pz += 4) {
    mkBox(scene, `r2_gp_${pz}`, 0.04, Z1_H, 3.88, R2_X0, Z1_H / 2, pz, r2GlassMat, false);
  }
  // Vertical bronze structural posts every 4m
  for (let fz = -10; fz <= 10; fz += 4) {
    mkBox(scene, `r2_gPost_${fz}`, 0.32, Z1_H, 0.26, R2_X0 + 0.12, Z1_H / 2, fz, bronzeMat, true);
  }
  // Top header rail and bottom sill along west glass
  mkBox(scene, 'r2_gRailTop', 0.24, 0.14, Z1_D, R2_X0 + 0.10, Z1_H - 0.07, 0, gFrameMat, false);
  mkBox(scene, 'r2_gSill',    0.28, 0.10, Z1_D, R2_X0 + 0.10, 0.05,         0, gFrameMat, false);

  // Solid outer collision barrier at x = -14.0
  mkBox(scene, 'r2_west_col', 0.20, Z1_H, Z1_D, R2_X0, Z1_H / 2, 0, invisMat(scene, 'r2WestColMat'), true);

  // Exterior architectural framing outside the glass curtain wall:
  const extStoneMat = solidMat(scene, 'extStoneMat', 0.16, 0.18, 0.22, 16);
  mkBox(scene, 'r2_ext_sill', 0.70, 0.14, Z1_D + 1.2, R2_X0 - 0.35, 0.07, 0, extStoneMat, false);
  mkBox(scene, 'r2_ext_lintel', 0.70, 0.18, Z1_D + 1.2, R2_X0 - 0.35, Z1_H - 0.09, 0, extStoneMat, false);
  mkBox(scene, 'r2_ext_pilaster_n', 1.00, Z1_H + 0.3, 0.80, R2_X0 - 0.40, Z1_H / 2, 10.35, extStoneMat, true);
  mkBox(scene, 'r2_ext_pilaster_s', 1.00, Z1_H + 0.3, 0.80, R2_X0 - 0.40, Z1_H / 2, -10.35, extStoneMat, true);

  // Seamless 360-Degree Panoramic High-Rise Skyline
  buildCitySkyline(scene, { westWallX: R2_X0 });

  // 6. Natural Daylight through Room 2 West Facade
  const r2WindowLight = new DirectionalLight('r2WindowLight', new Vector3(0.70, -0.60, 0.15), scene);
  r2WindowLight.intensity = 0.45;
  r2WindowLight.diffuse   = new Color3(0.80, 0.88, 0.98);

  // 7. Room 2 Recessed Ceiling Downlights
  const r2Downlights: [number, number][] = [
    [4.5, 0.0],
    [1.0, 4.5], [1.0, 0.0], [1.0, -4.5],
    [-4.0, 4.5], [-4.0, 0.0], [-4.0, -4.5],
    [-9.0, 4.5], [-9.0, 0.0], [-9.0, -4.5],
  ];
  for (let i = 0; i < r2Downlights.length; i++) {
    const [dx, dz] = r2Downlights[i];
    mkDownlightFixture(scene, `r2_dlFix_${i}`, dx, Z1_H, dz);
  }

  // Strategic Room 2 Lab Zone Fill Light (warm natural daylight, 3400K)
  const labZoneLight = new PointLight('labZoneLight', new Vector3(-3.0, Z1_H - 0.40, 0.0), scene);
  labZoneLight.intensity = 0.65;
  labZoneLight.range = 22.0;
  labZoneLight.diffuse = new Color3(1.0, 0.98, 0.94);

  // 8. Workstation Materials Suite (Frosted screen, leather mat, mechanical keycaps, metals)
  const frostedScreenMat = new StandardMaterial('frostedScreenMat', scene);
  frostedScreenMat.diffuseColor = new Color3(0.24, 0.28, 0.32);
  frostedScreenMat.specularColor = new Color3(0.20, 0.20, 0.22);
  frostedScreenMat.specularPower = 32;
  frostedScreenMat.alpha = 0.88;

  // Dedicated Leather Desk Pad Material
  const deskPadTex = createDeskPadTexture(scene);
  const deskPadMat = new StandardMaterial('deskPadMat', scene);
  deskPadMat.diffuseTexture = deskPadTex;
  deskPadMat.specularPower = 12;

  // 75% Mechanical ANSI Keyboard Texture & Material
  const kbTex = createMechanicalKeyboardTexture(scene);
  const kbMat = new StandardMaterial('kbMat', scene);
  kbMat.diffuseTexture  = kbTex;
  kbMat.emissiveTexture = kbTex;
  kbMat.emissiveColor   = new Color3(0.25, 0.25, 0.28); // subtle keycap backlight
  kbMat.specularPower   = 32;

  // CNC Machined Anodized Space-Gray Aluminum Material
  const aluminumMat = solidMat(scene, 'aluminumMat', 0.28, 0.30, 0.36, 64, new Color3(0.75, 0.75, 0.80));

  // Precision Mouse Dark Graphite Material
  const graphiteMat = solidMat(scene, 'graphiteMat', 0.14, 0.15, 0.18, 48, new Color3(0.25, 0.25, 0.28));

  // Ceramic Tumbler Materials
  const ceramicMat = solidMat(scene, 'ceramicMat', 0.12, 0.12, 0.14, 40);
  const sleeveMat  = solidMat(scene, 'sleeveMat',  0.22, 0.23, 0.26, 12);

  // Dynamic IDE Code Textures for each Pod
  const ideTexPod1 = createIdeCodeTexture(scene, 'POD-01 (NORTH-EAST)');
  const ideTexPod2 = createIdeCodeTexture(scene, 'POD-02 (NORTH-WEST)');
  const ideTexPod3 = createIdeCodeTexture(scene, 'POD-03 (SOUTH-EAST)');
  const ideTexPod4 = createIdeCodeTexture(scene, 'POD-04 (SOUTH-WEST)');

  // Desk surface height and ergonomic chair seated capsule height
  const ENG_DESK_H = 0.745;
  const ENG_SEAT_Y = 0.88; // Calibrated capsule height when seated on ergonomic task chair

  // ── 9. WORKSTATION PODS (4 Dual-Pod Benches = 8 Developer Stations) ────────
  // Pod 1: x = -4.0, z = +4.5
  // Pod 2: x = -9.0, z = +4.5
  // Pod 3: x = -4.0, z = -4.5
  // Pod 4: x = -9.0, z = -4.5

  interface PodConfig {
    id: string;
    label: string;
    cx: number;
    cz: number;
    ideTex: DynamicTexture;
  }

  const pods: PodConfig[] = [
    { id: 'p1', label: 'Pod 1', cx: -4.0, cz:  4.5, ideTex: ideTexPod1 },
    { id: 'p2', label: 'Pod 2', cx: -9.0, cz:  4.5, ideTex: ideTexPod2 },
    { id: 'p3', label: 'Pod 3', cx: -4.0, cz: -4.5, ideTex: ideTexPod3 },
    { id: 'p4', label: 'Pod 4', cx: -9.0, cz: -4.5, ideTex: ideTexPod4 },
  ];

  for (const pod of pods) {
    const { id, cx, cz, ideTex } = pod;

    // Station South (facing North toward +Z): Desk at cz - 0.42, Chair at cz - 1.15
    const deskZ_S = cz - 0.42;
    const chairZ_S = cz - 1.15;
    const seatedZ_S = cz - 1.05;
    const standZ_S = cz - 1.85;

    // Modern Developer Desk S (Rotated 90° so 1.6m width faces developer along X)
    spawnProp('minimalistDesk', cx, 0, deskZ_S, Math.PI / 2, new Vector3(2.45, 1.35, 1.60), `eng_${id}_desk_s`);

    // Dual 4K Monitors on Articulated Arm S (clamped to back edge of desk, facing South toward user)
    mkDualMonitorSetup(scene, `eng_${id}_mon_s`, cx, ENG_DESK_H, deskZ_S + 0.28, 0, ideTex, bronzeMat);

    // Station S Root Transform Node for perfectly aligned desk accessories
    const stationS_root = new TransformNode(`eng_${id}_stationS_root`, scene);
    stationS_root.position = new Vector3(cx, ENG_DESK_H, deskZ_S);
    stationS_root.rotation = new Vector3(0, 0, 0);

    // Extended Charcoal Leather Desk Pad
    const padS = MeshBuilder.CreateBox(`eng_${id}_pad_s`, { width: 0.82, height: 0.003, depth: 0.34 }, scene);
    padS.parent = stationS_root;
    padS.position = new Vector3(0, 0.0015, -0.12);
    padS.material = deskPadMat;

    // Custom 75% Mechanical Keyboard (centered in front of chair on pad)
    mkMechanicalKeyboard(scene, `eng_${id}_kb_s`, stationS_root, -0.06, 0.005, -0.12, kbMat, aluminumMat);

    // Precision Wireless Mouse (to the right on pad)
    mkErgonomicMouse(scene, `eng_${id}_mouse_s`, stationS_root, 0.24, 0.005, -0.12, graphiteMat, aluminumMat);

    // Aluminum Laptop Riser Stand & MacBook Pro M3 (facing developer, 12° inward yaw)
    const mbpRot_S = Math.PI + 0.20;
    mkLaptopRiserStand(scene, `eng_${id}_riser_s`, null, cx - 0.52, ENG_DESK_H, deskZ_S - 0.02, mbpRot_S, aluminumMat);
    spawnProp('macbook', cx - 0.52, ENG_DESK_H + 0.065, deskZ_S - 0.02, mbpRot_S, 0.010, `eng_${id}_mbp_s`);

    // Ceramic Matte Black Coffee Tumbler
    mkCoffeeTumbler(scene, `eng_${id}_mug_s`, stationS_root, 0.52, 0, 0.08, ceramicMat, sleeveMat);

    // Realistic Modern Ergonomic Mesh Task Chair S
    spawnProp('modernChair', cx, 0, chairZ_S, 0, 1.0, `eng_${id}_chair_s`);

    // Interactive [E] SIT Trigger S
    env.triggers.push({
      id:            `sit_eng_${id}_s`,
      type:          'SIT',
      position:      new Vector3(cx, ENG_SEAT_Y, chairZ_S),
      radius:        1.25,
      snapPosition:  new Vector3(cx, ENG_SEAT_Y, seatedZ_S),
      standPosition: new Vector3(cx, 0.90, standZ_S),
      snapRotationY: 0, // facing North toward screens
      promptText:    '[E] Work at Workstation',
    });

    // Station North (facing South toward -Z): Desk at cz + 0.42, Chair at cz + 1.15
    const deskZ_N = cz + 0.42;
    const chairZ_N = cz + 1.15;
    const seatedZ_N = cz + 1.05;
    const standZ_N = cz + 1.85;

    // Modern Developer Desk N (Rotated -90° so 1.6m width faces developer along X)
    spawnProp('minimalistDesk', cx, 0, deskZ_N, -Math.PI / 2, new Vector3(2.45, 1.35, 1.60), `eng_${id}_desk_n`);

    // Dual 4K Monitors on Articulated Arm N (clamped to back edge of desk, facing North toward user)
    mkDualMonitorSetup(scene, `eng_${id}_mon_n`, cx, ENG_DESK_H, deskZ_N - 0.28, Math.PI, ideTex, bronzeMat);

    // Station N Root Transform Node for perfectly aligned desk accessories
    const stationN_root = new TransformNode(`eng_${id}_stationN_root`, scene);
    stationN_root.position = new Vector3(cx, ENG_DESK_H, deskZ_N);
    stationN_root.rotation = new Vector3(0, Math.PI, 0);

    // Extended Charcoal Leather Desk Pad
    const padN = MeshBuilder.CreateBox(`eng_${id}_pad_n`, { width: 0.82, height: 0.003, depth: 0.34 }, scene);
    padN.parent = stationN_root;
    padN.position = new Vector3(0, 0.0015, -0.12);
    padN.material = deskPadMat;

    // Custom 75% Mechanical Keyboard (centered in front of chair on pad)
    mkMechanicalKeyboard(scene, `eng_${id}_kb_n`, stationN_root, -0.06, 0.005, -0.12, kbMat, aluminumMat);

    // Precision Wireless Mouse (to the right on pad)
    mkErgonomicMouse(scene, `eng_${id}_mouse_n`, stationN_root, 0.24, 0.005, -0.12, graphiteMat, aluminumMat);

    // Aluminum Laptop Riser Stand & MacBook Pro M3 (facing developer, 12° inward yaw)
    const mbpRot_N = -0.20;
    mkLaptopRiserStand(scene, `eng_${id}_riser_n`, null, cx + 0.52, ENG_DESK_H, deskZ_N + 0.02, mbpRot_N, aluminumMat);
    spawnProp('macbook', cx + 0.52, ENG_DESK_H + 0.065, deskZ_N + 0.02, mbpRot_N, 0.010, `eng_${id}_mbp_n`);

    // Ceramic Matte Black Coffee Tumbler
    mkCoffeeTumbler(scene, `eng_${id}_mug_n`, stationN_root, 0.52, 0, 0.08, ceramicMat, sleeveMat);

    // Realistic Modern Ergonomic Mesh Task Chair N
    spawnProp('modernChair', cx, 0, chairZ_N, Math.PI, 1.0, `eng_${id}_chair_n`);

    // Interactive [E] SIT Trigger N
    env.triggers.push({
      id:            `sit_eng_${id}_n`,
      type:          'SIT',
      position:      new Vector3(cx, ENG_SEAT_Y, chairZ_N),
      radius:        1.25,
      snapPosition:  new Vector3(cx, ENG_SEAT_Y, seatedZ_N),
      standPosition: new Vector3(cx, 0.90, standZ_N),
      snapRotationY: Math.PI, // facing South toward screens
      promptText:    '[E] Work at Workstation',
    });

    // Center Acoustic Screen Divider & Under-Desk Modesty Raceway
    mkBox(scene, `eng_${id}_screen`, 2.4, 0.46, 0.04, cx, 0.98, cz, frostedScreenMat, false);
    mkBox(scene, `eng_${id}_raceway`, 2.2, 0.48, 0.12, cx, 0.38, cz, bronzeMat, false);

    // Suspended Linear Pendant Task Light overhead
    mkLinearSuspendedLight(scene, `pendant_eng_${id}`, cx, 3.10, cz, 2.4, 'X', bronzeMat);
  }

  // ── 10. AGILE SPRINT WHITEBOARD & STANDING IDEATION HUB (North Wall: x ∈ [0.5, 5.2], z ≈ 9.9) ───
  {
    const sprintTex = createAgileSprintBoardTexture(scene);
    const sprintMat = new StandardMaterial('agileSprintMat', scene);
    sprintMat.diffuseTexture  = sprintTex;
    sprintMat.emissiveTexture = sprintTex;
    sprintMat.emissiveColor   = new Color3(0.95, 0.95, 0.95);
    sprintMat.backFaceCulling = false;

    const SPRINT_W = 4.40;
    const SPRINT_H = 1.90;
    const SPRINT_X = 2.80;
    const SPRINT_Y = 2.15;
    const SPRINT_Z = Z1_ZH - 0.06;

    // Dark bronze bezel frame
    mkBox(scene, 'agileBoardBezel', SPRINT_W + 0.08, SPRINT_H + 0.08, 0.04, SPRINT_X, SPRINT_Y, SPRINT_Z + 0.02, bronzeMat, false);

    // Tempered Glass Whiteboard Surface
    const sprintPlane = MeshBuilder.CreatePlane('agileSprintBoard', { width: SPRINT_W, height: SPRINT_H }, scene);
    sprintPlane.position = new Vector3(SPRINT_X, SPRINT_Y, SPRINT_Z - 0.005);
    sprintPlane.rotation = new Vector3(0, 0, 0); // faces South toward room
    sprintPlane.material = sprintMat;

    // Bronze marker tray at bottom
    mkBox(scene, 'agileMarkerTray', SPRINT_W - 0.40, 0.03, 0.10, SPRINT_X, SPRINT_Y - SPRINT_H / 2 - 0.015, SPRINT_Z - 0.05, bronzeMat, false);

    // Standing Ideation High Round Table (Walnut & Bronze, 1.15m diameter, 1.04m high)
    const TABLE_X = 2.80;
    const TABLE_Z = 7.50;
    const TABLE_H = 1.04;

    // Fluted trumpet base
    mkDisc(scene, 'ideationTableBase', 0.55, 0.03, TABLE_X, 0.015, TABLE_Z, bronzeMat, 24, true);
    mkDisc(scene, 'ideationTableCol',  0.08, TABLE_H - 0.06, TABLE_X, TABLE_H / 2, TABLE_Z, bronzeMat, 20, false);
    // Walnut tabletop with bronze edge band
    mkDisc(scene, 'ideationTableTop',  1.15, 0.04, TABLE_X, TABLE_H, TABLE_Z, walnutMat, 32, true);

    // 2 High Bar Stools at Ideation Table
    const leatherMat = solidMat(scene, 'barLeatherMat', 0.18, 0.16, 0.15, 24);
    mkModernBarStool(scene, 'ideationStool_w', TABLE_X - 0.70, TABLE_Z, Math.PI / 2, 0.75, leatherMat, bronzeMat);
    mkModernBarStool(scene, 'ideationStool_e', TABLE_X + 0.70, TABLE_Z, -Math.PI / 2, 0.75, leatherMat, bronzeMat);

    // Interactive SIT Triggers for Ideation Table Bar Stools
    env.triggers.push({
      id:            'sit_ideation_w',
      type:          'SIT',
      position:      new Vector3(TABLE_X - 0.70, 0.90, TABLE_Z),
      radius:        1.15,
      snapPosition:  new Vector3(TABLE_X - 0.62, 1.22, TABLE_Z),
      standPosition: new Vector3(TABLE_X - 1.40, 0.90, TABLE_Z),
      snapRotationY: Math.PI / 2, // faces East toward table
      promptText:    '[E] Sit at Ideation Table',
    });

    env.triggers.push({
      id:            'sit_ideation_e',
      type:          'SIT',
      position:      new Vector3(TABLE_X + 0.70, 0.90, TABLE_Z),
      radius:        1.15,
      snapPosition:  new Vector3(TABLE_X + 0.62, 1.22, TABLE_Z),
      standPosition: new Vector3(TABLE_X + 1.40, 0.90, TABLE_Z),
      snapRotationY: -Math.PI / 2, // faces West toward table
      promptText:    '[E] Sit at Ideation Table',
    });

    // Floating Architectural Bookshelf on East Wall (x = 5.85, z in [6.5, 8.5])
    mkBox(scene, 'agileBookcaseFrame', 0.28, 2.40, 1.80, 5.85, 1.80, 7.50, bronzeMat, true);
    for (const sy of [0.90, 1.45, 2.00, 2.55]) {
      mkBox(scene, `agileBookShelf_${sy}`, 0.26, 0.03, 1.76, 5.85, sy, 7.50, walnutMat, false);
    }

    // Task Point Light for Agile Hub (crisp 4000K daylight)
    const whiteboardLight = new PointLight('whiteboardLight', new Vector3(SPRINT_X, 2.9, SPRINT_Z - 1.4), scene);
    whiteboardLight.intensity = 0.45;
    whiteboardLight.range     = 8.0;
    whiteboardLight.diffuse   = new Color3(0.96, 0.98, 1.0);

    // Interactive READ trigger to inspect Sprint Backlog
    env.triggers.push({
      id:         'read_agile_sprint',
      type:       'READ',
      position:   new Vector3(SPRINT_X, 1.2, SPRINT_Z - 1.4),
      radius:     2.5,
      promptText: '[E] Inspect Sprint Backlog',
    });
  }

  // ── 11. DEVELOPER HYDRATION & SPECIALTY COFFEE BAR (South Wall: x ∈ [0.5, 5.2], z ≈ -9.9) ───
  {
    const BAR_X = 2.80;
    const BAR_Z = -Z1_ZH + 0.55;
    const BAR_W = 4.40;
    const BAR_H = 0.94;
    const BAR_D = 0.72;

    const chromeMat = solidMat(scene, 'chromeMat', 0.88, 0.90, 0.94, 128, new Color3(0.95, 0.95, 0.98));
    const quartzMat = solidMat(scene, 'quartzMat', 0.95, 0.95, 0.94, 48, new Color3(0.4, 0.4, 0.4));

    // Walnut Cabinetry Base
    mkBox(scene, 'coffeeBarBase', BAR_W, BAR_H, BAR_D, BAR_X, BAR_H / 2, BAR_Z, walnutMat, true);

    // Calacatta White Quartz Waterfall Countertop (overhangs front edge)
    mkBox(scene, 'coffeeBarTop', BAR_W + 0.06, 0.06, BAR_D + 0.08, BAR_X, BAR_H + 0.03, BAR_Z + 0.02, quartzMat, true);
    // Waterfall side edge
    mkBox(scene, 'coffeeBarWaterfall', 0.06, BAR_H + 0.06, BAR_D + 0.08, BAR_X - BAR_W / 2 - 0.03, (BAR_H + 0.06) / 2, BAR_Z + 0.02, quartzMat, true);

    // Commercial 2-Group Head Chrome & Walnut Espresso Machine
    mkEspressoMachine(scene, 'espressoMachine', null as any, BAR_X - 1.20, BAR_H + 0.06, BAR_Z, chromeMat, bronzeMat, walnutMat);

    // Commercial On-Demand Burr Coffee Grinder (Matte Black & Stainless Steel)
    mkCommercialCoffeeGrinder(scene, 'coffeeGrinder', BAR_X - 0.55, BAR_H + 0.06, BAR_Z, chromeMat, bronzeMat, walnutMat);

    // Beverage Dual Draft Tap Tower (Cold Brew & Sparkling Water)
    mkBeverageDraftTapTower(scene, 'draftTap', BAR_X + 1.20, BAR_H + 0.06, BAR_Z, chromeMat, bronzeMat, walnutMat);

    // 4 Modern Leather & Bronze Bar Stools along Front Counter
    const barLeatherMat = solidMat(scene, 'coffeeStoolLeather', 0.22, 0.18, 0.14, 28);
    const stoolXs = [BAR_X - 1.5, BAR_X - 0.5, BAR_X + 0.5, BAR_X + 1.5];
    const stoolZ = BAR_Z + 0.80;

    for (let si = 0; si < stoolXs.length; si++) {
      const sx = stoolXs[si];
      // rotY = Math.PI so stool faces South toward the counter, lumbar backrest supports user from North
      mkModernBarStool(scene, `coffeeStool_${si}`, sx, stoolZ, Math.PI, 0.75, barLeatherMat, bronzeMat);

      // Interactive SIT Trigger for Bar Stools
      // Stool cushion is at 0.75m; capsule position 1.22m places hips flush on cushion and feet on footrest ring
      const BAR_STOOL_SEATED_Y = 1.22;
      env.triggers.push({
        id:            `sit_bar_stool_${si}`,
        type:          'SIT',
        position:      new Vector3(sx, 0.90, stoolZ),
        radius:        1.15,
        snapPosition:  new Vector3(sx, BAR_STOOL_SEATED_Y, stoolZ - 0.08),
        standPosition: new Vector3(sx, 0.90, stoolZ + 0.75),
        snapRotationY: Math.PI, // faces South directly toward coffee counter
        promptText:    '[E] Sit at Coffee Bar',
      });
    }

    // Suspended Bronze Glassware Rack overhead
    mkBox(scene, 'coffeeGlassRack', BAR_W - 0.60, 0.04, 0.40, BAR_X, 2.75, BAR_Z, bronzeMat, false);

    // 3 Brushed Brass Pendant Lights overhead
    for (let pi = -1; pi <= 1; pi++) {
      const px = BAR_X + pi * 1.10;
      mkDownlightFixture(scene, `coffeePendant_${pi}`, px, Z1_H, BAR_Z);
    }

    // Warm Amber Point Light for Coffee Bar (2800K glow)
    const barZoneLight = new PointLight('barZoneLight', new Vector3(BAR_X, 2.6, BAR_Z + 0.60), scene);
    barZoneLight.intensity = 0.50;
    barZoneLight.range     = 7.0;
    barZoneLight.diffuse   = new Color3(1.0, 0.92, 0.78);
  }

  // ── 12. SKYLINE CASUAL IDEATION LOUNGE (West Window: x ≈ -11.0, z ∈ [-2.5, 2.5]) ───
  {
    const LOUNGE_X = -11.0;
    const LOUNGE_Z = 0.0;

    // Organic Travertine Stone Coffee Table (1.2m x 0.6m x 0.38m)
    const travMat = solidMat(scene, 'travertineMat', 0.86, 0.84, 0.80, 24);
    mkBox(scene, 'skylineCoffeeTable', 1.20, 0.05, 0.60, LOUNGE_X, 0.36, LOUNGE_Z, travMat, true);
    mkBox(scene, 'skylineTableLegL',   0.10, 0.34, 0.48, LOUNGE_X - 0.45, 0.17, LOUNGE_Z, bronzeMat, false);
    mkBox(scene, 'skylineTableLegR',   0.10, 0.34, 0.48, LOUNGE_X + 0.45, 0.17, LOUNGE_Z, bronzeMat, false);

    // Open MacBook on Coffee Table
    spawnProp('macbook', LOUNGE_X - 0.15, 0.38 + 0.015, LOUNGE_Z + 0.04, Math.PI / 4, 0.010, 'skyline_macbook');

    // 2 Contemporary Lounge Armchairs facing each other across table
    const armZ_N = LOUNGE_Z + 1.25;
    const armZ_S = LOUNGE_Z - 1.25;

    spawnProp('orangecouch', LOUNGE_X, 0, armZ_N, Math.PI, 1.15, 'skyline_couch_n');
    env.triggers.push({
      id:            'sit_skyline_n',
      type:          'SIT',
      position:      new Vector3(LOUNGE_X, SEATED_Y, armZ_N),
      radius:        1.2,
      snapPosition:  new Vector3(LOUNGE_X, SEATED_Y, armZ_N - 0.22),
      standPosition: new Vector3(LOUNGE_X, 0.90, armZ_N + 0.80),
      snapRotationY: Math.PI, // faces South
      promptText:    '[E] Relax at Skyline Lounge',
    });

    spawnProp('redcouch', LOUNGE_X, 0, armZ_S, 0, 1.15, 'skyline_couch_s');
    env.triggers.push({
      id:            'sit_skyline_s',
      type:          'SIT',
      position:      new Vector3(LOUNGE_X, SEATED_Y, armZ_S),
      radius:        1.2,
      snapPosition:  new Vector3(LOUNGE_X, SEATED_Y, armZ_S + 0.22),
      standPosition: new Vector3(LOUNGE_X, 0.90, armZ_S - 0.80),
      snapRotationY: 0, // faces North
      promptText:    '[E] Relax at Skyline Lounge',
    });

    // Floor Lamp next to Lounge
    mkDownlightFixture(scene, 'skylineFloorLamp', LOUNGE_X + 1.4, 0, LOUNGE_Z);

    // Warm Sunset Point Light for Skyline Lounge
    const skylineLight = new PointLight('skylineLight', new Vector3(LOUNGE_X, 2.6, LOUNGE_Z), scene);
    skylineLight.intensity = 0.45;
    skylineLight.range     = 8.0;
    skylineLight.diffuse   = new Color3(1.0, 0.94, 0.85);
  }

  // ── 13. SERVER TELEMETRY BAY (North-West Wall, x: -11.5 → -6.5, z = +9.5) ───
  // 3 Enterprise 42U Server Rack Cabinets with animated diagnostic displays & status LEDs
  const RACK_W = 0.95;
  const RACK_H = 2.20;
  const RACK_D = 0.90;
  const rackXs = [-10.4, -9.0, -7.6];

  for (let r = 0; r < rackXs.length; r++) {
    const rx = rackXs[r];
    const rTex = createServerRackTexture(scene, r + 1);
    const rMat = new StandardMaterial(`serverRackMat_${r}`, scene);
    rMat.diffuseTexture  = rTex;
    rMat.emissiveTexture = rTex;
    rMat.emissiveColor   = new Color3(1.0, 1.0, 1.0);
    rMat.backFaceCulling = false;

    // Main cabinet body
    mkBox(scene, `serverRack_${r}`, RACK_W, RACK_H, RACK_D, rx, RACK_H / 2, Z1_ZH - RACK_D / 2 - 0.05, bronzeMat, true);

    // Front illuminated telemetry face (faces South toward room)
    const facePlane = MeshBuilder.CreatePlane(`serverFace_${r}`, { width: RACK_W - 0.06, height: RACK_H - 0.08 }, scene);
    facePlane.position = new Vector3(rx, RACK_H / 2, Z1_ZH - RACK_D - 0.055);
    facePlane.rotation = new Vector3(0, 0, 0); // facing South toward room
    facePlane.material = rMat;
  }

  // High-voltage safety perimeter boundary floor tape
  const hazardMat = solidMat(scene, 'serverHazardMat', 0.90, 0.70, 0.10, 16);
  mkBox(scene, 'serverHazardTape', 4.8, 0.005, 0.08, -9.0, 0.005, Z1_ZH - RACK_D - 0.25, hazardMat, false);

  // Overhead yellow/black steel cable ladder rack above servers
  const ladderMat = solidMat(scene, 'cableLadderMat', 0.85, 0.65, 0.15, 32);
  mkBox(scene, 'cableLadder', 4.4, 0.08, 0.50, -9.0, 3.20, Z1_ZH - 0.55, ladderMat, false);

  // Cyan server glow point light
  const serverGlow = new PointLight('serverGlow', new Vector3(-9.0, 1.8, Z1_ZH - 1.4), scene);
  serverGlow.intensity = 0.55;
  serverGlow.range     = 8.0;
  serverGlow.diffuse   = new Color3(0.20, 0.85, 1.0);

  // ── 14. INCIDENT WAR-ROOM ARCHITECTURE BOARD (South Wall, x: -7.0 → -2.5) ────
  // Large format illuminated glass whiteboard with microservice topology & incident callouts
  {
    const boardTex = createIncidentBoardTexture(scene);
    const boardMat = new StandardMaterial('incidentBoardMat', scene);
    boardMat.diffuseTexture  = boardTex;
    boardMat.emissiveTexture = boardTex;
    boardMat.emissiveColor   = new Color3(1.0, 1.0, 1.0);
    boardMat.backFaceCulling = false;

    const BOARD_W = 4.60;
    const BOARD_H = 2.00;
    const BOARD_X = -4.80;
    const BOARD_Y = 2.10;
    const BOARD_Z = -Z1_ZH + 0.08;

    // Dark bronze bezel casing
    mkBox(scene, 'incBoardBezel', BOARD_W + 0.08, BOARD_H + 0.08, 0.04, BOARD_X, BOARD_Y, BOARD_Z - 0.02, bronzeMat, false);

    const boardPlane = MeshBuilder.CreatePlane('incidentBoard', { width: BOARD_W, height: BOARD_H }, scene);
    boardPlane.position = new Vector3(BOARD_X, BOARD_Y, BOARD_Z + 0.005);
    boardPlane.rotation = new Vector3(0, Math.PI, 0);
    boardPlane.material = boardMat;

    // Interactive READ trigger to inspect architecture topology
    env.triggers.push({
      id:         'read_incident_board',
      type:       'READ',
      position:   new Vector3(BOARD_X, 1.2, BOARD_Z + 1.2),
      radius:     2.5,
      promptText: '[E] Inspect Architecture Topology',
    });
  }

  // 15. Biophilic Planters in Room 2 (Framing walkways and lounges)
  spawnProp('plant', -4.0, 0, 0.0, 0, 1.35, 'r2_plant_center');
  spawnProp('plant', -9.0, 0, 0.0, 0, 1.35, 'r2_plant_west');
  spawnProp('plant', R2_X0 + 1.2, 0, 7.5, 0, 1.20, 'r2_plant_skyline_n');
  spawnProp('plant', R2_X0 + 1.2, 0, -7.5, 0, 1.20, 'r2_plant_skyline_s');
  spawnProp('plant', 5.2, 0, 2.2, 0, 1.15, 'r2_portal_plant_n');
  spawnProp('plant', 5.2, 0, -2.2, 0, 1.15, 'r2_portal_plant_s');
  spawnProp('plant', 0.2, 0, -9.2, 0, 1.15, 'r2_coffee_plant');
  spawnProp('plant', 0.2, 0, 9.2, 0, 1.15, 'r2_agile_plant');

  // ── SHADOWS CONFIGURATION ──────────────────────────────────────────────────

  const ENV_PREFIXES = [
    'floor', 'ceiling', 'soffit', 'baseboard', 'pilaster',
    'wallN', 'wallS', 'wallE', 'wallMat', 'slats',
    'gp_', 'gPost_', 'gRailTop', 'gTransom', 'gSill', 'glassCol', 'cityBackdrop',
    'efL', 'efR', 'efTop', 'elevL', 'elevR', 'elevAlcove', 'elevBlock', 'indBezel', 'indScreen',
    'rug_', 'brandSign', 'artN', 'artS', 'dlFix_', 'dashPlane', 'dashBezel',
    'r2_floor', 'r2_ceiling', 'r2_wall', 'r2_gp_', 'r2_gPost_', 'r2_gRail', 'r2_gSill', 'r2_baseboard',
    'r2_promenade', 'r2_prom_trim', 'r2_rug_', 'r2_ceil_', 'r2_oak_slat_',
    'partGlass_', 'partPost_', 'partRail', 'partSill', 'portalJamb', 'portalLintel', 'portalTransom', 'portalSign',
    'frostedScreen', 'eng_p', 'pendant_', 'serverRack_', 'serverFace_', 'cableLadder', 'incBoard', 'incidentBoard',
    'agileBoard', 'agileSprint', 'coffeeBar', 'coffeeGrinder', 'espresso', 'draftTap', 'skyline',
    'planterBuffer', 'eastCredenza',
  ];

  // Only major ground furniture casts shadows (no tiny micro-props, screws, cables, or monitors)
  const SHADOW_KEYWORDS = ['couch', 'table', 'plinth', 'desk', 'chair'];
  for (const mesh of scene.meshes) {
    if (mesh.name === '__root__') continue;
    const nameLower = mesh.name.toLowerCase();
    const isMajorFurniture = SHADOW_KEYWORDS.some(k => nameLower.includes(k));
    const isEnv = ENV_PREFIXES.some(p => mesh.name.startsWith(p));
    if (isMajorFurniture && !isEnv) {
      shadowGen.addShadowCaster(mesh, false);
    }
  }

  // Technique #9 (Baked Shadows): Render static office shadows once instead of every single frame
  const sm = shadowGen.getShadowMap();
  if (sm) {
    sm.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
  }

  // ── Build Floor 2 (Frontend Engineering Department) ──────────────────────
  const floor2Doors = await buildFloor2(scene, env, spawnProp);

  // ── Initialize Interactive 3D Elevator Transit System ────────────────────
  const elevatorManager = new ElevatorManager(scene);
  elevatorManager.init(env, { left: elevL, right: elevR }, floor2Doors);
  env.elevatorManager = elevatorManager;
  (scene as any).elevatorManager = elevatorManager;

  console.log(`[Redesign] SimOffice Lounge built with ${env.triggers.length} calibrated SIT triggers.`);
  return env;
}
