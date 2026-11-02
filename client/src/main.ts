import React from 'react';
import { createRoot } from 'react-dom/client';
import { Shell } from './shell/Shell';
import { registerEngineCallbacks, registerEngineInitializer, notifySit, notifyStand, registerSitCallback, registerStandCallback, registerStandAction } from './shell/engineBridge';
import { COLOR_SCHEMES } from './shell/appearanceCatalog';
import { useShellStore } from './shell/store';

// Expose store and engine objects for testing, screenshots, and automation
(window as any).__useShellStore = useShellStore;

// Mount the React shell immediately so the UI is always accessible
const rootEl = document.getElementById('shell-root');
if (rootEl) {
    const root = createRoot(rootEl);
    root.render(React.createElement(Shell));
}

// Handle deep link query params (?teacher=1, ?teacher=true, ?joinCode=...)
const searchParams = new URLSearchParams(window.location.search);
const isTeacherUrl = searchParams.get('teacher') === '1' || searchParams.get('teacher') === 'true';
const targetSession = searchParams.get('sessionId') || searchParams.get('joinCode') || 'DEMO01';

if (isTeacherUrl) {
    useShellStore.getState().enterTeacherDashboard(targetSession, localStorage.getItem('teacherToken') || '');
}

// Just-in-Time Babylon.js 3D engine initializer (deferred until post-login/simulation entry)
let engineInitialized = false;

(window as any).__initBabylonEngine = initBabylonEngine;

async function initBabylonEngine(): Promise<void> {
    if (engineInitialized) return;
    engineInitialized = true;

    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
    if (canvas) {
        canvas.style.display = 'block';
        requestAnimationFrame(() => {
            canvas.style.opacity = '1';
        });
    }

    try {
        const { Engine, Scene, Vector3, HemisphericLight, Color4, MeshBuilder, StandardMaterial, Color3, DynamicTexture, Mesh } = await import('@babylonjs/core');
        (window as any).BABYLON = { Engine, Scene, Vector3, HemisphericLight, Color4, MeshBuilder, StandardMaterial, Color3, DynamicTexture, Mesh };
        await import('@babylonjs/loaders');
        const { buildScene } = await import('./sceneBuilder');
        const { CharacterController } = await import('./characterController');

        if (!canvas) return;

        const engine = new Engine(canvas, true, {
            adaptToDeviceRatio: false, // Technique #10: Avoid unconstrained 2x/3x Retina rendering
        });
        // Cap devicePixelRatio to 1.25 for crisp text/textures with a ~60% reduction in fill-rate pixels
        const targetDpr = Math.min(window.devicePixelRatio || 1, 1.25);
        engine.setHardwareScalingLevel(1 / targetDpr);
        engine.disableUniformBuffers = true;
        engine.renderEvenInBackground = true;

        const scene = new Scene(engine);
        (window as any).__scene = scene;
        scene.clearColor = new Color4(0.08, 0.09, 0.12, 1);
        scene.collisionsEnabled = true;

        const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
        light.intensity = 1.0;

        const env = await buildScene(scene);
        const controller = new CharacterController(scene, canvas, env);
        await controller.init();

        scene.metadata = { ...scene.metadata, controller };
        (window as any).__controller = controller;
        (window as any).__setMouseSensitivity = (mult: number) => controller.setSensitivity(mult);

        // Technique #10: Dynamic Adaptive Resolution Supervisor
        let frameCount = 0;
        let lastFpsCheck = performance.now();
        scene.onAfterRenderObservable.add(() => {
            frameCount++;
            const now = performance.now();
            if (now - lastFpsCheck >= 2000) {
                const fps = (frameCount * 1000) / (now - lastFpsCheck);
                frameCount = 0;
                lastFpsCheck = now;
                const currentScaling = engine.getHardwareScalingLevel();
                if (fps < 32 && currentScaling < 1.6) {
                    // Under heavy load: reduce resolution dynamically to protect interactive framerate
                    engine.setHardwareScalingLevel(Math.min(1.6, currentScaling + 0.15));
                } else if (fps > 55 && currentScaling > 1 / targetDpr) {
                    // Solid 60 FPS: restore crisp scaling
                    engine.setHardwareScalingLevel(Math.max(1 / targetDpr, currentScaling - 0.05));
                }
            }
        });

        engine.runRenderLoop(() => {
            scene.render();
        });

        window.addEventListener("resize", () => {
            engine.resize();
        });

        // Wire up the engine bridge so the React shell can control the 3D scene
        registerEngineCallbacks(
            // Live preview from SCR-07
            (colorHex: string) => {
                controller.applyAppearance(colorHex);
            },
            // Transition to in-world state
            async (appearance: { colorScheme: string }) => {
                const uiOverlay = document.getElementById("uiOverlay");
                if (uiOverlay) {
                    uiOverlay.style.display = 'flex';
                }

                const scheme = COLOR_SCHEMES.find(c => c.id === appearance.colorScheme);
                if (scheme) {
                    controller.applyAppearance(scheme.hex);
                } else if (!appearance.colorScheme || appearance.colorScheme === 'default') {
                    controller.applyAppearance(null);
                }

                const joinResult = useShellStore.getState().joinResult;
                if (joinResult && joinResult.teamId) {
                    try {
                        const finalColorScheme = scheme?.hex || appearance.colorScheme;
                        const { RoomClient } = await import('./network/RoomClient');
                        const { RemotePlayerInterpolator } = await import('./RemotePlayerInterpolator');
                        const roomClient = new RoomClient(window.location.hostname === 'localhost' ? 'ws://localhost:3000' : `wss://${window.location.host}`);
                        const room = await roomClient.joinTeamRoom(joinResult.teamId, joinResult.sessionId, joinResult.token, finalColorScheme);
                        new RemotePlayerInterpolator(scene, room);
                        
                        useShellStore.getState().setRoom(room);
                        
                        controller.onNetworkMove = (payload) => {
                            room.send("move", payload);
                        };
                    } catch (e) {
                        console.error("Failed to connect to multiplayer room", e);
                    }
                }

                controller.setControlsActive(true);
            }
        );

        controller.onSit = (trigger) => {
            // Only open code editor workstation overlay if this is an engineering workstation desk
            if (trigger && !trigger.id.startsWith('sit_ws_') && !trigger.id.startsWith('sit_eng_')) {
                console.log(`[Interaction] Seated on lounge furniture (${trigger.id})`);
                return;
            }
            const jr = useShellStore.getState().joinResult;
            const teamId = jr?.teamId || sessionStorage.getItem('studentTeamId') || '99528558-6ca8-428b-846b-0ee162c11a4f';
            const token = jr?.token || sessionStorage.getItem('studentToken') || 'dev-token';

            const department = (trigger?.id.startsWith('sit_ws_fe_') || trigger?.id.includes('_fe_')) ? 'frontend' : 'backend';

            controller.setControlsActive(false);
            useShellStore.getState().openWorkstation(teamId, token, department);
            notifySit();
        };

        controller.onStand = () => {
            useShellStore.getState().closeWorkstation();
            notifyStand();
            controller.setControlsActive(true);
        };

        controller.onElevator = (trigger) => {
            if (env.elevatorManager) {
                env.elevatorManager.handleTrigger(trigger, controller);
            }
        };

        registerSitCallback(() => {});
        registerStandCallback(() => {});
        registerStandAction(() => {
            controller.standUp();
        });
    } catch (err: any) {
        console.warn('[SimOffice Engine] WebGL/Babylon init skipped or not supported:', err?.message || err);
        // In environments without WebGL, provide fallback bridge callbacks so React UI progresses
        registerEngineCallbacks(
            () => {},
            async (appearance) => {
                const joinResult = useShellStore.getState().joinResult;
                if (joinResult && joinResult.teamId) {
                    try {
                        const { RoomClient } = await import('./network/RoomClient');
                        const roomClient = new RoomClient(window.location.hostname === 'localhost' ? 'ws://localhost:3000' : `wss://${window.location.host}`);
                        const room = await roomClient.joinTeamRoom(joinResult.teamId, joinResult.sessionId, joinResult.token, appearance.colorScheme);
                        useShellStore.getState().setRoom(room);
                    } catch (e) {
                        console.error("Failed to connect to multiplayer room in fallback mode", e);
                    }
                }
            }
        );
    }
}

// Register with engine bridge so JoinScreen triggers this JIT
registerEngineInitializer(initBabylonEngine);

// If the page was loaded in a non-join/non-teacher screen, spin up immediately
const currentScreen = useShellStore.getState().screen;
if (currentScreen !== 'join' && currentScreen !== 'teacher-dashboard') {
    initBabylonEngine();
}
