import { useRef, useEffect, useState } from 'react';
import { DEFAULT_HINT_PRESETS, type DashboardTeam } from './types';
import { IconLightbulb, IconSend } from './icons';
import { teacherEventBus } from './eventBus';

interface Props {
  isOpen: boolean;
  teams: DashboardTeam[];
  selectedTeamId: string | null;
  onClose: () => void;
  onSendHint: (teamId: string, message: string) => Promise<void>;
}

export function TeacherHintModal({
  isOpen,
  teams,
  selectedTeamId,
  onClose,
  onSendHint,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activeTeamId, setActiveTeamId] = useState<string>(selectedTeamId || '');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (selectedTeamId) {
      setActiveTeamId(selectedTeamId);
    } else if (teams.length > 0 && !activeTeamId) {
      setActiveTeamId(teams[0].teamId);
    }
  }, [selectedTeamId, teams]);

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

  const handlePresetClick = (text: string) => {
    setMessage(text);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeamId || !message.trim() || isSubmitting) return;

    const targetTeam = teams.find((t) => t.teamId === activeTeamId);
    const targetDept = targetTeam?.departmentCode
      ? `${targetTeam.departmentCode.toUpperCase()} Team`
      : 'Target Squad';

    setIsSubmitting(true);
    try {
      await onSendHint(activeTeamId, message.trim());
      teacherEventBus.recordHintSent(targetDept, 'Direct Guidance', message.trim());
      setMessage('');
      onClose();
    } catch {
      // Handled by caller
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (e.target === dialog) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const targetTeam = teams.find((t) => t.teamId === activeTeamId);

  return (
    <dialog
      ref={dialogRef}
      className="tc-modal"
      onClick={handleBackdropClick}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="hint-modal-title"
    >
      <div className="tc-modal-header">
        <h3 id="hint-modal-title" className="tc-modal-title">
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'var(--tc-amber-tint)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--tc-amber-border)',
              color: 'var(--tc-amber)',
              boxShadow: 'var(--tc-amber-glow)',
            }}
          >
            <IconLightbulb size={16} />
          </div>
          <span>Dispatch Tactical Guidance</span>
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

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Target Squad Selector */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tc-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Target Incident Squad
          </label>
          {targetTeam && (
            <span
              style={{
                fontSize: '11px',
                color: targetTeam.outcomeState === 'resolved' ? 'var(--tc-mint)' : 'var(--tc-amber)',
                fontWeight: 700,
                fontFamily: 'var(--tc-font-mono)',
              }}
            >
              ● {targetTeam.outcomeState === 'resolved' ? 'RESOLVED' : 'IN PROGRESS'} ({targetTeam.roster?.length || 0} online)
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {teams.map((t) => {
            const isSelected = t.teamId === activeTeamId;
            const isResolved = t.outcomeState === 'resolved';
            return (
              <button
                key={t.teamId}
                type="button"
                className={`tc-filter-pill ${isSelected ? 'tc-filter-pill--active' : ''}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                }}
                onClick={() => setActiveTeamId(t.teamId)}
              >
                <span
                  className="tc-pulse-beacon"
                  style={{
                    background: isResolved ? 'var(--tc-mint)' : 'var(--tc-amber)',
                    boxShadow: isResolved ? 'var(--tc-mint-glow)' : 'var(--tc-amber-glow)',
                  }}
                />
                <span>{(t.departmentCode || t.teamId).toUpperCase()}</span>
              </button>
            );
          })}
        </div>

        {/* Quick Clue Presets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tc-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Tactical Clue Presets
          </label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {DEFAULT_HINT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="tc-btn"
                onClick={() => handlePresetClick(preset.text)}
                title={preset.text}
                style={{
                  fontSize: '11px',
                  padding: '4px 10px',
                  background: 'rgba(255, 255, 255, 0.04)',
                }}
              >
                <span style={{ color: 'var(--tc-amber)', fontWeight: 800 }}>+</span>
                <span>{preset.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Hint Message Box */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tc-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Guidance Transmission
            </label>
            <span style={{ fontSize: '11px', fontFamily: 'var(--tc-font-mono)', color: message.length > 200 ? 'var(--tc-amber)' : 'var(--tc-text-muted)' }}>
              {message.length} chars
            </span>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type specific clues, file locations, or diagnostic instructions for this team…"
            rows={3}
            required
            autoFocus
            style={{
              width: '100%',
              background: 'var(--tc-glass-surface-inset)',
              border: '1px solid var(--tc-border)',
              borderRadius: '8px',
              color: '#fff',
              padding: '10px 14px',
              fontFamily: 'var(--tc-font-sans)',
              fontSize: '13px',
              lineHeight: '1.5',
              outline: 'none',
              resize: 'none',
            }}
          />
        </div>

        {/* Live Student-View Preview Card */}
        <div
          style={{
            background: 'rgba(251, 191, 36, 0.06)',
            border: '1px solid var(--tc-amber-border)',
            borderRadius: '8px',
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="tc-pulse-beacon" style={{ background: 'var(--tc-amber)', boxShadow: 'var(--tc-amber-glow)' }} />
            <span style={{ color: 'var(--tc-amber)', fontWeight: 800, fontSize: '10.5px', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              Student In-Game HUD Preview
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#f8fafc', lineHeight: '1.4' }}>
            {message.trim() || 'Type message above or click a preset to preview student alert…'}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="tc-modal-actions">
          <button
            type="button"
            className="tc-btn"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="tc-btn tc-btn--primary"
            disabled={isSubmitting || !message.trim()}
          >
            <IconSend size={13} />
            <span>{isSubmitting ? 'Transmitting…' : 'Transmit Guidance'}</span>
          </button>
        </div>
      </form>
    </dialog>
  );
}
