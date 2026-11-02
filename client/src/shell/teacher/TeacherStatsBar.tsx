import type { DashboardTeam } from './types';
import { IconCpu, IconUsers, IconTarget, IconSearch, IconZap, IconCheck } from './icons';

interface Props {
  teams: DashboardTeam[];
  isSimulatedDemo?: boolean;
  onToggleSimulatedDemo?: () => void;
}

export function TeacherStatsBar({ teams, isSimulatedDemo = false, onToggleSimulatedDemo }: Props) {
  let totalConnected = 0;
  let totalSeated = 0;
  let totalRoster = 0;
  let resolvedTeams = 0;
  let totalDiagnosticPassed = 0;

  teams.forEach((t) => {
    if (t.outcomeState === 'resolved') {
      resolvedTeams++;
    }
    totalDiagnosticPassed += t.diagnosticChecksPassed || 0;
    t.roster?.forEach((r) => {
      totalRoster++;
      if (r.connected) totalConnected++;
      if (r.seated) totalSeated++;
    });
  });

  const totalTeams = teams.length;
  const resolutionPercentage = totalTeams > 0 ? Math.round((resolvedTeams / totalTeams) * 100) : 0;
  const displayConnected = isSimulatedDemo ? 4 : totalConnected;
  const displaySeated = isSimulatedDemo ? 4 : totalSeated;

  return (
    <section className="tc-hud-bar" aria-label="Classroom Key Performance Indicators">
      {/* 1. Active Teams */}
      <div className="tc-hud-item">
        <div className="tc-hud-icon-wrap">
          <IconCpu size={14} />
        </div>
        <div>
          <span className="tc-hud-label">Sectors: </span>
          <span className="tc-hud-number">{totalTeams}</span>
          <span className="tc-hud-sub"> Active</span>
        </div>
      </div>

      <div className="tc-hud-divider" />

      {/* 2. Students Presence */}
      <div className="tc-hud-item">
        <div className="tc-hud-icon-wrap">
          <IconUsers size={14} />
        </div>
        <div>
          <span className="tc-hud-label">Agents: </span>
          <span className="tc-hud-number" style={{ color: displayConnected > 0 ? 'var(--tc-cyan)' : '#fff' }}>
            {displayConnected}
          </span>
          <span className="tc-hud-sub"> Online ({displaySeated} Seated)</span>
        </div>
      </div>

      <div className="tc-hud-divider" />

      {/* 3. Verification Progress */}
      <div className="tc-hud-item">
        <div className="tc-hud-icon-wrap" style={{ color: 'var(--tc-mint)' }}>
          <IconTarget size={14} />
        </div>
        <div>
          <span className="tc-hud-label">Verification: </span>
          <span className="tc-hud-number" style={{ color: resolvedTeams > 0 ? 'var(--tc-mint)' : '#fff' }}>
            {resolvedTeams}
          </span>
          <span className="tc-hud-sub"> of {totalTeams} Solved ({resolutionPercentage}%)</span>
        </div>
      </div>

      <div className="tc-hud-divider" />

      {/* 4. Diagnostic Clues */}
      <div className="tc-hud-item">
        <div className="tc-hud-icon-wrap" style={{ color: 'var(--tc-amber)' }}>
          <IconSearch size={14} />
        </div>
        <div>
          <span className="tc-hud-label">Diagnostic Clues: </span>
          <span className="tc-hud-number" style={{ color: totalDiagnosticPassed > 0 ? 'var(--tc-amber)' : '#fff' }}>
            {totalDiagnosticPassed}
          </span>
          <span className="tc-hud-sub"> Discovered</span>
        </div>
      </div>

      {/* 5. Systems Status & Demo Sandbox Toggle */}
      <div className="tc-hud-item tc-hud-item--right">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--tc-mint)' }}>
          <IconCheck size={13} strokeWidth={2.5} />
          <span>Telemetry Stream Active</span>
        </div>

        {onToggleSimulatedDemo && (
          <button
            type="button"
            className={`tc-demo-toggle-btn ${isSimulatedDemo ? 'tc-demo-toggle-btn--active' : ''}`}
            onClick={onToggleSimulatedDemo}
            title="Toggle between live telemetry and 4-desk simulation sandbox preview"
          >
            <IconZap size={11} />
            <span>{isSimulatedDemo ? 'Sandbox Mode' : 'Live Mode'}</span>
          </button>
        )}
      </div>
    </section>
  );
}
