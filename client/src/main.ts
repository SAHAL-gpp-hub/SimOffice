import React from 'react';
import { createRoot } from 'react-dom/client';
import { Shell } from './shell/Shell';
import { registerEngineCallbacks, registerEngineInitializer, notifySit, notifyStand, registerSitCallback, registerStandCallback } from './shell/engineBridge';
import { COLOR_SCHEMES } from './shell/appearanceCatalog';
import { useShellStore } from './shell/store';

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
        const { Engine, Scene, Vector3, HemisphericLight, Color4 } = await import('@babylonjs/core');
        await import('@babylonjs/loaders');
        const { buildScene } = await import('./sceneBuilder');
        const { CharacterController } = await import('./characterController');

        if (!canvas) return;

        const engine = new Engine(canvas, true);

        const scene = new Scene(engine);
        scene.clearColor = new Color4(0.08, 0.09, 0.12, 1);
        scene.collisionsEnabled = true;

        const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
        light.intensity = 1.0;

        const env = await buildScene(scene);
        const controller = new CharacterController(scene, canvas, env);
        await controller.init();

        scene.metadata = { ...scene.metadata, controller };

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

        controller.onSit = () => {
            const jr = useShellStore.getState().joinResult;
            if (!jr?.teamId || !jr?.token) {
                console.warn('[WorkstationOverlay] onSit fired before joinResult — ignoring');
                return;
            }
            controller.setControlsActive(false);
            useShellStore.getState().openWorkstation(jr.teamId, jr.token);
            notifySit();
        };

        controller.onStand = () => {
            useShellStore.getState().closeWorkstation();
            notifyStand();
            controller.setControlsActive(true);
        };

        registerSitCallback(() => {});
        registerStandCallback(() => {});
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
