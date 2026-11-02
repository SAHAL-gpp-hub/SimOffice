/**
 * WorkstationOverlay — SCR-14 (UIUXD v2.1)
 *
 * The diegetic code editor. Appears as an HTML overlay anchored to the 3D scene
 * when the player sits at a workstation desk (animState === 'sit'). Disappears
 * when the player stands up. It is ALWAYS MOUNTED (never unmounts mid-session)
 * so in-memory editor state survives minor React re-renders.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useShellStore } from './store';
import { triggerStandAction } from './engineBridge';
import * as api from '../api/workstation';
import type {
  FileNode,
  RunCheckResult,
} from '../api/workstation';

// ── Constants ─────────────────────────────────────────────────────────────────

const SAVE_DEBOUNCE_MS = 500;
const VERIFY_STAGGER_MS = 200;

// ── Types ─────────────────────────────────────────────────────────────────────

type OverlayState =
  | 'idle'
  | 'loading'
  | 'boot-polling'
  | 'editing'
  | 'run-check-pending'
  | 'verify-pending'
  | 'verify-done'
  | 'error';

type SaveState = 'saved' | 'saving' | 'save-failed';

interface VerifyRow {
  checkId: string;
  checkType: 'full_fix' | 'diagnostic';
  result: api.VerificationResult | null;
}

// ── Helper: sort & build file tree ───────────────────────────────────────────

function sortFileNodes(nodes: FileNode[]): FileNode[] {
  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.path.localeCompare(b.path);
  });
}

function basename(path: string): string {
  return path.split('/').pop() ?? path;
}

function depth(path: string): number {
  return path.split('/').length - 1;
}

function getFileIcon(path: string, isDir: boolean) {
  if (isDir) {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" style={{ color: '#38bdf8' }}>
        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
      </svg>
    );
  }
  if (path.endsWith('.js') || path.endsWith('.ts')) {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" style={{ color: '#fbbf24' }}>
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
      </svg>
    );
  }
  if (path.endsWith('.json')) {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" style={{ color: '#34d399' }}>
        <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" style={{ color: '#94a3b8' }}>
      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
    </svg>
  );
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
      <div className="ws-file-tree__title">
        <span>EXPLORER</span>
        <span className="ws-file-tree__badge">{files.filter(f => f.type === 'file').length} FILES</span>
      </div>
      <div className="ws-file-tree__list">
        {sorted.map((node) => {
          const isDir = node.type === 'directory';
          const isSelected = selectedPath === node.path;
          return (
            <button
              key={node.path}
              id={`ws-file-${node.path.replace(/\//g, '-')}`}
              className={[
                'ws-file-node',
                isDir ? 'ws-file-node--dir' : 'ws-file-node--file',
                isSelected ? 'ws-file-node--selected' : '',
              ].join(' ')}
              style={{ paddingLeft: `${14 + depth(node.path) * 14}px` }}
              onClick={() => !isDir && onSelect(node.path)}
              disabled={disabled || isDir}
              aria-current={isSelected ? 'true' : undefined}
            >
              <span className="ws-file-node__icon" aria-hidden="true">
                {getFileIcon(node.path, isDir)}
              </span>
              <span className="ws-file-node__name">{basename(node.path)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

interface SaveIndicatorProps {
  state: SaveState;
}

function SaveIndicator({ state }: SaveIndicatorProps) {
  if (state === 'saving') {
    return (
      <span className="ws-save-indicator ws-save-indicator--saving" aria-live="polite">
        <span className="ws-save-dot ws-save-dot--saving" />
        Saving…
      </span>
    );
  }
  if (state === 'save-failed') {
    return (
      <span className="ws-save-indicator ws-save-indicator--failed" role="alert">
        <span className="ws-save-dot ws-save-dot--failed" />
        Save failed
      </span>
    );
  }
  return (
    <span className="ws-save-indicator ws-save-indicator--saved" aria-live="polite">
      <span className="ws-save-dot ws-save-dot--saved" />
      Saved
    </span>
  );
}

interface RunCheckResultViewProps {
  result: RunCheckResult;
}

function RunCheckResultView({ result }: RunCheckResultViewProps) {
  return (
    <div className="ws-result-run" role="region" aria-label="Run check result">
      <div className="ws-result-run__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="ws-result-run__label">Diagnostics Output</span>
          <span className="ws-result-run__tag">Informal Check</span>
        </div>
        <span className={`ws-result-run__badge ws-result-run__badge--${result.result}`}>
          {result.result === 'pass' ? '✓ Passed' : '✕ Failed'}
        </span>
      </div>
      {result.output && (
        <pre className="ws-result-run__output">{result.output}</pre>
      )}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="ws-result-verify__label">Formal Verification Suite</span>
          <span className="ws-result-verify__tag">Graded Evaluation</span>
        </div>
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
            <span className="ws-result-verify__icon" aria-hidden="true">
              {row.result === 'pass' ? '✅' : row.result === 'fail' ? '❌' : '⏳'}
            </span>
            <span className="ws-result-verify__name">
              {row.checkType === 'full_fix' ? 'Full Fix Verification Check' : 'Boundary Diagnostic Check'}
            </span>
            <span className="ws-result-verify__status">
              {row.result === null
                ? 'Evaluating…'
                : row.result === 'pass'
                ? 'PASSED'
                : 'FAILED'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Main overlay component ────────────────────────────────────────────────────

export function WorkstationOverlay() {
  const { workstation, screen, joinResult } = useShellStore();
  const { isOpen, department = 'backend' } = workstation;

  // Resilient token & teamId resolution
  const teamId = workstation.teamId || joinResult?.teamId || sessionStorage.getItem('studentTeamId') || '99528558-6ca8-428b-846b-0ee162c11a4f';
  const token = workstation.token || joinResult?.token || sessionStorage.getItem('studentToken') || 'dev-token';
  const isVisible = isOpen && screen === 'in-world';

  const defaultFile = department === 'frontend' ? 'src/stores/cartStore.js' : 'src/index.js';

  // ── Editor state (pre-initialized so editor opens instantaneously with zero blank state) ──
  const [overlayState, setOverlayState] = useState<OverlayState>('editing');
  const [files, setFiles] = useState<FileNode[]>(() => api.getFallbackFileTree(department));
  const [selectedFile, setSelectedFile] = useState<string | null>(defaultFile);
  const [editorContent, setEditorContent] = useState<string>(() => api.getFallbackContent(defaultFile, department));
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [briefingOpen, setBriefingOpen] = useState(true);

  // ── Result panel state ──────────────────────────────────────────────────
  const [resultPanelOpen, setResultPanelOpen] = useState(false);
  const [runCheckResult, setRunCheckResult] = useState<RunCheckResult | null>(null);
  const [verifyRows, setVerifyRows] = useState<VerifyRow[]>([]);

  // ── Refs ────────────────────────────────────────────────────────────────
  const lastSavedContentRef = useRef<string>(api.getFallbackContent(defaultFile, department));
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Handle file selection ────────────────────────────────────────────────
  const handleFileSelect = useCallback(async (path: string) => {
    try {
      setSelectedFile(path);
      const { content } = await api.readFile(teamId, token, path, department);
      setEditorContent(content);
      lastSavedContentRef.current = content;
      setSaveState('saved');
    } catch {
      const fallback = api.getFallbackContent(path, department);
      setEditorContent(fallback);
      lastSavedContentRef.current = fallback;
      setSaveState('saved');
    }
  }, [teamId, token, department]);

  // ── Load file tree ───────────────────────────────────────────────────────
  const loadFileTree = useCallback(async () => {
    try {
      const { files: loaded } = await api.listFiles(teamId, token, department);
      if (loaded && loaded.length > 0) {
        setFiles(loaded);
        const target =
          loaded.find(f => f.path === defaultFile) ||
          loaded.find(f => f.path === 'src/index.js') ||
          loaded.find(f => f.type === 'file');
        if (target && target.path !== selectedFile) {
          handleFileSelect(target.path);
        }
      }
      setOverlayState('editing');
    } catch {
      // Keep existing files, don't break the user's workflow
      console.warn(`[WorkstationOverlay] Using resilient in-memory file tree for ${department}`);
      setFiles(api.getFallbackFileTree(department));
      setOverlayState('editing');
    }
  }, [teamId, token, department, defaultFile, selectedFile, handleFileSelect]);

  // Sync state whenever overlay opens or department changes
  useEffect(() => {
    if (isOpen) {
      setOverlayState('editing');
      setSaveState('saved');
      setErrorMessage(null);
      setResultPanelOpen(false);
      setRunCheckResult(null);
      setVerifyRows([]);

      setSelectedFile(defaultFile);
      setFiles(api.getFallbackFileTree(department));
      const content = api.getFallbackContent(defaultFile, department);
      setEditorContent(content);
      lastSavedContentRef.current = content;

      // Background sync with container / server without locking UI
      loadFileTree();
    }
  }, [isOpen, department, defaultFile, loadFileTree]);

  // ── Handle code editing with auto-save ────────────────────────────────────
  const handleEditorChange = useCallback((newContent: string) => {
    setEditorContent(newContent);
    setSaveState('saving');

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      if (!selectedFile) return;
      try {
        await api.writeFile(teamId, token, selectedFile, newContent, department);
        lastSavedContentRef.current = newContent;
        setSaveState('saved');
      } catch {
        setSaveState('save-failed');
      }
    }, SAVE_DEBOUNCE_MS);
  }, [teamId, token, selectedFile, department]);

  // ── Handle run check ─────────────────────────────────────────────────────
  const handleRunCheck = useCallback(async () => {
    setOverlayState('run-check-pending');
    setResultPanelOpen(true);
    setRunCheckResult(null);

    try {
      const result = await api.runCheck(teamId, token, department);
      setRunCheckResult(result);
      setOverlayState('editing');
    } catch {
      setOverlayState('editing');
      setErrorMessage('Failed to execute test runner.');
    }
  }, [teamId, token, department]);

  // ── Handle submit verification ───────────────────────────────────────────
  const handleSubmitVerification = useCallback(async () => {
    setOverlayState('verify-pending');
    setResultPanelOpen(true);
    setVerifyRows([
      { checkId: '1', checkType: 'diagnostic', result: null },
      { checkId: '2', checkType: 'full_fix', result: null },
    ]);

    try {
      const res = await api.submitVerification(teamId, token, department);
      
      // Reveal rows with smooth stagger
      res.runs.forEach((run, idx) => {
        setTimeout(() => {
          setVerifyRows((prev) =>
            prev.map((r, i) => (i === idx ? { ...r, result: run.result } : r))
          );
        }, (idx + 1) * VERIFY_STAGGER_MS);
      });

      setTimeout(() => {
        setOverlayState('verify-done');
      }, (res.runs.length + 1) * VERIFY_STAGGER_MS);
    } catch {
      setOverlayState('editing');
      setErrorMessage('Verification submission failed.');
    }
  }, [teamId, token, department]);

  const isWorking =
    overlayState === 'loading' ||
    overlayState === 'boot-polling' ||
    overlayState === 'run-check-pending' ||
    overlayState === 'verify-pending';

  const buttonsDisabled = isWorking || !selectedFile;

  return (
    <div
      id="workstation-overlay"
      aria-hidden={!isVisible}
      style={{ display: isVisible ? 'flex' : 'none' }}
    >
      <div className="ws-panel" role="main" aria-label="Workstation code editor">

        {/* ── Header ── */}
        <header className="ws-header">
          <div className="ws-header__left">
            <div className="ws-header__status-badge">
              <span className="ws-header__beacon" />
              <span>BACKEND SQUAD · TERMINAL 01</span>
            </div>
            <h2 className="ws-header__title">OmniCart Incident Workstation</h2>
          </div>
          <div className="ws-header__right">
            {selectedFile && <SaveIndicator state={saveState} />}
            <button
              type="button"
              className="ws-stand-btn"
              onClick={() => triggerStandAction()}
              title="Stand up and return to 3D room (ESC)"
            >
              <kbd className="hud-kbd">ESC</kbd>
              <span>Stand Up</span>
            </button>
          </div>
        </header>

        {/* ── Mission Briefing Strip ── */}
        <div className="ws-briefing-banner" role="region" aria-label="Mission Briefing">
          <div className="ws-briefing-banner__header">
            <div className="ws-briefing-banner__tag">
              <span className="ws-briefing-banner__badge">P1 CRITICAL</span>
              <strong>{department === 'frontend' ? 'INCIDENT REPORT #8493:' : 'INCIDENT REPORT #8492:'}</strong>
              <span style={{ color: '#e2e8f0' }}>
                {department === 'frontend'
                  ? 'OmniCart Storefront Cart Hydration & Immutability Freeze'
                  : 'OmniCart Inventory Underflow'}
              </span>
            </div>
            <button
              type="button"
              className="ws-briefing-banner__toggle"
              onClick={() => setBriefingOpen(!briefingOpen)}
              aria-expanded={briefingOpen}
            >
              {briefingOpen ? '▲ Hide Briefing' : '▼ View Briefing'}
            </button>
          </div>
          {briefingOpen && (
            <div className="ws-briefing-banner__body">
              {department === 'frontend' ? (
                <>
                  <p className="ws-briefing-banner__desc">
                    Cart updates fail to render and discount calculations fail payment gateway validation. Investigate{' '}
                    <button
                      type="button"
                      className="ws-briefing-file-chip"
                      onClick={() => handleFileSelect('src/stores/cartStore.js')}
                    >
                      src/stores/cartStore.js
                    </button>{' '}
                    and{' '}
                    <button
                      type="button"
                      className="ws-briefing-file-chip"
                      onClick={() => handleFileSelect('src/utils/pricing.js')}
                    >
                      src/utils/pricing.js
                    </button>
                    .
                  </p>
                  <div className="ws-briefing-banner__target">
                    🎯 <strong>Goal:</strong> Clone items array immutably in <code>addItem()</code> and round coupon discounts to 2 decimal places in <code>applyCoupon()</code>. Run informal check, then submit for verification.
                  </div>
                </>
              ) : (
                <>
                  <p className="ws-briefing-banner__desc">
                    High-traffic checkout surges cause inventory balances to drop below 0. Investigate{' '}
                    <button
                      type="button"
                      className="ws-briefing-file-chip"
                      onClick={() => handleFileSelect('src/index.js')}
                    >
                      src/index.js
                    </button>{' '}
                    and patch the boundary condition.
                  </p>
                  <div className="ws-briefing-banner__target">
                    🎯 <strong>Goal:</strong> Ensure <code>item.stock &gt;= quantity</code> before decrementing. Run informal check, then submit for verification.
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Error banner ── */}
        {errorMessage && (
          <div className="ws-error-banner" role="alert">
            <span style={{ fontSize: '14px' }}>⚠️</span>
            <span style={{ flex: 1 }}>{errorMessage}</span>
            <button
              type="button"
              className="ws-error-banner__dismiss"
              onClick={() => setErrorMessage(null)}
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Loading state ── */}
        {(overlayState === 'loading' || overlayState === 'boot-polling') && (
          <div className="ws-boot-message" role="status" aria-live="polite">
            <div className="ws-boot-spinner" />
            <div className="ws-boot-title">INITIALIZING LIVE WORKSTATION REPOSITORY…</div>
            <div className="ws-boot-sub">Mounting workspace tree and linking telemetry hooks</div>
            <button
              type="button"
              className="ws-retry-btn"
              onClick={loadFileTree}
            >
              Force Retry Connection
            </button>
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
              {/* Tab Bar */}
              <div className="ws-editor-tabs">
                {selectedFile ? (
                  <div className="ws-editor-tab ws-editor-tab--active">
                    <span className="ws-editor-tab__icon">{getFileIcon(selectedFile, false)}</span>
                    <span className="ws-editor-tab__name">{basename(selectedFile)}</span>
                  </div>
                ) : (
                  <div className="ws-editor-tab">No file selected</div>
                )}
                {selectedFile && (
                  <span className="ws-editor-path">{selectedFile}</span>
                )}
              </div>

              {selectedFile ? (
                <textarea
                  id="ws-editor-textarea"
                  className="ws-editor"
                  value={editorContent}
                  onChange={(e) => handleEditorChange(e.target.value)}
                  disabled={isWorking}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  aria-label={`Code editor: ${selectedFile}`}
                />
              ) : (
                <div className="ws-editor-empty">
                  Select a file from the explorer on the left to start editing.
                </div>
              )}

              {/* Action bar */}
              <div className="ws-action-bar">
                <div className="ws-action-hints">
                  <span>Autosaves on edit</span>
                  <span>·</span>
                  <span>ESC to stand up</span>
                </div>
                <div className="ws-action-btns">
                  <button
                    id="ws-btn-run-check"
                    type="button"
                    className="ws-btn ws-btn--run"
                    onClick={handleRunCheck}
                    disabled={buttonsDisabled}
                    aria-busy={overlayState === 'run-check-pending'}
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    <span>{overlayState === 'run-check-pending' ? 'Running…' : 'Run Check'}</span>
                  </button>
                  <button
                    id="ws-btn-submit-verification"
                    type="button"
                    className="ws-btn ws-btn--submit"
                    onClick={handleSubmitVerification}
                    disabled={buttonsDisabled || overlayState === 'verify-done'}
                    aria-busy={overlayState === 'verify-pending'}
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>
                      {overlayState === 'verify-pending'
                        ? 'Verifying…'
                        : overlayState === 'verify-done'
                        ? 'Verified ✓'
                        : 'Submit for Verification'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Result drawer */}
              {resultPanelOpen && (
                <div className="ws-result-panel" role="region" aria-label="Results">
                  <div className="ws-result-panel__header">
                    <span>EXECUTION TELEMETRY DRAWER</span>
                    <button
                      type="button"
                      className="ws-result-panel__close"
                      onClick={() => setResultPanelOpen(false)}
                      aria-label="Close result drawer"
                    >
                      ✕
                    </button>
                  </div>
                  {runCheckResult && <RunCheckResultView result={runCheckResult} />}
                  {verifyRows.length > 0 && <VerifyResultList rows={verifyRows} />}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
