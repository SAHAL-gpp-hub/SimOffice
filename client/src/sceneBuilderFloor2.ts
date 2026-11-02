import {
  Scene,
  Vector3,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  DynamicTexture,
  Texture,
  PointLight,
  TransformNode,
} from '@babylonjs/core';
import type { Environment, SpawnPropFn } from './sceneBuilder';
import {
  solidMat,
  invisMat,
  mkBox,
  mkDisc,
  createLimestoneFloorTexture,
  createTechBasaltFloorTexture,
  createBlondeOakSlatTexture,
  createWalnutSlatTexture,
  createAcousticFeltTexture,
  createWovenRugTexture,
  createAbstractArtTexture,
  createDeskPadTexture,
  createMechanicalKeyboardTexture,
  mkArtworkPanel,
  mkDownlightFixture,
  mkModernSideTable,
  mkDualMonitorSetup,
  mkLaptopRiserStand,
  mkMechanicalKeyboard,
  mkErgonomicMouse,
  mkCoffeeTumbler,
  mkModernBarStool,
  mkEspressoMachine,
  mkCommercialCoffeeGrinder,
  mkBeverageDraftTapTower,
} from './sceneBuilder';

// ── Coordinate Constants for Floor 2 ──────────────────────────────────────────
// Floor 2 Finished Floor Level (FFL) = 14.0m, Ceiling = 18.0m (Clear Height = 4.0m)
const F2_Y0      = 14.0;
const F2_H       = 4.0;
const F2_YTOP    = F2_Y0 + F2_H; // 18.0m

// Room 1 (Creative Tech & UX Design Studio, East Wing): x = 6 → 30 (width = 24m), z = -10 → +10 (depth = 20m)
const Z1_X0      = 6;    // Central dividing portal wall
const Z1_X1      = 30;   // East wall (elevator portal & fluted panels)
const Z1_MX      = 18;   // Room 1 center X
const Z1_ZH      = 10;   // Half-depth (north wall at +10, south wall at -10)
const Z1_W       = 24;   // Room 1 width
const Z1_D       = 20;   // Room depth
const WALL_T     = 0.3;  // Solid wall thickness

// Room 2 (Frontend Engineering & Device Lab, West Wing): x = -14 → 6 (width = 20m), z = -10 → +10 (depth = 20m)
const R2_X0      = -14;  // Room 2 west exterior wall (panoramic skyline curtain wall)
const R2_W       = 20;   // Room 2 width
const R2_MX      = -4;   // Room 2 center X

// Portal & Elevator dimensions
const ELEV_W     = 2.2;
const ELEV_H     = 2.8;
const PORTAL_W   = 3.4;  // Central portal doorway opening width
const PORTAL_H   = 2.85; // Central doorway opening height

export interface Floor2Doors {
  left: Mesh;
  right: Mesh;
}

export async function buildFloor2(
  scene: Scene,
  env: Environment,
  spawnProp?: SpawnPropFn,
): Promise<Floor2Doors> {
  // ── 1. ARCHITECTURAL MATERIALS SUITE ─────────────────────────────────────────

  // Room 1: Large-format Honed Limestone / Terrazzo Floor Tiles (1.0m x 1.0m module)
  const floorTex = createLimestoneFloorTexture(scene);
  floorTex.wrapU  = Texture.WRAP_ADDRESSMODE;
  floorTex.wrapV  = Texture.WRAP_ADDRESSMODE;
  floorTex.uScale = 12;
  floorTex.vScale = 10;

  const floorMat = new StandardMaterial('f2_limestoneFloorMat', scene);
  floorMat.diffuseTexture = floorTex;
  floorMat.specularColor  = new Color3(0.06, 0.06, 0.06);
  floorMat.specularPower  = 32;

  // Room 2: Industrial Tech Honed Basalt / Terrazzo Floor
  const basaltTex = createTechBasaltFloorTexture(scene);
  basaltTex.wrapU  = Texture.WRAP_ADDRESSMODE;
  basaltTex.wrapV  = Texture.WRAP_ADDRESSMODE;
  basaltTex.uScale = 10;
  basaltTex.vScale = 10;

  const basaltMat = new StandardMaterial('f2_basaltMat', scene);
  basaltMat.diffuseTexture = basaltTex;
  basaltMat.specularColor  = new Color3(0.08, 0.08, 0.08);
  basaltMat.specularPower  = 28;

  // Warm Neutral Plaster Wall Finish
  const wallMat = solidMat(scene, 'f2_plasterWallMat', 0.90, 0.87, 0.82, 10, new Color3(0.02, 0.02, 0.02));

  // Architectural Anodized Charcoal / Bronze Baseboards & Mullions
  const bronzeMat = solidMat(scene, 'f2_archBronzeMat', 0.18, 0.17, 0.16, 36, new Color3(0.20, 0.18, 0.16));

  // Blonde Oak Vertical Slat Paneling
  const blondeOakTex = createBlondeOakSlatTexture(scene);
  blondeOakTex.wrapU = Texture.WRAP_ADDRESSMODE;
  blondeOakTex.wrapV = Texture.WRAP_ADDRESSMODE;
  blondeOakTex.uScale = 6;
  blondeOakTex.vScale = 2;

  const blondeOakMat = new StandardMaterial('f2_blondeOakMat', scene);
  blondeOakMat.diffuseTexture = blondeOakTex;
  blondeOakMat.specularColor = new Color3(0.14, 0.12, 0.09);
  blondeOakMat.specularPower = 20;

  // American Walnut Architectural Slat Paneling
  const walnutTex = createWalnutSlatTexture(scene);
  const walnutMat = new StandardMaterial('f2_walnutMat', scene);
  walnutMat.diffuseTexture = walnutTex;
  walnutMat.specularColor = new Color3(0.18, 0.14, 0.10);
  walnutMat.specularPower = 24;

  // Fluted Charcoal Acoustic Felt Paneling
  const feltTex = createAcousticFeltTexture(scene);
  const feltMat = new StandardMaterial('f2_feltMat', scene);
  feltMat.diffuseTexture = feltTex;
  feltMat.specularColor = new Color3(0.03, 0.03, 0.03);
  feltMat.specularPower = 6;

  // Ceiling materials & Soffits
  const ceilMat = solidMat(scene, 'f2_ceilMat', 0.92, 0.89, 0.85, 4, new Color3(0.01, 0.01, 0.01));
  const soffitMat = solidMat(scene, 'f2_soffitMat', 0.86, 0.83, 0.79, 6);

  // Glass materials
  const r2GlassMat = new StandardMaterial('f2_r2GlassMat', scene);
  r2GlassMat.diffuseColor    = new Color3(0.04, 0.08, 0.14);
  r2GlassMat.specularColor   = new Color3(0.95, 0.95, 0.95);
  r2GlassMat.specularPower   = 128;
  r2GlassMat.alpha           = 0.15;
  r2GlassMat.backFaceCulling = false;

  const frostedGlassMat = new StandardMaterial('f2_frostedGlassMat', scene);
  frostedGlassMat.diffuseColor = new Color3(0.85, 0.90, 0.95);
  frostedGlassMat.specularColor = new Color3(0.9, 0.9, 0.9);
  frostedGlassMat.alpha = 0.55;

  // Woven Wool Rug Materials
  const roundRugTex = createWovenRugTexture(scene, true);
  const roundRugMat = new StandardMaterial('f2_roundRugMat', scene);
  roundRugMat.diffuseTexture = roundRugTex;
  roundRugMat.specularPower  = 6;

  const rectRugTex = createWovenRugTexture(scene, false);
  const rectRugMat = new StandardMaterial('f2_rectRugMat', scene);
  rectRugMat.diffuseTexture = rectRugTex;
  rectRugMat.specularPower  = 6;

  // Desk accessories & workstation materials
  const deskPadTex = createDeskPadTexture(scene);
  const deskPadMat = new StandardMaterial('f2_deskPadMat', scene);
  deskPadMat.diffuseTexture = deskPadTex;
  deskPadMat.specularPower = 12;

  const kbTex = createMechanicalKeyboardTexture(scene);
  const kbMat = new StandardMaterial('f2_kbMat', scene);
  kbMat.diffuseTexture  = kbTex;
  kbMat.emissiveTexture = kbTex;
  kbMat.emissiveColor   = new Color3(0.25, 0.25, 0.28);
  kbMat.specularPower   = 32;

  const aluminumMat = solidMat(scene, 'f2_aluminumMat', 0.75, 0.77, 0.80, 64, new Color3(0.4, 0.4, 0.4));
  const graphiteMat = solidMat(scene, 'f2_graphiteMat', 0.14, 0.14, 0.15, 32);
  const ceramicMat = solidMat(scene, 'f2_ceramicMat', 0.18, 0.18, 0.19, 48);
  const sleeveMat = solidMat(scene, 'f2_sleeveMat', 0.12, 0.12, 0.13, 16);
  const chromeMat = solidMat(scene, 'f2_chromeMat', 0.88, 0.90, 0.94, 128, new Color3(0.95, 0.95, 0.98));
  const quartzMat = solidMat(scene, 'f2_quartzMat', 0.96, 0.96, 0.98, 48, new Color3(0.4, 0.4, 0.4));
  const barLeatherMat = solidMat(scene, 'f2_barLeatherMat', 0.22, 0.18, 0.14, 28);

  // ── 2. DEDICATED ARCHITECTURAL POINT LIGHT SUITE FOR FLOOR 2 ───────────────
  // Floor 2 Finished Floor Level is y = 14.0m, ceiling is y = 18.0m.
  // Floor 1 lights (y = 0-3.6m) do not illuminate Floor 2.
  // These 8 optimized zone lights give Floor 2 the exact same rich, warm, cinematic atmosphere:

  // Room 1: Executive Lounge Warm Ambient Light
  const f2_loungeLight = new PointLight('f2_loungeZoneLight', new Vector3(Z1_MX, F2_YTOP - 0.45, 0.0), scene);
  f2_loungeLight.intensity = 0.58;
  f2_loungeLight.range     = 18.0;
  f2_loungeLight.diffuse   = new Color3(1.0, 0.95, 0.88);

  // Room 1: Elevator Arrival & Eastern Circulation Light
  const f2_arrivalLight = new PointLight('f2_arrivalZoneLight', new Vector3(25.0, F2_YTOP - 0.45, 0.0), scene);
  f2_arrivalLight.intensity = 0.48;
  f2_arrivalLight.range     = 15.0;
  f2_arrivalLight.diffuse   = new Color3(1.0, 0.94, 0.86);

  // Room 1: Specialty Espresso Bar Warm Amber Glow (2800K)
  const f2_barLight = new PointLight('f2_barZoneLight', new Vector3(24.0, F2_Y0 + 2.7, -5.0), scene);
  f2_barLight.intensity = 0.52;
  f2_barLight.range     = 8.0;
  f2_barLight.diffuse   = new Color3(1.0, 0.92, 0.78);

  // Room 1: UX Whiteboard Crisp Task Daylight (4000K)
  const f2_whiteboardLight = new PointLight('f2_whiteboardLight', new Vector3(13.0, F2_Y0 + 2.8, -Z1_ZH + 1.2), scene);
  f2_whiteboardLight.intensity = 0.46;
  f2_whiteboardLight.range     = 8.0;
  f2_whiteboardLight.diffuse   = new Color3(0.96, 0.98, 1.0);

  // Room 2: Engineering Lab Natural Daylight (3400K)
  const f2_labLight = new PointLight('f2_labZoneLight', new Vector3(R2_MX, F2_YTOP - 0.45, 0.0), scene);
  f2_labLight.intensity = 0.65;
  f2_labLight.range     = 22.0;
  f2_labLight.diffuse   = new Color3(1.0, 0.98, 0.95);

  // Room 2: Incident Operations Rose Glow (P1 Alert ambiance)
  const f2_incidentLight = new PointLight('f2_incidentGlow', new Vector3(-6.0, F2_Y0 + 2.4, -Z1_ZH + 1.2), scene);
  f2_incidentLight.intensity = 0.55;
  f2_incidentLight.range     = 9.0;
  f2_incidentLight.diffuse   = new Color3(1.0, 0.35, 0.45);

  // Room 2: Device Testing Farm Cyan Tech Glow
  const f2_deviceFarmLight = new PointLight('f2_deviceFarmGlow', new Vector3(-11.5, F2_Y0 + 2.4, 5.0), scene);
  f2_deviceFarmLight.intensity = 0.50;
  f2_deviceFarmLight.range     = 10.0;
  f2_deviceFarmLight.diffuse   = new Color3(0.20, 0.85, 1.0);

  // Room 2: Skyline Lounge Warm Sunset Glow
  const f2_skylineLight = new PointLight('f2_skylineLight', new Vector3(-11.0, F2_Y0 + 2.5, 0.0), scene);
  f2_skylineLight.intensity = 0.45;
  f2_skylineLight.range     = 9.0;
  f2_skylineLight.diffuse   = new Color3(1.0, 0.94, 0.85);

  // ── 3. ROOM 1: ARCHITECTURAL ENVELOPE (East Wing, x ∈ [6, 30]) ───────────────

  // 1. Room 1 Finished Floor Slab (y = 14.0m)
  const floor1 = MeshBuilder.CreateGround('f2_floor_r1', { width: Z1_W, height: Z1_D }, scene);
  floor1.position.x      = Z1_MX;
  floor1.position.y      = F2_Y0;
  floor1.position.z      = 0;
  floor1.checkCollisions = true;
  floor1.material        = floorMat;
  floor1.receiveShadows  = true;

  // 2. Room 1 Ceiling with recessed central coffer / perimeter drop soffit
  mkBox(scene, 'f2_ceiling_r1', Z1_W + WALL_T * 2, 0.06, Z1_D + WALL_T * 2,
    Z1_MX, F2_YTOP + 0.03, 0, ceilMat, true);

  // Ceiling perimeter light trough / soffits
  mkBox(scene, 'f2_soffit_north', Z1_W - 1.2, 0.14, 0.90, Z1_MX, F2_YTOP - 0.07, Z1_ZH - 0.45, soffitMat, true);
  mkBox(scene, 'f2_soffit_south', Z1_W - 1.2, 0.14, 0.90, Z1_MX, F2_YTOP - 0.07, -Z1_ZH + 0.45, soffitMat, true);
  mkBox(scene, 'f2_soffit_east',  0.90, 0.14, Z1_D - 1.2, Z1_X1 - 0.45, F2_YTOP - 0.07, 0, soffitMat, true);

  // 3. Recessed dark bronze architectural baseboards (0.14m high)
  const BB_H = 0.14;
  const sideLen = (Z1_D - ELEV_W) / 2; // 8.9m wings flanking elevator
  mkBox(scene, 'f2_baseboard_north', Z1_W, BB_H, 0.03, Z1_MX, F2_Y0 + BB_H / 2, Z1_ZH - 0.015, bronzeMat, false);
  mkBox(scene, 'f2_baseboard_south', Z1_W, BB_H, 0.03, Z1_MX, F2_Y0 + BB_H / 2, -Z1_ZH + 0.015, bronzeMat, false);
  mkBox(scene, 'f2_baseboard_east_n', 0.03, BB_H, sideLen, Z1_X1 - 0.015, F2_Y0 + BB_H / 2, (ELEV_W / 2 + sideLen / 2), bronzeMat, false);
  mkBox(scene, 'f2_baseboard_east_s', 0.03, BB_H, sideLen, Z1_X1 - 0.015, F2_Y0 + BB_H / 2, -(ELEV_W / 2 + sideLen / 2), bronzeMat, false);

  // 4. North & South Solid Walls with Structural Pilasters & Acoustic Walnut Paneling
  mkBox(scene, 'f2_wallN_r1', Z1_W + WALL_T * 2, F2_H, WALL_T, Z1_MX, F2_Y0 + F2_H / 2, Z1_ZH + WALL_T / 2, wallMat, true);
  mkBox(scene, 'f2_wallS_r1', Z1_W + WALL_T * 2, F2_H, WALL_T, Z1_MX, F2_Y0 + F2_H / 2, -Z1_ZH - WALL_T / 2, wallMat, true);

  // Acoustic Walnut Paneling accents along North wall
  mkBox(scene, 'f2_slatsN_left', 7.5, F2_H - 0.20, 0.04, 11.5, F2_Y0 + F2_H / 2, Z1_ZH - 0.02, walnutMat, false);
  mkBox(scene, 'f2_slatsN_right', 7.5, F2_H - 0.20, 0.04, 24.5, F2_Y0 + F2_H / 2, Z1_ZH - 0.02, walnutMat, false);

  // Structural Pilasters along North wall
  for (const px of [10.0, 16.0, 22.0, 28.0]) {
    mkBox(scene, `f2_pilaster_n_${px}`, 0.60, F2_H, 0.22, px, F2_Y0 + F2_H / 2, Z1_ZH - 0.11, wallMat, false);
  }
  // Structural Pilasters along South wall (only at x=22, 28 so whiteboard at x=13 is 100% unobstructed)
  for (const px of [22.0, 28.0]) {
    mkBox(scene, `f2_pilaster_s_${px}`, 0.60, F2_H, 0.22, px, F2_Y0 + F2_H / 2, -Z1_ZH + 0.11, wallMat, false);
  }

  // 5. East Wall with Elevator Portal & Fluted Slat Wings
  mkBox(scene, 'f2_wallE_s', WALL_T, F2_H, sideLen, Z1_X1 + WALL_T / 2, F2_Y0 + F2_H / 2, -(ELEV_W / 2 + sideLen / 2), wallMat, true);
  mkBox(scene, 'f2_wallE_n', WALL_T, F2_H, sideLen, Z1_X1 + WALL_T / 2, F2_Y0 + F2_H / 2, (ELEV_W / 2 + sideLen / 2), wallMat, true);
  mkBox(scene, 'f2_wallE_top', WALL_T, F2_H - ELEV_H, ELEV_W, Z1_X1 + WALL_T / 2, F2_Y0 + ELEV_H + (F2_H - ELEV_H) / 2, 0, wallMat, true);

  // Full-height Blonde Oak Paneling flanking elevator portal
  mkBox(scene, 'f2_slatsE_left', 0.05, F2_H - 0.20, 6.6, Z1_X1 - 0.025, F2_Y0 + (F2_H - 0.20) / 2 + 0.10, 4.5, blondeOakMat, false);
  mkBox(scene, 'f2_slatsE_right', 0.05, F2_H - 0.20, 6.6, Z1_X1 - 0.025, F2_Y0 + (F2_H - 0.20) / 2 + 0.10, -4.5, blondeOakMat, false);

  // Floor 2 Elevator Door Frame & Sliding Panels
  const efMat = solidMat(scene, 'f2_elevFrameMat', 0.16, 0.15, 0.14, 28);
  const EF_T = 0.08;
  mkBox(scene, 'f2_efL',   EF_T, ELEV_H, EF_T, Z1_X1, F2_Y0 + ELEV_H / 2, -ELEV_W / 2, efMat, false);
  mkBox(scene, 'f2_efR',   EF_T, ELEV_H, EF_T, Z1_X1, F2_Y0 + ELEV_H / 2,  ELEV_W / 2, efMat, false);
  mkBox(scene, 'f2_efTop', EF_T, EF_T, ELEV_W + EF_T * 2, Z1_X1, F2_Y0 + ELEV_H + EF_T / 2, 0, efMat, false);

  const elevDoorMat = solidMat(scene, 'f2_elevDoorMat', 0.58, 0.56, 0.54, 32);
  const DOOR_PANEL_W = ELEV_W / 2 - 0.015;
  const doorsF2_L = mkBox(scene, 'f2_elevL', 0.04, ELEV_H, DOOR_PANEL_W, Z1_X1 + 0.02, F2_Y0 + ELEV_H / 2, -ELEV_W / 4, elevDoorMat, false);
  const doorsF2_R = mkBox(scene, 'f2_elevR', 0.04, ELEV_H, DOOR_PANEL_W, Z1_X1 + 0.02, F2_Y0 + ELEV_H / 2,  ELEV_W / 4, elevDoorMat, false);

  // East Wall Architectural Storage Credenzas flanking Elevator
  const ECD_W = 2.40;
  const ECD_H = 0.78;
  const ECD_D = 0.50;
  const ECD_X = Z1_X1 - ECD_D / 2 - 0.04;
  mkBox(scene, 'f2_eastCredenzaNorth_body', ECD_D, ECD_H, ECD_W, ECD_X, F2_Y0 + ECD_H / 2, 8.2, walnutMat, true);
  mkBox(scene, 'f2_eastCredenzaNorth_top', ECD_D + 0.04, 0.04, ECD_W + 0.04, ECD_X, F2_Y0 + ECD_H + 0.02, 8.2, bronzeMat, false);
  mkBox(scene, 'f2_eastCredenzaSouth_body', ECD_D, ECD_H, ECD_W, ECD_X, F2_Y0 + ECD_H / 2, -8.2, walnutMat, true);
  mkBox(scene, 'f2_eastCredenzaSouth_top', ECD_D + 0.04, 0.04, ECD_W + 0.04, ECD_X, F2_Y0 + ECD_H + 0.02, -8.2, bronzeMat, false);

  // Downlight Fixture Grids in Room 1 Ceiling with visible brass bezel and glowing lens
  for (const dx of [10, 14, 18, 22, 26]) {
    for (const dz of [-6, -2, 2, 6]) {
      mkDownlightFixture(scene, `f2_dl_r1_${dx}_${dz}`, dx, F2_YTOP, dz);
    }
  }

  // Gallery Abstract Artwork Panels with picture lights along North wall
  mkArtworkPanel(scene, 'f2_art_n1', 13.0, F2_Y0 + 2.1, Z1_ZH - 0.05, 1.8, 1.2, 0, createAbstractArtTexture(scene, 1), bronzeMat);
  mkArtworkPanel(scene, 'f2_art_n2', 25.0, F2_Y0 + 2.1, Z1_ZH - 0.05, 1.8, 1.2, 0, createAbstractArtTexture(scene, 2), bronzeMat);

  // ── 4. ROOM 1: EXECUTIVE HOSPITALITY LOUNGES & DESIGN SHOWCASE ─────────────

  // Premium Tabletop Materials for Floor 2 Lounges (Rich lighting with maxSimultaneousLights = 8)
  const f2TableMat = new StandardMaterial('f2_loungeTableTopMat', scene);
  f2TableMat.diffuseTexture = walnutTex;
  f2TableMat.specularColor = new Color3(0.24, 0.20, 0.16);
  f2TableMat.specularPower = 32;
  f2TableMat.maxSimultaneousLights = 8;
  f2TableMat.emissiveColor = new Color3(0.12, 0.10, 0.08);

  const f2TableBronzeMat = solidMat(scene, 'f2_tableBronzeMat', 0.35, 0.30, 0.24, 48, new Color3(0.40, 0.32, 0.22));
  f2TableBronzeMat.maxSimultaneousLights = 8;
  f2TableBronzeMat.emissiveColor = new Color3(0.10, 0.08, 0.06);

  function buildFloor2CoffeeTable(
    tName: string,
    cx: number,
    cz: number,
    baseY: number,
    topRadius: number = 0.65,
    tableHeight: number = 0.44,
  ): void {
    // 1. Heavy brushed bronze circular base plinth
    const basePlinth = MeshBuilder.CreateCylinder(`${tName}_plinth`, {
      diameter: topRadius * 1.1,
      height: 0.04,
      tessellation: 36,
    }, scene);
    basePlinth.position = new Vector3(cx, baseY + 0.02, cz);
    basePlinth.material = f2TableBronzeMat;
    basePlinth.checkCollisions = true;

    // 2. Architectural central pedestal column
    const pedH = tableHeight - 0.08;
    const pedestal = MeshBuilder.CreateCylinder(`${tName}_pedestal`, {
      diameterTop: 0.38,
      diameterBottom: 0.48,
      height: pedH,
      tessellation: 36,
    }, scene);
    pedestal.position = new Vector3(cx, baseY + 0.04 + pedH / 2, cz);
    pedestal.material = f2TableBronzeMat;
    pedestal.checkCollisions = true;

    // 3. Brushed bronze reveal ring under top
    const ring = MeshBuilder.CreateCylinder(`${tName}_ring`, {
      diameter: topRadius * 1.8,
      height: 0.02,
      tessellation: 36,
    }, scene);
    ring.position = new Vector3(cx, baseY + tableHeight - 0.045, cz);
    ring.material = f2TableBronzeMat;

    // 4. Solid premium walnut tabletop with smooth bevel
    const topMesh = MeshBuilder.CreateCylinder(`${tName}_top`, {
      diameter: topRadius * 2.0,
      height: 0.04,
      tessellation: 48,
    }, scene);
    topMesh.position = new Vector3(cx, baseY + tableHeight - 0.02, cz);
    topMesh.material = f2TableMat;
    topMesh.checkCollisions = true;

    // 5. Ceramic coffee tumbler on table
    mkCoffeeTumbler(scene, `${tName}_tumbler`, null, cx + 0.22, baseY + tableHeight, cz - 0.15, bronzeMat, walnutMat);
  }

  function buildFloor2ExecutiveTable(
    tName: string,
    cx: number,
    cz: number,
    baseY: number,
  ): void {
    const W = 1.60;
    const D = 0.85;
    const H = 0.44;

    // Solid walnut slab top
    mkBox(scene, `${tName}_top`, W, 0.05, D, cx, baseY + H - 0.025, cz, walnutMat, true);

    // Sturdy dark bronze architectural legs
    const legT = 0.05;
    const legH = H - 0.05;
    mkBox(scene, `${tName}_legL`, legT, legH, D - 0.10, cx - W / 2 + 0.10, baseY + legH / 2, cz, bronzeMat, true);
    mkBox(scene, `${tName}_legR`, legT, legH, D - 0.10, cx + W / 2 - 0.10, baseY + legH / 2, cz, bronzeMat, true);
    mkBox(scene, `${tName}_stretcher`, W - 0.24, legT, legT, cx, baseY + 0.08, cz, bronzeMat, false);

    // Ceramic tumbler
    mkCoffeeTumbler(scene, `${tName}_tumbler`, null, cx + 0.35, baseY + H, cz - 0.18, bronzeMat, walnutMat);
  }

  // ZONE A: EXECUTIVE COLLABORATION SUITE (North: x = 18.0, z = +5.6)
  const ZA_X = 18.0;
  const ZA_Z = 5.6;
  const rugA = mkDisc(scene, 'f2_rug_zoneA', 4.8, 0.02, ZA_X, F2_Y0 + 0.01, ZA_Z, roundRugMat, 64, false);
  rugA.receiveShadows = true;

  if (spawnProp) {
    // Two designer couches facing each other across coffee table
    spawnProp('orangecouch', ZA_X, F2_Y0, ZA_Z + 1.4, Math.PI, 1.10, 'f2_za_couch_n');
    spawnProp('redcouch',    ZA_X, F2_Y0, ZA_Z - 1.4, 0,       1.10, 'f2_za_couch_s');
    // Calibrated scale 0.010 for MacBook perfectly sitting on top of the 0.44m high table
    spawnProp('macbook', ZA_X - 0.20, F2_Y0 + 0.44 + 0.015, ZA_Z, Math.PI * 0.9, 0.010, 'f2_za_mb');
    spawnProp('plant',   ZA_X - 2.2,  F2_Y0,                ZA_Z + 1.8, 0,       1.15, 'f2_za_plant');
    spawnProp('lamp',    ZA_X + 2.2,  F2_Y0,                ZA_Z + 1.4, 0,       1.0,  'f2_za_lamp');
  }
  buildFloor2ExecutiveTable('f2_table_zoneA', ZA_X, ZA_Z, F2_Y0);
  mkModernSideTable(scene, 'f2_sidetable_zoneA', ZA_X + 2.2, ZA_Z - 0.5, bronzeMat, F2_Y0);

  // Interactive SIT Trigger for Zone A
  env.triggers.push({
    id: 'sit_fe_lounge_a',
    type: 'SIT',
    position: new Vector3(ZA_X, F2_Y0 + 0.5, ZA_Z + 1.4),
    radius: 1.8,
    snapPosition: new Vector3(ZA_X, F2_Y0 + 0.50, ZA_Z + 1.15),
    standPosition: new Vector3(ZA_X, F2_Y0 + 0.86, ZA_Z + 2.10),
    snapRotationY: Math.PI,
    promptText: '[E] Sit at Executive Design Suite',
  });

  // ZONE B: CENTRAL COLLABORATION ISLAND (Center: x = 18.0, z = 0.0)
  const ZB_X = 18.0;
  const ZB_Z = 0.0;
  const rugB = mkDisc(scene, 'f2_rug_zoneB', 5.2, 0.02, ZB_X, F2_Y0 + 0.01, ZB_Z, roundRugMat, 64, false);
  rugB.receiveShadows = true;

  if (spawnProp) {
    // 3 designer couches arranged at 120° around central lounge table
    const COUCH_R = 1.45;
    const angles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
    for (let i = 0; i < 3; i++) {
      const a = angles[i];
      const cx = ZB_X + Math.sin(a) * COUCH_R;
      const cz = ZB_Z + Math.cos(a) * COUCH_R;
      const facing = a + Math.PI;
      const asset = i === 0 ? 'orangecouch' : 'redcouch';
      spawnProp(asset, cx, F2_Y0, cz, facing, 1.05, `f2_zb_couch_${i}`);
    }
    // Calibrated scale 0.010 for MacBook perfectly sitting on top of the 0.44m high table
    spawnProp('macbook', ZB_X - 0.05, F2_Y0 + 0.44 + 0.015, ZB_Z + 0.04, Math.PI, 0.010, 'f2_zb_mb');
  }
  buildFloor2CoffeeTable('f2_table_zoneB', ZB_X, ZB_Z, F2_Y0, 0.65, 0.44);

  // ZONE C: INFORMAL TOUCHDOWN LOUNGE (South: x = 18.0, z = -5.6)
  const ZC_X = 18.0;
  const ZC_Z = -5.6;
  const rugC = mkDisc(scene, 'f2_rug_zoneC', 4.8, 0.02, ZC_X, F2_Y0 + 0.01, ZC_Z, roundRugMat, 64, false);
  rugC.receiveShadows = true;

  if (spawnProp) {
    spawnProp('redcouch',    ZC_X, F2_Y0, ZC_Z - 1.4, 0,       1.10, 'f2_zc_couch_s');
    spawnProp('orangecouch', ZC_X, F2_Y0, ZC_Z + 1.4, Math.PI, 1.10, 'f2_zc_couch_n');
    // Calibrated scale 0.010 for MacBook perfectly sitting on top of the 0.44m high table
    spawnProp('macbook', ZC_X + 0.05, F2_Y0 + 0.44 + 0.015, ZC_Z - 0.04, 0, 0.010, 'f2_zc_mb');
    spawnProp('lamp',    ZC_X + 2.2,  F2_Y0, ZC_Z, 0, 1.0, 'f2_zc_lamp');
    spawnProp('plant',   ZC_X - 2.2,  F2_Y0, ZC_Z - 1.6, 0, 1.15, 'f2_zc_plant');
  }
  buildFloor2CoffeeTable('f2_table_zoneC', ZC_X, ZC_Z, F2_Y0, 0.65, 0.44);
  mkModernSideTable(scene, 'f2_sidetable_zoneC', ZC_X + 2.2, ZC_Z, bronzeMat, F2_Y0);

  // Interactive SIT Trigger for Zone C
  env.triggers.push({
    id: 'sit_fe_lounge_c',
    type: 'SIT',
    position: new Vector3(ZC_X, F2_Y0 + 0.5, ZC_Z - 1.4),
    radius: 1.8,
    snapPosition: new Vector3(ZC_X, F2_Y0 + 0.50, ZC_Z - 1.15),
    standPosition: new Vector3(ZC_X, F2_Y0 + 0.86, ZC_Z - 2.10),
    snapRotationY: 0,
    promptText: '[E] Sit at Touchdown Lounge',
  });

  // ── 5. ROOM 1: SPECIALTY REFRESHMENT BAR & UX WIREFRAME WHITEBOARD ──────────

  // UX WIREFRAME WHITEBOARD (South Wall at x = 13.0, z = -9.85)
  mkBox(scene, 'f2_whiteboard', 4.8, 2.0, 0.06, 13.0, F2_Y0 + 2.0, -Z1_ZH + 0.12, frostedGlassMat, false);
  mkBox(scene, 'f2_whiteboard_frame', 5.0, 2.15, 0.04, 13.0, F2_Y0 + 2.0, -Z1_ZH + 0.09, bronzeMat, false);

  // Dynamic Whiteboard Texture (Checkout Wireframe Flows & Sticky Notes)
  {
    const wbTex = new DynamicTexture('f2_wbTex', { width: 1024, height: 512 }, scene, false);
    const wctx = wbTex.getContext() as unknown as CanvasRenderingContext2D;
    wctx.fillStyle = 'rgba(248, 250, 252, 0.94)';
    wctx.fillRect(0, 0, 1024, 512);

    wctx.strokeStyle = '#64748B';
    wctx.lineWidth = 3;
    wctx.strokeRect(12, 12, 1000, 488);

    wctx.fillStyle = '#0F172A';
    wctx.font = 'bold 26px -apple-system, sans-serif';
    wctx.fillText('OMNICART CHECKOUT FLOW // USER JOURNEY WIREFRAME', 36, 54);

    // Box 1: Product Detail
    wctx.fillStyle = '#E2E8F0';
    wctx.fillRect(40, 100, 180, 260);
    wctx.strokeStyle = '#38BDF8';
    wctx.lineWidth = 2;
    wctx.strokeRect(40, 100, 180, 260);
    wctx.fillStyle = '#0F172A';
    wctx.font = 'bold 16px sans-serif';
    wctx.fillText('[1] Product Detail', 56, 136);

    wctx.fillStyle = '#38BDF8';
    wctx.font = 'bold 28px sans-serif';
    wctx.fillText('➔', 240, 230);

    // Box 2: Cart Drawer
    wctx.fillStyle = '#FEF2F2';
    wctx.fillRect(280, 100, 220, 260);
    wctx.strokeStyle = '#EF4444';
    wctx.lineWidth = 3;
    wctx.strokeRect(280, 100, 220, 260);
    wctx.fillStyle = '#EF4444';
    wctx.font = 'bold 16px sans-serif';
    wctx.fillText('[2] CartDrawer.tsx ⚠️', 296, 136);
    wctx.fillStyle = '#7F1D1D';
    wctx.font = '13px monospace';
    wctx.fillText('Infinite re-render', 296, 180);
    wctx.fillText('when coupon active', 296, 205);

    wctx.fillStyle = '#38BDF8';
    wctx.fillText('➔', 520, 230);

    // Box 3: Payment Gateway
    wctx.fillStyle = '#F0FDF4';
    wctx.fillRect(560, 100, 200, 260);
    wctx.strokeStyle = '#10B981';
    wctx.lineWidth = 2;
    wctx.strokeRect(560, 100, 200, 260);
    wctx.fillStyle = '#065F46';
    wctx.font = 'bold 16px sans-serif';
    wctx.fillText('[3] Payment API', 580, 136);

    // Sticky Notes
    wctx.fillStyle = '#FEF08A';
    wctx.fillRect(800, 110, 140, 120);
    wctx.fillStyle = '#713F12';
    wctx.font = 'bold 13px sans-serif';
    wctx.fillText('FIX IMMUTABILITY', 812, 140);
    wctx.fillText('Use [...items, item]', 812, 165);

    wctx.fillStyle = '#FBCFE8';
    wctx.fillRect(820, 260, 140, 120);
    wctx.fillStyle = '#831843';
    wctx.font = 'bold 13px sans-serif';
    wctx.fillText('MEMOIZE TOTAL', 832, 290);
    wctx.fillText('Remove effect loop', 832, 315);

    wbTex.update();

    const wbMat = new StandardMaterial('f2_wbMat', scene);
    wbMat.diffuseTexture  = wbTex;
    wbMat.emissiveTexture = wbTex;
    wbMat.emissiveColor   = new Color3(1.0, 1.0, 1.0);
    wbMat.backFaceCulling = false;

    const wbPlane = MeshBuilder.CreatePlane('f2_wbPlane', { width: 4.7, height: 1.9 }, scene);
    wbPlane.position = new Vector3(13.0, F2_Y0 + 2.0, -Z1_ZH + 0.16);
    wbPlane.rotation = new Vector3(0, Math.PI, 0);
    wbPlane.material = wbMat;

    env.triggers.push({
      id: 'read_ux_whiteboard',
      type: 'READ',
      position: new Vector3(13.0, F2_Y0 + 1.2, -Z1_ZH + 1.4),
      radius: 2.5,
      promptText: '[E] Inspect UX Flow Diagram',
    });
  }

  // CALACATTA QUARTZ & WALNUT WATERFALL REFRESHMENT BAR
  const BAR_X = 24.0;
  const BAR_Z = -5.5;
  const BAR_W = 1.10;
  const BAR_H = 0.94;
  const BAR_D = 4.20;

  // Walnut Cabinetry Base with Waterfall Countertop
  mkBox(scene, 'f2_barBase', BAR_W, BAR_H, BAR_D, BAR_X, F2_Y0 + BAR_H / 2, BAR_Z, walnutMat, true);
  mkBox(scene, 'f2_barTop',  BAR_W + 0.10, 0.06, BAR_D + 0.10, BAR_X, F2_Y0 + BAR_H + 0.03, BAR_Z, quartzMat, true);
  // Waterfall end panels
  mkBox(scene, 'f2_barEndN', BAR_W + 0.10, BAR_H + 0.06, 0.06, BAR_X, F2_Y0 + (BAR_H + 0.06) / 2, BAR_Z + BAR_D / 2 + 0.03, quartzMat, true);
  mkBox(scene, 'f2_barEndS', BAR_W + 0.10, BAR_H + 0.06, 0.06, BAR_X, F2_Y0 + (BAR_H + 0.06) / 2, BAR_Z - BAR_D / 2 - 0.03, quartzMat, true);

  // Authentic Commercial Espresso Machine with dual group heads, pressure dials, steam wands!
  mkEspressoMachine(scene, 'f2_espresso', null, BAR_X, F2_Y0 + BAR_H + 0.06, BAR_Z + 0.8, chromeMat, bronzeMat, walnutMat);

  // Commercial On-Demand Burr Grinder
  mkCommercialCoffeeGrinder(scene, 'f2_grinder', BAR_X, F2_Y0 + BAR_H + 0.06, BAR_Z + 1.5, chromeMat, bronzeMat, walnutMat);

  // Beverage Draft Tap Tower for Cold Brew & Sparkling Water
  mkBeverageDraftTapTower(scene, 'f2_draftTap', BAR_X, F2_Y0 + BAR_H + 0.06, BAR_Z - 1.2, chromeMat, bronzeMat, walnutMat);

  // Modern Leather & Bronze Bar Stools with Sit Triggers
  const stoolZs = [BAR_Z - 1.2, BAR_Z, BAR_Z + 1.2];
  for (let si = 0; si < stoolZs.length; si++) {
    const sz = stoolZs[si];
    mkModernBarStool(scene, `f2_barstool_${si}`, BAR_X - 0.85, sz, Math.PI / 2, 0.75, barLeatherMat, bronzeMat, F2_Y0);

    env.triggers.push({
      id: `sit_fe_bar_${si}`,
      type: 'SIT',
      position: new Vector3(BAR_X - 0.85, F2_Y0 + 0.90, sz),
      radius: 1.15,
      snapPosition: new Vector3(BAR_X - 0.75, F2_Y0 + 1.22, sz),
      standPosition: new Vector3(BAR_X - 1.50, F2_Y0 + 0.90, sz),
      snapRotationY: Math.PI / 2,
      promptText: '[E] Sit at Espresso Bar',
    });
  }

  // ── 6. CENTRAL DIVIDING PORTAL WALL AT X = 6.0m (Visual Connectivity) ───────
  // Replaces the heavy opaque partition with an architectural bronze portal arch
  // and flanking floor-to-ceiling glass screens that let daylight & views flow between rooms!
  const PART_LEN = (Z1_D - PORTAL_W) / 2; // (20 - 3.4) / 2 = 8.3m each wing
  const PART_N_Z = (PORTAL_W / 2 + Z1_ZH) / 2;  // +5.85m
  const PART_S_Z = -(PORTAL_W / 2 + Z1_ZH) / 2; // -5.85m

  // Dark Bronze Portal Doorway Frame (centred at z = 0)
  const JAMB_W = 0.14;
  const JAMB_D = 0.32;
  mkBox(scene, 'f2_portalJamb_S', JAMB_D, PORTAL_H, JAMB_W, Z1_X0, F2_Y0 + PORTAL_H / 2, -PORTAL_W / 2, bronzeMat, true);
  mkBox(scene, 'f2_portalJamb_N', JAMB_D, PORTAL_H, JAMB_W, Z1_X0, F2_Y0 + PORTAL_H / 2,  PORTAL_W / 2, bronzeMat, true);
  mkBox(scene, 'f2_portalLintel', JAMB_D, 0.16, PORTAL_W + JAMB_W * 2, Z1_X0, F2_Y0 + PORTAL_H + 0.08, 0, bronzeMat, true);

  // Clear Transom Glass above doorway
  const TRANSOM_H = F2_H - (PORTAL_H + 0.16);
  mkBox(scene, 'f2_portalTransomGlass', 0.04, TRANSOM_H, PORTAL_W, Z1_X0, F2_Y0 + PORTAL_H + 0.16 + TRANSOM_H / 2, 0, r2GlassMat, false);

  // Architectural Bronze Mullioned Glass Screens flanking doorway
  for (const wingZ of [PART_N_Z, PART_S_Z]) {
    // Glass panes
    mkBox(scene, `f2_portalGlass_${wingZ}`, 0.04, F2_H - 0.24, PART_LEN - 0.2, Z1_X0, F2_Y0 + F2_H / 2, wingZ, r2GlassMat, false);
    // Bronze top rail & sill
    mkBox(scene, `f2_portalRailTop_${wingZ}`, 0.14, 0.12, PART_LEN, Z1_X0, F2_YTOP - 0.06, wingZ, bronzeMat, false);
    mkBox(scene, `f2_portalSill_${wingZ}`,    0.14, 0.12, PART_LEN, Z1_X0, F2_Y0 + 0.06,   wingZ, bronzeMat, false);
  }

  // Architectural Low Planter Credenzas along Portal Glass (Both sides for lush tech feel)
  mkBox(scene, 'f2_portalCredenza_E', 0.45, 0.76, 4.2, Z1_X0 + 0.35, F2_Y0 + 0.38, 4.5, walnutMat, true);
  mkBox(scene, 'f2_portalCredenza_W', 0.45, 0.76, 4.2, Z1_X0 - 0.35, F2_Y0 + 0.38, 4.5, walnutMat, true);

  // Double-Sided Architectural Portal Signage Header
  {
    const signTex = new DynamicTexture('f2_portalSignTex', { width: 512, height: 128 }, scene, false);
    const sctx = signTex.getContext() as unknown as CanvasRenderingContext2D;
    sctx.fillStyle = '#0F172A';
    sctx.fillRect(0, 0, 512, 128);
    sctx.strokeStyle = '#38BDF8';
    sctx.lineWidth = 4;
    sctx.strokeRect(4, 4, 504, 120);
    sctx.fillStyle = '#38BDF8';
    sctx.font = 'bold 22px monospace';
    sctx.fillText('// FRONTEND LAB SEC-02 //', 64, 52);
    sctx.fillStyle = '#94A3B8';
    sctx.font = 'bold 15px monospace';
    sctx.fillText('CORE WORKSTATIONS & DEVICE FARM', 64, 88);
    signTex.update();

    const signMat = new StandardMaterial('f2_portalSignMat', scene);
    signMat.diffuseTexture  = signTex;
    signMat.emissiveTexture = signTex;
    signMat.backFaceCulling = false;

    const signPlane = MeshBuilder.CreatePlane('f2_portalSignPlane', { width: 2.6, height: 0.65 }, scene);
    signPlane.position = new Vector3(Z1_X0 + 0.18, F2_Y0 + PORTAL_H + 0.45, 0);
    signPlane.rotation = new Vector3(0, Math.PI / 2, 0);
    signPlane.material = signMat;
  }

  // ── 7. ROOM 2: ARCHITECTURAL ENVELOPE (West Wing, x ∈ [-14, 6]) ───────────────

  // 1. Room 2 Finished Basalt Floor (y = 14.0m)
  const floor2 = MeshBuilder.CreateGround('f2_floor_r2', { width: R2_W, height: Z1_D }, scene);
  floor2.position.x      = R2_MX;
  floor2.position.y      = F2_Y0;
  floor2.position.z      = 0;
  floor2.checkCollisions = true;
  floor2.material        = basaltMat;
  floor2.receiveShadows  = true;

  // 2. Room 2 Ceiling with Recessed Linear Light Troughs
  mkBox(scene, 'f2_ceiling_r2', R2_W + WALL_T * 2, 0.06, Z1_D + WALL_T * 2,
    R2_MX, F2_YTOP + 0.03, 0, ceilMat, true);

  const r2ChannelLensMat = new StandardMaterial('f2_r2ChannelLensMat', scene);
  r2ChannelLensMat.diffuseColor = new Color3(1.0, 0.97, 0.90);
  r2ChannelLensMat.emissiveColor = new Color3(1.0, 0.95, 0.88);

  for (const cz of [-4.5, 0.0, 4.5]) {
    mkBox(scene, `f2_r2_ceil_trough_${cz}`, 18.0, 0.05, 0.28, R2_MX, F2_YTOP - 0.02, cz, bronzeMat, false);
    mkBox(scene, `f2_r2_ceil_lens_${cz}`, 17.8, 0.02, 0.16, R2_MX, F2_YTOP - 0.04, cz, r2ChannelLensMat, false);
  }

  // 3. Room 2 North & South Solid Walls with Acoustic Felt & Walnut Slats
  mkBox(scene, 'f2_r2_wallN', R2_W, F2_H, WALL_T, R2_MX, F2_Y0 + F2_H / 2, Z1_ZH + WALL_T / 2, wallMat, true);
  mkBox(scene, 'f2_r2_baseboardN', R2_W, 0.16, 0.04, R2_MX, F2_Y0 + 0.08, Z1_ZH - 0.02, bronzeMat, false);

  mkBox(scene, 'f2_r2_wallS', R2_W, F2_H, WALL_T, R2_MX, F2_Y0 + F2_H / 2, -Z1_ZH - WALL_T / 2, wallMat, true);
  mkBox(scene, 'f2_r2_baseboardS', R2_W, 0.16, 0.04, R2_MX, F2_Y0 + 0.08, -Z1_ZH + 0.02, bronzeMat, false);

  // Acoustic Fluted Charcoal Felt Wall Panels on North wall
  mkBox(scene, 'f2_r2_felt_north', 12.0, F2_H - 0.20, 0.04, -5.0, F2_Y0 + F2_H / 2, Z1_ZH - 0.03, feltMat, false);

  // American Walnut Slat Accent on South wall behind developer pods
  mkBox(scene, 'f2_r2_walnut_south', 6.0, F2_H - 0.20, 0.04, -1.0, F2_Y0 + F2_H / 2, -Z1_ZH + 0.03, walnutMat, false);

  // 4. Room 2 Panoramic West Exterior Glass Curtain Wall (x = -14.0, z ∈ [-10, 10])
  for (let pz = -8; pz <= 8; pz += 4) {
    mkBox(scene, `f2_r2_gp_${pz}`, 0.04, F2_H, 3.88, R2_X0, F2_Y0 + F2_H / 2, pz, r2GlassMat, false);
  }
  for (let fz = -10; fz <= 10; fz += 4) {
    mkBox(scene, `f2_r2_gPost_${fz}`, 0.32, F2_H, 0.26, R2_X0 + 0.12, F2_Y0 + F2_H / 2, fz, bronzeMat, true);
  }
  mkBox(scene, 'f2_r2_gRailTop', 0.24, 0.14, Z1_D, R2_X0 + 0.10, F2_YTOP - 0.07, 0, bronzeMat, false);
  mkBox(scene, 'f2_r2_gSill',    0.28, 0.10, Z1_D, R2_X0 + 0.10, F2_Y0 + 0.05,    0, bronzeMat, false);

  // Outer solid collision barrier at west glass
  mkBox(scene, 'f2_r2_westBarrier', 0.10, F2_H, Z1_D + 1, R2_X0 - 0.05, F2_Y0 + F2_H / 2, 0, invisMat(scene, 'f2_westBarrierMat'), true);

  // ── 8. ROOM 2 FRONTEND DEVELOPER WORKSTATION PODS ───────────────────────────
  // Authentic minimalist desks, Aeron chairs, dual monitors, MacBook M3 (0.010 scale),
  // mechanical keyboards, precision mice, and acoustic dividers.

  // Dynamic texture for portrait code monitor (React 18 / Zustand)
  const ideTex = new DynamicTexture('f2_ideCodeTex', { width: 512, height: 512 }, scene, false);
  {
    const ictx = ideTex.getContext() as unknown as CanvasRenderingContext2D;
    ictx.fillStyle = '#0F172A';
    ictx.fillRect(0, 0, 512, 512);

    ictx.strokeStyle = '#38BDF8';
    ictx.lineWidth = 2;
    ictx.strokeRect(4, 4, 504, 504);

    ictx.font = 'bold 18px monospace';
    ictx.fillStyle = '#38BDF8';
    ictx.fillText('// cartStore.ts (React 18)', 16, 36);

    ictx.font = '14px monospace';
    ictx.fillStyle = '#C084FC';
    ictx.fillText('import { create } from "zustand";', 16, 75);
    ictx.fillStyle = '#F8FAFC';
    ictx.fillText('export const useCartStore = create((set) => ({', 16, 110);
    ictx.fillStyle = '#94A3B8';
    ictx.fillText('  items: [],', 16, 145);
    ictx.fillStyle = '#34D399';
    ictx.fillText('  // IMMUTABLE ARRAY UPDATE:', 16, 185);
    ictx.fillStyle = '#38BDF8';
    ictx.fillText('  addItem: (item) => set((s) => ({', 16, 220);
    ictx.fillStyle = '#F8FAFC';
    ictx.fillText('    items: [...s.items, item]', 16, 255);
    ictx.fillStyle = '#38BDF8';
    ictx.fillText('  })),', 16, 290);
    ictx.fillStyle = '#F43F5E';
    ictx.fillText('  // BUG ALERT: items.push breaks equality', 16, 340);
    ictx.fillStyle = '#F8FAFC';
    ictx.fillText('  coupon: null,', 16, 385);
    ictx.fillText('}));', 16, 420);

    ideTex.update();
  }

  // 2 Dual Pods (4 Developer Workstations Total)
  // Pod 1: cx = -7.5, cz = -5.5
  // Pod 2: cx = -2.5, cz = -5.5
  const pods = [
    { idPrefix: 'pod1', cx: -7.5, cz: -5.5, idS: '1', idN: '3' },
    { idPrefix: 'pod2', cx: -2.5, cz: -5.5, idS: '2', idN: '4' },
  ];

  const ENG_DESK_H = 0.74;
  const SEAT_H = 0.50;

  for (const pod of pods) {
    const { cx, cz, idS, idN } = pod;

    // Station South (facing North toward +Z)
    const deskZ_S = cz - 0.45;
    const chairZ_S = cz - 1.20;
    const seatedZ_S = cz - 1.05;
    const standZ_S = cz - 1.80;

    // Station North (facing South toward -Z)
    const deskZ_N = cz + 0.45;
    const chairZ_N = cz + 1.20;
    const seatedZ_N = cz + 1.05;
    const standZ_N = cz + 1.80;

    if (spawnProp) {
      // Authentic 3D Minimalist Desk models (scaled exactly like Floor 1: 2.45, 1.35, 1.60)
      spawnProp('minimalistDesk', cx, F2_Y0, deskZ_S, Math.PI / 2, new Vector3(2.45, 1.35, 1.60), `f2_desk_${idS}`);
      spawnProp('minimalistDesk', cx, F2_Y0, deskZ_N, -Math.PI / 2, new Vector3(2.45, 1.35, 1.60), `f2_desk_${idN}`);

      // Modern Ergonomic Task Chairs
      spawnProp('modernChair', cx, F2_Y0, chairZ_S, 0,       1.0, `f2_chair_${idS}`);
      spawnProp('modernChair', cx, F2_Y0, chairZ_N, Math.PI, 1.0, `f2_chair_${idN}`);

      // Trash cans under desks
      spawnProp('trashcan', cx + 1.15, F2_Y0, deskZ_S, 0, 0.85, `f2_trash_${idS}`);
      spawnProp('trashcan', cx + 1.15, F2_Y0, deskZ_N, 0, 0.85, `f2_trash_${idN}`);
    }

    // Frosted Glass / Charcoal Acoustic Privacy Divider between opposite desks
    mkBox(scene, `f2_divider_${pod.idPrefix}`, 2.2, 0.42, 0.04, cx, F2_Y0 + ENG_DESK_H + 0.21, cz, feltMat, false);

    // ── South Workstation Accessories ──
    const stationS_root = new TransformNode(`f2_stationS_${idS}_root`, scene);
    stationS_root.position = new Vector3(cx, F2_Y0 + ENG_DESK_H, deskZ_S);

    // Dual 4K Monitors on Articulated Arm S
    mkDualMonitorSetup(scene, `f2_monSetup_${idS}`, cx, F2_Y0 + ENG_DESK_H, deskZ_S + 0.28, 0, ideTex, bronzeMat);

    // Charcoal Leather Desk Pad
    const padS = MeshBuilder.CreateBox(`f2_pad_${idS}`, { width: 0.82, height: 0.003, depth: 0.34 }, scene);
    padS.parent = stationS_root;
    padS.position = new Vector3(0, 0.0015, -0.12);
    padS.material = deskPadMat;

    // Mechanical Keyboard & Precision Mouse
    mkMechanicalKeyboard(scene, `f2_kb_${idS}`, stationS_root, -0.06, 0.005, -0.12, kbMat, aluminumMat);
    mkErgonomicMouse(scene, `f2_mouse_${idS}`, stationS_root, 0.24, 0.005, -0.12, graphiteMat, aluminumMat);

    // Ceramic Tumbler
    mkCoffeeTumbler(scene, `f2_mug_${idS}`, stationS_root, 0.52, 0, 0.08, ceramicMat, sleeveMat);

    // Laptop Riser Stand & MacBook Pro M3 (0.010 scale)
    const mbpRot_S = Math.PI + 0.20;
    mkLaptopRiserStand(scene, `f2_riser_${idS}`, null, cx - 0.52, F2_Y0 + ENG_DESK_H, deskZ_S - 0.02, mbpRot_S, aluminumMat);
    if (spawnProp) {
      spawnProp('macbook', cx - 0.52, F2_Y0 + ENG_DESK_H + 0.065, deskZ_S - 0.02, mbpRot_S, 0.010, `f2_mb_${idS}`);
    }

    // SIT Trigger for South Workstation
    env.triggers.push({
      id: `sit_ws_fe_${idS}`,
      type: 'SIT',
      position: new Vector3(cx, F2_Y0 + SEAT_H, chairZ_S),
      radius: 1.3,
      snapPosition: new Vector3(cx, F2_Y0 + SEAT_H, seatedZ_S),
      standPosition: new Vector3(cx, F2_Y0 + 0.90, standZ_S),
      snapRotationY: 0,
      promptText: '[E] Sit at Frontend Workstation',
    });

    // ── North Workstation Accessories ──
    const stationN_root = new TransformNode(`f2_stationN_${idN}_root`, scene);
    stationN_root.position = new Vector3(cx, F2_Y0 + ENG_DESK_H, deskZ_N);
    stationN_root.rotation = new Vector3(0, Math.PI, 0);

    // Dual 4K Monitors on Articulated Arm N
    mkDualMonitorSetup(scene, `f2_monSetup_${idN}`, cx, F2_Y0 + ENG_DESK_H, deskZ_N - 0.28, Math.PI, ideTex, bronzeMat);

    // Charcoal Leather Desk Pad
    const padN = MeshBuilder.CreateBox(`f2_pad_${idN}`, { width: 0.82, height: 0.003, depth: 0.34 }, scene);
    padN.parent = stationN_root;
    padN.position = new Vector3(0, 0.0015, -0.12);
    padN.material = deskPadMat;

    // Mechanical Keyboard & Precision Mouse
    mkMechanicalKeyboard(scene, `f2_kb_${idN}`, stationN_root, -0.06, 0.005, -0.12, kbMat, aluminumMat);
    mkErgonomicMouse(scene, `f2_mouse_${idN}`, stationN_root, 0.24, 0.005, -0.12, graphiteMat, aluminumMat);

    // Ceramic Tumbler
    mkCoffeeTumbler(scene, `f2_mug_${idN}`, stationN_root, 0.52, 0, 0.08, ceramicMat, sleeveMat);

    // Laptop Riser Stand & MacBook Pro M3 (0.010 scale)
    const mbpRot_N = 0.20;
    mkLaptopRiserStand(scene, `f2_riser_${idN}`, null, cx + 0.52, F2_Y0 + ENG_DESK_H, deskZ_N + 0.02, mbpRot_N, aluminumMat);
    if (spawnProp) {
      spawnProp('macbook', cx + 0.52, F2_Y0 + ENG_DESK_H + 0.065, deskZ_N + 0.02, mbpRot_N, 0.010, `f2_mb_${idN}`);
    }

    // SIT Trigger for North Workstation
    env.triggers.push({
      id: `sit_ws_fe_${idN}`,
      type: 'SIT',
      position: new Vector3(cx, F2_Y0 + SEAT_H, chairZ_N),
      radius: 1.3,
      snapPosition: new Vector3(cx, F2_Y0 + SEAT_H, seatedZ_N),
      standPosition: new Vector3(cx, F2_Y0 + 0.90, standZ_N),
      snapRotationY: Math.PI,
      promptText: '[E] Sit at Frontend Workstation',
    });
  }

  // ── 9. ROOM 2: MOBILE DEVICE TESTING FARM (Northwest, x ∈ [-12, -7], z ∈ [3, 8]) ──
  // Device Testing Bench
  mkBox(scene, 'f2_devBench_top', 1.2, 0.06, 5.0, -10.5, F2_Y0 + 0.88, 5.0, walnutMat, true);
  mkBox(scene, 'f2_devBench_legL', 1.1, 0.85, 0.1, -10.5, F2_Y0 + 0.44, 2.7, bronzeMat, false);
  mkBox(scene, 'f2_devBench_legR', 1.1, 0.85, 0.1, -10.5, F2_Y0 + 0.44, 7.3, bronzeMat, false);

  if (spawnProp) {
    // Calibrated scale 0.010 for MacBooks on test bench
    spawnProp('macbook', -10.5, F2_Y0 + 0.91, 3.8, Math.PI / 2, 0.010, 'f2_bench_mb1');
    spawnProp('macbook', -10.5, F2_Y0 + 0.91, 6.2, Math.PI / 2, 0.010, 'f2_bench_mb2');
  }

  // Wall-Mounted Device Testing Rack
  mkBox(scene, 'f2_devRack_back', 0.12, 2.8, 6.0, -13.6, F2_Y0 + 1.8, 5.0, bronzeMat, true);
  const phoneMat = solidMat(scene, 'f2_phoneScreen', 0.1, 0.6, 0.9, 120);
  phoneMat.emissiveColor = new Color3(0.05, 0.4, 0.7);

  for (let i = 0; i < 4; i++) {
    const pz = 2.6 + i * 1.0;
    mkBox(scene, `f2_phone_${i}`, 0.02, 0.45, 0.22, -13.52, F2_Y0 + 2.1, pz, bronzeMat, false);
    mkBox(scene, `f2_phone_screen_${i}`, 0.005, 0.42, 0.20, -13.50, F2_Y0 + 2.1, pz, phoneMat, false);
  }

  // 1x 49" Curved Ultrawide Display
  mkBox(scene, 'f2_ultrawide_bezel', 0.04, 0.55, 1.6, -13.52, F2_Y0 + 1.2, 5.0, bronzeMat, false);
  const ultrawideScreenMat = solidMat(scene, 'f2_ultrawideScreen', 0.12, 0.15, 0.22, 60);
  ultrawideScreenMat.emissiveColor = new Color3(0.1, 0.25, 0.4);
  mkBox(scene, 'f2_ultrawide_screen', 0.005, 0.51, 1.54, -13.49, F2_Y0 + 1.2, 5.0, ultrawideScreenMat, false);

  // Core Web Vitals Telemetry Screen
  {
    const vitalsTex = new DynamicTexture('f2_vitalsTex', { width: 512, height: 256 }, scene, false);
    const vctx = vitalsTex.getContext() as unknown as CanvasRenderingContext2D;
    vctx.fillStyle = '#090E17';
    vctx.fillRect(0, 0, 512, 256);

    vctx.strokeStyle = '#38BDF8';
    vctx.lineWidth = 2;
    vctx.strokeRect(4, 4, 504, 248);

    vctx.fillStyle = '#38BDF8';
    vctx.font = 'bold 20px monospace';
    vctx.fillText('DEVICE FARM // CORE WEB VITALS', 24, 38);

    vctx.fillStyle = '#F43F5E';
    vctx.font = '16px monospace';
    vctx.fillText('● LCP: 4.8s (POOR - CART HYDRATION)', 24, 80);
    vctx.fillText('● INP: 520ms (POOR - RENDER LOOP)', 24, 115);
    vctx.fillText('● CLS: 0.28 (POOR - DISCOUNT FLICKER)', 24, 150);

    vctx.fillStyle = '#94A3B8';
    vctx.font = '14px monospace';
    vctx.fillText('RESPONSIVE VIEWPORTS: 12/12 ACTIVE', 24, 195);
    vctx.fillText('MOBILE (390px) · TABLET · 4K ULTRAWIDE', 24, 225);

    vitalsTex.update();

    const vitalsMat = new StandardMaterial('f2_vitalsMat', scene);
    vitalsMat.diffuseTexture  = vitalsTex;
    vitalsMat.emissiveTexture = vitalsTex;
    vitalsMat.emissiveColor   = new Color3(1.0, 1.0, 1.0);
    vitalsMat.backFaceCulling = false;

    const vitalsPlane = MeshBuilder.CreatePlane('f2_vitalsPlane', { width: 1.8, height: 0.9 }, scene);
    vitalsPlane.position = new Vector3(-13.49, F2_Y0 + 2.5, 5.0);
    vitalsPlane.rotation = new Vector3(0, -Math.PI / 2, 0);
    vitalsPlane.material = vitalsMat;
  }

  // ── 10. ROOM 2: SKYLINE CASUAL IDEATION LOUNGE (West Window: x ≈ -11.0, z ∈ [-2.5, 2.5]) ─
  {
    const LOUNGE_X = -11.0;
    const LOUNGE_Z = 0.0;

    // Organic Travertine Stone Coffee Table (1.2m x 0.6m)
    const travMat = solidMat(scene, 'f2_travertineMat', 0.86, 0.84, 0.80, 24);
    mkBox(scene, 'f2_skylineCoffeeTable', 1.20, 0.05, 0.60, LOUNGE_X, F2_Y0 + 0.36, LOUNGE_Z, travMat, true);
    mkBox(scene, 'f2_skylineTableLegL',   0.10, 0.34, 0.48, LOUNGE_X - 0.45, F2_Y0 + 0.17, LOUNGE_Z, bronzeMat, false);
    mkBox(scene, 'f2_skylineTableLegR',   0.10, 0.34, 0.48, LOUNGE_X + 0.45, F2_Y0 + 0.17, LOUNGE_Z, bronzeMat, false);

    // Open MacBook on Coffee Table
    if (spawnProp) {
      spawnProp('macbook', LOUNGE_X - 0.15, F2_Y0 + 0.38 + 0.015, LOUNGE_Z + 0.04, Math.PI / 4, 0.010, 'f2_skyline_mb');
    }

    // 2 Contemporary Lounge Armchairs facing each other across table looking out at skyline
    const armZ_N = LOUNGE_Z + 1.25;
    const armZ_S = LOUNGE_Z - 1.25;

    if (spawnProp) {
      spawnProp('orangecouch', LOUNGE_X, F2_Y0, armZ_N, Math.PI, 1.15, 'f2_skyline_couch_n');
      spawnProp('redcouch',    LOUNGE_X, F2_Y0, armZ_S, 0,       1.15, 'f2_skyline_couch_s');
      spawnProp('lamp',        LOUNGE_X + 1.5, F2_Y0, LOUNGE_Z, 0, 1.0, 'f2_skyline_lamp');
      spawnProp('plant',       LOUNGE_X - 1.2, F2_Y0, armZ_N + 1.2, 0, 1.15, 'f2_skyline_plant');
    }

    env.triggers.push({
      id:            'sit_fe_skyline_n',
      type:          'SIT',
      position:      new Vector3(LOUNGE_X, F2_Y0 + SEAT_H, armZ_N),
      radius:        1.2,
      snapPosition:  new Vector3(LOUNGE_X, F2_Y0 + SEAT_H, armZ_N - 0.22),
      standPosition: new Vector3(LOUNGE_X, F2_Y0 + 0.90, armZ_N + 0.80),
      snapRotationY: Math.PI,
      promptText:    '[E] Relax at Skyline Lounge',
    });

    env.triggers.push({
      id:            'sit_fe_skyline_s',
      type:          'SIT',
      position:      new Vector3(LOUNGE_X, F2_Y0 + SEAT_H, armZ_S),
      radius:        1.2,
      snapPosition:  new Vector3(LOUNGE_X, F2_Y0 + SEAT_H, armZ_S + 0.22),
      standPosition: new Vector3(LOUNGE_X, F2_Y0 + 0.90, armZ_S - 0.80),
      snapRotationY: 0,
      promptText:    '[E] Relax at Skyline Lounge',
    });
  }

  // ── 11. ROOM 2: INCIDENT WAR-ROOM BRIEFING WALL MONITOR #8493 (South Wall at x = -6.0) ──
  {
    const dashTex = new DynamicTexture('f2_dashTex', { width: 1024, height: 512 }, scene, false);
    const dctx = dashTex.getContext() as unknown as CanvasRenderingContext2D;

    dctx.fillStyle = '#080D14';
    dctx.fillRect(0, 0, 1024, 512);

    dctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    dctx.lineWidth = 1;
    for (let x = 0; x < 1024; x += 32) {
      dctx.beginPath(); dctx.moveTo(x, 0); dctx.lineTo(x, 512); dctx.stroke();
    }
    for (let y = 0; y < 512; y += 32) {
      dctx.beginPath(); dctx.moveTo(0, y); dctx.lineTo(1024, y); dctx.stroke();
    }

    dctx.strokeStyle = '#F43F5E';
    dctx.lineWidth = 4;
    dctx.strokeRect(6, 6, 1012, 500);

    // Header
    dctx.fillStyle = '#F43F5E';
    dctx.beginPath();
    dctx.arc(42, 44, 9, 0, Math.PI * 2);
    dctx.fill();

    dctx.fillStyle = '#FDA4AF';
    dctx.font = 'bold 22px monospace';
    dctx.fillText('FRONTEND INCIDENT // CRITICAL UI OUTAGE', 62, 51);

    dctx.fillStyle = 'rgba(244, 63, 94, 0.25)';
    dctx.fillRect(770, 26, 215, 36);
    dctx.strokeStyle = '#F43F5E';
    dctx.lineWidth = 2;
    dctx.strokeRect(770, 26, 215, 36);
    dctx.fillStyle = '#FECDD3';
    dctx.font = 'bold 17px monospace';
    dctx.fillText('SEVERITY: P1-CRITICAL', 784, 50);

    dctx.fillStyle = '#334155';
    dctx.fillRect(36, 74, 952, 2);

    dctx.fillStyle = '#FFFFFF';
    dctx.font = 'bold 34px -apple-system, sans-serif';
    dctx.fillText('OmniCart Storefront Cart Re-render & Hydration Freeze', 38, 122);

    dctx.fillStyle = '#38BDF8';
    dctx.font = 'bold 16px monospace';
    dctx.fillText('SERVICE: omnicart-storefront-ui (React 18 / Zustand)  ·  STATUS: INVESTIGATION', 38, 156);

    dctx.fillStyle = '#94A3B8';
    dctx.font = 'bold 16px monospace';
    dctx.fillText('REPORTED SYMPTOMS:', 38, 202);

    dctx.fillStyle = '#F1F5F9';
    dctx.font = '20px -apple-system, sans-serif';
    dctx.fillText('100% CPU lockup on coupon apply; cart state fails to update until full refresh.', 38, 234);

    dctx.fillStyle = '#38BDF8';
    dctx.font = 'bold 16px monospace';
    dctx.fillText('ACTION REQUIRED:', 38, 280);

    dctx.fillStyle = '#F8FAFC';
    dctx.font = '20px -apple-system, sans-serif';
    dctx.fillText('Sit at any Frontend Workstation and press [E] to open the live codebase', 38, 312);

    dctx.fillStyle = 'rgba(244, 63, 94, 0.15)';
    dctx.fillRect(36, 350, 952, 92);
    dctx.strokeStyle = '#F43F5E';
    dctx.lineWidth = 2;
    dctx.strokeRect(36, 350, 952, 92);

    dctx.fillStyle = '#FDA4AF';
    dctx.font = 'bold 17px monospace';
    dctx.fillText('OBJECTIVE: Fix cart state immutability, remove useEffect loop, & round discounts', 54, 402);

    dashTex.update();

    const dashMat = new StandardMaterial('f2_dashMat', scene);
    dashMat.diffuseTexture  = dashTex;
    dashMat.emissiveTexture = dashTex;
    dashMat.emissiveColor   = new Color3(1.0, 1.0, 1.0);
    dashMat.backFaceCulling = false;

    // Dark bronze bezel casing
    mkBox(scene, 'f2_incBoardBezel', 3.32, 1.72, 0.04, -6.0, F2_Y0 + 2.3, -Z1_ZH + 0.04, bronzeMat, false);

    const dashPlane = MeshBuilder.CreatePlane('f2_dashPlane', { width: 3.2, height: 1.6 }, scene);
    dashPlane.position = new Vector3(-6.0, F2_Y0 + 2.3, -Z1_ZH + 0.08);
    dashPlane.rotation = new Vector3(0, Math.PI, 0);
    dashPlane.material = dashMat;

    env.triggers.push({
      id: 'read_incident_wall_fe',
      type: 'READ',
      position: new Vector3(-6.0, F2_Y0 + 1.2, -Z1_ZH + 1.4),
      radius: 2.6,
      promptText: '[E] Read Frontend Incident Briefing #8493',
    });
  }

  // ── 12. POTTED ARCHITECTURAL FOLIAGE IN CORNERS ─────────────────────────────
  if (spawnProp) {
    spawnProp('plant', -13.0, F2_Y0, -8.5, 0, 1.15, 'f2_plant_sw');
    spawnProp('plant', -13.0, F2_Y0,  8.5, 0, 1.15, 'f2_plant_nw');
    spawnProp('plant',  28.5, F2_Y0, -8.5, 0, 1.15, 'f2_plant_se');
    spawnProp('plant',  28.5, F2_Y0,  8.5, 0, 1.15, 'f2_plant_ne');
    spawnProp('plant',   5.2, F2_Y0,  2.5, 0, 1.15, 'f2_plant_portal_e');
    spawnProp('plant',   6.8, F2_Y0, -2.5, 0, 1.15, 'f2_plant_portal_w');
  }

  return {
    left: doorsF2_L,
    right: doorsF2_R,
  };
}
