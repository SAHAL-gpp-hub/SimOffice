import { Scene, MeshBuilder, Vector3, Mesh } from '@babylonjs/core';
import type { Room } from 'colyseus.js';
import { TeamRoomState, PlayerState } from './network/schema/TeamRoomState';

import { CharacterModel } from './CharacterModel';
import type { AnimState } from './animState';

interface RemotePlayer {
  mesh: Mesh;
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

      console.log('Remote player joined:', sessionId);
      const mesh = MeshBuilder.CreateCapsule(`remote_${sessionId}`, { height: 1.8, radius: 0.3 }, this.scene);
      mesh.position = new Vector3(player.x, player.y, player.z);
      mesh.isVisible = false; // Hide collision capsule

      const model = new CharacterModel(this.scene, mesh);
      model.loadAssets().then(() => {
        if (player.colorScheme) model.applyAppearance(player.colorScheme);
        const rp = this.players.get(sessionId);
        if (rp && rp.animState) {
          model.playAnim(rp.animState as AnimState);
        }
      });

      const remotePlayer: RemotePlayer = {
        mesh,
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
      player.listen('animState', (value) => {
        const rp = this.players.get(sessionId);
        if (rp) {
          rp.animState = value;
          rp.model.playAnim(value as AnimState);
        }
      });
      player.listen('colorScheme', (value) => {
        const rp = this.players.get(sessionId);
        if (rp && value) {
          rp.model.applyAppearance(value);
        }
      });
    });

    this.room.state.players.onRemove((_player: PlayerState, sessionId: string) => {
      console.log('Remote player left:', sessionId);
      const rp = this.players.get(sessionId);
      if (rp) {
        rp.model.dispose();
        rp.mesh.dispose();
        this.players.delete(sessionId);
      }
      this.pendingPos.delete(sessionId);
    });

    this.scene.onBeforeRenderObservable.add(this.update.bind(this));
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
      if (moveDelta.x !== 0 || moveDelta.z !== 0) {
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
