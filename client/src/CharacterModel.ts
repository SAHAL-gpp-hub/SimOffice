import { Scene, Mesh, TransformNode, SceneLoader, AnimationGroup, StandardMaterial, Color3, Vector3 } from '@babylonjs/core';
import type { AnimState } from './animState';

const CAPSULE_HEIGHT = 1.8;
const CAPSULE_HALF_HEIGHT = CAPSULE_HEIGHT * 0.5;

export class CharacterModel {
    private scene: Scene;
    private parentMesh: Mesh;
    
    public visualWrapper!: TransformNode;
    public animGroups: Map<AnimState, AnimationGroup> = new Map();
    public currentAnim: AnimationGroup | null = null;
    public animState: AnimState = 'idle';

    // Track hips as a TransformNode (NOT a Bone).
    // Bone.position is skeleton-local; TransformNode.position matches the anim keyframe space.
    private hipsNode: TransformNode | null = null;
    private hipsRestX = 0;
    private hipsRestY = 0;
    private hipsRestZ = 0;

    // Keep animation GLB roots alive after loading.
    // CRITICAL: do NOT dispose them. Retargeted AnimationGroups hold live
    // references to TransformNodes inside these hierarchies — disposing them
    // silently breaks all animations and makes the character invisible.
    private animRoots: TransformNode[] = [];
    
    private savedLocoFrames: Map<AnimState, number> = new Map();

    constructor(scene: Scene, parentMesh: Mesh) {
        this.scene = scene;
        this.parentMesh = parentMesh;
    }

    public async loadAssets(): Promise<void> {
        try {
            const baseRes = await SceneLoader.ImportMeshAsync('', '/assets/character/', 'Idle.glb', this.scene);
            // meshes[0] is BabylonJS synthetic __root__ container (not the Armature node)
            const visualRoot = baseRes.meshes[0];
            
            // Wrapper lets us rotate the character without disturbing the GLB root's
            // internal GLTF-to-BJS coordinate-system quaternions.
            this.visualWrapper = new TransformNode('visualWrapper', this.scene);
            // IMPORTANT: Use .parent (direct) NOT .setParent() for the wrapper.
            // setParent() preserves world position by adjusting local transforms,
            // which would make the wrapper stay at world origin instead of following the capsule.
            this.visualWrapper.parent = this.parentMesh;
            this.visualWrapper.position = Vector3.Zero(); 
            this.visualWrapper.scaling = Vector3.One();
            this.visualWrapper.rotation = new Vector3(0, 0, 0);

            // CRITICAL FIX: Use .parent (direct) instead of .setParent() here too.
            // .setParent() adjusts visualRoot's local position to preserve its current
            // WORLD position (near origin). This bakes a huge local offset (~28m) that
            // permanently cancels out the capsule's world position — the character is
            // always rendered at world (0,0,0) while the camera follows the capsule.
            // Using .parent directly keeps the local transform as the GLB exported it
            // (position ≈ 0), so the character correctly sits at the wrapper's location.
            visualRoot.parent = this.visualWrapper;
            // Zero out any GLTF coordinate-conversion position artifact on the root node.
            // Rotation/quaternion (the actual coord-system conversion) is left intact.
            visualRoot.position = Vector3.Zero();

            // Mark all child meshes always-active so BabylonJS frustum culling
            // on the invisible capsule parent never hides visible character parts.
            visualRoot.getChildMeshes(false).forEach(m => {
                m.alwaysSelectAsActiveMesh = true;
            });

            this.alignFeetToCapsule(this.visualWrapper, visualRoot);
            
            const normalizeName = (name: string) =>
                name
                    .split(':')
                    .pop()!
                    .replace(/^mixamorig/i, '')
                    .replace(/[^a-zA-Z0-9]/g, '')
                    .toLowerCase();

            // Build target map from BASE character's TransformNodes ONLY (no Bones).
            // Using Bones would put keyframe positions into skeleton-local space,
            // which doesn't match the scene-graph space the Mixamo GLBs expect.
            const baseTargets = new Map<string, TransformNode>();
            const registerNode = (node: any) => {
                if (node && node.name) baseTargets.set(normalizeName(node.name), node);
            };

            registerNode(visualRoot);
            visualRoot.getDescendants(false).forEach((node: any) => {
                if (node) registerNode(node);
            });

            // Find the Hips TransformNode for root-motion locking.
            this.hipsNode = baseTargets.get('hips') ?? null;
            if (this.hipsNode) {
                // Capture rest position after the first animation frame settles.
                this.scene.onAfterAnimationsObservable.addOnce(() => {
                    if (this.hipsNode) {
                        this.hipsRestX = this.hipsNode.position.x;
                        this.hipsRestY = this.hipsNode.position.y;
                        this.hipsRestZ = this.hipsNode.position.z;
                    }
                    // Install per-frame root-motion cancellation.
                    this.scene.onAfterAnimationsObservable.add(() => {
                        if (!this.hipsNode) return;
                        if (this.animState === 'sitDown' || this.animState === 'sit' || this.animState === 'standUp') return;
                        
                        // Lock XZ drift from baked root motion in walk/run clips
                        this.hipsNode.position.x = this.hipsRestX;
                        this.hipsNode.position.z = this.hipsRestZ;

                        // Allow small vertical bob (jump/land) but clamp runaway values.
                        const MAX_HIP_BOB = 0.3; // metres
                        const y = this.hipsNode.position.y;
                        if (y > this.hipsRestY + MAX_HIP_BOB) this.hipsNode.position.y = this.hipsRestY + MAX_HIP_BOB;
                        else if (y < this.hipsRestY - MAX_HIP_BOB) this.hipsNode.position.y = this.hipsRestY - MAX_HIP_BOB;
                    });
                });
            } else {
                console.warn('[rootMotion] Hips node not found — walk/run may drift.');
            }

            // Set up Idle animation from the base GLB
            if (baseRes.animationGroups.length > 0) {
                const idleAg = baseRes.animationGroups[0];
                idleAg.name = 'idle';
                idleAg.stop();
                idleAg.enableBlending = true;
                idleAg.blendingSpeed = 0.1; 
                this.animGroups.set('idle', idleAg);
            }

            const animFiles: { file: string, state: AnimState }[] = [
                { file: 'Walking.glb',           state: 'walk'    },
                { file: 'Running.glb',            state: 'run'     },
                { file: 'Jump.glb',               state: 'jump'    },
                { file: 'Jumping Up.glb',         state: 'jumpUp'  },
                { file: 'Falling.glb',            state: 'fall'    },
                { file: 'Falling To Landing.glb', state: 'land'    },
                { file: 'Sitting.glb',            state: 'sit'     },
                { file: 'Stand To Sit.glb',       state: 'sitDown' },
                { file: 'Sit To Stand.glb',       state: 'standUp' },
            ];

            for (const item of animFiles) {
                try {
                    const res = await SceneLoader.ImportMeshAsync('', '/assets/character/', item.file, this.scene);
                    const animRoot = res.meshes[0] as unknown as TransformNode;

                    // Hide duplicate geometry but keep nodes alive for the AnimationGroup.
                    console.log('[CharacterModel] anim GLB ' + item.state + ' meshes:', res.meshes.map(m => m.name + '(enabled=' + m.isEnabled() + ')'));
                    res.meshes.forEach(m => {
                        m.isVisible = false;
                        // NOTE: do NOT call setEnabled(false) — it cascades to children
                        // and could interfere with scene nodes if the hierarchy overlaps.
                    });
                    this.animRoots.push(animRoot);

                    if (res.animationGroups.length > 0) {
                        const ag = res.animationGroups[0];
                        ag.name = item.state;
                        ag.stop();
                        ag.enableBlending = true;
                        
                        const isLoco = item.state === 'walk' || item.state === 'run';
                        ag.blendingSpeed = isLoco ? 0.25 : 0.05;

                        // Retarget: swap each animation target from the anim-GLB node
                        // to the matching node on the BASE character.
                        let matched = 0;
                        ag.targetedAnimations.forEach((ta: any) => {
                            if (ta.target && ta.target.name) {
                                const sourceName = normalizeName(ta.target.name);
                                const newTarget = baseTargets.get(sourceName);
                                if (newTarget) {
                                    ta.target = newTarget;
                                    matched++;
                                }
                            }
                        });

                        const total = ag.targetedAnimations.length;
                        const pct = total > 0 ? Math.round((matched / total) * 100) : 0;
                        if (pct < 80) {
                            console.warn('[retarget] ' + item.state + ': ' + matched + '/' + total + ' nodes matched (' + pct + '%)');
                        }
                        this.animGroups.set(item.state, ag);
                    }
                } catch (e) {
                    console.warn('Failed to load anim:', item.file, e);
                }
            }
        } catch (e) {
            console.error('Failed to load base character:', e);
        }
        this.playAnim('idle');
    }

    /**
     * Position the visualWrapper so the character feet sit at the bottom of
     * the physics capsule. The GLB Armature already bakes scale=0.01 (cm to m),
     * so bounding boxes are already in metres — no extra scaling needed.
     */
    private alignFeetToCapsule(wrapper: TransformNode, visualRoot: any) {
        const meshes = visualRoot.getChildMeshes ? visualRoot.getChildMeshes(false) : [];
        if (!meshes.length) {
            wrapper.position.y = -CAPSULE_HALF_HEIGHT;
            return;
        }

        // Force world-matrix propagation so bounding boxes are valid
        wrapper.computeWorldMatrix(true);
        meshes.forEach((m: any) => m.computeWorldMatrix(true));

        let minY = Number.POSITIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        for (const mesh of meshes) {
            const b = mesh.getBoundingInfo().boundingBox;
            if (b.minimumWorld.y < minY) minY = b.minimumWorld.y;
            if (b.maximumWorld.y > maxY) maxY = b.maximumWorld.y;
        }

        if (!Number.isFinite(minY)) {
            wrapper.position.y = -CAPSULE_HALF_HEIGHT;
            return;
        }

        // Shift wrapper so the character's lowest point lands at capsule bottom.
        // wrapper.position is local to parentMesh, so this is a local-space offset.
        const capsuleBottomWorld = this.parentMesh.position.y - CAPSULE_HALF_HEIGHT;
        const shift = capsuleBottomWorld - minY;
        wrapper.position.y = shift;
    }

    public playAnim(state: AnimState) {
        const ag = this.animGroups.get(state);
        if (!ag) return;

        if (this.animState === state && this.currentAnim === ag && ag.isPlaying) return;

        if (this.currentAnim && (this.animState === 'walk' || this.animState === 'run')) {
            const frame = this.currentAnim.animatables?.[0]?.masterFrame ?? -1;
            if (frame >= 0) this.savedLocoFrames.set(this.animState, frame);
        }

        this.animState = state;
        if (this.currentAnim) this.currentAnim.stop();
        
        const loop = !['jump', 'sitDown', 'land', 'standUp'].includes(state);
        ag.play(loop);

        if (state === 'walk' || state === 'run') {
            const saved = this.savedLocoFrames.get(state);
            if (saved !== undefined) ag.goToFrame(saved);
        }

        this.currentAnim = ag;

        if (!loop) {
            ag.onAnimationEndObservable.addOnce(() => {
                if (this.animState !== state) return;
                if (state === 'sitDown') this.playAnim('sit');
                else if (state === 'standUp' || state === 'land') this.playAnim('idle');
                else if (state === 'jump') this.playAnim('idle'); 
            });
        }
    }

    public applyAppearance(hex: string) {
        if (!this.visualWrapper) return;
        
        const meshes = this.visualWrapper.getChildMeshes(false);
        for (const m of meshes) {
            if (m.name.toLowerCase().includes('primitive')) {
                let mat = m.material as any;
                if (!mat || mat.name !== 'customAppearance') {
                    mat = new StandardMaterial('customAppearance', this.scene);
                    m.material = mat;
                }
                mat.diffuseColor = Color3.FromHexString(hex);
            }
        }
    }

    public dispose() {
        if (this.visualWrapper) {
            this.visualWrapper.dispose();
        }
        for (const ag of this.animGroups.values()) {
            ag.dispose();
        }
        // AnimationGroups disposed first — now safe to dispose the anim GLB roots
        for (const root of this.animRoots) {
            root.dispose();
        }
    }
}
