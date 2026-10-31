import { Scene, MeshBuilder, Vector3, Mesh, DynamicTexture, StandardMaterial, Color3 } from '@babylonjs/core';
import type { Room } from 'colyseus.js';
import { TeamRoomState, PlayerState } from './network/schema/TeamRoomState';

import { CharacterModel } from './CharacterModel';
import type { AnimState } from './animState';

interface RemotePlayer {
  mesh: Mesh;
  nameTag: Mesh | null;
  model: CharacterModel;
  targetPos: Vector3;
  startPos: Vector3;
  animState: string;
  lerpStart: number;
}

export class RemotePlayerInterpolator {
  private scene: Scene;
  private room: Room<TeamRoomState>;
  private players: Map<string, RemotePlayer> = new Map();
  private localSessionId: string;

  // Pending position batches: accumulate per-axis updates within one tick
  // and apply them atomically at the next frame start to avoid diagonal stutter
  // caused by Colyseus firing separate per-field callbacks.
  private pendingPos: Map<string, Partial<{ x: number; y: number; z: number }>> = new Map();
  private pendingFlushScheduled = false;

  constructor(scene: Scene, room: Room<TeamRoomState>) {
    this.scene = scene;
    this.room = room;
    this.localSessionId = room.sessionId;

    this.room.state.players.onAdd((player: PlayerState, sessionId: string) => {
      // Don't render the local player via the interpolator
      if (sessionId === this.localSessionId) return;

      console.log('Remote player joined:', sessionId, player.displayName);
      const mesh = MeshBuilder.CreateCapsule(`remote_${sessionId}`, { height: 1.8, radius: 0.3 }, this.scene);
      mesh.position = new Vector3(player.x, player.y, player.z);
      mesh.isVisible = false; // Hide collision capsule

      const nameTag = this.createNameTag(mesh, player.displayName || 'Player', player.colorScheme);

      const model = new CharacterModel(this.scene, mesh);
      model.loadAssets().then(() => {
        if (player.colorScheme && player.colorScheme !== 'default') model.applyAppearance(player.colorScheme);
        const rp = this.players.get(sessionId);
        if (rp && rp.animState) {
          model.playAnim(rp.animState as AnimState);
        }
      });

      const remotePlayer: RemotePlayer = {
        mesh,
        nameTag,
        model,
        targetPos: mesh.position.clone(),
        startPos: mesh.position.clone(),
        animState: player.animState,
        lerpStart: performance.now(),
      };
      this.players.set(sessionId, remotePlayer);

      // Listen to schema property changes cleanly with full TypeScript type safety
      player.listen('x', (value) => this.schedulePositionUpdate(sessionId, 'x', value));
      player.listen('y', (value) => this.schedulePositionUpdate(sessionId, 'y', value));
      player.listen('z', (value) => this.schedulePositionUpdate(sessionId, 'z', value));
      player.listen('rotationY', (value) => {
        const rp = this.players.get(sessionId);
        if (rp && typeof value === 'number') {
          rp.mesh.rotation.y = value;
        }
      });
      player.listen('animState', (value) => {
        const rp = this.players.get(sessionId);
        if (rp) {
          rp.animState = value;
          rp.model.playAnim(value as AnimState);
        }
      });
      player.listen('colorScheme', (value) => {
        const rp = this.players.get(sessionId);
        if (rp) {
          rp.model.applyAppearance(value === 'default' ? null : value);
          this.updateNameTag(rp, player.displayName || 'Player', value);
        }
      });
      player.listen('displayName', (value) => {
        const rp = this.players.get(sessionId);
        if (rp && value) {
          this.updateNameTag(rp, value, player.colorScheme);
        }
      });
    });

    this.room.state.players.onRemove((_player: PlayerState, sessionId: string) => {
      console.log('Remote player left:', sessionId);
      const rp = this.players.get(sessionId);
      if (rp) {
        if (rp.nameTag) rp.nameTag.dispose();
        rp.model.dispose();
        rp.mesh.dispose();
        this.players.delete(sessionId);
      }
      this.pendingPos.delete(sessionId);
    });

    this.scene.onBeforeRenderObservable.add(this.update.bind(this));
  }

  private createNameTag(parent: Mesh, name: string, colorHex?: string): Mesh {
    const plane = MeshBuilder.CreatePlane(`nametag_${parent.name}`, { width: 1.8, height: 0.45 }, this.scene);
    plane.parent = parent;
    plane.position = new Vector3(0, 2.2, 0);
    plane.billboardMode = Mesh.BILLBOARDMODE_ALL;

    const texture = new DynamicTexture(`nametagTex_${parent.name}`, { width: 256, height: 64 }, this.scene, false);
    const ctx = texture.getContext() as unknown as CanvasRenderingContext2D;

    // Background pill
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(10, 8, 236, 48, 16);
    } else {
      ctx.rect(10, 8, 236, 48);
    }
    ctx.fill();

    // Border with player color
    ctx.strokeStyle = colorHex || '#38bdf8';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Text
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name.slice(0, 16), 128, 32);
    texture.update();

    const mat = new StandardMaterial(`nametagMat_${parent.name}`, this.scene);
    mat.diffuseTexture = texture;
    mat.diffuseTexture.hasAlpha = true;
    mat.useAlphaFromDiffuseTexture = true;
    mat.emissiveColor = new Color3(1, 1, 1);
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    plane.material = mat;

    return plane;
  }

  private updateNameTag(rp: RemotePlayer, name: string, colorHex?: string) {
    if (!rp.nameTag) return;
    const mat = rp.nameTag.material as StandardMaterial;
    if (mat && mat.diffuseTexture instanceof DynamicTexture) {
      const tex = mat.diffuseTexture;
      const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
      ctx.clearRect(0, 0, 256, 64);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(10, 8, 236, 48, 16);
      } else {
        ctx.rect(10, 8, 236, 48);
      }
      ctx.fill();

      ctx.strokeStyle = colorHex || '#38bdf8';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name.slice(0, 16), 128, 32);
      tex.update();
    }
  }

  /**
   * Accumulate a per-axis position update into a pending batch. All updates
   * for a given sessionId within the same JS microtask queue flush are combined
   * into a single interpolation snapshot at the next onBeforeRender tick.
   */
  private schedulePositionUpdate(sessionId: string, axis: 'x' | 'y' | 'z', value: number) {
    let batch = this.pendingPos.get(sessionId);
    if (!batch) {
      batch = {};
      this.pendingPos.set(sessionId, batch);
    }
    batch[axis] = value;

    if (!this.pendingFlushScheduled) {
      this.pendingFlushScheduled = true;
      // Use addOnce so we flush exactly once at the top of the next frame,
      // after all listen() callbacks from the same server patch have fired.
      this.scene.onBeforeRenderObservable.addOnce(() => this.flushPositionUpdates());
    }
  }

  private flushPositionUpdates() {
    this.pendingFlushScheduled = false;
    for (const [sessionId, axes] of this.pendingPos) {
      const rp = this.players.get(sessionId);
      if (!rp) continue;

      // Only reset lerp if any axis actually moved
      const xMoved = axes.x !== undefined && Math.abs(rp.targetPos.x - axes.x) > 0.001;
      const yMoved = axes.y !== undefined && Math.abs(rp.targetPos.y - axes.y) > 0.001;
      const zMoved = axes.z !== undefined && Math.abs(rp.targetPos.z - axes.z) > 0.001;

      if (xMoved || yMoved || zMoved) {
        rp.startPos.copyFrom(rp.mesh.position);
        if (axes.x !== undefined) rp.targetPos.x = axes.x;
        if (axes.y !== undefined) rp.targetPos.y = axes.y;
        if (axes.z !== undefined) rp.targetPos.z = axes.z;
        rp.lerpStart = performance.now();
      }
    }
    this.pendingPos.clear();
  }

  private update() {
    const now = performance.now();
    const INTERPOLATION_MS = 100.0;

    const dt = this.scene.getEngine().getDeltaTime() / 1000;

    for (const rp of this.players.values()) {
      const elapsed = now - rp.lerpStart;
      const t = Math.min(elapsed / INTERPOLATION_MS, 1.0);
      
      const prevPos = rp.mesh.position.clone();
      Vector3.LerpToRef(rp.startPos, rp.targetPos, t, rp.mesh.position);

      const moveDelta = rp.mesh.position.subtract(prevPos);
      if (rp.animState === 'sit' || rp.animState === 'sitDown') {
        // When seated or transitioning to sit, snap or stay facing the seated rotation
        const statePlayer = this.room.state.players.get(Array.from(this.players.entries()).find(([_, v]) => v === rp)?.[0] ?? '');
        if (statePlayer && typeof statePlayer.rotationY === 'number') {
          rp.mesh.rotation.y = statePlayer.rotationY;
        }
      } else if (moveDelta.x !== 0 || moveDelta.z !== 0) {
        const targetAngle = Math.atan2(moveDelta.x, moveDelta.z);
        let currentAngle = rp.mesh.rotation.y;
        
        let diff = targetAngle - currentAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        
        rp.mesh.rotation.y += diff * 10 * dt;
      }
    }
  }
}
