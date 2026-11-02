import { useState, useEffect } from 'react';
import { DEFAULT_BROADCAST_PRESETS, type DashboardTeam } from './types';
import { IconRadio, IconGlobe, IconSend, IconClock, IconLightbulb } from './icons';
import { teacherEventBus, type SentAnnouncement } from './eventBus';

interface Props {
  teams: DashboardTeam[];
  onBroadcast: (text: string) => Promise<void>;
}

export function TeacherCommsView({ teams, onBroadcast }: Props) {
  const [text, setText] = useState('');
  const [targetTeam, setTargetTeam] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState<SentAnnouncement[]>(() => teacherEventBus.getAnnouncements());

  useEffect(() => {
    const unsubscribe = teacherEventBus.subscribe(() => {
      setHistory(teacherEventBus.getAnnouncements());
    });
    return unsubscribe;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isSubmitting) return;

    const targetLabel = targetTeam === 'all' ? 'All Workstations' : targetTeam.toUpperCase();
    setIsSubmitting(true);
    try {
      await onBroadcast(text.trim());
      teacherEventBus.addAnnouncement(text.trim(), targetLabel);
      setText('');
    } catch {
      // Handled by parent toast
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="tc-roster-view" role="region" aria-label="Communications Console">
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', flex: 1, minHeight: 0 }}>
        {/* Left: Compose Broadcast */}
        <div
          style={{
            background: 'var(--tc-glass-bg)',
            border: '1px solid var(--tc-border)',
            borderRadius: '14px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            boxShadow: 'var(--tc-shadow-lg)',
            backdropFilter: 'var(--tc-glass-blur)',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              background: 'var(--tc-cyan-tint)',
              border: '1px solid var(--tc-cyan-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--tc-cyan)',
              boxShadow: 'var(--tc-cyan-glow)',
            }}>
              <IconRadio size={16} />
            </div>
            <span>Dispatch System Broadcast</span>
          </h3>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            {/* Target Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tc-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Target Recipients
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`tc-filter-pill ${targetTeam === 'all' ? 'tc-filter-pill--active' : ''}`}
                  onClick={() => setTargetTeam('all')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <IconGlobe size={13} />
                  <span>All Workstations (Broadcast)</span>
                </button>
                {teams.map((t) => (
                  <button
                    key={t.teamId}
                    type="button"
                    className={`tc-filter-pill ${targetTeam === t.teamId ? 'tc-filter-pill--active' : ''}`}
                    onClick={() => setTargetTeam(t.teamId)}
                  >
                    {(t.departmentCode || t.teamId).toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Templates */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tc-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Quick Directive Templates
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {DEFAULT_BROADCAST_PRESETS.map((preset, idx) => {
                  const tag = preset.startsWith('[') && preset.includes(']')
                    ? preset.slice(1, preset.indexOf(']'))
                    : `Preset ${idx + 1}`;
                  return (
                    <button
                      key={idx}
                      type="button"
                      className="tc-btn"
                      style={{ fontSize: '11.5px', padding: '5px 10px', background: 'rgba(255, 255, 255, 0.04)' }}
                      onClick={() => setText(preset)}
                      title={preset}
                    >
                      <IconLightbulb size={12} color="var(--tc-amber)" />
                      <span>{tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Textarea */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tc-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Directive Message Body
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type instructor announcement to display across student workstations..."
                style={{
                  flex: 1,
                  minHeight: '130px',
                  background: 'var(--tc-glass-surface-inset)',
                  border: '1px solid var(--tc-border)',
                  borderRadius: '10px',
                  color: '#fff',
                  padding: '14px',
                  fontFamily: 'var(--tc-font-sans)',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  outline: 'none',
                  resize: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="submit"
                className="tc-btn tc-btn--primary"
                disabled={!text.trim() || isSubmitting}
                style={{ padding: '8px 20px', fontSize: '13px' }}
              >
                <IconSend size={14} />
                <span>{isSubmitting ? 'Transmitting Directive…' : 'Transmit Broadcast'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right: Dispatch History */}
        <div
          style={{
            background: 'var(--tc-glass-bg)',
            border: '1px solid var(--tc-border)',
            borderRadius: '14px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: 'var(--tc-shadow-lg)',
            backdropFilter: 'var(--tc-glass-blur)',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--tc-border-subtle)', paddingBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconClock size={15} color="var(--tc-cyan)" />
              <span>Transmission Log</span>
            </span>
            <span style={{ fontSize: '11px', fontFamily: 'var(--tc-font-mono)', color: 'var(--tc-text-muted)' }}>
              {history.length} Sent
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {history.map((msg) => (
              <div
                key={msg.id}
                style={{
                  background: 'var(--tc-glass-surface-inset)',
                  border: '1px solid var(--tc-border-subtle)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--tc-cyan)', background: 'var(--tc-cyan-tint)', border: '1px solid var(--tc-cyan-border)', padding: '1px 6px', borderRadius: '4px' }}>
                    {msg.target}
                  </span>
                  <span style={{ fontSize: '10.5px', fontFamily: 'var(--tc-font-mono)', color: 'var(--tc-text-muted)' }}>
                    {msg.time}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#e2e8f0', lineHeight: '1.45' }}>
                  {msg.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
