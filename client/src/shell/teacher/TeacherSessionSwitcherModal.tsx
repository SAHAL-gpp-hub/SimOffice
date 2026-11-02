import { useRef, useEffect, useState } from 'react';
import { IconRefresh } from './icons';

interface Props {
  isOpen: boolean;
  currentSessionId: string;
  onClose: () => void;
  onSwitchSession: (newSessionId: string) => void;
}

export function TeacherSessionSwitcherModal({
  isOpen,
  currentSessionId,
  onClose,
  onSwitchSession,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [inputVal, setInputVal] = useState(currentSessionId);

  useEffect(() => {
    setInputVal(currentSessionId);
  }, [currentSessionId, isOpen]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    onSwitchSession(inputVal.trim().toUpperCase());
    onClose();
  };

  const handleSelectPreset = (code: string) => {
    onSwitchSession(code);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className="tc-modal"
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="switch-session-title"
      style={{ maxWidth: '460px' }}
    >
      <div className="tc-modal-header">
        <h3 id="switch-session-title" className="tc-modal-title">
          <IconRefresh size={18} color="var(--tc-cyan)" />
          <span>Switch Classroom Session</span>
        </h3>
        <button
          type="button"
          className="tc-modal-close-btn"
          onClick={onClose}
          aria-label="Close dialog"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tc-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Active Session Join Code / UUID
          </label>
          <input
            type="text"
            style={{
              padding: '10px 14px',
              fontSize: '15px',
              fontFamily: 'var(--tc-font-mono)',
              textAlign: 'center',
              letterSpacing: '2px',
              background: 'var(--tc-glass-surface-inset)',
              border: '1px solid var(--tc-border)',
              borderRadius: '8px',
              color: '#fff',
              outline: 'none',
            }}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value.toUpperCase())}
            placeholder="DEMO01"
            autoFocus
          />
        </div>

        {/* Presets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tc-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Simulation Presets & Fast Rooms
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['DEMO01', 'DEMO02'].map((code) => {
              const isActive = currentSessionId === code;
              return (
                <button
                  key={code}
                  type="button"
                  className={`tc-filter-pill ${isActive ? 'tc-filter-pill--active' : ''}`}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontFamily: 'var(--tc-font-mono)',
                    fontSize: '12px',
                    justifyContent: 'center',
                  }}
                  onClick={() => handleSelectPreset(code)}
                >
                  {code} {isActive && '● Active'}
                </button>
              );
            })}
          </div>
        </div>

        <div className="tc-modal-actions">
          <button type="button" className="tc-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="tc-btn tc-btn--primary">
            Connect to Session
          </button>
        </div>
      </form>
    </dialog>
  );
}
