import { useState } from 'react';
import type { DashboardTeam } from './types';
import {
  IconLayers,
  IconGlobe,
  IconCpu,
  IconDatabase,
  IconSearch,
  IconTarget,
  IconLightbulb,
  IconKey,
  IconZap,
  IconChevronDown,
  IconChevronRight,
  IconCheck,
} from './icons';

interface Props {
  teams: DashboardTeam[];
  onSendHint: (teamId: string, message: string) => void;
  activeTeamId?: string;
}

export function TeacherIncidentDossier({ teams, onSendHint, activeTeamId }: Props) {
  const [showSolutionDiff, setShowSolutionDiff] = useState(false);
  const [dispatchedClue, setDispatchedClue] = useState<number | null>(null);

  const targetTeam = activeTeamId
    ? teams.find((t) => t.teamId === activeTeamId) || teams[0]
    : teams[0];

  const handlePushClue = (level: number, text: string) => {
    if (!targetTeam) return;
    onSendHint(targetTeam.teamId, text);
    setDispatchedClue(level);
    setTimeout(() => setDispatchedClue(null), 2500);
  };

  const progressiveClues = [
    {
      level: 1,
      badge: 'CLUE 1 · NUDGE',
      title: 'Inspect Decrement Condition',
      text: 'Inspect the decrement logic in src/index.js. Notice how inventory counts handle high-traffic or rapid consecutive checkout requests.',
    },
    {
      level: 2,
      badge: 'CLUE 2 · TARGET LINE',
      title: 'Check Boundary Guard',
      text: 'Look at the stock validation check before reducing quantity. Ensure inventory does not decrement when available count is zero or less than requested.',
    },
    {
      level: 3,
      badge: 'CLUE 3 · DIRECT FIX',
      title: 'Apply Allocation Guard',
      text: 'Add boundary check: if (inventory[itemId] < requestedQty) { throw new Error("INSUFFICIENT_STOCK"); } before updating inventory count.',
    },
  ];

  const isResolved = targetTeam?.outcomeState === 'resolved';

  return (
    <aside className="tc-incident-dossier" aria-label="Incident Intelligence Dossier">
      {/* Dossier Header */}
      <div className="tc-dossier-header">
        <div className="tc-dossier-kicker">
          <span className="tc-pulse-beacon" />
          <span>INCIDENT INTELLIGENCE</span>
        </div>
        <span className="tc-dossier-variant-tag">v1.4 · Specialist</span>
      </div>

      {/* Scenario Blueprint Card */}
      <div className="tc-dossier-card">
        <div className="tc-dossier-title-row">
          <div className="tc-dossier-icon">
            <IconLayers size={18} />
          </div>
          <div>
            <h3 className="tc-dossier-title">OmniCart Inventory Incident</h3>
            <span className="tc-dossier-sub">Domain: Backend Engine Room</span>
          </div>
        </div>

        <p className="tc-dossier-desc">
          High-priority production incident: Customers report inventory counts drop below zero on high-traffic items. Teams must isolate decrement logic in <code>src/index.js</code> and enforce allocation guards.
        </p>

        <div className="tc-dossier-meta-grid">
          <div className="tc-meta-item">
            <span className="tc-meta-label">BUG CLASSIFICATION</span>
            <span className="tc-meta-value" style={{ color: 'var(--tc-blue)' }}>Logic Bug</span>
          </div>
          <div className="tc-meta-item">
            <span className="tc-meta-label">DIFFICULTY</span>
            <span className="tc-meta-value" style={{ color: 'var(--tc-amber)' }}>Beginner</span>
          </div>
          <div className="tc-meta-item">
            <span className="tc-meta-label">TARGET FILE</span>
            <span className="tc-meta-value" style={{ color: 'var(--tc-purple)' }}>src/index.js</span>
          </div>
          <div className="tc-meta-item">
            <span className="tc-meta-label">PORT / REPO</span>
            <span className="tc-meta-value">logic-bug-01:8080</span>
          </div>
        </div>
      </div>

      {/* Interactive System Topology Mini-Diagram */}
      <div className="tc-dossier-card">
        <div className="tc-topology-header">
          <span className="tc-topology-title">SERVICE TOPOLOGY & HEALTH</span>
          <span className="tc-topology-status">
            {isResolved ? (
              <span style={{ color: 'var(--tc-mint)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span className="tc-pulse-beacon" />
                100% HEALTHY
              </span>
            ) : (
              <span style={{ color: 'var(--tc-amber)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span className="tc-pulse-beacon" style={{ background: 'var(--tc-amber)', boxShadow: '0 0 6px var(--tc-amber)' }} />
                INCIDENT ACTIVE
              </span>
            )}
          </span>
        </div>

        <div className="tc-topology-diagram">
          <div className="tc-topology-node">
            <div className="tc-top-node-icon">
              <IconGlobe size={14} />
            </div>
            <span className="tc-top-node-label">API Gateway</span>
          </div>
          <div className="tc-topology-arrow">
            <IconChevronRight size={12} />
          </div>
          <div className={`tc-topology-node ${isResolved ? 'tc-topology-node--healthy' : 'tc-topology-node--alert'}`}>
            <div className="tc-top-node-icon">
              <IconCpu size={14} />
            </div>
            <span className="tc-top-node-label">cart-service</span>
            <span className="tc-top-node-port">:8080</span>
          </div>
          <div className="tc-topology-arrow">
            <IconChevronRight size={12} />
          </div>
          <div className="tc-topology-node">
            <div className="tc-top-node-icon">
              <IconDatabase size={14} />
            </div>
            <span className="tc-top-node-label">Postgres</span>
          </div>
        </div>

        {/* Verification Check Requirements */}
        <div className="tc-verification-specs">
          <div className="tc-spec-item">
            <span className="tc-spec-icon">
              <IconSearch size={13} />
            </span>
            <div className="tc-spec-info">
              <span className="tc-spec-name">check_logic (Diagnostic)</span>
              <span className="tc-spec-desc">Verifies decrement boundary under test</span>
            </div>
            <span className="tc-spec-badge tc-spec-badge--pass">PASS</span>
          </div>
          <div className="tc-spec-item">
            <span className="tc-spec-icon">
              <IconTarget size={13} />
            </span>
            <div className="tc-spec-info">
              <span className="tc-spec-name">check_full (Verification)</span>
              <span className="tc-spec-desc">Checkout inventory allocation constraints</span>
            </div>
            <span className={`tc-spec-badge ${isResolved ? 'tc-spec-badge--pass' : 'tc-spec-badge--pending'}`}>
              {isResolved ? 'PASS' : 'TESTING'}
            </span>
          </div>
        </div>
      </div>

      {/* Teacher Tactical Clue Arsenal (1-Click Push Hints) */}
      <div className="tc-dossier-card">
        <div className="tc-dossier-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <IconLightbulb size={14} color="var(--tc-amber)" />
            <h4 className="tc-clue-arsenal-title">Tactical Hint Arsenal</h4>
          </div>
          <span style={{ fontSize: '10.5px', color: 'var(--tc-text-muted)' }}>Progressive Ladder</span>
        </div>

        <div className="tc-clue-list">
          {progressiveClues.map((clue) => {
            const isDispatched = dispatchedClue === clue.level;
            return (
              <div key={clue.level} className="tc-clue-card">
                <div className="tc-clue-top">
                  <span className="tc-clue-badge">{clue.badge}</span>
                  <button
                    type="button"
                    className={`tc-clue-push-btn ${isDispatched ? 'tc-clue-push-btn--sent' : ''}`}
                    onClick={() => handlePushClue(clue.level, clue.text)}
                    disabled={!targetTeam || isDispatched}
                    title={`Push Clue ${clue.level} to ${targetTeam ? targetTeam.departmentCode.toUpperCase() : 'Sector'}`}
                  >
                    {isDispatched ? (
                      <>
                        <IconCheck size={11} />
                        <span>Sent!</span>
                      </>
                    ) : (
                      <>
                        <IconZap size={11} />
                        <span>Push to Team</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="tc-clue-heading">{clue.title}</div>
                <p className="tc-clue-text">{clue.text}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reference Solution Code Drawer */}
      <div className="tc-dossier-card" style={{ marginBottom: 0 }}>
        <div
          className="tc-solution-toggle-header"
          onClick={() => setShowSolutionDiff(!showSolutionDiff)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setShowSolutionDiff(!showSolutionDiff);
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <IconKey size={13} color="var(--tc-purple)" />
            <span style={{ fontWeight: 600, fontSize: '12px', color: '#fff' }}>Reference Solution Diff</span>
          </div>
          <span style={{ color: 'var(--tc-blue)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}>
            {showSolutionDiff ? (
              <>
                <span>Hide</span>
                <IconChevronDown size={11} />
              </>
            ) : (
              <>
                <span>Reveal</span>
                <IconChevronRight size={11} />
              </>
            )}
          </span>
        </div>

        {showSolutionDiff && (
          <div className="tc-solution-diff-body">
            <div className="tc-diff-file-tag">src/index.js</div>
            <pre className="tc-diff-code">
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
          </div>
        )}
      </div>
    </aside>
  );
}
