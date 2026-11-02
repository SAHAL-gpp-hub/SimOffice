import {
  Scene,
  Vector3,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  TransformNode,
  PointLight,
  DynamicTexture,
  ArcRotateCamera,
} from '@babylonjs/core';
import type { Environment, InteractionTrigger } from '../sceneBuilder';
import type { CharacterController } from '../characterController';

/**
 * Procedural Web Audio synthesizer for elevator audio feedback.
 * Generates crystal-clear chimes, motor hum, door glide swoosh, and call beeps
 * without external audio asset downloads.
 */
class ElevatorAudio {
  private ctx: AudioContext | null = null;
  private motorGain: GainNode | null = null;
  private motorOsc: OscillatorNode | null = null;

  private initCtx(): boolean {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return !!this.ctx;
    } catch {
      return false;
    }
  }

  /**
   * Classic two-tone elevator chime ("Ding-Dong!").
   */
  public playChime(isAscending: boolean = true) {
    if (!this.initCtx() || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const f1 = isAscending ? 523.25 : 783.99; // C5 or G5
      const f2 = isAscending ? 783.99 : 523.25; // G5 or C5

      this.playChimeTone(f1, now, 0.7);
      this.playChimeTone(f2, now + 0.22, 1.3);
    } catch {
      // Audio not permitted or interrupted
    }
  }

  private playChimeTone(freq: number, startTime: number, decayDuration: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.25, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + decayDuration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + decayDuration);
  }

  /**
   * Filtered white noise door gliding swoosh.
   */
  public playDoorSound(action: 'open' | 'close') {
    if (!this.initCtx() || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const duration = 0.85;
      const sampleRate = this.ctx.sampleRate;
      const bufferSize = Math.floor(sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.4;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(action === 'open' ? 440 : 360, now);
      filter.Q.setValueAtTime(1.8, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.07, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + duration);
    } catch {
      // Audio not permitted or interrupted
    }
  }

  /**
   * Low-frequency electric motor hum with pitch curve during elevator travel.
   */
  public startMotor(durationSec: number) {
    if (!this.initCtx() || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      this.motorOsc = this.ctx.createOscillator();
      this.motorGain = this.ctx.createGain();

      this.motorOsc.type = 'triangle';
      this.motorOsc.frequency.setValueAtTime(52, now);
      this.motorOsc.frequency.linearRampToValueAtTime(96, now + durationSec * 0.35);
      this.motorOsc.frequency.setValueAtTime(96, now + durationSec * 0.65);
      this.motorOsc.frequency.linearRampToValueAtTime(48, now + durationSec);

      this.motorGain.gain.setValueAtTime(0.001, now);
      this.motorGain.gain.linearRampToValueAtTime(0.065, now + 0.4);
      this.motorGain.gain.setValueAtTime(0.065, now + durationSec - 0.5);
      this.motorGain.gain.linearRampToValueAtTime(0.001, now + durationSec);

      this.motorOsc.connect(this.motorGain);
      this.motorGain.connect(this.ctx.destination);

      this.motorOsc.start(now);
      this.motorOsc.stop(now + durationSec);
    } catch {
      // Audio not permitted or interrupted
    }
  }

  public stopMotor() {
    if (!this.motorGain || !this.ctx) return;
    try {
      this.motorGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    } catch {
      // Audio not permitted or interrupted
    }
  }

  /**
   * Crisp electronic double-pip for calling the elevator.
   */
  public playCallBeep() {
    if (!this.initCtx() || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      for (let i = 0; i < 2; i++) {
        const t = now + i * 0.12;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, t);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.12, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.08);
      }
    } catch {
      // Audio not permitted or interrupted
    }
  }
}

export class ElevatorManager {
  private scene: Scene;
  private currentFloor: 1 | 2 = 1;
  private isTransitioning: boolean = false;

  // Exterior Landing Doors
  public doorsF1_L!: Mesh;
  public doorsF1_R!: Mesh;
  public doorsF2_L!: Mesh;
  public doorsF2_R!: Mesh;

  // Cabin and Interior Doors
  public cabinRoot!: TransformNode;
  public cabinDoorL!: Mesh;
  public cabinDoorR!: Mesh;

  // In-cabin indicator texture
  private indTexture!: DynamicTexture;
  private lastIndUpdate = 0;

  // Audio synthesizer
  private audio = new ElevatorAudio();

  // Dimensions & Coordinates
  private readonly doorSlideDist = 0.95;
  private readonly travelDurationSec = 3.6;
  private readonly floor1Y = 0.0;
  private readonly floor2Y = 14.0;
  private readonly vestibuleX = 28.4; // Vestibule standing coordinate outside elevator

  constructor(scene: Scene) {
    this.scene = scene;
  }

  public init(
    env: Environment,
    doorsF1: { left: Mesh; right: Mesh },
    doorsF2: { left: Mesh; right: Mesh }
  ) {
    this.doorsF1_L = doorsF1.left;
    this.doorsF1_R = doorsF1.right;
    this.doorsF2_L = doorsF2.left;
    this.doorsF2_R = doorsF2.right;

    this.buildCabin();
    this.buildFloorCallFixtures();
    this.registerTriggers(env);
  }

  private buildCabin() {
    this.cabinRoot = new TransformNode('elevatorCabinRoot', this.scene);
    this.cabinRoot.position = new Vector3(31.2, this.floor1Y, 0);

    const cabinMat = new StandardMaterial('elevCabinMat', this.scene);
    cabinMat.diffuseColor = new Color3(0.18, 0.20, 0.24);
    cabinMat.specularColor = new Color3(0.3, 0.3, 0.35);
    cabinMat.backFaceCulling = false;

    // Hairline brushed stainless steel
    const metalMat = new StandardMaterial('elevCabinMetalMat', this.scene);
    metalMat.diffuseColor = new Color3(0.65, 0.66, 0.68);
    metalMat.specularColor = new Color3(0.85, 0.85, 0.90);
    metalMat.specularPower = 48;
    metalMat.backFaceCulling = false;

    // Bronze architectural trim & handrails
    const bronzeMat = new StandardMaterial('elevBronzeMat', this.scene);
    bronzeMat.diffuseColor = new Color3(0.35, 0.28, 0.20);
    bronzeMat.specularColor = new Color3(0.7, 0.6, 0.45);
    bronzeMat.specularPower = 32;
    bronzeMat.backFaceCulling = false;

    // Smoked architectural mirror
    const mirrorMat = new StandardMaterial('elevMirrorMat', this.scene);
    mirrorMat.diffuseColor = new Color3(0.12, 0.14, 0.18);
    mirrorMat.specularColor = new Color3(0.95, 0.95, 1.0);
    mirrorMat.specularPower = 120;
    mirrorMat.backFaceCulling = false;
    mirrorMat.specularPower = 120;

    // 1. Cabin Floor with anti-slip threshold plate (interior: W=2.4m, D=2.2m)
    const floor = MeshBuilder.CreateBox('elevCabinFloor', { width: 2.3, height: 0.1, depth: 2.2 }, this.scene);
    floor.parent = this.cabinRoot;
    floor.position = new Vector3(0, 0.05, 0);
    floor.material = cabinMat;
    floor.checkCollisions = true;

    // Fluted Bronze Threshold Sill Plate at cabin entrance (x = -1.14)
    const sill = MeshBuilder.CreateBox('elevThresholdSill', { width: 0.12, height: 0.02, depth: 2.1 }, this.scene);
    sill.parent = this.cabinRoot;
    sill.position = new Vector3(-1.14, 0.105, 0);
    sill.material = bronzeMat;

    // 2. Cabin Ceiling
    const ceil = MeshBuilder.CreateBox('elevCabinCeil', { width: 2.3, height: 0.1, depth: 2.2 }, this.scene);
    ceil.parent = this.cabinRoot;
    ceil.position = new Vector3(0, 2.75, 0);
    ceil.material = cabinMat;
    ceil.checkCollisions = true;

    // 3. Cabin Walls with Stainless Steel Paneling
    // Rear Wall (East wall of cabin)
    const wallE = MeshBuilder.CreateBox('elevCabinWallE', { width: 0.1, height: 2.7, depth: 2.2 }, this.scene);
    wallE.parent = this.cabinRoot;
    wallE.position = new Vector3(1.1, 1.4, 0);
    wallE.material = metalMat;
    wallE.checkCollisions = true;

    // Smoked Bronze Mirror feature in center of rear wall
    const mirror = MeshBuilder.CreateBox('elevMirror', { width: 0.02, height: 2.1, depth: 1.4 }, this.scene);
    mirror.parent = this.cabinRoot;
    mirror.position = new Vector3(1.04, 1.4, 0);
    mirror.material = mirrorMat;

    // North Wall
    const wallN = MeshBuilder.CreateBox('elevCabinWallN', { width: 2.3, height: 2.7, depth: 0.1 }, this.scene);
    wallN.parent = this.cabinRoot;
    wallN.position = new Vector3(0, 1.4, 1.1);
    wallN.material = metalMat;
    wallN.checkCollisions = true;

    // South Wall
    const wallS = MeshBuilder.CreateBox('elevCabinWallS', { width: 2.3, height: 2.7, depth: 0.1 }, this.scene);
    wallS.parent = this.cabinRoot;
    wallS.position = new Vector3(0, 1.4, -1.1);
    wallS.material = metalMat;
    wallS.checkCollisions = true;

    // 4. Interior Sliding Cabin Doors (move with cabinRoot)
    const cabinDoorMat = new StandardMaterial('elevCabinDoorMat', this.scene);
    cabinDoorMat.diffuseColor = new Color3(0.52, 0.53, 0.56);
    cabinDoorMat.specularColor = new Color3(0.8, 0.8, 0.85);
    cabinDoorMat.specularPower = 40;
    cabinDoorMat.backFaceCulling = false;

    const cabinDoorW = 1.08;
    const cabinDoorH = 2.65;
    const cabinDoorT = 0.035;

    this.cabinDoorL = MeshBuilder.CreateBox('elevCabinDoorL', { width: cabinDoorT, height: cabinDoorH, depth: cabinDoorW }, this.scene);
    this.cabinDoorL.parent = this.cabinRoot;
    this.cabinDoorL.position = new Vector3(-1.12, 1.4, -0.55);
    this.cabinDoorL.material = cabinDoorMat;

    this.cabinDoorR = MeshBuilder.CreateBox('elevCabinDoorR', { width: cabinDoorT, height: cabinDoorH, depth: cabinDoorW }, this.scene);
    this.cabinDoorR.parent = this.cabinRoot;
    this.cabinDoorR.position = new Vector3(-1.12, 1.4, 0.55);
    this.cabinDoorR.material = cabinDoorMat;

    // Vertical Bronze Hand Grip Rails on Cabin Doors
    const gripL = MeshBuilder.CreateBox('elevCabinDoorGripL', { width: 0.02, height: 1.8, depth: 0.03 }, this.scene);
    gripL.parent = this.cabinDoorL;
    gripL.position = new Vector3(0.02, 0, cabinDoorW / 2 - 0.04);
    gripL.material = bronzeMat;

    const gripR = MeshBuilder.CreateBox('elevCabinDoorGripR', { width: 0.02, height: 1.8, depth: 0.03 }, this.scene);
    gripR.parent = this.cabinDoorR;
    gripR.position = new Vector3(0.02, 0, -cabinDoorW / 2 + 0.04);
    gripR.material = bronzeMat;

    // 5. Architectural Champagne Bronze Handrails along North, South, and East walls
    const handrailN = MeshBuilder.CreateCylinder('elevRailN', { height: 2.1, diameter: 0.045 }, this.scene);
    handrailN.parent = this.cabinRoot;
    handrailN.rotation = new Vector3(Math.PI / 2, 0, 0);
    handrailN.position = new Vector3(0, 0.95, 1.02);
    handrailN.material = bronzeMat;

    const handrailS = MeshBuilder.CreateCylinder('elevRailS', { height: 2.1, diameter: 0.045 }, this.scene);
    handrailS.parent = this.cabinRoot;
    handrailS.rotation = new Vector3(Math.PI / 2, 0, 0);
    handrailS.position = new Vector3(0, 0.95, -1.02);
    handrailS.material = bronzeMat;

    const handrailE = MeshBuilder.CreateCylinder('elevRailE', { height: 2.0, diameter: 0.045 }, this.scene);
    handrailE.parent = this.cabinRoot;
    handrailE.rotation = new Vector3(0, 0, Math.PI / 2);
    handrailE.position = new Vector3(1.02, 0.95, 0);
    handrailE.material = bronzeMat;

    // 6. In-Cabin Tactile Button Fixture Plate on South Wall (facing player)
    const plate = MeshBuilder.CreateBox('elevBtnPlate', { width: 0.22, height: 0.65, depth: 0.03 }, this.scene);
    plate.parent = this.cabinRoot;
    plate.position = new Vector3(-0.4, 1.25, -1.03);
    plate.material = bronzeMat;

    // Button 2 (Floor 2 - Frontend)
    const btn2 = MeshBuilder.CreateCylinder('elevBtn2', { height: 0.02, diameter: 0.08 }, this.scene);
    btn2.parent = this.cabinRoot;
    btn2.rotation = new Vector3(Math.PI / 2, 0, 0);
    btn2.position = new Vector3(-0.4, 1.42, -1.01);
    const btn2Mat = new StandardMaterial('elevBtn2Mat', this.scene);
    btn2Mat.diffuseColor = new Color3(0.1, 0.8, 0.5);
    btn2Mat.emissiveColor = new Color3(0.1, 0.7, 0.4);
    btn2.material = btn2Mat;

    // Button 1 (Floor 1 - Backend)
    const btn1 = MeshBuilder.CreateCylinder('elevBtn1', { height: 0.02, diameter: 0.08 }, this.scene);
    btn1.parent = this.cabinRoot;
    btn1.rotation = new Vector3(Math.PI / 2, 0, 0);
    btn1.position = new Vector3(-0.4, 1.25, -1.01);
    const btn1Mat = new StandardMaterial('elevBtn1Mat', this.scene);
    btn1Mat.diffuseColor = new Color3(0.2, 0.6, 0.9);
    btn1Mat.emissiveColor = new Color3(0.1, 0.5, 0.8);
    btn1.material = btn1Mat;

    // 7. In-Cabin Overhead Digital LED Status Indicator Display
    this.indTexture = new DynamicTexture('elevIndTex', { width: 512, height: 128 }, this.scene, false);
    this.updateIndicatorText('FLOOR 1 // BACKEND ENGINE ROOM');

    const indMat = new StandardMaterial('elevIndMat', this.scene);
    indMat.diffuseTexture = this.indTexture;
    indMat.emissiveTexture = this.indTexture;
    indMat.backFaceCulling = false;

    const indPlane = MeshBuilder.CreatePlane('elevIndPlane', { width: 1.2, height: 0.3, sideOrientation: Mesh.DOUBLESIDE }, this.scene);
    indPlane.parent = this.cabinRoot;
    indPlane.position = new Vector3(-1.08, 2.45, 0);
    indPlane.rotation = new Vector3(0, -Math.PI / 2, 0); // Faces +X (East) directly into cabin towards passenger
    indPlane.material = indMat;

    // 8. Warm recessed LED downlight inside cabin
    const cabinLight = new PointLight('elevCabinLight', new Vector3(0, 2.6, 0), this.scene);
    cabinLight.parent = this.cabinRoot;
    cabinLight.intensity = 0.95;
    cabinLight.diffuse = new Color3(1.0, 0.95, 0.88);
    cabinLight.range = 5.0;

    // 9. Full-Height Structural Elevator Shaft Enclosure (Y = 0m to 18m)
    // Ensures the cabin is always traveling inside a real architectural concrete/steel enclosure
    const shaftMat = new StandardMaterial('elevShaftMat', this.scene);
    shaftMat.diffuseColor = new Color3(0.10, 0.11, 0.13);
    shaftMat.specularColor = new Color3(0.18, 0.18, 0.22);
    shaftMat.backFaceCulling = false;

    // East shaft rear wall (x = 32.38)
    const shaftE = MeshBuilder.CreateBox('elevShaftE', { width: 0.15, height: 18.0, depth: 2.8 }, this.scene);
    shaftE.position.set(32.38, 9.0, 0);
    shaftE.material = shaftMat;

    // North shaft wall (z = 1.25)
    const shaftN = MeshBuilder.CreateBox('elevShaftN', { width: 2.6, height: 18.0, depth: 0.15 }, this.scene);
    shaftN.position.set(31.2, 9.0, 1.25);
    shaftN.material = shaftMat;

    // South shaft wall (z = -1.25)
    const shaftS = MeshBuilder.CreateBox('elevShaftS', { width: 2.6, height: 18.0, depth: 0.15 }, this.scene);
    shaftS.position.set(31.2, 9.0, -1.25);
    shaftS.material = shaftMat;

    // West shaft wall between floors (x = 30.08, from Y = 2.8 to 14.0)
    const shaftMidH = 14.0 - 2.8;
    const shaftW = MeshBuilder.CreateBox('elevShaftW_Mid', { width: 0.15, height: shaftMidH, depth: 2.8 }, this.scene);
    shaftW.position.set(30.08, 2.8 + shaftMidH / 2, 0);
    shaftW.material = shaftMat;
  }

  private buildFloorCallFixtures() {
    const bronzeMat = new StandardMaterial('elevCallBezelMat', this.scene);
    bronzeMat.diffuseColor = new Color3(0.25, 0.22, 0.18);
    bronzeMat.specularColor = new Color3(0.6, 0.5, 0.4);

    const callLightMat = new StandardMaterial('elevCallLightMat', this.scene);
    callLightMat.diffuseColor = new Color3(0.2, 0.7, 0.9);
    callLightMat.emissiveColor = new Color3(0.15, 0.6, 0.85);

    // Floor 1 Exterior Call Fixture
    const callF1 = MeshBuilder.CreateBox('callPlateF1', { width: 0.04, height: 0.28, depth: 0.12 }, this.scene);
    callF1.position.set(29.95, 1.3, -1.35);
    callF1.material = bronzeMat;

    const chevronF1 = MeshBuilder.CreateCylinder('callChevronF1', { height: 0.02, diameter: 0.04 }, this.scene);
    chevronF1.rotation.set(0, 0, Math.PI / 2);
    chevronF1.position.set(29.92, 1.35, -1.35);
    chevronF1.material = callLightMat;

    // Floor 2 Exterior Call Fixture
    const callF2 = MeshBuilder.CreateBox('callPlateF2', { width: 0.04, height: 0.28, depth: 0.12 }, this.scene);
    callF2.position.set(29.95, 15.3, -1.35);
    callF2.material = bronzeMat;

    const chevronF2 = MeshBuilder.CreateCylinder('callChevronF2', { height: 0.02, diameter: 0.04 }, this.scene);
    chevronF2.rotation.set(0, 0, Math.PI / 2);
    chevronF2.position.set(29.92, 15.25, -1.35);
    chevronF2.material = callLightMat;
  }

  public updateIndicatorText(title: string, subtext?: string, progress?: number) {
    if (!this.indTexture) return;
    const now = performance.now();
    if (progress !== undefined && now - this.lastIndUpdate < 90) return; // Cap at ~11Hz during continuous travel
    this.lastIndUpdate = now;

    const ctx = this.indTexture.getContext() as unknown as CanvasRenderingContext2D;
    ctx.fillStyle = '#070D14';
    ctx.fillRect(0, 0, 512, 128);

    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, 504, 120);

    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(title, 256, 48);

    if (progress !== undefined) {
      // Progress bar
      const barW = 380;
      const barH = 14;
      const barX = (512 - barW) / 2;
      const barY = 66;

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, barY, barW, barH);

      const fillW = Math.max(0, Math.min(barW, barW * progress));
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(barX + 2, barY + 2, fillW - 4, barH - 4);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '15px monospace';
      const pctText = `${Math.round(progress * 100)}% // TRANSIT IN PROGRESS`;
      ctx.fillText(subtext || pctText, 256, 108);
    } else {
      ctx.fillStyle = '#94A3B8';
      ctx.font = '16px monospace';
      ctx.fillText(subtext || 'HIGH-SPEED TRANSIT // OMNICART HQ', 256, 92);
    }

    this.indTexture.update();
  }

  private registerTriggers(env: Environment) {
    // Floor 1 Portal Trigger
    env.triggers.push({
      id: 'elev_call_f1',
      type: 'ELEVATOR',
      position: new Vector3(28.6, 1.0, 0),
      radius: 2.8,
      promptText: '[E] Take Elevator to Floor 2 (Frontend Studio)',
    });

    // Floor 2 Portal Trigger
    env.triggers.push({
      id: 'elev_call_f2',
      type: 'ELEVATOR',
      position: new Vector3(28.6, 15.0, 0),
      radius: 2.8,
      promptText: '[E] Take Elevator to Floor 1 (Backend Lab)',
    });
  }

  public async handleTrigger(trigger: InteractionTrigger, controller: CharacterController): Promise<void> {
    if (this.isTransitioning) return;

    // Detect which floor player is currently interacting from
    const playerMesh = controller.getMesh();
    const playerFloor: 1 | 2 = (trigger.id === 'elev_call_f1' || playerMesh.position.y < 7.0) ? 1 : 2;
    const targetFloor: 1 | 2 = playerFloor === 1 ? 2 : 1;

    await this.rideElevator(playerFloor, targetFloor, controller);
  }

  /**
   * The complete, silky-smooth elevator ride sequence.
   */
  public async rideElevator(
    fromFloor: 1 | 2,
    targetFloor: 1 | 2,
    controller: CharacterController
  ): Promise<void> {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    const playerMesh = controller.getMesh();
    const camera = controller.getCamera();

    // 1. Deactivate controls & suspend character physics during elevator ride
    controller.setControlsActive(false);
    controller.setInElevator(true);

    const origCameraCheckCollisions = camera.checkCollisions;
    // Disable camera collisions to prevent jerky wall pinching inside compact cabin
    camera.checkCollisions = false;

    // Detach canvas mouse controls so user dragging mouse cannot push camera through walls
    const renderingCanvas = this.scene.getEngine().getRenderingCanvas();
    if (renderingCanvas) {
      camera.detachControl();
    }

    // 2. Check if elevator is already at caller's floor. If not, summon it!
    if (this.currentFloor !== fromFloor) {
      this.audio.playCallBeep();
      this.showElevatorToast(`Elevator called to Floor ${fromFloor}...`);
      this.updateIndicatorText(`TRANSIT ➔ FLOOR ${fromFloor}`, 'DISPATCHING TO CALLER');

      const summonStartY = this.currentFloor === 1 ? this.floor1Y : this.floor2Y;
      const summonTargetY = fromFloor === 1 ? this.floor1Y : this.floor2Y;

      await this.animateEmptyCabinTravel(summonStartY, summonTargetY, 2.0);
      this.currentFloor = fromFloor;
      this.audio.playChime(fromFloor === 2);
    }

    const startFloorY = fromFloor === 1 ? this.floor1Y : this.floor2Y;
    const targetFloorY = targetFloor === 1 ? this.floor1Y : this.floor2Y;

    const fromLandingDoors = fromFloor === 1
      ? { l: this.doorsF1_L, r: this.doorsF1_R }
      : { l: this.doorsF2_L, r: this.doorsF2_R };

    // 3. Open doors smoothly (Landing doors + Interior Cabin doors)
    this.updateIndicatorText(`FLOOR ${fromFloor} // BOARDING`, 'DOORS OPENING');
    await this.animateDoorPairs(
      [fromLandingDoors, { l: this.cabinDoorL, r: this.cabinDoorR }],
      'open',
      0.85
    );

    // 4. Smoothly walk character from outside into cabin center
    // Character standing position inside cabin (x = 31.0, z = 0):
    const insideCharPos = new Vector3(31.0, startFloorY + 0.86, 0.0);
    // Camera target point inside cabin (chest level, slightly forward looking towards doors):
    const insideCamTarget = new Vector3(30.3, startFloorY + 1.35, 0.0);

    // With target.x = 30.3, radius = 1.25, alpha = 0.08, beta = Math.PI / 2.3:
    // Camera is positioned at x = 30.3 + 1.25 * cos(0.08) * sin(beta) = 31.52m (inside cabin, 73cm in front of rear wall)
    await Promise.all([
      this.animateCharacterWalk(controller, insideCharPos, Math.PI / 2, 1.1),
      this.animateCameraTo(camera, insideCamTarget, 1.25, 0.08, Math.PI / 2.3, 1.1),
    ]);

    // Second: character naturally turns around inside cabin to face west toward the doors
    await this.animateCharacterTurn(controller, -Math.PI / 2, 0.45);
    controller.model.playAnim('idle');

    // 5. Close doors
    await this.delay(200);
    this.updateIndicatorText('DOORS CLOSING // STAND CLEAR');
    await this.animateDoorPairs(
      [fromLandingDoors, { l: this.cabinDoorL, r: this.cabinDoorR }],
      'close',
      0.8
    );

    // 6. Vertical Travel with smooth easing, motor audio, vibration & live LED telemetry
    await this.delay(250);
    this.showElevatorToast(
      targetFloor === 2
        ? '▲ Ascending to Floor 2 — Frontend Engineering & Design Studio'
        : '▼ Descending to Floor 1 — Backend Infrastructure & Executive Lab'
    );

    await this.animateVerticalTravel(
      startFloorY,
      targetFloorY,
      targetFloor,
      playerMesh,
      camera,
      controller
    );

    // 7. Arrival at destination floor
    this.currentFloor = targetFloor;
    this.audio.playChime(targetFloor === 2);
    this.updateIndicatorText(
      targetFloor === 2 ? 'ARRIVED // LEVEL 2: FRONTEND' : 'ARRIVED // LEVEL 1: BACKEND',
      'WELCOME TO YOUR DESTINATION'
    );

    await this.delay(350);

    const toLandingDoors = targetFloor === 1
      ? { l: this.doorsF1_L, r: this.doorsF1_R }
      : { l: this.doorsF2_L, r: this.doorsF2_R };

    // 8. Open doors at destination floor
    await this.animateDoorPairs(
      [toLandingDoors, { l: this.cabinDoorL, r: this.cabinDoorR }],
      'open',
      0.85
    );

    this.showElevatorToast(
      targetFloor === 2
        ? 'Arrived at Floor 2: Frontend Engineering Department'
        : 'Arrived at Floor 1: Backend Infrastructure & Executive Suite'
    );

    // 9. Smoothly walk character forward out into the vestibule
    const exitTarget = new Vector3(this.vestibuleX, targetFloorY + 0.86, 0.0);
    await Promise.all([
      this.animateCharacterWalk(controller, exitTarget, -Math.PI / 2, 1.15),
      this.animateCameraTo(camera, exitTarget.add(new Vector3(0, 1.5, 0)), 3.2, 0.0, Math.PI / 2.7, 1.15),
    ]);

    controller.model.playAnim('idle');

    // 10. Restore camera collisions, re-attach mouse controls & re-enable player controls
    camera.checkCollisions = origCameraCheckCollisions;
    if (renderingCanvas) {
      camera.attachControl(renderingCanvas, true);
    }
    controller.setInElevator(false);
    controller.setControlsActive(true);
    this.isTransitioning = false;

    // 11. After 2.0s delay, close doors smoothly behind player
    setTimeout(() => {
      void this.animateDoorPairs(
        [toLandingDoors, { l: this.cabinDoorL, r: this.cabinDoorR }],
        'close',
        0.85
      );
    }, 2000);
  }

  /**
   * Animates one or more door pairs simultaneously with smooth cubic easing.
   */
  private animateDoorPairs(
    doorPairs: Array<{ l: Mesh; r: Mesh }>,
    action: 'open' | 'close',
    durationSec: number = 0.85
  ): Promise<void> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const durationMs = durationSec * 1000;

      const baseZL = -0.55;
      const baseZR = 0.55;
      const openZL = baseZL - this.doorSlideDist;
      const openZR = baseZR + this.doorSlideDist;

      const targetZL = action === 'open' ? openZL : baseZL;
      const targetZR = action === 'open' ? openZR : baseZR;

      const initialPositions = doorPairs.map((p) => ({
        lStart: p.l.position.z,
        rStart: p.r.position.z,
      }));

      this.audio.playDoorSound(action);

      const easeInOutCubic = (t: number) =>
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      const observer = this.scene.onBeforeRenderObservable.add(() => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(1.0, elapsed / durationMs);
        const eased = easeInOutCubic(progress);

        doorPairs.forEach((pair, idx) => {
          const { lStart, rStart } = initialPositions[idx];
          pair.l.position.z = lStart + (targetZL - lStart) * eased;
          pair.r.position.z = rStart + (targetZR - rStart) * eased;
        });

        if (progress >= 1.0) {
          this.scene.onBeforeRenderObservable.remove(observer);
          doorPairs.forEach((pair) => {
            pair.l.position.z = targetZL;
            pair.r.position.z = targetZR;
          });
          resolve();
        }
      });
    });
  }

  /**
   * Smoothly animates the character walking to targetPos while playing the walk animation.
   */
  private animateCharacterWalk(
    controller: CharacterController,
    targetPos: Vector3,
    facingAngle: number,
    durationSec: number
  ): Promise<void> {
    return new Promise((resolve) => {
      const playerMesh = controller.getMesh();
      const startPos = playerMesh.position.clone();
      const startAngle = playerMesh.rotation.y;

      let angleDiff = facingAngle - startAngle;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

      controller.model.playAnim('walk');

      const startTime = performance.now();
      const durationMs = durationSec * 1000;

      const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

      const observer = this.scene.onBeforeRenderObservable.add(() => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(1.0, elapsed / durationMs);
        const eased = easeInOutQuad(progress);

        playerMesh.position = Vector3.Lerp(startPos, targetPos, eased);
        playerMesh.rotation.y = startAngle + angleDiff * eased;

        controller.dispatchNetworkState();

        if (progress >= 1.0) {
          this.scene.onBeforeRenderObservable.remove(observer);
          playerMesh.position.copyFrom(targetPos);
          playerMesh.rotation.y = facingAngle;
          controller.dispatchNetworkState(true);
          resolve();
        }
      });
    });
  }

  /**
   * Smoothly turns character rotation in-place.
   */
  private animateCharacterTurn(
    controller: CharacterController,
    targetAngle: number,
    durationSec: number
  ): Promise<void> {
    return new Promise((resolve) => {
      const playerMesh = controller.getMesh();
      const startAngle = playerMesh.rotation.y;

      let angleDiff = targetAngle - startAngle;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

      const startTime = performance.now();
      const durationMs = durationSec * 1000;

      const observer = this.scene.onBeforeRenderObservable.add(() => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(1.0, elapsed / durationMs);
        const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        playerMesh.rotation.y = startAngle + angleDiff * eased;
        controller.dispatchNetworkState();

        if (progress >= 1.0) {
          this.scene.onBeforeRenderObservable.remove(observer);
          playerMesh.rotation.y = targetAngle;
          controller.dispatchNetworkState(true);
          resolve();
        }
      });
    });
  }

  /**
   * Smooth camera position, radius, alpha and beta transition.
   */
  private animateCameraTo(
    camera: ArcRotateCamera,
    targetLookAt: Vector3,
    targetRadius: number,
    targetAlpha: number,
    targetBeta: number,
    durationSec: number
  ): Promise<void> {
    return new Promise((resolve) => {
      const startLookAt = camera.target.clone();
      const startRadius = camera.radius;
      const startAlpha = camera.alpha;
      const startBeta = camera.beta;

      let alphaDiff = targetAlpha - startAlpha;
      while (alphaDiff < -Math.PI) alphaDiff += Math.PI * 2;
      while (alphaDiff > Math.PI) alphaDiff -= Math.PI * 2;

      const startTime = performance.now();
      const durationMs = durationSec * 1000;

      const easeInOutCubic = (t: number) =>
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      const observer = this.scene.onBeforeRenderObservable.add(() => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(1.0, elapsed / durationMs);
        const eased = easeInOutCubic(progress);

        camera.target = Vector3.Lerp(startLookAt, targetLookAt, eased);
        camera.radius = startRadius + (targetRadius - startRadius) * eased;
        camera.alpha = startAlpha + alphaDiff * eased;
        camera.beta = startBeta + (targetBeta - startBeta) * eased;

        if (progress >= 1.0) {
          this.scene.onBeforeRenderObservable.remove(observer);
          camera.target.copyFrom(targetLookAt);
          camera.radius = targetRadius;
          camera.alpha = targetAlpha;
          camera.beta = targetBeta;
          resolve();
        }
      });
    });
  }

  /**
   * Summons the empty elevator cabin to caller floor with closed doors.
   */
  private animateEmptyCabinTravel(
    startY: number,
    targetY: number,
    durationSec: number
  ): Promise<void> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const durationMs = durationSec * 1000;
      this.audio.startMotor(durationSec);

      const easeInOutCubic = (t: number) =>
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      const observer = this.scene.onBeforeRenderObservable.add(() => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(1.0, elapsed / durationMs);
        const eased = easeInOutCubic(progress);

        this.cabinRoot.position.y = startY + (targetY - startY) * eased;

        if (progress >= 1.0) {
          this.scene.onBeforeRenderObservable.remove(observer);
          this.cabinRoot.position.y = targetY;
          this.audio.stopMotor();
          resolve();
        }
      });
    });
  }

  /**
   * Smooth vertical elevator travel between floors with physical sensation & live telemetry.
   */
  private animateVerticalTravel(
    startY: number,
    targetY: number,
    toFloor: 1 | 2,
    playerMesh: Mesh,
    camera: ArcRotateCamera,
    controller: CharacterController
  ): Promise<void> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const durationMs = this.travelDurationSec * 1000;
      this.audio.startMotor(this.travelDurationSec);

      // Quintic ease-in-out: zero initial and final jerk
      const easeInOutQuint = (t: number) =>
        t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;

      const directionPrefix = toFloor === 2 ? '▲ ASCENDING ➔ FLOOR 2' : '▼ DESCENDING ➔ FLOOR 1';

      const observer = this.scene.onBeforeRenderObservable.add(() => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(1.0, elapsed / durationMs);
        const eased = easeInOutQuint(progress);

        const currentY = startY + (targetY - startY) * eased;

        // Subtle realistic mechanical micro-vibration during high-speed cruise
        const rumble = Math.sin(elapsed * 0.035) * 0.0025 * Math.sin(progress * Math.PI);

        // Synchronously move cabin, character capsule, and camera
        this.cabinRoot.position.y = currentY;
        playerMesh.position.y = currentY + 0.86 + rumble;
        camera.target.y = currentY + 1.35 + rumble;

        // Update live in-cabin overhead indicator with progress bar & elevation
        const currentMeters = Math.abs(currentY - startY).toFixed(1);
        const totalMeters = Math.abs(targetY - startY).toFixed(1);
        const telemetrySubtext = `ELEVATION ${currentMeters}m / ${totalMeters}m`;
        this.updateIndicatorText(directionPrefix, telemetrySubtext, progress);

        controller.dispatchNetworkState();

        if (progress >= 1.0) {
          this.scene.onBeforeRenderObservable.remove(observer);
          this.cabinRoot.position.y = targetY;
          playerMesh.position.y = targetY + 0.86;
          camera.target.y = targetY + 1.35;
          this.audio.stopMotor();
          controller.dispatchNetworkState(true);
          resolve();
        }
      });
    });
  }

  private showElevatorToast(text: string) {
    const existing = document.getElementById('elevator-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'elevator-toast';
    toast.style.position = 'fixed';
    toast.style.top = '36px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.padding = '12px 28px';
    toast.style.background = 'rgba(15, 23, 42, 0.94)';
    toast.style.backdropFilter = 'blur(12px)';
    toast.style.border = '1px solid rgba(56, 189, 248, 0.5)';
    toast.style.borderRadius = '9999px';
    toast.style.color = '#F8FAFC';
    toast.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    toast.style.fontSize = '14px';
    toast.style.fontWeight = '600';
    toast.style.letterSpacing = '0.04em';
    toast.style.boxShadow = '0 12px 36px rgba(0, 0, 0, 0.5), 0 0 20px rgba(56, 189, 248, 0.35)';
    toast.style.zIndex = '99999';
    toast.style.transition = 'opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
    toast.style.pointerEvents = 'none';
    toast.innerText = text;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(-10px)';
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((res) => setTimeout(res, ms));
  }

  public getCurrentFloor(): 1 | 2 {
    return this.currentFloor;
  }
}
