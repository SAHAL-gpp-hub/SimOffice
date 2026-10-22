/**
 * WorkstationOverlay — SCR-14 (UIUXD v2.1)
 *
 * The diegetic code editor. Appears as an HTML overlay anchored to the 3D scene
 * when the player sits at a workstation desk (animState === 'sit'). Disappears
 * when the player stands up. It is ALWAYS MOUNTED (never unmounts mid-session)
 * so in-memory editor state survives minor React re-renders.
 *
 * Architecture (SAD v1.3 §12):
 *   - Not a modal — no full-screen dim. The 3D world remains visible in
 *     periphery (pointer-events: none on the root, auto only on the panel).
 *   - Reads teamId + token from Zustand store (set by main.ts sit callback).
 *   - All five API calls wired to api/workstation.ts (M0.2f endpoints).
 *
 * State machine:
 *   idle → loading → editing ←→ error
 *                ↓              ↑
 *            run-check-pending ─┘  (HTTP error)
 *                ↓
 *            verify-pending → verify-done
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useShellStore } from './store';
import * as api from '../api/workstation';
import type {
  FileNode,
  RunCheckResult,
  WorkstationApiError,
} from '../api/workstation';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Debounce delay for auto-save (ms). Matches UIUXD v2.1 P7 "no explicit save button". */
const SAVE_DEBOUNCE_MS = 500;

/** Delay between per-check reveal rows during simulated streaming (ms). */
const VERIFY_STAGGER_MS = 200;

/** How long before disabling run/submit buttons after a recoverable error (ms). */
const ERROR_RETRY_GATE_MS = 3000;

/** Max retries for "booting up" polling on 409 ENVIRONMENT_NOT_READY. */
const BOOT_RETRY_MAX = 3;
const BOOT_RETRY_INTERVAL_MS = 5000;

// ── Types ─────────────────────────────────────────────────────────────────────

type OverlayState =
  | 'idle'
  | 'loading'
  | 'boot-polling'   // 409 received; retrying GET /files
  | 'editing'
  | 'run-check-pending'
  | 'verify-pending'
  | 'verify-done'
  | 'error';

type SaveState = 'saved' | 'saving' | 'save-failed';

interface VerifyRow {
  checkId: string;
  checkType: 'full_fix' | 'diagnostic';
  result: api.VerificationResult | null; // null = pending reveal
}

// ── Helper: sort & build file tree ───────────────────────────────────────────

/** Directories first, then files, both alphabetically. */
function sortFileNodes(nodes: FileNode[]): FileNode[] {
  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.path.localeCompare(b.path);
  });
}

/** Basename of a path. */
function basename(path: string): string {
  return path.split('/').pop() ?? path;
}

/** Depth (number of slashes) — used for indentation. */
function depth(path: string): number {
  return path.split('/').length - 1;
}

// ── Result icon ───────────────────────────────────────────────────────────────

function resultIcon(result: api.VerificationResult | null): string {
  if (result === null) return '⏳';
  if (result === 'pass') return '✅';
  if (result === 'fail') return '❌';
  if (result === 'resource_limit_exceeded') return '⚠️';
  return '🔴'; // error
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface FileTreeProps {
  files: FileNode[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
  disabled: boolean;
}

function FileTree({ files, selectedPath, onSelect, disabled }: FileTreeProps) {
  const sorted = sortFileNodes(files);

  return (
    <nav className="ws-file-tree" aria-label="File tree">
      {sorted.map((node) => (
        <button
          key={node.path}
          id={`ws-file-${node.path.replace(/\//g, '-')}`}
          className={[
            'ws-file-node',
            node.type === 'directory' ? 'ws-file-node--dir' : 'ws-file-node--file',
            selectedPath === node.path ? 'ws-file-node--selected' : '',
          ].join(' ')}
          style={{ paddingLeft: `${12 + depth(node.path) * 16}px` }}
          onClick={() => node.type === 'file' && onSelect(node.path)}
          disabled={disabled || node.type === 'directory'}
          aria-current={selectedPath === node.path ? 'true' : undefined}
          aria-label={`${node.type === 'directory' ? 'Folder' : 'File'}: ${node.path}`}
        >
          <span className="ws-file-node__icon" aria-hidden="true">
            {node.type === 'directory' ? '📁' : '📄'}
          </span>
          <span className="ws-file-node__name">{basename(node.path)}</span>
        </button>
      ))}
    </nav>
  );
}

interface SaveIndicatorProps {
  state: SaveState;
}

function SaveIndicator({ state }: SaveIndicatorProps) {
  if (state === 'saving') {
    return <span className="ws-save-indicator ws-save-indicator--saving" aria-live="polite">Saving…</span>;
  }
  if (state === 'save-failed') {
    return <span className="ws-save-indicator ws-save-indicator--failed" role="alert">Save failed — will retry</span>;
  }
  return <span className="ws-save-indicator ws-save-indicator--saved" aria-live="polite">Saved</span>;
}

interface RunCheckResultViewProps {
  result: RunCheckResult;
}

function RunCheckResultView({ result }: RunCheckResultViewProps) {
  return (
    <div className="ws-result-run" role="region" aria-label="Run check result">
      <div className="ws-result-run__header">
        <span className="ws-result-run__label">Run Check</span>
        <span className="ws-result-run__tag">Informal — not graded</span>
        <span className={`ws-result-run__badge ws-result-run__badge--${result.result}`}>
          {result.result === 'pass' ? '✅ Pass' : '❌ Fail'}
        </span>
      </div>
      {result.output && (
        <pre className="ws-result-run__output">{result.output}</pre>
      )}
    </div>
  );
}

interface ResourceLimitExceededViewProps {}

function ResourceLimitExceededView(_: ResourceLimitExceededViewProps) {
  return (
    <div className="ws-result-run ws-result-run--limit" role="alert">
      <div className="ws-result-run__header">
        <span className="ws-result-run__label">Run Check</span>
        <span className="ws-result-run__tag">Informal — not graded</span>
        <span className="ws-result-run__badge ws-result-run__badge--limit">⚠️ Resource limit reached</span>
      </div>
      <p className="ws-result-run__output">
        The check hit its CPU/time ceiling. This is a defined outcome, not a failure — try simplifying your change and running again.
      </p>
    </div>
  );
}

interface VerifyResultListProps {
  rows: VerifyRow[];
}

function VerifyResultList({ rows }: VerifyResultListProps) {
  return (
    <div className="ws-result-verify" role="region" aria-label="Verification results">
      <div className="ws-result-verify__header">
        <span className="ws-result-verify__label">Submit for Verification</span>
        <span className="ws-result-verify__tag">Formal — graded</span>
      </div>
      <ul className="ws-result-verify__list" aria-live="polite">
        {rows.map((row) => (
          <li
            key={row.checkId}
            className={[
              'ws-result-verify__row',
              row.result ? `ws-result-verify__row--${row.result}` : 'ws-result-verify__row--pending',
            ].join(' ')}
          >
            <span className="ws-result-verify__icon" aria-hidden="true">{resultIcon(row.result)}</span>
            <span className="ws-result-verify__name">
              {row.checkType === 'full_fix' ? 'Full fix check' : 'Diagnostic check'}
            </span>
            <span className="ws-result-verify__status">
              {row.result === null
                ? 'Running…'
                : row.result === 'pass'
                ? 'Passed'
                : row.result === 'fail'
                ? 'Not yet'
                : row.result === 'resource_limit_exceeded'
                ? 'Resource limit'
                : 'Error'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Main overlay component ────────────────────────────────────────────────────

export function WorkstationOverlay() {
  const { workstation, screen } = useShellStore();
  const { isOpen, teamId, token } = workstation;
  const isVisible = isOpen && screen === 'in-world';

  // ── Editor state ────────────────────────────────────────────────────────
  const [overlayState, setOverlayState] = useState<OverlayState>('idle');
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorRetryGate, setErrorRetryGate] = useState(false);
  const [briefingOpen, setBriefingOpen] = useState(true);

  // ── Result panel state ──────────────────────────────────────────────────
  const [resultPanelOpen, setResultPanelOpen] = useState(false);
  const [runCheckResult, setRunCheckResult] = useState<RunCheckResult | null>(null);
  const [runCheckLimitExceeded, setRunCheckLimitExceeded] = useState(false);
  const [verifyRows, setVerifyRows] = useState<VerifyRow[]>([]);

  // ── Refs ────────────────────────────────────────────────────────────────
  /** The content of the last successful save — used to detect dirty state. */
  const lastSavedContentRef = useRef<string>('');
  /** Pending debounce timer id. */
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Boot polling timer. */
  const bootTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bootRetryCountRef = useRef(0);
  /** Error retry gate timer. */
  const errorGateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Reset all state on open/close ───────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      // Fresh sit: reset all transient state, then load.
      setOverlayState('loading');
      setFiles([]);
      setSelectedFile(null);
      setEditorContent('');
      setSaveState('saved');
      setErrorMessage(null);
      setErrorRetryGate(false);
      setResultPanelOpen(false);
      setRunCheckResult(null);
      setRunCheckLimitExceeded(false);
      setVerifyRows([]);
      lastSavedContentRef.current = '';
      bootRetryCountRef.current = 0;
    }
  }, [isOpen]);

  // ── Flush pending save on close (debounce-flush on stand) ───────────────
  useEffect(() => {
    if (!isOpen) {
      // Flush any pending debounce timer (fire-and-forget — player has stood).
      if (saveTimerRef.current !== null) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        if (selectedFile && token && teamId && editorContent !== lastSavedContentRef.current) {
          api.writeFile(teamId, token, selectedFile, editorContent).catch(() => {
            console.warn('[WorkstationOverlay] Final flush write failed — last keystrokes may be lost.');
          });
        }
      }
      // Clear any boot polling.
      if (bootTimerRef.current !== null) {
        clearTimeout(bootTimerRef.current);
        bootTimerRef.current = null;
      }
      // Clear error gate.
      if (errorGateTimerRef.current !== null) {
        clearTimeout(errorGateTimerRef.current);
        errorGateTimerRef.current = null;
      }
      // Transition back to idle.
      setOverlayState('idle');
    }
  }, [isOpen, selectedFile, token, teamId, editorContent]);

  // ── Load file tree ───────────────────────────────────────────────────────
  const loadFileTree = useCallback(async () => {
    if (!teamId || !token) return;
    try {
      setOverlayState('loading');
      const { files: loaded } = await api.listFiles(teamId, token);
      setFiles(loaded);
      setOverlayState('editing');
    } catch (err) {
      const apiErr = err as WorkstationApiError;
      if (apiErr.code === 'ENVIRONMENT_NOT_READY') {
        setOverlayState('boot-polling');
        scheduleBootRetry();
      } else if (apiErr.code === 'AUTH_EXPIRED') {
        setOverlayState('error');
        setErrorMessage('Session expired — please stand up and rejoin.');
      } else {
        setOverlayState('error');
        setErrorMessage('Could not load workspace files. Please try again.');
        scheduleErrorRetryGate();
      }
    }
  }, [teamId, token]);

  // Trigger load when overlay opens.
  useEffect(() => {
    if (isOpen && overlayState === 'loading') {
      loadFileTree();
    }
  }, [isOpen, overlayState, loadFileTree]);

  // ── Boot polling ─────────────────────────────────────────────────────────
  const scheduleBootRetry = useCallback(() => {
    bootTimerRef.current = setTimeout(() => {
      if (bootRetryCountRef.current >= BOOT_RETRY_MAX) {
        setOverlayState('error');
        setErrorMessage('Workstation did not become ready. Please stand up and try again in a moment.');
        return;
      }
      bootRetryCountRef.current += 1;
      loadFileTree();
    }, BOOT_RETRY_INTERVAL_MS);
  }, [loadFileTree]);

  // ── Error retry gate ─────────────────────────────────────────────────────
  const scheduleErrorRetryGate = useCallback(() => {
    setErrorRetryGate(true);
    errorGateTimerRef.current = setTimeout(() => {
      setErrorRetryGate(false);
    }, ERROR_RETRY_GATE_MS);
  }, []);

  // ── File selection & content load ────────────────────────────────────────
  const handleFileSelect = useCallback(async (path: string) => {
    if (!teamId || !token) return;
    // Flush any pending save for the previously selected file before switching.
    if (saveTimerRef.current !== null) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
      if (selectedFile && editorContent !== lastSavedContentRef.current) {
        setSaveState('saving');
        api.writeFile(teamId, token, selectedFile, editorContent)
          .then(() => { setSaveState('saved'); lastSavedContentRef.current = editorContent; })
          .catch(() => setSaveState('save-failed'));
      }
    }

    setSelectedFile(path);
    setEditorContent('');
    try {
      const { content } = await api.readFile(teamId, token, path);
      setEditorContent(content);
      lastSavedContentRef.current = content;
      setSaveState('saved');
    } catch (err) {
      const apiErr = err as WorkstationApiError;
      if (apiErr.code === 'AUTH_EXPIRED') {
        setOverlayState('error');
        setErrorMessage('Session expired — please stand up and rejoin.');
      } else {
        setErrorMessage(`Could not load ${path}.`);
      }
    }
  }, [teamId, token, selectedFile, editorContent]);

  // ── Editor change & debounced auto-save ──────────────────────────────────
  const handleEditorChange = useCallback((value: string) => {
    setEditorContent(value);

    if (!teamId || !token || !selectedFile) return;

    // Cancel existing debounce.
    if (saveTimerRef.current !== null) {
      clearTimeout(saveTimerRef.current);
    }
    setSaveState('saving');

    saveTimerRef.current = setTimeout(async () => {
      saveTimerRef.current = null;
      try {
        await api.writeFile(teamId, token, selectedFile, value);
        lastSavedContentRef.current = value;
        setSaveState('saved');
      } catch (err) {
        const apiErr = err as WorkstationApiError;
        if (apiErr.code === 'AUTH_EXPIRED') {
          setOverlayState('error');
          setErrorMessage('Session expired — please stand up and rejoin.');
        } else {
          // Mark failed but do NOT clear the buffer — next debounce will retry.
          setSaveState('save-failed');
        }
      }
    }, SAVE_DEBOUNCE_MS);
  }, [teamId, token, selectedFile]);

  // ── Run check (§7.4) ─────────────────────────────────────────────────────
  const handleRunCheck = useCallback(async () => {
    if (!teamId || !token || overlayState !== 'editing') return;
    setOverlayState('run-check-pending');
    setRunCheckResult(null);
    setRunCheckLimitExceeded(false);

    try {
      const result = await api.runCheck(teamId, token);
      setRunCheckResult(result);
      setResultPanelOpen(true);
      setOverlayState('editing');
    } catch (err) {
      const apiErr = err as WorkstationApiError;
      if (apiErr.code === 'RESOURCE_LIMIT_EXCEEDED') {
        setRunCheckLimitExceeded(true);
        setResultPanelOpen(true);
        setOverlayState('editing');
      } else if (apiErr.code === 'AUTH_EXPIRED') {
        setOverlayState('error');
        setErrorMessage('Session expired — please stand up and rejoin.');
      } else if (apiErr.code === 'ENVIRONMENT_NOT_READY') {
        setOverlayState('error');
        setErrorMessage('Workstation not ready. Please stand up and try again.');
      } else {
        setOverlayState('editing');
        setErrorMessage('Run check failed. Please try again.');
        scheduleErrorRetryGate();
      }
    }
  }, [teamId, token, overlayState, scheduleErrorRetryGate]);

  // ── Submit verification (§7.5) ───────────────────────────────────────────
  const handleSubmitVerification = useCallback(async () => {
    if (!teamId || !token || overlayState !== 'editing') return;
    setOverlayState('verify-pending');
    setVerifyRows([]);

    try {
      const response = await api.submitVerification(teamId, token);

      // Simulate per-check streaming: reveal rows with VERIFY_STAGGER_MS stagger.
      // NOTE (tech debt): this is client-side theater — all results are already in the
      // response body. If verification is slow server-side (multi-second per check),
      // the user stares at a spinner for the full duration then sees a rapid burst.
      // Replace with SSE or Colyseus verificationResult broadcast if this feels broken
      // in pilot. (API Spec §10.4 already has the socket infrastructure.)
      const pendingRows: VerifyRow[] = response.runs.map((r) => ({
        checkId: r.checkId,
        checkType: r.checkType,
        result: null,
      }));
      setVerifyRows([...pendingRows]);
      setResultPanelOpen(true);

      for (let i = 0; i < response.runs.length; i++) {
        await new Promise<void>((resolve) => setTimeout(resolve, VERIFY_STAGGER_MS));
        setVerifyRows((prev) => {
          const next = [...prev];
          next[i] = { ...next[i], result: response.runs[i].result };
          return next;
        });
      }

      setOverlayState('verify-done');
    } catch (err) {
      const apiErr = err as WorkstationApiError;
      if (apiErr.code === 'AUTH_EXPIRED') {
        setOverlayState('error');
        setErrorMessage('Session expired — please stand up and rejoin.');
      } else if (apiErr.code === 'ENVIRONMENT_NOT_READY') {
        setOverlayState('error');
        setErrorMessage('Workstation not ready. Please stand up and try again.');
      } else {
        setOverlayState('editing');
        setErrorMessage('Verification failed. Please try again.');
        scheduleErrorRetryGate();
      }
    }
  }, [teamId, token, overlayState, scheduleErrorRetryGate]);

  // ── Derived UI flags ─────────────────────────────────────────────────────
  const isWorking =
    overlayState === 'loading' ||
    overlayState === 'boot-polling' ||
    overlayState === 'run-check-pending' ||
    overlayState === 'verify-pending';

  const buttonsDisabled =
    isWorking ||
    overlayState === 'error' ||
    errorRetryGate ||
    !selectedFile;

  const isAuthError = overlayState === 'error' && errorMessage?.includes('expired');

  // ── Render ───────────────────────────────────────────────────────────────

  // Root always present in DOM (never unmounts mid-session), but invisible
  // when not open. pointer-events: none on root so 3D world is clickable
  // in the periphery; auto on the panel itself.
  return (
    <div
      id="workstation-overlay"
      aria-hidden={!isVisible}
      style={{ display: isVisible ? 'block' : 'none' }}
    >
      <div className="ws-panel" role="main" aria-label="Workstation code editor">

        {/* ── Header ── */}
        <header className="ws-header">
          <div className="ws-header__left">
            <span className="ws-header__dept">Backend Dept.</span>
            <span className="ws-header__title">Workstation</span>
          </div>
          <div className="ws-header__right">
            {selectedFile && <SaveIndicator state={saveState} />}
            <span className="ws-header__hint">[E] or [Esc] to stand up</span>
          </div>
        </header>
 
        {/* ── Mission Briefing Banner ── */}
        <div className="ws-briefing-banner" role="region" aria-label="Mission Briefing">
          <div className="ws-briefing-banner__header">
            <div className="ws-briefing-banner__tag">
              <span className="ws-briefing-banner__pulse" aria-hidden="true"></span>
              <strong>🚨 INCIDENT BRIEFING:</strong> OmniCart Checkout Underflow
            </div>
            <button
              type="button"
              className="ws-briefing-banner__toggle"
              onClick={() => setBriefingOpen(!briefingOpen)}
              aria-expanded={briefingOpen}
            >
              {briefingOpen ? '▲ Collapse Mission Briefing' : '▼ Expand Mission Briefing'}
            </button>
          </div>
          {briefingOpen && (
            <div className="ws-briefing-banner__body">
              <p className="ws-briefing-banner__desc">
                Customers report inventory counts dropping below zero during high-traffic checkout surges. Investigate <code>src/index.js</code> and fix the boundary allocation condition.
              </p>
              <div className="ws-briefing-banner__target">
                🎯 <strong>Goal:</strong> Ensure <code>item.stock &gt;= quantity</code> before decrementing. Run informal checks, then submit for verification.
              </div>
            </div>
          )}
        </div>

        {/* ── Error banner ── */}
        {errorMessage && (
          <div
            className={`ws-error-banner ${isAuthError ? 'ws-error-banner--auth' : ''}`}
            role="alert"
          >
            {errorMessage}
            {!isAuthError && overlayState !== 'error' && (
              <button
                className="ws-error-banner__dismiss"
                onClick={() => setErrorMessage(null)}
                aria-label="Dismiss error"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* ── Loading / booting states ── */}
        {(overlayState === 'loading' || overlayState === 'boot-polling') && (
          <div className="ws-boot-message" role="status" aria-live="polite">
            {overlayState === 'boot-polling'
              ? `Your workstation is booting up — please wait… (retrying, ${bootRetryCountRef.current}/${BOOT_RETRY_MAX})`
              : 'Loading workspace…'}
          </div>
        )}

        {/* ── Main workspace layout ── */}
        {(overlayState === 'editing' ||
          overlayState === 'run-check-pending' ||
          overlayState === 'verify-pending' ||
          overlayState === 'verify-done') && (
          <div className="ws-workspace">
            {/* File tree */}
            <FileTree
              files={files}
              selectedPath={selectedFile}
              onSelect={handleFileSelect}
              disabled={isWorking}
            />

            {/* Editor pane */}
            <div className="ws-editor-pane">
              {selectedFile ? (
                <textarea
                  id="ws-editor-textarea"
                  className="ws-editor"
                  value={editorContent}
                  onChange={(e) => handleEditorChange(e.target.value)}
                  disabled={isWorking}
                  spellCheck={false}
                  aria-label={`Code editor: ${selectedFile}`}
                  aria-readonly={isWorking}
                />
              ) : (
                <div className="ws-editor-empty" aria-label="No file selected">
                  Select a file to start editing
                </div>
              )}

              {/* Action bar */}
              <div className="ws-action-bar">
                <button
                  id="ws-btn-run-check"
                  className="ws-btn ws-btn--run"
                  onClick={handleRunCheck}
                  disabled={buttonsDisabled}
                  aria-busy={overlayState === 'run-check-pending'}
                >
                  {overlayState === 'run-check-pending' ? 'Running…' : 'Run Check'}
                </button>
                <button
                  id="ws-btn-submit-verification"
                  className="ws-btn ws-btn--submit"
                  onClick={handleSubmitVerification}
                  disabled={buttonsDisabled || overlayState === 'verify-done'}
                  aria-busy={overlayState === 'verify-pending'}
                >
                  {overlayState === 'verify-pending'
                    ? 'Verifying…'
                    : overlayState === 'verify-done'
                    ? 'Submitted ✓'
                    : 'Submit for Verification'}
                </button>
              </div>

              {/* Result panel — starts collapsed, expands on first result */}
              {resultPanelOpen && (
                <div className="ws-result-panel" role="region" aria-label="Results">
                  {(runCheckResult || runCheckLimitExceeded) && (
                    <>
                      {runCheckLimitExceeded
                        ? <ResourceLimitExceededView />
                        : runCheckResult && <RunCheckResultView result={runCheckResult} />}
                    </>
                  )}
                  {verifyRows.length > 0 && (
                    <>
                      {(runCheckResult || runCheckLimitExceeded) && (
                        <hr className="ws-result-divider" aria-hidden="true" />
                      )}
                      <VerifyResultList rows={verifyRows} />
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
