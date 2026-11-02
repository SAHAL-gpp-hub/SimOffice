import { Scene, Mesh, MeshBuilder, Vector3, Ray, ArcRotateCamera, ActionManager, ExecuteCodeAction } from '@babylonjs/core';
import type { Environment, InteractionTrigger } from './sceneBuilder';
import { SPAWN_POSITION } from './sceneBuilder';
import type { ActionEvent, MovementInput, PhysicsState } from './animState';
import { nextAnimState } from './animState';

import { CharacterModel } from './CharacterModel';

const WALK_SPEED = 3.5;
const RUN_SPEED = 6.0;
const GRAVITY = -9.81 * 2; // Increased gravity for snappier feel
const JUMP_VELOCITY = 8.0; // Tuned for ~1.1s airtime
const COYOTE_TIME = 0.15; // 150ms
const JUMP_BUFFER = 0.15; // 150ms
const CAPSULE_HEIGHT = 1.8;
const CAPSULE_RADIUS = 0.3;
const CAPSULE_HALF_HEIGHT = CAPSULE_HEIGHT * 0.5;
const GROUND_EPSILON = 0.1;
const MAX_STEP_HEIGHT = 0.4;
const STEP_CHECK_DISTANCE = 0.45;
const STEP_UP_SPEED = 4.0;

// Ground speed (m/s) each clip's stride represents at speedRatio = 1. We scale
// the playing walk/run AnimationGroup's speedRatio by actual travel speed /
// this reference so foot planting matches how fast the capsule is actually
// moving. These are starting guesses, not measured from the assets — if feet
// still slide (looks like backward stepping while net motion is forward),
// raise the matching constant; if feet overshoot/skip ahead of the body,
// lower it. Tune by eye against WALK_SPEED / RUN_SPEED above.
const WALK_ANIM_REFERENCE_SPEED = 1.6;
const RUN_ANIM_REFERENCE_SPEED = 4.0;

// Mouse sensitivity tuning:
// Default Babylon.js ArcRotateCamera angularSensibility is 1000.0 (where higher = slower rotation).
// 1000.0 was too sluggish (~3140px of travel for 180°), while 260 was slightly too twitchy.
// Balanced values: 380 for X and 420 for Y provide smooth, controlled, and comfortable mouse look.
// Camera inertia at 0.76 provides a gentle, stable deceleration without heavy input lag.
const DEFAULT_ANGULAR_SENSIBILITY_X = 380.0;
const DEFAULT_ANGULAR_SENSIBILITY_Y = 420.0;
const DEFAULT_CAMERA_INERTIA = 0.76;

export const CEILING_MAX_CAM_Y = 3.75;
export const FLOOR_MIN_CAM_Y = 0.35;

/**
 * Computes dynamic pitch (beta) bounds for the ArcRotateCamera.
 *
 * In Babylon.js spherical coordinates:
 *   camera.position.y = target.y + radius * cos(beta)
 *   beta = 0: overhead zenith looking straight down at feet (top-down pitch)
 *   beta = Math.PI / 2: horizontal eye level
 *   beta = Math.PI: nadir looking straight up at ceiling (bottom-up pitch)
 *
 * To prevent the camera from piercing through the 4.0m ceiling (or 3.86m soffits)
 * when looking down at feet, or dipping through the floor when looking up:
 *   targetY + radius * cos(beta) <= CEILING_MAX_CAM_Y (3.75m)
 *   targetY + radius * cos(beta) >= FLOOR_MIN_CAM_Y (0.35m)
 */
export function computeCameraBetaLimits(
    targetY: number,
    radius: number,
    floorBaseY = 0,
): { lowerBetaLimit: number; upperBetaLimit: number } {
    const safeRadius = Math.max(0.1, radius);
    const ceilingMax = floorBaseY + CEILING_MAX_CAM_Y;
    const floorMin = floorBaseY + FLOOR_MIN_CAM_Y;

    // Ceiling constraint: cos(beta) <= (ceilingMax - targetY) / radius
    const maxCosBeta = (ceilingMax - targetY) / safeRadius;
    const lowerBetaLimit = maxCosBeta < 1.0
        ? Math.acos(Math.max(-1.0, Math.min(1.0, maxCosBeta)))
        : 0.15; // When zoomed in very close, player can safely look almost straight down

    // Floor constraint: cos(beta) >= (floorMin - targetY) / radius
    const minCosBeta = (floorMin - targetY) / safeRadius;
    const upperBetaLimit = minCosBeta > -1.0
        ? Math.acos(Math.max(-1.0, Math.min(1.0, minCosBeta)))
        : Math.PI - 0.15;

    return {
        lowerBetaLimit: Math.max(0.15, lowerBetaLimit),
        upperBetaLimit: Math.min(Math.PI - 0.15, upperBetaLimit),
    };
}

export class CharacterController {
    private scene: Scene;
    private canvas: HTMLCanvasElement;
    private env: Environment;
    
    private mesh!: Mesh;
    private camera!: ArcRotateCamera;
    
    private inputMap: { [key: string]: boolean } = {};
    private pointerLocked = false;
    private controlsActive = false;
    
    // Physics & State
    private verticalVelocity = 0;
    private isGrounded = false;
    private wasGrounded = false;
    private timeSinceGrounded = 0;
    private timeSinceJumpPressed = 999;
    private inElevatorTransit = false;

    public model!: CharacterModel;
    private promptEl: HTMLElement | null = null;
    private noticeOverlayEl: HTMLElement | null = null;
    private activeReadTriggerId: string | null = null;
    private currentSitTrigger: InteractionTrigger | null = null;

    /**
     * Fired when the player sits at a workstation desk or couch.
     * Passes the triggering InteractionTrigger so listeners can differentiate.
     * Same callback pattern as onNetworkMove.
     */
    public onSit?: (trigger?: InteractionTrigger) => void;

    /**
     * Fired when the player stands up from a workstation desk.
     * Registered in main.ts and routed through the engine bridge to close SCR-14.
     */
    public onStand?: () => void;

    /**
     * Fired when the player interacts with an elevator trigger.
     */
    public onElevator?: (trigger: InteractionTrigger) => void;

    constructor(scene: Scene, canvas: HTMLCanvasElement, env: Environment) {
        this.scene = scene;
        this.canvas = canvas;
        this.env = env;
    }

    public async init() {
        await this.loadCharacterAssets();
        this.setupCamera();
        this.setupInputs();
        this.setupUI();
        
        this.scene.onBeforeRenderObservable.add(() => this.update());
    }

    private async loadCharacterAssets() {
        // Create root mesh for collision/movement
        this.mesh = MeshBuilder.CreateCapsule("player", { height: CAPSULE_HEIGHT, radius: CAPSULE_RADIUS }, this.scene);
        const jitterX = (Math.random() - 0.5) * 1.2;
        const jitterZ = (Math.random() - 0.5) * 1.2;
        this.mesh.position = new Vector3(
            SPAWN_POSITION.x + jitterX,
            SPAWN_POSITION.y,
            SPAWN_POSITION.z + jitterZ,
        );
        this.mesh.rotation.y = -Math.PI / 2; // Face West (into the lobby)
        this.mesh.checkCollisions = true;
        this.mesh.ellipsoid = new Vector3(CAPSULE_RADIUS, CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS);
        this.mesh.ellipsoidOffset = new Vector3(0, CAPSULE_HALF_HEIGHT, 0); // Bottom at origin
        this.mesh.isVisible = false; // Hide collision capsule

        this.model = new CharacterModel(this.scene, this.mesh);
        await this.model.loadAssets();
        this.model.playAnim('idle'); // Ensure bind pose doesn't hide the player
    }

    private setupCamera() {
        this.camera = new ArcRotateCamera("camera", 0, Math.PI / 2.8, 3.2, this.mesh.position, this.scene);
        this.camera.attachControl(this.canvas, true);
        
        // Natural, responsive mouse look sensitivity
        this.camera.angularSensibilityX = DEFAULT_ANGULAR_SENSIBILITY_X;
        this.camera.angularSensibilityY = DEFAULT_ANGULAR_SENSIBILITY_Y;
        this.camera.inertia = DEFAULT_CAMERA_INERTIA;

        this.camera.lowerRadiusLimit = 0.2; // Must be very small so camera can get close to target without clipping through walls
        this.camera.upperRadiusLimit = 3.5; // Restrict max zoom

        // Set safe initial pitch limits (dynamically kept in sync every frame in update())
        const initialLimits = computeCameraBetaLimits(1.5, 3.2);
        this.camera.lowerBetaLimit = initialLimits.lowerBetaLimit;
        this.camera.upperBetaLimit = initialLimits.upperBetaLimit;
        
        // Fix: BabylonJS default minZ is 1.0, which near-clip-culls the character
        // mesh whenever the camera radius is < ~3m (the character is < 1.72m tall).
        // 0.05 keeps geometry precision while ensuring the character is always visible.
        this.camera.minZ = 0.05;
        // Technique #4: Tight far clip plane to maximize z-buffer depth precision and cull geometry outside the building
        this.camera.maxZ = 55.0;

        this.camera.checkCollisions = true;
        this.camera.collisionRadius = new Vector3(0.1, 0.1, 0.1);
    }

    private setupInputs() {
        this.scene.actionManager = new ActionManager(this.scene);
        
        this.scene.actionManager.registerAction(
            new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, (evt) => {
                const key = evt.sourceEvent.key.toLowerCase();
                this.inputMap[key] = true;
                if (key === ' ') this.timeSinceJumpPressed = 0;
                this.updateHudKey(key, true);
            })
        );
        this.scene.actionManager.registerAction(
            new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, (evt) => {
                const key = evt.sourceEvent.key.toLowerCase();
                this.inputMap[key] = false;
                this.updateHudKey(key, false);
            })
        );

        this.canvas.addEventListener("click", () => {
            if (!this.pointerLocked && this.controlsActive) {
                this.canvas.requestPointerLock();
            }
        });

        document.addEventListener("pointerlockchange", () => {
            this.pointerLocked = document.pointerLockElement === this.canvas;
        });
    }

    private updateHudKey(key: string, isDown: boolean) {
        const kbd = document.querySelector(`.hud-kbd[data-key="${key}"]`);
        if (kbd) {
            if (isDown) kbd.classList.add('hud-kbd--active');
            else kbd.classList.remove('hud-kbd--active');
        }
    }

    private setupUI() {
        this.promptEl = document.getElementById("interactionPrompt");
        this.noticeOverlayEl = document.getElementById("noticeOverlay");
    }

    private openNoticeOverlay(trigger: InteractionTrigger) {
        if (!this.noticeOverlayEl) return;
        this.noticeOverlayEl.style.display = "block";

        if (trigger.id === 'read_incident_wall_fe') {
            this.noticeOverlayEl.innerHTML = `
                <div class="incident-dossier-card">
                  <div class="incident-dossier-header">
                    <div class="incident-dossier-title-wrap">
                      <span class="incident-dossier-badge" style="background: rgba(244, 63, 94, 0.2); color: #FDA4AF; border-color: #F43F5E;">INCIDENT REPORT #8493</span>
                      <h2 class="incident-dossier-title">OmniCart Storefront Cart Re-render & Hydration Freeze</h2>
                    </div>
                    <div class="incident-dossier-status">
                      <span class="incident-pulse-dot" style="background: #F43F5E;"></span>
                      P1 CRITICAL · ACTIVE
                    </div>
                  </div>
                  <div class="incident-dossier-body">
                    <div class="incident-dossier-section">
                      <div class="incident-dossier-label">SYSTEM TELEMETRY & SYMPTOMS</div>
                      <p class="incident-dossier-desc">
                        100% CPU browser thread lockup when customers apply promo code SPRING50. Cart drawer desyncs due to direct array mutations, and floating-point errors prevent checkout.
                      </p>
                    </div>
                    <div class="incident-dossier-action-box" style="border-left-color: #F43F5E;">
                      <div class="incident-dossier-action-header">
                        <span class="incident-target-icon">🎯</span>
                        <strong>Primary Objective:</strong>
                      </div>
                      <p>Fix cart state immutability in <code>useCartStore.ts</code>, remove useEffect re-render loop in <code>CartDrawer.tsx</code>, and round prices in <code>pricing.ts</code>.</p>
                    </div>
                    <div class="incident-dossier-instruction">
                      Approach any Frontend Engineering Workstation desk and press <kbd class="hud-kbd hud-kbd--accent">E</kbd> to open the live IDE.
                    </div>
                  </div>
                  <div class="incident-dossier-footer">
                    <span class="incident-dossier-hint">Press <kbd class="hud-kbd">ESC</kbd> to close dossier</span>
                  </div>
                </div>
            `;
        } else {
            this.noticeOverlayEl.innerHTML = `
                <div class="incident-dossier-card">
                  <div class="incident-dossier-header">
                    <div class="incident-dossier-title-wrap">
                      <span class="incident-dossier-badge">INCIDENT REPORT #8492</span>
                      <h2 class="incident-dossier-title">OmniCart Inventory Underflow</h2>
                    </div>
                    <div class="incident-dossier-status">
                      <span class="incident-pulse-dot"></span>
                      P1 CRITICAL · ACTIVE
                    </div>
                  </div>
                  <div class="incident-dossier-body">
                    <div class="incident-dossier-section">
                      <div class="incident-dossier-label">SYSTEM TELEMETRY & SYMPTOMS</div>
                      <p class="incident-dossier-desc">
                        Customers report negative stock counts during high-traffic surges. E-commerce inventory balances are dropping below zero under concurrent race conditions.
                      </p>
                    </div>
                    <div class="incident-dossier-action-box">
                      <div class="incident-dossier-action-header">
                        <span class="incident-target-icon">🎯</span>
                        <strong>Primary Objective:</strong>
                      </div>
                      <p>Inspect and patch logic bug in <code>src/index.js</code> so stock never drops below 0.</p>
                    </div>
                    <div class="incident-dossier-instruction">
                      Approach any computer workstation desk and press <kbd class="hud-kbd hud-kbd--accent">E</kbd> to open the live IDE.
                    </div>
                  </div>
                  <div class="incident-dossier-footer">
                    <span class="incident-dossier-hint">Press <kbd class="hud-kbd">ESC</kbd> to close dossier</span>
                  </div>
                </div>
            `;
        }
        this.activeReadTriggerId = trigger.id;
        
        // Release pointer lock so ESC doesn't double-fire (once to release lock, once to close UI)
        this.setControlsActive(false);
    }

    private closeNoticeOverlay() {
        if (!this.noticeOverlayEl) return;
        this.noticeOverlayEl.style.display = "none";
        this.activeReadTriggerId = null;
        
        // Re-enable pointer lock controls
        this.setControlsActive(true);
    }

    private tryAutoStepUp(moveInput: Vector3, dt: number) {
        if (!this.isGrounded || this.verticalVelocity > 0 || moveInput.lengthSquared() === 0) return;

        const direction = moveInput.normalizeToNew();
        const footY = this.mesh.position.y - CAPSULE_HALF_HEIGHT;
        const lowOrigin = new Vector3(this.mesh.position.x, footY + 0.05, this.mesh.position.z);
        const lowHit = this.scene.pickWithRay(
            new Ray(lowOrigin, direction, STEP_CHECK_DISTANCE),
            (m) => m !== this.mesh && m.checkCollisions,
        );

        if (!lowHit?.hit) return;

        const highOrigin = new Vector3(lowOrigin.x, lowOrigin.y + MAX_STEP_HEIGHT, lowOrigin.z);
        const highHit = this.scene.pickWithRay(
            new Ray(highOrigin, direction, STEP_CHECK_DISTANCE),
            (m) => m !== this.mesh && m.checkCollisions,
        );

        if (highHit?.hit) return;

        this.mesh.position.y += Math.min(MAX_STEP_HEIGHT, STEP_UP_SPEED * dt);
    }

    private update() {
        // Clamp dt to prevent a single massive lurch after the tab was backgrounded
        // or the GC paused — anything over 100 ms is treated as 100 ms.
        const dt = Math.min(this.scene.getEngine().getDeltaTime() / 1000, 0.1);

        if (this.inElevatorTransit) {
            if (this.promptEl) this.promptEl.style.display = "none";
            this.dispatchNetworkState();
            return;
        }
        
        this.timeSinceJumpPressed += dt;
        
        let action: ActionEvent | null = null;
        const rawEscapePressed = this.inputMap['escape'] === true;
        const escapePressed = this.controlsActive && rawEscapePressed;
        if (rawEscapePressed && this.noticeOverlayEl?.style.display === "block") {
            this.closeNoticeOverlay();
            this.inputMap['escape'] = false;
        }
        
        // 1. Check Interactions (SIT / READ / STAND)
        if (this.model.animState === 'sit') {
            // The prompt is only ever set in the "not sitting" branch below —
            // without this it stays stuck showing "[E] Sit" the whole time
            // the player is seated.
            if (this.promptEl) this.promptEl.style.display = "none";

            // Check exit conditions (E, Esc, or WASD movement)
            const rawMovement = this.inputMap['w'] || this.inputMap['a'] || this.inputMap['s'] || this.inputMap['d'];
            if (this.inputMap['e'] || escapePressed || rawEscapePressed || rawMovement) {
                action = { type: 'STAND' };
                this.inputMap['e'] = false; // consume
                this.inputMap['escape'] = false;
                
                // Unsnap to the open aisle behind the chair on ground level
                if (this.currentSitTrigger?.standPosition) {
                    this.mesh.position = this.currentSitTrigger.standPosition.clone();
                } else {
                    const facingAngle = this.mesh.rotation.y;
                    const backX = -Math.sin(facingAngle) * 0.8;
                    const backZ = -Math.cos(facingAngle) * 0.8;
                    this.mesh.position.x += backX;
                    this.mesh.position.z += backZ;
                }
                this.mesh.position.y = CAPSULE_HALF_HEIGHT;
                this.verticalVelocity = 0;
                this.isGrounded = true;
                this.currentSitTrigger = null;

                // Release camera from seated position back to character head height
                this.camera.target = this.mesh.position.add(new Vector3(0, 1.5, 0));

                // Return model animation state to idle
                this.model.playAnim('idle');

                // Notify the React overlay to close SCR-14 (flush + hide).
                this.onStand?.();
            }
        } else {
            // Find nearest trigger
            let nearest: InteractionTrigger | null = null;
            let minDist = Infinity;
            
            for (const t of this.env.triggers) {
                const dist = Vector3.Distance(this.mesh.position, t.position);
                if (dist <= t.radius && dist < minDist) {
                    minDist = dist;
                    nearest = t;
                }
            }
            
            if (this.promptEl) {
                const crosshair = document.getElementById("crosshair");
                if (nearest) {
                    this.promptEl.style.display = "flex";
                    const promptTextEl = document.getElementById("interactionPromptText");
                    const rawText = nearest.promptText || (nearest.type === 'SIT' ? "Sit at Station" : "Inspect Board");
                    const cleanText = rawText.replace(/^\[E\]\s*/i, '');
                    if (promptTextEl) {
                        promptTextEl.innerText = cleanText;
                    } else {
                        this.promptEl.innerText = rawText;
                    }
                    if (crosshair) crosshair.classList.add("hud-crosshair--active");
                } else {
                    this.promptEl.style.display = "none";
                    if (crosshair) crosshair.classList.remove("hud-crosshair--active");
                }
            }
            if (nearest && this.inputMap['e']) {
                this.inputMap['e'] = false; // consume
                if (nearest.type === 'SIT' && nearest.snapPosition) {
                    action = { type: 'SIT' };
                    this.currentSitTrigger = nearest;
                    
                    // Snap position
                    this.mesh.position = nearest.snapPosition.clone();
                    this.mesh.rotation.y = nearest.snapRotationY || 0;
                    this.dispatchNetworkState(true);
                    
                    // Move camera to look toward the desk / monitor or lounge.
                    // For workstations, orbit a point near the monitors.
                    // For stools and lounge couches, focus on the seated character so the
                    // camera does not clip through adjacent walls or counters.
                    const facingX = Math.sin(this.mesh.rotation.y);
                    const facingZ = Math.cos(this.mesh.rotation.y);
                    const isWorkstation = nearest.id.startsWith('sit_eng_') || nearest.id.startsWith('sit_ws_');
                    if (isWorkstation) {
                        this.camera.target = this.mesh.position.add(
                            new Vector3(facingX * 1.2, 0.8, facingZ * 1.2),
                        );
                    } else {
                        this.camera.target = this.mesh.position.add(
                            new Vector3(facingX * 0.3, 1.1, facingZ * 0.3),
                        );
                    }

                    // Notify listeners (and pass trigger info).
                    // Pointer lock is released by setControlsActive(false) in main.ts
                    // after this callback fires if this is a workstation trigger.
                    this.onSit?.(nearest);
                } else if (nearest.type === 'READ') {
                    this.openNoticeOverlay(nearest);
                } else if (nearest.type === 'ELEVATOR') {
                    this.onElevator?.(nearest);
                }
            }
        }

        if (this.activeReadTriggerId) {
            const activeRead = this.env.triggers.find((trigger) => trigger.id === this.activeReadTriggerId);
            if (!activeRead || Vector3.Distance(this.mesh.position, activeRead.position) > activeRead.radius + 0.2) {
                this.closeNoticeOverlay();
            }
        }

        // 2. Physics & Ground Check (Raycast)
        const isSeated = this.model.animState === 'sit' || this.model.animState === 'sitDown';
        if (isSeated && this.currentSitTrigger?.snapPosition) {
            // Keep seated height fixed at the snapPosition to prevent ground raycast
            // from snapping capsule to the top of the couch cushion/backrest
            this.mesh.position.y = this.currentSitTrigger.snapPosition.y;
            this.verticalVelocity = 0;
            this.isGrounded = true;
            this.timeSinceGrounded = 0;
        } else {
            const ray = new Ray(this.mesh.position.clone(), new Vector3(0, -1, 0), CAPSULE_HALF_HEIGHT + GROUND_EPSILON);
            const hit = this.scene.pickWithRay(ray, (m) => m.name !== "player" && m.checkCollisions);
            this.wasGrounded = this.isGrounded;

            if (hit?.hit) {
                this.isGrounded = true;
                this.timeSinceGrounded = 0;
                if (this.verticalVelocity <= 0) {
                    this.verticalVelocity = 0;
                    this.mesh.position.y = hit.pickedPoint!.y + CAPSULE_HALF_HEIGHT;
                }
                // Only treat this as a "landing" if we were actually in a falling/jumping
                // animation state. A single-frame ground-ray miss during walk/run/idle is
                // swallowed by animState's fall-grace window (animState.ts) and never
                // leaves 'walk' — but wasGrounded/isGrounded still flip true->false->true
                // for that one frame. Firing LAND on every such blip forces a hard cut
                // into the non-looping 'land' clip (then 'idle') even though the
                // character never visibly left the walk cycle, which reads as a
                // stutter/flicker while walking over anything slightly uneven.
                if (!this.wasGrounded && (this.model.animState === 'fall' || this.model.animState === 'jumpUp')) {
                    action = action ?? { type: 'LAND' };
                }
            } else {
                this.isGrounded = false;
                this.timeSinceGrounded += dt;
                this.verticalVelocity += GRAVITY * dt;
            }
        }

        // Jump Logic (Coyote time & Buffer)
        let jumpStarted = false;
        if (this.model.animState !== 'sit' && this.model.animState !== 'standUp' && this.model.animState !== 'sitDown') {
            if (this.timeSinceJumpPressed <= JUMP_BUFFER && this.timeSinceGrounded <= COYOTE_TIME) {
                this.verticalVelocity = JUMP_VELOCITY;
                this.timeSinceGrounded = 999;
                this.timeSinceJumpPressed = 999;
                this.isGrounded = false;
                jumpStarted = true;
            }
        }
        if (jumpStarted) {
            action = action ?? { type: 'JUMP_START' };
        }

        const physicsState: PhysicsState = {
            grounded: this.isGrounded,
            verticalVelocity: this.verticalVelocity,
            timeSinceGrounded: this.timeSinceGrounded,
        };

        // 3. WASD Movement
        let forward = this.camera.getDirection(Vector3.Forward());
        let right = this.camera.getDirection(Vector3.Right());
        forward.y = 0; forward.normalize();
        right.y = 0; right.normalize();

        const moveInput = new Vector3(0, 0, 0);
        if (this.controlsActive && this.model.animState !== 'sit' && this.model.animState !== 'sitDown') {
            if (this.inputMap['w']) moveInput.addInPlace(forward);
            if (this.inputMap['s']) moveInput.subtractInPlace(forward);
            if (this.inputMap['d']) moveInput.addInPlace(right);
            if (this.inputMap['a']) moveInput.subtractInPlace(right);
        }

        const runHeld = this.controlsActive && this.inputMap['shift'];
        let speed = runHeld ? RUN_SPEED : WALK_SPEED;
        
        if (moveInput.lengthSquared() > 0) {
            moveInput.normalize();
            
            // Rotate player visual to face movement direction smoothly
            const targetAngle = Math.atan2(moveInput.x, moveInput.z);
            let currentAngle = this.mesh.rotation.y;
            
            // Shortest path angle lerp
            let diff = targetAngle - currentAngle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            this.mesh.rotation.y += diff * 10 * dt;
        }

        const input: MovementInput = {
            moveVector: { x: moveInput.x, z: moveInput.z },
            runHeld: runHeld
        };

        // Apply movement using collision
        const velocity = moveInput.scale(speed * dt);
        velocity.y = this.verticalVelocity * dt;
        
        if (this.model.animState !== 'sit' && this.model.animState !== 'sitDown') {
            this.tryAutoStepUp(moveInput, dt);
            this.mesh.moveWithCollisions(velocity);
        }

        // Update Camera Target (Spring Arm)
        if (this.model.animState !== 'sit' && this.model.animState !== 'sitDown') {
            const floorBaseY = this.mesh.position.y > 7.0 ? 14.0 : 0.0;
            const camTarget = this.mesh.position.add(new Vector3(0, 1.5, 0));
            camTarget.y = Math.min(camTarget.y, floorBaseY + 2.5); // stay clear of the ceiling at jump apex
            this.camera.target = Vector3.Lerp(this.camera.target, camTarget, 10 * dt);
        }

        // Dynamically constrain camera beta limits so the camera never clips through
        // the 4.0m ceiling (or 3.86m perimeter soffits) when looking down at feet,
        // jumping, or zooming out, and stays above the floor when looking up.
        const currentFloorBaseY = this.mesh.position.y > 7.0 ? 14.0 : 0.0;
        const { lowerBetaLimit, upperBetaLimit } = computeCameraBetaLimits(
            this.camera.target.y,
            this.camera.radius,
            currentFloorBaseY,
        );
        this.camera.lowerBetaLimit = lowerBetaLimit;
        this.camera.upperBetaLimit = upperBetaLimit;

        if (this.camera.beta < lowerBetaLimit) {
            this.camera.beta = lowerBetaLimit;
            if (this.camera.inertialBetaOffset < 0) this.camera.inertialBetaOffset = 0;
        } else if (this.camera.beta > upperBetaLimit) {
            this.camera.beta = upperBetaLimit;
            if (this.camera.inertialBetaOffset > 0) this.camera.inertialBetaOffset = 0;
        }

        // 4. Update Animation State Machine
        const nextState = nextAnimState(this.model.animState, input, physicsState, action);
        if (nextState !== this.model.animState) {
            this.model.playAnim(nextState);
        }

        // Keep stride speed matched to actual travel speed every frame (not
        // just on state transitions). Root motion cancellation stops the
        // skeleton drifting independently of the capsule, but a mismatch
        // between the clip's stride cadence and WALK_SPEED/RUN_SPEED reads
        // the same way (feet appear to slip backward while body moves forward).
        const activeLocoState = this.model.animState === 'walk' || this.model.animState === 'run' ? this.model.animState : null;
        if (activeLocoState) {
            const ag = this.model.animGroups.get(activeLocoState);
            if (ag) {
                const ref = activeLocoState === 'run' ? RUN_ANIM_REFERENCE_SPEED : WALK_ANIM_REFERENCE_SPEED;
                ag.speedRatio = speed / ref;
            }
        }

        this.dispatchNetworkState();
    }

    private lastSendTime = 0;
    private lastSendPayload = "";
    public onNetworkMove?: (payload: { x: number, y: number, z: number, rotationY: number, animState: string }) => void;

    public dispatchNetworkState(force = false) {
        if (!this.onNetworkMove) return;

        const now = performance.now();
        if (!force && now - this.lastSendTime < 67) return; // 15Hz cap

        const payload = {
            x: this.mesh.position.x,
            y: this.mesh.position.y,
            z: this.mesh.position.z,
            rotationY: this.mesh.rotation.y,
            animState: this.model.animState,
        };

        const json = JSON.stringify(payload);
        if (force || json !== this.lastSendPayload) {
            this.onNetworkMove(payload);
            this.lastSendPayload = json;
            this.lastSendTime = now;
        }
    }

    public setInElevator(inElevator: boolean) {
        this.inElevatorTransit = inElevator;
        if (inElevator) {
            this.verticalVelocity = 0;
            this.isGrounded = true;
            if (this.promptEl) this.promptEl.style.display = "none";
        }
    }

    public isInElevator(): boolean {
        return this.inElevatorTransit;
    }

    public setControlsActive(active: boolean) {
        this.controlsActive = active;
        if (!active && this.pointerLocked) {
            document.exitPointerLock();
        }
    }

    public applyAppearance(hex?: string | null) {
        if (this.model) {
            this.model.applyAppearance(hex);
        }
    }

    public setSensitivity(multiplier: number) {
        if (multiplier <= 0) return;
        this.camera.angularSensibilityX = DEFAULT_ANGULAR_SENSIBILITY_X / multiplier;
        this.camera.angularSensibilityY = DEFAULT_ANGULAR_SENSIBILITY_Y / multiplier;
    }

    public getSensitivity(): { sensibilityX: number; sensibilityY: number; inertia: number } {
        return {
            sensibilityX: this.camera.angularSensibilityX,
            sensibilityY: this.camera.angularSensibilityY,
            inertia: this.camera.inertia,
        };
    }

    public standUp() {
        if (this.model.animState === 'sit' || this.model.animState === 'sitDown') {
            if (this.currentSitTrigger?.standPosition) {
                this.mesh.position = this.currentSitTrigger.standPosition.clone();
            } else {
                const facingAngle = this.mesh.rotation.y;
                const backX = -Math.sin(facingAngle) * 0.8;
                const backZ = -Math.cos(facingAngle) * 0.8;
                this.mesh.position.addInPlace(new Vector3(backX, 0, backZ));
                const floorBaseY = this.mesh.position.y > 7.0 ? 14.0 : 0.0;
                this.mesh.position.y = floorBaseY + CAPSULE_HALF_HEIGHT;
            }
            this.verticalVelocity = 0;
            this.isGrounded = true;
            this.currentSitTrigger = null;
            this.camera.target = this.mesh.position.add(new Vector3(0, 1.5, 0));
            this.model.playAnim('idle');
            this.onStand?.();
        }
    }

    public getMesh(): Mesh {
        return this.mesh;
    }

    public getCamera(): ArcRotateCamera {
        return this.camera;
    }
}
