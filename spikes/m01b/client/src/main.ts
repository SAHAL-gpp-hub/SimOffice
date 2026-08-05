import * as BABYLON from "babylonjs";
import * as Colyseus from "colyseus.js";

// DOM Elements
const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const fpsDisplay = document.getElementById("fps") as HTMLElement;
const cameraStatus = document.getElementById("cameraStatus") as HTMLElement;

const connStatus = document.getElementById("connStatus") as HTMLElement;

// Colyseus Client
const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const client = new Colyseus.Client(`${protocol}//${window.location.host}`);
let room: Colyseus.Room | null = null;

// Game State
const players: { [sessionId: string]: BABYLON.Mesh } = {};
const interpolationBuffers: { [sessionId: string]: { time: number, x: number, y: number, z: number, yaw: number, animState: string }[] } = {};

// Engine & Scene
const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);

// Initial Camera (Fallback so scene renders before connection)
let activeCamera: BABYLON.TargetCamera = new BABYLON.FreeCamera("fallbackCamera", new BABYLON.Vector3(0, 5, -10), scene);
activeCamera.setTarget(BABYLON.Vector3.Zero());
activeCamera.attachControl(canvas, true);

// Physics/Movement Config (Kinematic)
const GRAVITY = -15; // m/s^2
const JUMP_VELOCITY = 6; // m/s
const WALK_SPEED = 3.5; // m/s
const RUN_SPEED = 6.0; // m/s
let verticalVelocity = 0;
let isGrounded = false;

// Input State
const inputMap: { [key: string]: boolean } = {};
scene.onKeyboardObservable.add((kbInfo) => {
    switch (kbInfo.type) {
        case BABYLON.KeyboardEventTypes.KEYDOWN:
            inputMap[kbInfo.event.key.toLowerCase()] = true;
            break;
        case BABYLON.KeyboardEventTypes.KEYUP:
            inputMap[kbInfo.event.key.toLowerCase()] = false;
            break;
    }
});

const MOUSE_SENSITIVITY = 0.005;

// Pointer Lock and Aiming
document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement === canvas) {
        // Locked
    } else {
        // Unlocked (e.g., user pressed ESC)
        // Babylon handles this gracefully, but we can reset any UI state here if needed
    }
});

document.addEventListener("pointerlockerror", () => {
    console.error("Pointer lock failed.");
});

scene.onPointerObservable.add((pointerInfo) => {
    if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
        canvas.focus();
        if (document.pointerLockElement !== canvas) {
            canvas.requestPointerLock();
        }
    } else if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERMOVE) {
        if (document.pointerLockElement === canvas && activeCamera instanceof BABYLON.ArcRotateCamera) {
            const evt = pointerInfo.event as PointerEvent;
            
            // Mouse sensitivity
            activeCamera.alpha -= evt.movementX * MOUSE_SENSITIVITY;
            activeCamera.beta -= evt.movementY * MOUSE_SENSITIVITY;
        }
    }
});

// Create basic environment
function createEnvironment() {
    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.7;

    const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 50, height: 50 }, scene);
    ground.checkCollisions = true; // Important for camera collision

    const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
    groundMat.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    ground.material = groundMat;

    // Create walls for camera collision testing
    const wall1 = BABYLON.MeshBuilder.CreateBox("wall1", { width: 10, height: 5, depth: 1 }, scene);
    wall1.position = new BABYLON.Vector3(0, 2.5, 5);
    wall1.checkCollisions = true;

    const wall2 = BABYLON.MeshBuilder.CreateBox("wall2", { width: 1, height: 5, depth: 10 }, scene);
    wall2.position = new BABYLON.Vector3(5, 2.5, 0);
    wall2.checkCollisions = true;
}

// Create a player mesh (capsule primitive)
function createPlayerMesh(id: string, color: BABYLON.Color3): BABYLON.Mesh {
    const mesh = BABYLON.MeshBuilder.CreateCapsule("player_" + id, { radius: 0.4, height: 1.8 }, scene);
    mesh.position.y = 0.9;
    
    const mat = new BABYLON.StandardMaterial("mat_" + id, scene);
    mat.diffuseColor = color;
    mesh.material = mat;

    // Add a simple "nose" to show direction
    const nose = BABYLON.MeshBuilder.CreateBox("nose", { size: 0.2 }, scene);
    nose.parent = mesh;
    nose.position = new BABYLON.Vector3(0, 0.5, 0.4);

    return mesh;
}

async function connect() {
    try {
        room = await client.joinOrCreate("office");
        console.log("Joined room:", room.roomId);
        connStatus.innerText = "Connected!";
        connStatus.style.color = "#00ff00";

        room.state.players.onAdd((player: any, sessionId: string) => {
            console.log("Player joined:", sessionId);
            const isMe = (sessionId === room?.sessionId);
            const color = isMe ? new BABYLON.Color3(0.2, 0.8, 0.2) : new BABYLON.Color3(0.8, 0.2, 0.2);
            const mesh = createPlayerMesh(sessionId, color);
            mesh.position.set(player.x, player.y, player.z);
            players[sessionId] = mesh;
            interpolationBuffers[sessionId] = [];

            if (isMe) {
                setupCamera(mesh);
            }

            player.onChange(() => {
                if (!isMe) {
                    interpolationBuffers[sessionId].push({
                        time: Date.now(),
                        x: player.x,
                        y: player.y,
                        z: player.z,
                        yaw: player.yaw,
                        animState: player.animState
                    });
                }
            });
        });

        room.state.players.onRemove((_player: any, sessionId: string) => {
            if (players[sessionId]) {
                players[sessionId].dispose();
                delete players[sessionId];
                delete interpolationBuffers[sessionId];
            }
        });

    } catch (e) {
        console.error("Colyseus connection error", e);
        connStatus.innerText = "Connection Failed. Check console.";
        connStatus.style.color = "#ff0000";
    }
}

function setupCamera(targetMesh: BABYLON.Mesh) {
    // Detach initial fallback camera
    activeCamera.detachControl();
    
    // GDD §4: Third-person spring-arm follow camera
    const camera = new BABYLON.ArcRotateCamera(
        "camera",
        -Math.PI / 2, // alpha (rotation around Y axis)
        Math.PI / 3,  // beta (pitch)
        4.5,          // radius (follow distance)
        targetMesh.position, // target
        scene
    );

    // We DO NOT attachControl here because we are manually driving alpha/beta via pointer lock
    // camera.attachControl(canvas, true);
    
    // Limits
    camera.lowerRadiusLimit = 1.0;
    camera.upperRadiusLimit = 8.0;
    camera.lowerBetaLimit = 0.1;
    camera.upperBetaLimit = Math.PI - 0.1;
    camera.wheelPrecision = 50; // although GDD says no user zoom, keep basic for dev

    // Set height offset removed to ensure capsule stays centered

    // Camera Collision (Spring Arm logic in Babylon)
    camera.checkCollisions = true;
    camera.collisionRadius = new BABYLON.Vector3(0.2, 0.2, 0.2);
    
    activeCamera = camera;
    scene.activeCamera = camera;

    // We manually update target position to follow the player smoothly
    scene.onBeforeRenderObservable.add(() => {
        camera.setTarget(targetMesh.position.add(new BABYLON.Vector3(0, 1.5, 0)));
        
        // Log camera distance to verify spring arm collision
        const actualDistance = BABYLON.Vector3.Distance(camera.position, targetMesh.position);
        if (actualDistance < 4.4) {
             cameraStatus.innerText = `Camera: Colliding (Dist: ${actualDistance.toFixed(2)}m)`;
        } else {
             cameraStatus.innerText = `Camera: OK (Dist: ${actualDistance.toFixed(2)}m)`;
        }
    });
}

// Main game loop
let lastNetworkSend = 0;
const NETWORK_TICK_MS = 1000 / 15; // 15Hz

scene.onBeforeRenderObservable.add(() => {
    const deltaTime = engine.getDeltaTime() / 1000;
    
    if (room && players[room.sessionId] && activeCamera) {
        const myPlayer = players[room.sessionId];
        
        // 1. Check ground via raycast (simple kinematic physics)
        const ray = new BABYLON.Ray(myPlayer.position.add(new BABYLON.Vector3(0, 0.1, 0)), new BABYLON.Vector3(0, -1, 0), 1.1);
        const hit = scene.pickWithRay(ray, (mesh) => mesh.name === "ground" || mesh.name.startsWith("wall"));
        
        isGrounded = hit?.hit ?? false;

        // Apply gravity & jump
        if (isGrounded && verticalVelocity <= 0) {
            verticalVelocity = 0;
            // Snap to ground
            if (hit && hit.pickedPoint) {
                myPlayer.position.y = hit.pickedPoint.y + 0.9;
            }
            if (inputMap[" "]) {
                verticalVelocity = JUMP_VELOCITY;
                isGrounded = false;
            }
        } else {
            verticalVelocity += GRAVITY * deltaTime;
        }

        myPlayer.position.y += verticalVelocity * deltaTime;

        // 2. WASD Movement (Camera relative)
        let forward = BABYLON.Vector3.Forward();
        let right = BABYLON.Vector3.Right();
        
        if (activeCamera instanceof BABYLON.ArcRotateCamera) {
            forward = activeCamera.getDirection(BABYLON.Vector3.Forward());
            right = activeCamera.getDirection(BABYLON.Vector3.Right());
        }
        
        forward.y = 0;
        forward.normalize();
        
        right.y = 0;
        right.normalize();

        let moveVector = new BABYLON.Vector3(0, 0, 0);
        
        if (inputMap["w"]) moveVector.addInPlace(forward);
        if (inputMap["s"]) moveVector.subtractInPlace(forward);
        if (inputMap["d"]) moveVector.addInPlace(right);
        if (inputMap["a"]) moveVector.subtractInPlace(right);

        let isRunning = inputMap["shift"];
        let speed = isRunning ? RUN_SPEED : WALK_SPEED;
        let animState = "idle";

        if (moveVector.lengthSquared() > 0) {
            moveVector.normalize();
            myPlayer.position.addInPlace(moveVector.scale(speed * deltaTime));
            animState = isRunning ? "run" : "walk";
        }
        
        // Always rotate player to face the camera's forward direction (Minecraft style)
        if (activeCamera instanceof BABYLON.ArcRotateCamera) {
            myPlayer.rotation.y = -activeCamera.alpha - (Math.PI / 2);
        }

        if (!isGrounded) animState = "jump";

        // 3. Network Send (15Hz)
        const now = Date.now();
        if (now - lastNetworkSend > NETWORK_TICK_MS) {
            room.send("movement", {
                x: myPlayer.position.x,
                y: myPlayer.position.y,
                z: myPlayer.position.z,
                yaw: myPlayer.rotation.y,
                animState: animState
            });
            lastNetworkSend = now;
        }
    }

    // 4. Remote Player Interpolation (100ms buffer)
    const renderTime = Date.now() - 100;
    
    for (const sessionId in interpolationBuffers) {
        const buffer = interpolationBuffers[sessionId];
        if (buffer.length === 0) continue;

        // Drop older packets
        while (buffer.length > 2 && buffer[1].time <= renderTime) {
            buffer.shift();
        }

        const playerMesh = players[sessionId];
        if (!playerMesh) continue;

        if (buffer.length >= 2 && buffer[0].time <= renderTime && renderTime <= buffer[1].time) {
            const p0 = buffer[0];
            const p1 = buffer[1];
            const t = (renderTime - p0.time) / (p1.time - p0.time);

            playerMesh.position.x = BABYLON.Scalar.Lerp(p0.x, p1.x, t);
            playerMesh.position.y = BABYLON.Scalar.Lerp(p0.y, p1.y, t);
            playerMesh.position.z = BABYLON.Scalar.Lerp(p0.z, p1.z, t);

            if (p0.yaw !== undefined && p1.yaw !== undefined) {
                // Shortest path angle lerp
                let angleDiff = p1.yaw - p0.yaw;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                playerMesh.rotation.y = p0.yaw + (angleDiff * t);
            }

        } else if (buffer.length === 1 && renderTime > buffer[0].time) {
            // Snap to latest if we don't have future data
            const latest = buffer[0];
            playerMesh.position.set(latest.x, latest.y, latest.z);
        }
    }
});

// Init
createEnvironment();
connect();

engine.runRenderLoop(() => {
    scene.render();
    fpsDisplay.innerText = engine.getFps().toFixed(0);
});

window.addEventListener("resize", () => {
    engine.resize();
});
