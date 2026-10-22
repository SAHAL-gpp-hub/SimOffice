/**
 * Engine bridge — thin façade between the React shell and the Babylon.js engine.
 *
 * The shell and the engine run in the same JS context but are deliberately
 * decoupled. The shell calls these functions; the engine registers callbacks
 * during init. This avoids importing Babylon types into React components.
 *
 * Callbacks registered here:
 *   - previewCallback     : live colour preview during SCR-07 (character creation)
 *   - enterWorldCallback  : transition from SCR-07 to in-world
 *   - sitCallback         : player sat at a workstation desk (SCR-14 opens)
 *   - standCallback       : player stood up from desk (SCR-14 closes)
 */

type PreviewCallback = (colorHex: string) => void;
type EnterWorldCallback = (appearance: { colorScheme: string }) => void;
type CutsceneCallback = (onComplete: () => void, onFloorTick?: (floor: number) => void) => void;
type ScannerCallback = (state: 'idle' | 'scanning' | 'granted' | 'denied') => void;
type SkipCallback = (onComplete?: () => void) => void;
type SitCallback = () => void;
type StandCallback = () => void;
type EngineInitializer = () => Promise<void>;

let previewCallback: PreviewCallback | null = null;
let enterWorldCallback: EnterWorldCallback | null = null;
let cutsceneCallback: CutsceneCallback | null = null;
let scannerCallback: ScannerCallback | null = null;
let skipCallback: SkipCallback | null = null;
let sitCallback: SitCallback | null = null;
let standCallback: StandCallback | null = null;

let engineInitializer: EngineInitializer | null = null;
let engineInitPromise: Promise<void> | null = null;

/**
 * Register the async function that boots Babylon.js on demand.
 */
export function registerEngineInitializer(fn: EngineInitializer): void {
  engineInitializer = fn;
}

/**
 * Trigger Babylon.js engine boot if not already initialized.
 * Returns a promise that resolves once the engine and scene are ready.
 */
export function ensureEngineInitialized(): Promise<void> {
  if (engineInitPromise) return engineInitPromise;
  if (engineInitializer) {
    engineInitPromise = engineInitializer();
    return engineInitPromise;
  }
  return Promise.resolve();
}

/**
 * Called from main.ts once the Babylon scene and character mesh are ready.
 * Registers the functions the shell will call to drive the engine.
 */
export function registerEngineCallbacks(
  onPreview: PreviewCallback,
  onEnterWorld: EnterWorldCallback,
  onCutscene?: CutsceneCallback,
  onScanner?: ScannerCallback,
  onSkip?: SkipCallback,
): void {
  previewCallback = onPreview;
  enterWorldCallback = onEnterWorld;
  if (onCutscene) cutsceneCallback = onCutscene;
  if (onScanner) scannerCallback = onScanner;
  if (onSkip) skipCallback = onSkip;
}

export function startCutscene(onComplete: () => void, onFloorTick?: (floor: number) => void): void {
  cutsceneCallback?.(onComplete, onFloorTick);
}

export function setScannerState(state: 'idle' | 'scanning' | 'granted' | 'denied'): void {
  scannerCallback?.(state);
}

export function skipCutscene(onComplete?: () => void): void {
  skipCallback?.(onComplete);
}

/**
 * Register a callback to be fired when the player sits at a desk.
 * Called from WorkstationOverlay (or main.ts) during mount.
 */
export function registerSitCallback(onSit: SitCallback): void {
  sitCallback = onSit;
}

/**
 * Register a callback to be fired when the player stands up from a desk.
 * Called from WorkstationOverlay (or main.ts) during mount.
 */
export function registerStandCallback(onStand: StandCallback): void {
  standCallback = onStand;
}

/**
 * Apply a color hex preview to the character mesh in real-time as the user
 * selects swatches in SCR-07. Safe to call before callbacks are registered
 * (no-op until the engine is ready).
 */
export function previewAppearance(colorHex: string): void {
  previewCallback?.(colorHex);
}

/**
 * Signal the engine to activate world controls and apply the final appearance.
 * Called once SCR-07 confirmation succeeds (or immediately on join for
 * returning students who already have an appearance).
 */
export function enterWorld(appearance: { colorScheme: string }): void {
  enterWorldCallback?.(appearance);
}

/**
 * Called by CharacterController when the player sits at a workstation desk.
 * Triggers the WorkstationOverlay to open (SCR-14).
 * Safe to call before sitCallback is registered (no-op until registered).
 */
export function notifySit(): void {
  sitCallback?.();
}

/**
 * Called by CharacterController when the player stands up from a desk.
 * Triggers the WorkstationOverlay to close.
 * Safe to call before standCallback is registered (no-op until registered).
 */
export function notifyStand(): void {
  standCallback?.();
}
