export type AnimState = 
  | 'idle' 
  | 'walk' 
  | 'run' 
  | 'jump' 
  | 'jumpUp'
  | 'fall' 
  | 'land' 
  | 'sitDown'
  | 'sit' 
  | 'standUp' 
  | 'emote_wave' 
  | 'emote_thumbsUp' 
  | 'emote_facepalm' 
  | 'emote_thinking';

export type ActionEvent = 
  | { type: 'SIT' }
  | { type: 'STAND' }
  | { type: 'LAND' }
  | { type: 'JUMP_START' }
  | { type: 'EMOTE', emote: 'wave' | 'thumbsUp' | 'facepalm' | 'thinking' };

export interface MovementInput {
  moveVector: { x: number, z: number };
  runHeld: boolean;
}

export interface PhysicsState {
  grounded: boolean;
  verticalVelocity: number;
  // How long (seconds) the character has been continuously off the ground.
  // Used to add a short grace period before committing to the 'fall' state so
  // a single-frame ground-ray miss (micro-bump, tile seam) doesn't flicker
  // the anim state and restart the walk clip from frame 0.
  timeSinceGrounded: number;
}

export function nextAnimState(
  current: AnimState,
  input: MovementInput,
  physics: PhysicsState,
  action: ActionEvent | null,
): AnimState {
  // Explicit actions take priority over ambient movement — sitting down
  // interrupts a walk-cycle immediately, not after it finishes.
  if (action) {
    switch (action.type) {
      case 'SIT': return 'sitDown';
      case 'STAND': return 'standUp'; // caller advances standUp -> idle after its fixed duration
      case 'LAND': return 'land';
      case 'JUMP_START': return 'jump';
      case 'EMOTE':
        // Queuing is handled at the controller/input layer, not in the state machine.
        if (current.startsWith('emote_')) return current;
        return `emote_${action.emote}` as AnimState;
    }
  }

  // Held states aren't overridden by ambient movement input each tick — a
  // seated character doesn't fall back to 'idle' from a moment of residual
  // input buffering.
  if (current === 'sit' || current === 'sitDown' || current.startsWith('emote_') || current === 'land' || current === 'standUp') return current;

  if (current === 'jump') {
    if (!physics.grounded) return physics.verticalVelocity > 0 ? 'jumpUp' : 'fall';
    return 'idle';
  }

  // Jump inputs are consumed by the physics layer, which updates verticalVelocity before calling nextAnimState.
  if (!physics.grounded) {
    // Grace period: don't commit to 'fall' for the first 80 ms of being
    // airborne while not jumping. This swallows single-frame ground-ray
    // misses on bumpy geometry that would otherwise flicker walk→fall→walk
    // and restart the walk animation from frame 0 (the "dragged" snap).
    const FALL_GRACE = 0.08;
    if (physics.timeSinceGrounded < FALL_GRACE && physics.verticalVelocity <= 0) {
      // Stay in whatever loco/idle state we're currently in.
      return current;
    }
    return physics.verticalVelocity > 0 ? 'jumpUp' : 'fall';
  }

  const moving = input.moveVector.x !== 0 || input.moveVector.z !== 0;
  if (!moving) return 'idle';
  return input.runHeld ? 'run' : 'walk';
}
