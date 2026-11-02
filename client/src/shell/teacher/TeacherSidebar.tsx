import React, { useState, useEffect } from 'react';
import type { DashboardTeam } from './types';
import {
  IconRadio,
  IconLightbulb,
  IconSend,
  IconFlag,
  IconShield,
  IconKey,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconClock,
  IconUsers,
  IconAward,
  IconAlertCircle,
} from './icons';
import { teacherEventBus, type TimelineEvent } from './eventBus';

interface Props {
  teams: DashboardTeam[];
  onBroadcast: (text: string) => Promise<void>;
  onSendHint: (teamId: string, message: string) => void;
  onOpenEndSession: () => void;
  isSimulatedDemo?: boolean;
}

export function TeacherSidebar({
  teams,
  onBroadcast,
  onSendHint,
  onOpenEndSession,
}: Props) {
  const [activeSidebarTab, setActiveSidebarTab] = useState<'feed' | 'guide'>('feed');
  const [broadcastText, setBroadcastText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showSolutionDiff, setShowSolutionDiff] = useState(false);
  const [dispatchedClue, setDispatchedClue] = useState<number | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>(() => teacherEventBus.getEvents());

  // Subscribe to live event bus
  useEffect(() => {
    const unsubscribe = teacherEventBus.subscribe(() => {
      setEvents(teacherEventBus.getEvents());
    });
    return unsubscribe;
  }, []);

  const targetTeam = teams[0];
  const deptDisplayName = targetTeam
    ? targetTeam.departmentCode
      ? `${targetTeam.departmentCode.toUpperCase()} Team`
      : 'Backend Engine Room'
    : 'Classroom Teams';

  // Progressive clues
  const progressiveClues = [
    {
      level: 1,
      badge: 'CLUE 1 · NUDGE',
      title: 'Inspect Decrement Condition',
      text: 'Inspect the decrement logic in src/index.js. Notice how inventory counts handle rapid consecutive checkout requests.',
    },
    {
      level: 2,
      badge: 'CLUE 2 · TARGET LINE',
      title: 'Check Boundary Guard',
      text: 'Look at the stock validation check before reducing quantity. Ensure inventory does not decrement when available count is zero.',
    },
    {
      level: 3,
      badge: 'CLUE 3 · DIRECT FIX',
      title: 'Apply Allocation Guard',
      text: 'Add check: if (inventory[itemId] < requestedQty) { throw new Error("INSUFFICIENT_STOCK"); } before updating inventory count.',
    },
  ];

  const handlePushClue = (level: number, title: string, text: string) => {
    if (!targetTeam) return;
    onSendHint(targetTeam.teamId, text);
    teacherEventBus.recordHintSent(deptDisplayName, title, text);
    setDispatchedClue(level);
    setTimeout(() => setDispatchedClue(null), 2500);
  };

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText.trim() || isSending) return;

    const msg = broadcastText.trim();
    setIsSending(true);
    try {
      await onBroadcast(msg);
      teacherEventBus.addAnnouncement(msg, 'All Workstations');
      setBroadcastText('');
    } finally {
      setIsSending(false);
    }
  };

  // Helper for event type icon
  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'check':
        return <IconCheck size={14} color="var(--tc-mint)" />;
      case 'hint':
        return <IconLightbulb size={14} color="var(--tc-amber)" />;
      case 'broadcast':
        return <IconRadio size={14} color="var(--tc-cyan)" />;
      case 'seated':
      case 'join':
        return <IconUsers size={14} color="var(--tc-purple)" />;
      case 'resolved':
        return <IconAward size={14} color="var(--tc-mint)" />;
      case 'error':
        return <IconAlertCircle size={14} color="var(--tc-rose)" />;
      default:
        return <IconClock size={14} color="var(--tc-cyan)" />;
    }
  };

  return (
    <aside className="tc-sidebar-card" aria-label="Activity Feed and Incident Guide">
      {/* 1. Sidebar Segmented Tabs */}
      <div className="tc-sidebar-tabs">
        <button
          type="button"
          className={`tc-sidebar-tab ${activeSidebarTab === 'feed' ? 'tc-sidebar-tab--active' : ''}`}
          onClick={() => setActiveSidebarTab('feed')}
        >
          <IconRadio size={14} />
          <span>Live Activity</span>
        </button>

        <button
          type="button"
          className={`tc-sidebar-tab ${activeSidebarTab === 'guide' ? 'tc-sidebar-tab--active' : ''}`}
          onClick={() => setActiveSidebarTab('guide')}
        >
          <IconLightbulb size={14} />
          <span>Incident Guide</span>
        </button>
      </div>

      {/* 2. Tab Content: Live Feed */}
      {activeSidebarTab === 'feed' ? (
        <>
          <div className="tc-timeline" role="log" aria-live="polite">
            {events.map((evt) => (
              <div key={evt.id} className="tc-timeline-item">
                <div className="tc-timeline-icon">
                  {getEventIcon(evt.type)}
                </div>
                <div className="tc-timeline-content">
                  <div className="tc-timeline-header">
                    <span className="tc-timeline-title">{evt.title}</span>
                    <span className="tc-timeline-time">{evt.time}</span>
                  </div>
                  <p className="tc-timeline-desc">{evt.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Intercom / Broadcast Bar */}
          <div className="tc-broadcast-bar">
            <form onSubmit={handleBroadcastSubmit} className="tc-broadcast-form">
              <input
                type="text"
                className="tc-broadcast-input"
                placeholder="Broadcast directive to all student screens…"
                value={broadcastText}
                onChange={(e) => setBroadcastText(e.target.value)}
                disabled={isSending}
              />
              <button
                type="submit"
                className="tc-btn tc-btn--primary"
                disabled={!broadcastText.trim() || isSending}
                style={{ padding: '6px 14px' }}
                title="Send system-wide broadcast"
              >
                <IconSend size={13} />
                <span>{isSending ? '…' : 'Send'}</span>
              </button>
            </form>
          </div>
        </>
      ) : (
        /* 3. Tab Content: Incident Guide & Solution */
        <div className="tc-guide-body">
          {/* Scenario Overview */}
          <div className="tc-guide-scenario-box">
            <h4 className="tc-guide-title">OmniCart Inventory Incident</h4>
            <p className="tc-guide-desc">
              Customers report stock counts dropping below zero during checkout bursts. Students must enforce stock guards in <code>src/index.js</code>.
            </p>
            <div className="tc-guide-meta-grid">
              <div className="tc-guide-meta-item">
                <span>Target Service</span>
                <strong>cart-service (:8080)</strong>
              </div>
              <div className="tc-guide-meta-item">
                <span>Target File</span>
                <strong>src/index.js</strong>
              </div>
              <div className="tc-guide-meta-item">
                <span>Diagnostic Check</span>
                <strong>check_logic</strong>
              </div>
              <div className="tc-guide-meta-item">
                <span>Verification Check</span>
                <strong>check_full</strong>
              </div>
            </div>
          </div>

          {/* Instructor Clues */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tc-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Instructor Clues (Progressive)
            </span>
            {progressiveClues.map((clue) => {
              const isDispatched = dispatchedClue === clue.level;
              return (
                <div key={clue.level} className="tc-clue-card">
                  <div className="tc-clue-card-header">
                    <span className="tc-clue-badge">{clue.badge}</span>
                    <button
                      type="button"
                      className="tc-btn tc-btn--hint"
                      style={{ padding: '2px 8px', fontSize: '10.5px' }}
                      onClick={() => handlePushClue(clue.level, clue.title, clue.text)}
                      disabled={isDispatched}
                    >
                      {isDispatched ? (
                        <>
                          <IconCheck size={10} strokeWidth={2.5} />
                          <span>Sent</span>
                        </>
                      ) : (
                        <span>Push to Team</span>
                      )}
                    </button>
                  </div>
                  <span className="tc-clue-title">{clue.title}</span>
                  <p className="tc-clue-body">{clue.text}</p>
                </div>
              );
            })}
          </div>

          {/* Reference Solution Diff */}
          <div style={{ borderTop: '1px solid var(--tc-border)', paddingTop: '12px' }}>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: '8px' }}
              onClick={() => setShowSolutionDiff(!showSolutionDiff)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IconKey size={14} color="var(--tc-purple)" />
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#fff' }}>Reference Solution Diff</span>
              </div>
              <span style={{ fontSize: '11.5px', color: 'var(--tc-cyan)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                {showSolutionDiff ? (
                  <>
                    <span>Hide</span>
                    <IconChevronDown size={12} />
                  </>
                ) : (
                  <>
                    <span>View Diff</span>
                    <IconChevronRight size={12} />
                  </>
                )}
              </span>
            </div>

            {showSolutionDiff && (
              <pre className="tc-code-diff">
                <code>
                  <span className="tc-diff-del">{'-  inventory[itemId] -= requestedQty;'}</span>
                  {'\n'}
                  <span className="tc-diff-add">{'+  if (inventory[itemId] < requestedQty) {'}</span>
                  {'\n'}
                  <span className="tc-diff-add">{'+    return res.status(400).json({ error: "INSUFFICIENT_STOCK" });'}</span>
                  {'\n'}
                  <span className="tc-diff-add">{'+  }'}</span>
                  {'\n'}
                  <span className="tc-diff-add">{'+  inventory[itemId] -= requestedQty;'}</span>
                </code>
              </pre>
            )}
          </div>
        </div>
      )}

      {/* 4. Conclude Lab Box (Non-Punitive Mandate) */}
      <div className="tc-end-lab-box">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--tc-text-secondary)' }}>
          <IconShield size={13} color="var(--tc-cyan)" />
          <span>Non-punitive policy: Unresolved teams preserve partial progress.</span>
        </div>
        <button
          type="button"
          className="tc-btn tc-btn--danger"
          onClick={onOpenEndSession}
          style={{ width: '100%', padding: '8px 14px', justifyContent: 'center' }}
        >
          <IconFlag size={13} />
          <span>Conclude Lab & Debrief</span>
        </button>
      </div>
    </aside>
  );
}
