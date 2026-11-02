import React, { useState } from 'react';
import type { DashboardTeam } from './types';
import {
  IconAward,
  IconSearch,
  IconUsers,
  IconRadio,
  IconShield,
  IconClock,
  IconTerminal,
  IconAlertCircle,
  IconSend,
  IconFlag,
  IconCpu,
} from './icons';

interface ActivityItem {
  id: string;
  time: string;
  category: 'verification' | 'clue' | 'roster' | 'directive' | 'system';
  icon: React.ReactNode;
  title: string;
  text: string;
  badge?: string;
  badgeType?: 'success' | 'info' | 'warning' | 'purple';
}

interface Props {
  teams: DashboardTeam[];
  onBroadcast: (text: string) => Promise<void>;
  onOpenEndSession: () => void;
  isSimulatedDemo?: boolean;
}

export function TeacherActivityFeed({
  teams,
  onBroadcast,
  onOpenEndSession,
  isSimulatedDemo = false,
}: Props) {
  const [fastText, setFastText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [filterCategory, setFilterCategory] = useState<'all' | 'verification' | 'clue' | 'directive'>('all');

  // Fast broadcast chips
  const directivePresets = [
    { label: '5m Warning', icon: <IconClock size={11} />, text: 'Time Check: 5 minutes remaining in the incident simulation window.' },
    { label: 'Check Logs', icon: <IconTerminal size={11} />, text: 'Hint: Inspect the terminal logs for unhandled boundary exceptions.' },
    { label: 'Final Checks', icon: <IconAlertCircle size={11} />, text: 'Attention all sectors: Run sanity checks and submit your final commits.' },
    { label: 'Stand By', icon: <IconRadio size={11} />, text: 'Stand by: Instructor is reviewing real-time sector test runs.' },
  ];

  // Dynamic live activity events
  const feedItems: ActivityItem[] = [];

  if (isSimulatedDemo) {
    feedItems.push(
      {
        id: 'sim-verif-2',
        time: 'Just now',
        category: 'verification',
        icon: <IconAward size={13} color="var(--tc-mint)" />,
        title: 'Full Fix Verification Passed',
        text: 'Team Backend passed check_full.js. Inventory allocation constraint confirmed.',
        badge: 'SOLVED',
        badgeType: 'success',
      },
      {
        id: 'sim-verif-1',
        time: '02m ago',
        category: 'clue',
        icon: <IconSearch size={13} color="var(--tc-blue)" />,
        title: 'Diagnostic Milestone Reached',
        text: 'Maya Lin discovered decrement boundary defect in src/index.js.',
        badge: 'CLUE 1',
        badgeType: 'info',
      },
      {
        id: 'sim-seat-1',
        time: '04m ago',
        category: 'roster',
        icon: <IconUsers size={13} color="var(--tc-purple)" />,
        title: 'Engineer Checked In',
        text: 'Maya Lin seated at Workstation DESK 01 (Lead Architect).',
        badge: 'SEATED',
        badgeType: 'purple',
      },
      {
        id: 'sim-seat-2',
        time: '04m ago',
        category: 'roster',
        icon: <IconUsers size={13} color="var(--tc-purple)" />,
        title: 'Engineer Checked In',
        text: 'Alex Rivera seated at Workstation DESK 02 (Backend Engineer).',
        badge: 'SEATED',
        badgeType: 'purple',
      },
      {
        id: 'sim-directive-1',
        time: '05m ago',
        category: 'directive',
        icon: <IconRadio size={13} color="var(--tc-amber)" />,
        title: 'Tactical Directive Dispatched',
        text: 'Instructor broadcast: "Inspect the decrement boundary condition in src/index.js".',
        badge: 'BROADCAST',
        badgeType: 'warning',
      }
    );
  } else {
    teams.forEach((team) => {
      const deptName = (team.departmentCode || team.teamId).toUpperCase();
      if (team.outcomeState === 'resolved') {
        feedItems.push({
          id: `res-${team.teamId}`,
          time: 'Just now',
          category: 'verification',
          icon: <IconAward size={13} color="var(--tc-mint)" />,
          title: 'Full Fix Verification Passed',
          text: `Team ${deptName} passed check_full.js verification and resolved their incident!`,
          badge: 'RESOLVED',
          badgeType: 'success',
        });
      }
      if (team.diagnosticChecksPassed > 0) {
        feedItems.push({
          id: `diag-${team.teamId}`,
          time: 'Recent',
          category: 'clue',
          icon: <IconSearch size={13} color="var(--tc-blue)" />,
          title: 'Diagnostic Clue Milestone',
          text: `Team ${deptName} discovered ${team.diagnosticChecksPassed} diagnostic clue milestone(s).`,
          badge: 'DIAGNOSTIC',
          badgeType: 'info',
        });
      }
      team.roster?.forEach((r) => {
        if (r.connected && r.seated) {
          feedItems.push({
            id: `seat-${r.rosterEntryId}`,
            time: 'Active',
            category: 'roster',
            icon: <IconUsers size={13} color="var(--tc-purple)" />,
            title: 'Engineer Checked In',
            text: `${r.displayName} seated at ${r.deskId ? r.deskId.toUpperCase() : 'Desk 1'}.`,
            badge: 'SEATED',
            badgeType: 'purple',
          });
        }
      });
    });

    if (feedItems.length === 0) {
      feedItems.push({
        id: 'init-1',
        time: '00:00',
        category: 'system',
        icon: <IconCpu size={13} color="var(--tc-blue)" />,
        title: 'Telemetry Stream Initialized',
        text: 'Classroom simulation room created. Telemetry stream listening for student arrivals.',
        badge: 'STANDBY',
        badgeType: 'info',
      });
    }
  }

  const filteredItems = feedItems.filter((item) => {
    if (filterCategory === 'all') return true;
    return item.category === filterCategory;
  });

  const handleFastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fastText.trim() || isSending) return;

    setIsSending(true);
    try {
      await onBroadcast(fastText.trim());
      setFastText('');
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickChip = (text: string) => {
    setFastText(text);
  };

  return (
    <aside className="tc-ops-stream-panel" aria-label="Operations Stream & Fast Directives">
      {/* Stream Header */}
      <div className="tc-ops-header">
        <div className="tc-ops-kicker">
          <span className="tc-pulse-beacon" style={{ background: 'var(--tc-blue)', boxShadow: '0 0 6px var(--tc-blue)' }} />
          <span>OPERATIONS TELEMETRY</span>
        </div>
        <span className="tc-ops-live-pill">LIVE 4s</span>
      </div>

      {/* Stream Category Filters */}
      <div className="tc-ops-category-bar">
        <button
          type="button"
          className={`tc-cat-pill ${filterCategory === 'all' ? 'tc-cat-pill--active' : ''}`}
          onClick={() => setFilterCategory('all')}
        >
          All ({feedItems.length})
        </button>
        <button
          type="button"
          className={`tc-cat-pill ${filterCategory === 'verification' ? 'tc-cat-pill--active' : ''}`}
          onClick={() => setFilterCategory('verification')}
        >
          Checks
        </button>
        <button
          type="button"
          className={`tc-cat-pill ${filterCategory === 'clue' ? 'tc-cat-pill--active' : ''}`}
          onClick={() => setFilterCategory('clue')}
        >
          Clues
        </button>
        <button
          type="button"
          className={`tc-cat-pill ${filterCategory === 'directive' ? 'tc-cat-pill--active' : ''}`}
          onClick={() => setFilterCategory('directive')}
        >
          Comms
        </button>
      </div>

      {/* Live Event Stream List */}
      <div className="tc-ops-stream-list" role="log" aria-live="polite">
        {filteredItems.map((item) => (
          <div key={item.id} className="tc-ops-event-card">
            <div className="tc-ops-event-top">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="tc-ops-event-icon">{item.icon}</span>
                <span className="tc-ops-event-title">{item.title}</span>
              </div>
              <span className="tc-ops-event-time">{item.time}</span>
            </div>

            <p className="tc-ops-event-text">{item.text}</p>

            {item.badge && (
              <span
                className={`tc-ops-event-badge tc-ops-event-badge--${item.badgeType || 'info'}`}
              >
                {item.badge}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Fast Directive Broadcast Console */}
      <div className="tc-ops-directive-box">
        <div className="tc-directive-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <IconRadio size={12} color="var(--tc-blue)" />
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff', letterSpacing: '0.4px' }}>
              FAST DIRECTIVE BROADCAST
            </span>
          </div>
          <span style={{ fontSize: '10px', color: 'var(--tc-text-muted)' }}>All Workstations</span>
        </div>

        {/* Quick Directive Chips */}
        <div className="tc-directive-chips">
          {directivePresets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              className="tc-chip-btn"
              onClick={() => handleQuickChip(preset.text)}
              title={preset.text}
            >
              {preset.icon}
              <span>{preset.label}</span>
            </button>
          ))}
        </div>

        {/* Custom Broadcast Form */}
        <form onSubmit={handleFastSubmit} className="tc-directive-form">
          <input
            type="text"
            className="tc-directive-input"
            placeholder="Type announcement… (Enter to push)"
            value={fastText}
            onChange={(e) => setFastText(e.target.value)}
            disabled={isSending}
            aria-label="Fast directive text"
          />
          <button
            type="submit"
            className="tc-directive-send-btn"
            disabled={!fastText.trim() || isSending}
            title="Push to all workstations"
          >
            <IconSend size={11} />
            <span>{isSending ? '…' : 'Push'}</span>
          </button>
        </form>
      </div>

      {/* Session Lifecycle Control & Non-Punitive Guarantee Box */}
      <div className="tc-ops-lifecycle-box">
        <div className="tc-lifecycle-header">
          <span className="tc-lifecycle-tag">SESSION LIFECYCLE · SCR-18</span>
        </div>

        <p className="tc-lifecycle-desc">
          Conclude active simulation and compile classroom debrief analytics.
        </p>

        <div className="tc-non-punitive-notice">
          <IconShield size={13} color="var(--tc-purple)" style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>Non-Punitive Protocol Active (PRD §13.3): Teams still investigating will be framed with partial diagnostic progress.</span>
        </div>

        <button
          type="button"
          className="tc-btn--end"
          onClick={onOpenEndSession}
          title="Conclude session and view debrief"
        >
          <IconFlag size={13} />
          <span>Conclude & Debrief Session</span>
        </button>
      </div>
    </aside>
  );
}
