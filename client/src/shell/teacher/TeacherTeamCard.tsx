import { useState } from 'react';
import type { DashboardTeam } from './types';
import {
  IconCheck,
  IconTerminal,
  IconLightbulb,
  IconUsers,
  IconChevronRight,
  IconZap,
} from './icons';

interface Props {
  team: DashboardTeam;
  onSendHint: (teamId: string) => void;
  isSimulatedDemo?: boolean;
}

export function TeacherTeamCard({ team, onSendHint, isSimulatedDemo = false }: Props) {
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [showLogOutput, setShowLogOutput] = useState(false);

  const isResolved = team.outcomeState === 'resolved';
  const deptCode = (team.departmentCode || team.teamId || 'team').toLowerCase();

  const deptLabels: Record<string, string> = {
    frontend: 'Frontend Studio',
    backend: 'Backend Engine Room',
    devops: 'DevOps Control Room',
    qa: 'QA Testing Lab',
  };
  const deptDisplayName = deptLabels[deptCode] || `${deptCode.toUpperCase()} Team`;
  const deptAbbr = deptCode.slice(0, 2).toUpperCase();

  const roster = team.roster || [];
  const connectedStudents = roster.filter((r) => r.connected);
  const seatedStudents = roster.filter((r) => r.seated);

  // Stepper milestones
  const hasClue1 = team.diagnosticChecksPassed >= 1 || isSimulatedDemo;
  const hasPassedFix = team.fullFixChecksPassed >= 1 || isResolved;

  // 4 Tactical Desks Mapping
  // If simulated demo is active, use realistic 4-student preview; otherwise, map live students intelligently
  const simulatedStudents = [
    {
      deskId: 'Desk 01',
      name: 'Maya Lin',
      initials: 'ML',
      status: 'Seated at Workstation · Editing src/index.js',
      active: true,
      seated: true,
      color: 'var(--tc-mint)',
    },
    {
      deskId: 'Desk 02',
      name: 'Alex Rivera',
      initials: 'AR',
      status: 'Seated at Workstation · Ran check_logic (Passed)',
      active: true,
      seated: true,
      color: 'var(--tc-cyan)',
    },
    {
      deskId: 'Desk 03',
      name: 'Chen Wei',
      initials: 'CW',
      status: 'Seated at Workstation · Inspecting error traces',
      active: true,
      seated: true,
      color: 'var(--tc-amber)',
    },
    {
      deskId: 'Desk 04',
      name: 'Sarah Connor',
      initials: 'SC',
      status: 'Seated at Workstation · Verifying non-negative stock',
      active: true,
      seated: true,
      color: 'var(--tc-purple)',
    },
  ];

  // Resolve 4 desk pods for live students
  const deskSlots = [1, 2, 3, 4].map((slotNum) => {
    const deskLabel = `Desk 0${slotNum}`;

    if (isSimulatedDemo) {
      return simulatedStudents[slotNum - 1];
    }

    // Find student specifically seated at this desk, or assign by connected/roster index
    const studentAtDesk =
      roster.find((r) => r.deskId === `desk-${slotNum}` || r.deskId === `desk-0${slotNum}`) ||
      roster[slotNum - 1];

    if (!studentAtDesk) {
      return {
        deskId: deskLabel,
        name: 'Available Desk',
        initials: '--',
        status: 'Ready for check-in',
        active: false,
        seated: false,
        color: 'var(--tc-text-muted)',
      };
    }

    const initials = studentAtDesk.displayName
      ? studentAtDesk.displayName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : 'ST';

    let statusText = 'Ready for check-in';
    if (studentAtDesk.connected) {
      statusText = studentAtDesk.seated
        ? 'Seated at Workstation · Active in Lab'
        : 'Online in Sector · Roaming / Standby';
    }

    return {
      deskId: deskLabel,
      name: studentAtDesk.displayName,
      initials,
      status: statusText,
      active: studentAtDesk.connected,
      seated: studentAtDesk.seated,
      color: studentAtDesk.connected
        ? studentAtDesk.seated
          ? 'var(--tc-mint)'
          : 'var(--tc-cyan)'
        : 'var(--tc-text-muted)',
    };
  });

  return (
    <article
      className={`tc-team-card ${isResolved ? 'tc-team-card--resolved' : ''}`}
      aria-label={`${deptDisplayName} Team Status Card`}
    >
      {/* 1. Sector Card Header */}
      <div className="tc-team-card-header">
        <div className="tc-team-identity">
          <div className="tc-team-avatar">
            {deptAbbr}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 className="tc-team-title">{deptDisplayName}</h3>
              <span className="tc-team-target-tag">Target: src/index.js</span>
            </div>
            <span className="tc-team-subtitle">
              Node #{team.teamId.slice(0, 8)} · Port 8080 · cart-service
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isResolved && (
            <span
              className="tc-status-badge"
              style={{
                color: 'var(--tc-mint)',
                border: '1px solid var(--tc-mint-border)',
                background: 'var(--tc-mint-tint)',
                boxShadow: 'var(--tc-mint-glow)',
              }}
            >
              <IconZap size={12} />
              <span>SOLVED IN 04m 12s</span>
            </span>
          )}

          <span
            className={`tc-status-badge ${
              isResolved ? 'tc-status-badge--resolved' : 'tc-status-badge--progress'
            }`}
          >
            {isResolved ? (
              <>
                <IconCheck size={12} strokeWidth={2.5} />
                <span>RESOLVED</span>
              </>
            ) : (
              <>
                <span className="tc-pulse-beacon" style={{ background: 'var(--tc-amber)', boxShadow: '0 0 8px var(--tc-amber)' }} />
                <span>IN PROGRESS</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* 2. Diagnostic & Verification Checks */}
      <div className="tc-test-section">
        <div className="tc-test-section-header">
          <span className="tc-test-section-title">Diagnostic & Verification Test Telemetry</span>
          <span style={{ fontSize: '11.5px', fontFamily: 'var(--tc-font-mono)', color: 'var(--tc-text-secondary)' }}>
            {isResolved
              ? '2 of 2 Passing (100%)'
              : hasClue1
              ? '1 of 2 Passing (50%)'
              : '0 of 2 Passing (0%)'}
          </span>
        </div>

        <div className="tc-test-rows">
          <div className="tc-test-row">
            <div className="tc-test-row-left">
              <span className="tc-test-code">check_logic</span>
              <span className="tc-test-desc">Diagnostic Check · Isolated decrement boundary defect</span>
            </div>
            <span className={`tc-test-badge ${hasClue1 ? 'tc-test-badge--pass' : 'tc-test-badge--pending'}`}>
              {hasClue1 ? (
                <>
                  <IconCheck size={11} strokeWidth={2.5} />
                  <span>PASS (14ms)</span>
                </>
              ) : (
                <span>NOT RUN</span>
              )}
            </span>
          </div>

          <div className="tc-test-row">
            <div className="tc-test-row-left">
              <span className="tc-test-code">check_full</span>
              <span className="tc-test-desc">Verification Check · Enforces non-negative stock allocation</span>
            </div>
            <span className={`tc-test-badge ${hasPassedFix ? 'tc-test-badge--pass' : 'tc-test-badge--pending'}`}>
              {hasPassedFix ? (
                <>
                  <IconCheck size={11} strokeWidth={2.5} />
                  <span>PASS (32ms)</span>
                </>
              ) : (
                <span>PENDING RECHECK</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* 3. 4-Desk Tactical Pod */}
      <div className="tc-roster-section">
        <div className="tc-roster-header">
          <span className="tc-roster-title">
            4-Desk Tactical Pod ({isSimulatedDemo ? '4/4 Seated' : `${connectedStudents.length} Online · ${seatedStudents.length} Seated`})
          </span>
          <span style={{ fontSize: '11px', fontFamily: 'var(--tc-font-mono)', color: 'var(--tc-cyan)' }}>
            Room Code: {team.teamId.slice(0, 8).toUpperCase()}
          </span>
        </div>

        <div className="tc-student-list">
          {deskSlots.map((slot, idx) => (
            <div
              key={slot.deskId || idx}
              className={`tc-student-item ${slot.active ? 'tc-student-item--active' : ''}`}
            >
              <div
                className={`tc-student-initials ${slot.active ? 'tc-student-initials--active' : ''}`}
                style={{ color: slot.color, borderColor: slot.color }}
              >
                {slot.initials}
              </div>
              <div className="tc-student-info">
                <div className="tc-student-name-row">
                  <span className="tc-student-name">{slot.name}</span>
                  <span className="tc-student-desk">{slot.deskId}</span>
                </div>
                <div className="tc-student-action">{slot.status}</div>
              </div>
              {slot.active && (
                <button
                  type="button"
                  className="tc-btn-subtle"
                  style={{ padding: '3px 6px', fontSize: '10.5px' }}
                  onClick={() => onSendHint(team.teamId)}
                  title={`Send direct clue to ${slot.name}`}
                >
                  <IconLightbulb size={11} color="var(--tc-amber)" />
                  <span>Clue</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 4. Live Terminal Telemetry Drawer */}
      {showLogOutput && (
        <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--tc-border)' }}>
          <div
            style={{
              padding: '8px 14px',
              background: 'rgba(6, 10, 20, 0.95)',
              borderBottom: '1px solid var(--tc-border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
              </div>
              <span style={{ fontSize: '11px', fontFamily: 'var(--tc-font-mono)', color: 'var(--tc-cyan)' }}>
                LIVE CONTAINER HARNESS · cart-service :8080 · Node #{team.teamId.slice(0, 8)}
              </span>
            </div>
            <button
              type="button"
              className="tc-btn-subtle"
              onClick={() => setShowLogOutput(false)}
            >
              Close
            </button>
          </div>
          <pre className="tc-code-diff" style={{ maxHeight: '160px' }}>
            <code>
              <span style={{ color: 'var(--tc-text-muted)' }}>[HARNESS] Attached to cart-service container runtime sandbox.</span>
              {'\n'}
              <span style={{ color: 'var(--tc-text-secondary)' }}>[EXEC] Executing diagnostic test: test/check_logic.js...</span>
              {'\n'}
              {hasClue1 ? (
                <span style={{ color: 'var(--tc-mint)' }}>✔ check_logic.js: PASS (14ms) [Decrement Logic Verified: Isolated decrement defect resolved]</span>
              ) : (
                <span style={{ color: 'var(--tc-amber)' }}>⏳ check_logic.js: RUNNING... [Awaiting student test run]</span>
              )}
              {'\n'}
              <span style={{ color: 'var(--tc-text-secondary)' }}>[EXEC] Executing verification test: test/check_full.js...</span>
              {'\n'}
              {hasPassedFix ? (
                <span style={{ color: 'var(--tc-mint)' }}>✔ check_full.js: PASS (32ms) [Inventory Constraints Enforced: Concurrent checkout integrity guaranteed]</span>
              ) : (
                <span style={{ color: 'var(--tc-rose)' }}>✖ check_full.js: FAIL [AssertionError: Stock dropped below zero on concurrent checkouts]</span>
              )}
              {'\n'}
              <span style={{ color: 'var(--tc-cyan)' }}>[TELEMETRY] Test suite completed with status: {isResolved ? 'ALL_CHECKS_PASSED' : 'DIAGNOSTIC_MILESTONE_REACHED'}</span>
            </code>
          </pre>
        </div>
      )}

      {/* 5. Sector Action Footer */}
      <div className="tc-team-card-footer">
        <div className="tc-btn-group">
          <button
            type="button"
            className="tc-btn tc-btn--hint"
            onClick={() => onSendHint(team.teamId)}
            title={`Send instructor clue to ${deptDisplayName}`}
          >
            <IconLightbulb size={13} />
            <span>Send Clue</span>
          </button>

          <button
            type="button"
            className="tc-btn tc-btn--primary"
            onClick={() => setShowLogOutput(!showLogOutput)}
          >
            <IconTerminal size={13} />
            <span>{showLogOutput ? 'Hide Terminal' : 'Terminal Telemetry'}</span>
          </button>
        </div>

        {roster.length > 0 && (
          <button
            type="button"
            className="tc-btn-subtle"
            onClick={() => setShowRosterModal(true)}
          >
            <IconUsers size={12} />
            <span>View All Roster ({roster.length})</span>
            <IconChevronRight size={12} />
          </button>
        )}
      </div>

      {/* Quick Team Roster Dialog */}
      {showRosterModal && (
        <dialog
          className="tc-modal"
          open
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowRosterModal(false);
          }}
          style={{ maxWidth: '460px' }}
        >
          <div className="tc-modal-header">
            <h3 className="tc-modal-title">
              <IconUsers size={16} color="var(--tc-cyan)" />
              <span>{deptDisplayName} Enrolled Agents ({roster.length})</span>
            </h3>
            <button
              type="button"
              className="tc-modal-close-btn"
              onClick={() => setShowRosterModal(false)}
            >
              ✕
            </button>
          </div>
          <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {roster.map((s) => (
              <div
                key={s.rosterEntryId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'var(--tc-glass-surface-inset)',
                  border: '1px solid var(--tc-border-subtle)',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    className="tc-pulse-beacon"
                    style={{
                      background: s.connected ? 'var(--tc-mint)' : '#64748b',
                      boxShadow: s.connected ? 'var(--tc-mint-glow)' : 'none',
                    }}
                  />
                  <div>
                    <span style={{ color: '#fff', fontWeight: 700 }}>{s.displayName}</span>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--tc-text-muted)' }}>
                      {s.connected ? (s.seated ? 'Seated at Workstation' : 'Roaming / Standby in Lab') : 'Offline'}
                    </span>
                  </div>
                </div>
                <span style={{ color: 'var(--tc-cyan)', fontSize: '11px', fontFamily: 'var(--tc-font-mono)' }}>
                  {s.seated ? `Seat: ${s.deskId || 'Desk'}` : 'In Sector'}
                </span>
              </div>
            ))}
          </div>
          <div className="tc-modal-actions">
            <button
              type="button"
              className="tc-btn tc-btn--primary"
              onClick={() => setShowRosterModal(false)}
            >
              Close
            </button>
          </div>
        </dialog>
      )}
    </article>
  );
}
