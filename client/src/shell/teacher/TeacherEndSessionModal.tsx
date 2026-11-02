import { useRef, useEffect, useState } from 'react';
import type { DashboardTeam } from './types';
import { IconFlag, IconAward, IconSearch, IconAlertCircle } from './icons';

interface Props {
  isOpen: boolean;
  teams: DashboardTeam[];
  onClose: () => void;
  onConfirmEnd: () => Promise<void>;
}

export function TeacherEndSessionModal({
  isOpen,
  teams,
  onClose,
  onConfirmEnd,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isEnding, setIsEnding] = useState(false);

  const resolvedCount = teams.filter((t) => t.outcomeState === 'resolved').length;
  const inProgressCount = teams.filter((t) => t.outcomeState !== 'resolved').length;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    setIsEnding(true);
    try {
      await onConfirmEnd();
      onClose();
    } catch {
      // Caller handles errors
    } finally {
      setIsEnding(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current && !isEnding) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className="tc-modal"
      onClick={handleBackdropClick}
      onCancel={(e) => {
        if (isEnding) e.preventDefault();
        else onClose();
      }}
      aria-labelledby="end-session-title"
      style={{ maxWidth: '540px' }}
    >
      <div className="tc-modal-header">
        <h3 id="end-session-title" className="tc-modal-title" style={{ color: 'var(--tc-rose)' }}>
          <IconFlag size={18} color="var(--tc-rose)" />
          <span>Conclude Simulation & Transition to Debrief</span>
        </h3>
        {!isEnding && (
          <button
            type="button"
            className="tc-modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <p style={{ fontSize: '13.5px', color: '#e2e8f0', margin: 0, lineHeight: 1.5 }}>
          You are concluding the active simulation session. All student workstations will immediately freeze, sandboxes will begin automated teardown, and all participants will transition to the Classroom Debrief Screen.
        </p>

        {/* Current Standing Summary */}
        <div style={{ background: 'var(--tc-glass-surface-inset)', border: '1px solid var(--tc-border)', borderRadius: '10px', padding: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--tc-mint-tint)', border: '1px solid var(--tc-mint-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconAward size={20} color="var(--tc-mint)" />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--tc-text-muted)', textTransform: 'uppercase' }}>Resolved</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--tc-mint)', fontFamily: 'var(--tc-font-mono)' }}>
                {resolvedCount} {resolvedCount === 1 ? 'Team' : 'Teams'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--tc-amber-tint)', border: '1px solid var(--tc-amber-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconSearch size={18} color="var(--tc-amber)" />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--tc-text-muted)', textTransform: 'uppercase' }}>Investigating</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--tc-amber)', fontFamily: 'var(--tc-font-mono)' }}>
                {inProgressCount} {inProgressCount === 1 ? 'Team' : 'Teams'}
              </div>
            </div>
          </div>
        </div>

        {/* Mandated Non-Punitive Notice */}
        <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid var(--tc-cyan-border)', borderRadius: '8px', padding: '12px 14px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <IconAlertCircle size={18} color="var(--tc-cyan)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '12.5px', color: '#cbd5e1', lineHeight: 1.45 }}>
            <strong style={{ color: 'var(--tc-cyan)' }}>Non-Punitive Assessment Policy:</strong> Any team still in-progress will receive an encouraging, non-punitive <em>"unresolved"</em> outcome. Partial credit and learning milestones are preserved.
          </div>
        </div>

        {/* Ending State Waiting Indicator */}
        {isEnding && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0, 0, 0, 0.4)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <span className="tc-pulse-beacon" style={{ background: 'var(--tc-rose)', boxShadow: 'var(--tc-rose-glow)' }} />
            <span style={{ fontSize: '13px', color: '#fca5a5', fontWeight: 600 }}>
              Initiating safe sandbox teardown & compiling debrief analytics…
            </span>
          </div>
        )}

        <div className="tc-modal-actions">
          <button
            type="button"
            className="tc-btn"
            onClick={onClose}
            disabled={isEnding}
          >
            Cancel
          </button>
          <button
            type="button"
            className="tc-btn tc-btn--danger"
            onClick={handleConfirm}
            disabled={isEnding}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <IconFlag size={14} color="#fff" />
            <span>{isEnding ? 'Finalizing Session…' : 'Yes, Conclude Session'}</span>
          </button>
        </div>
      </div>
    </dialog>
  );
}
