/**
 * CitySkylineBuilder.ts
 *
 * Seamless 360-Degree Panoramic High-Rise Skyline for SimOffice.
 *
 * Solves the "near window illusion break" completely:
 *  1. Full 360-degree unbroken enclosing cylinder (diameter = 90m, height = 85m)
 *     centered around the office building. There are ZERO card edges, ZERO horizontal cutoffs,
 *     and ZERO empty black voids at any viewing angle.
 *  2. 4K seamless composite panoramic texture (skyline_360.jpg) with the high-resolution
 *     twilight metropolis centered directly facing west, smooth sky gradient extending to the zenith,
 *     and dark urban depth extending far below the floor.
 *  3. Vertically calibrated so eye level (y ≈ 1.8m) aligns with the city horizon,
 *     skyscrapers soar 45m above the ceiling, and street canyons recede 35m below the floor sill.
 *  4. Unlit self-illumination (fogEnabled: false, disableLighting: true) preserving razor-sharp
 *     twinkling office windows and crisp night contrast.
 */

import {
  Scene,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Texture,
  Mesh,
} from '@babylonjs/core';

export interface SkylineOptions {
  westWallX?: number; // X coordinate of the exterior curtain wall (default: -14.0)
  imagePath?: string; // Path to 360-degree panoramic skyline texture
}

export function buildCitySkyline(scene: Scene, options: SkylineOptions = {}): {
  mesh: Mesh;
  dispose: () => void;
} {
  const imagePath = options.imagePath ?? '/assets/office/skyline_360.jpg';

  // Ensure no fog washes out the crisp night view
  scene.fogMode = Scene.FOGMODE_NONE;

  // ── 1. MATERIAL SETUP ─────────────────────────────────────────────────────
  const skylineTex = new Texture(imagePath, scene, false, true);
  skylineTex.wrapU = Texture.WRAP_ADDRESSMODE;
  skylineTex.wrapV = Texture.CLAMP_ADDRESSMODE;

  const skylineMat = new StandardMaterial('skyline_360_mat', scene);
  skylineMat.diffuseTexture = skylineTex;
  skylineMat.emissiveTexture = skylineTex;
  skylineMat.emissiveColor = new Color3(1.0, 1.0, 1.0);
  skylineMat.disableLighting = true; // Clean, unlit self-illumination
  skylineMat.backFaceCulling = false;
  skylineMat.fogEnabled = false; // Crystal-clear, never washed out by distance fog

  // ── 2. FULL 360-DEGREE ENCLOSING CYLINDER ─────────────────────────────────
  // Diameter = 90m (radius = 45m).
  // Height = 85m (spans y = -35.0m to y = +50.0m).
  // Centered at (x = 4.0, y = 7.5, z = 0.0) so the entire office (x in [-14, 30], z in [-10, 10])
  // sits comfortably inside.
  // Due West (x = -41.0, z = 0.0) is at U = 0.50, where the high-res city panorama is centered.
  const cylinder = MeshBuilder.CreateCylinder(
    'skyline_360_cylinder',
    {
      diameter: 90,
      height: 85,
      tessellation: 64,
      sideOrientation: Mesh.BACKSIDE,
    },
    scene
  );

  cylinder.position = new Vector3(4.0, 7.5, 0.0);
  cylinder.material = skylineMat;
  cylinder.isPickable = false;
  cylinder.checkCollisions = false;

  return {
    mesh: cylinder,
    dispose: () => {
      cylinder.dispose();
      skylineMat.dispose();
      skylineTex.dispose();
    },
  };
}
