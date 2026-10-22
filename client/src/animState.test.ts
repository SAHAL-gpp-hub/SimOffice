import { expect, test, describe } from 'vitest';
import type { MovementInput, PhysicsState } from './animState';
import { nextAnimState } from './animState';

describe('nextAnimState', () => {
  const defaultInput: MovementInput = { moveVector: { x: 0, z: 0 }, runHeld: false };
  const defaultPhysics: PhysicsState = { grounded: true, verticalVelocity: 0, timeSinceGrounded: 0 };

  test('idle -> walk when moving', () => {
    const next = nextAnimState('idle', { ...defaultInput, moveVector: { x: 1, z: 0 } }, defaultPhysics, null);
    expect(next).toBe('walk');
  });

  test('idle -> run when moving with runHeld', () => {
    const next = nextAnimState('idle', { moveVector: { x: 1, z: 0 }, runHeld: true }, defaultPhysics, null);
    expect(next).toBe('run');
  });

  test('walk -> idle when movement stops', () => {
    const next = nextAnimState('walk', defaultInput, defaultPhysics, null);
    expect(next).toBe('idle');
  });

  test('run -> walk when runHeld released but still moving', () => {
    const next = nextAnimState('run', { moveVector: { x: 1, z: 0 }, runHeld: false }, defaultPhysics, null);
    expect(next).toBe('walk');
  });

  test('falling when not grounded and velocity <= 0', () => {
    // timeSinceGrounded must exceed the fall-grace period (80 ms) to commit to 'fall'
    const next = nextAnimState('walk', defaultInput, { grounded: false, verticalVelocity: -2, timeSinceGrounded: 0.1 }, null);
    expect(next).toBe('fall');
  });

  test('jumping when not grounded and velocity > 0', () => {
    const next = nextAnimState('walk', defaultInput, { grounded: false, verticalVelocity: 5, timeSinceGrounded: 0.1 }, null);
    expect(next).toBe('jumpUp');
  });

  test('stays in walk during the fall-grace window (timeSinceGrounded < 80 ms)', () => {
    // A single-frame ground-ray miss: airborne for only 20 ms — should NOT switch to fall
    const next = nextAnimState('walk', defaultInput, { grounded: false, verticalVelocity: -0.1, timeSinceGrounded: 0.02 }, null);
    expect(next).toBe('walk');
  });

  test('sit action interrupts walk', () => {
    const next = nextAnimState('walk', { moveVector: { x: 1, z: 0 }, runHeld: false }, defaultPhysics, { type: 'SIT' });
    expect(next).toBe('sitDown');
  });

  test('stand action transitions to standUp', () => {
    const next = nextAnimState('sit', defaultInput, defaultPhysics, { type: 'STAND' });
    expect(next).toBe('standUp');
  });

  test('sit state ignores movement input', () => {
    const next = nextAnimState('sit', { moveVector: { x: 1, z: 0 }, runHeld: false }, defaultPhysics, null);
    expect(next).toBe('sit');
  });

  test('sitDown state ignores movement input', () => {
    const next = nextAnimState('sitDown', { moveVector: { x: 1, z: 0 }, runHeld: false }, defaultPhysics, null);
    expect(next).toBe('sitDown');
  });

  test('standUp state ignores movement input', () => {
    const next = nextAnimState('standUp', { moveVector: { x: 1, z: 0 }, runHeld: false }, defaultPhysics, null);
    expect(next).toBe('standUp');
  });

  test('land state ignores movement input', () => {
    const next = nextAnimState('land', { moveVector: { x: 1, z: 0 }, runHeld: false }, defaultPhysics, null);
    expect(next).toBe('land');
  });

  test('emote transitions from idle', () => {
    const next = nextAnimState('idle', defaultInput, defaultPhysics, { type: 'EMOTE', emote: 'wave' });
    expect(next).toBe('emote_wave');
  });

  test('emote state ignores movement input', () => {
    const next = nextAnimState('emote_wave', { moveVector: { x: 1, z: 0 }, runHeld: false }, defaultPhysics, null);
    expect(next).toBe('emote_wave');
  });

  test('land action transitions to land', () => {
    const next = nextAnimState('fall', defaultInput, defaultPhysics, { type: 'LAND' });
    expect(next).toBe('land');
  });

  test('jump start action transitions to jump', () => {
    const next = nextAnimState('idle', defaultInput, defaultPhysics, { type: 'JUMP_START' });
    expect(next).toBe('jump');
  });
});
