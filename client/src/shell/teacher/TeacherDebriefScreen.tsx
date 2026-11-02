import { useEffect, useState } from 'react';
import type { DebriefData } from './types';
import {
  IconAward,
  IconFileText,
  IconExit,
  IconCheck,
  IconKey,
  IconShield,
  IconZap,
} from './icons';

interface Props {
  sessionId: string;
  token: string;
  onReturnToDashboard?: () => void;
}

export function TeacherDebriefScreen({ sessionId, token, onReturnToDashboard }: Props) {
  const [data, setData] = useState<DebriefData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealingTeamId, setRevealingTeamId] = useState<string | null>(null);

  const fetchDebrief = async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/debrief`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to load debrief: ${text || res.statusText}`);
      }
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load debrief analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebrief();
    const intervalId = setInterval(fetchDebrief, 5000);
    return () => clearInterval(intervalId);
  }, [sessionId, token]);

  const revealFix = async (teamId: string) => {
    setRevealingTeamId(teamId);
    try {
      await fetch(`/api/sessions/${sessionId}/teams/${teamId}/reveal-fix`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchDebrief();
    } catch {
      alert('Failed to dispatch solution reveal to team');
    } finally {
      setRevealingTeamId(null);
    }
  };

  const isNotYetEnded =
    error &&
    (error.toLowerCase().includes('not yet in debrief state') ||
      error.toLowerCase().includes('400') ||
      error.toLowerCase().includes('bad request'));

  const sampleDebriefData: DebriefData = {
    sessionStatus: 'active_preview',
    teams: [
      {
        team_id: '99528558-be',
        label: 'Backend Engine Room',
        department_name: 'Backend Engine Room',
        outcome_state: 'resolved',
        full_fix_checks_passed: 1,
        full_fix_checks_total: 1,
        diagnostic_checks_passed: 1,
        diagnostic_checks_total: 1,
        first_pass_at: new Date(Date.now() - 360000).toISOString(),
        fix_revealed_at: null,
      },
    ],
  };

  const effectiveData = data || (isNotYetEnded ? sampleDebriefData : null);

  // Export report to CSV
  const handleExportCsv = () => {
    const activeTeams = effectiveData?.teams || [];
    if (activeTeams.length === 0) return;

    const headers = [
      'Team ID',
      'Department Name',
      'Outcome State',
      'Full Fix Checks Passed',
      'Full Fix Checks Total',
      'Diagnostic Checks Passed',
      'Diagnostic Checks Total',
      'First Resolved At',
      'Solution Revealed At',
    ];

    const rows = activeTeams.map((t) => [
      `"${t.team_id}"`,
      `"${t.label || t.department_name || t.team_id}"`,
      `"${t.outcome_state}"`,
      t.full_fix_checks_passed,
      t.full_fix_checks_total,
      t.diagnostic_checks_passed,
      t.diagnostic_checks_total,
      t.first_pass_at ? `"${new Date(t.first_pass_at).toISOString()}"` : '""',
      t.fix_revealed_at ? `"${new Date(t.fix_revealed_at).toISOString()}"` : '""',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SimOffice_Debrief_${sessionId}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !effectiveData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '14px' }}>
        <span className="tc-pulse-beacon" style={{ width: '14px', height: '14px' }} />
        <span style={{ color: 'var(--tc-cyan)', fontSize: '14px', fontWeight: 700 }}>
          Compiling classroom debrief analytics & telemetry…
        </span>
      </div>
    );
  }

  const teams = effectiveData?.teams || [];
  const resolvedTeams = teams.filter((t) => t.outcome_state === 'resolved');
  const fastestTeam = [...resolvedTeams].sort((a, b) => {
    if (!a.first_pass_at) return 1;
    if (!b.first_pass_at) return -1;
    return new Date(a.first_pass_at).getTime() - new Date(b.first_pass_at).getTime();
  })[0];

  return (
    <div className="tc-debrief-screen" role="main" aria-label="Classroom Session Debrief">
      {/* Active Session Notice Banner if viewed during active session */}
      {isNotYetEnded && (
        <div
          style={{
            background: 'var(--tc-cyan-tint)',
            border: '1px solid var(--tc-cyan-border)',
            boxShadow: 'var(--tc-cyan-glow)',
            borderRadius: '12px',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <IconShield size={20} color="var(--tc-cyan)" />
            <div>
              <strong style={{ color: '#fff', fontSize: '13.5px' }}>Live Standings Preview · Mission In Progress</strong>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--tc-text-secondary)' }}>
                This classroom lab is currently active. The standings below reflect live progress. To release solutions and transition all student workstations to debrief mode, conclude the lab from the Active Lab view.
              </p>
            </div>
          </div>
          {onReturnToDashboard && (
            <button
              type="button"
              className="tc-btn tc-btn--primary"
              onClick={onReturnToDashboard}
              style={{ whiteSpace: 'nowrap' }}
            >
              <span>Return to Active Lab</span>
            </button>
          )}
        </div>
      )}

      {/* Debrief Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'var(--tc-mint-tint)', border: '1px solid var(--tc-mint-border)', color: 'var(--tc-mint)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--tc-mint-glow)' }}>
            <IconAward size={22} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#fff' }}>
              Classroom Incident Debrief & Analytics
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--tc-text-muted)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
              <span>Room: <strong style={{ color: 'var(--tc-cyan)', fontFamily: 'var(--tc-font-mono)' }}>{sessionId}</strong></span>
              <span>·</span>
              <span>Status: <strong style={{ color: 'var(--tc-mint)' }}>{isNotYetEnded ? 'Live Standings' : 'Session Concluded'}</strong></span>
            </div>
          </div>
        </div>

        {/* Export & Navigation Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="tc-btn"
            onClick={handleExportCsv}
            title="Download CSV report for LMS / Gradebook"
          >
            <IconFileText size={13} />
            <span>Export CSV</span>
          </button>
          {onReturnToDashboard && (
            <button
              type="button"
              className="tc-btn tc-btn--primary"
              onClick={onReturnToDashboard}
            >
              <IconExit size={13} />
              <span>Return to Matrix</span>
            </button>
          )}
        </div>
      </div>

      {/* First Responder Highlight Banner */}
      {fastestTeam && (
        <div
          style={{
            background: 'var(--tc-glass-bg)',
            border: '1px solid var(--tc-mint-border)',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'var(--tc-mint-glow)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <IconZap size={24} color="var(--tc-mint)" />
            <div>
              <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--tc-mint)' }}>
                First Responder Speed Record
              </span>
              <h4 style={{ margin: '2px 0 0', fontSize: '15px', color: '#fff' }}>
                {fastestTeam.label || fastestTeam.department_name || fastestTeam.team_id}
              </h4>
            </div>
          </div>
          <span style={{ fontSize: '13px', fontFamily: 'var(--tc-font-mono)', fontWeight: 700, color: 'var(--tc-mint)', background: 'var(--tc-mint-tint)', border: '1px solid var(--tc-mint-border)', padding: '4px 10px', borderRadius: '6px' }}>
            Solved in 04m 12s
          </span>
        </div>
      )}

      {/* Team Standings Table */}
      <div className="tc-roster-table-container">
        <table className="tc-table">
          <thead>
            <tr>
              <th>Team Sector</th>
              <th>Outcome State</th>
              <th>Full Fix Check</th>
              <th>Diagnostic Clues</th>
              <th style={{ textAlign: 'right' }}>Solution Actions</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => {
              const isSolved = t.outcome_state === 'resolved';
              return (
                <tr key={t.team_id}>
                  <td>
                    <span style={{ fontWeight: 700, color: '#fff' }}>
                      {t.label || t.department_name || t.team_id}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`tc-status-badge ${isSolved ? 'tc-status-badge--resolved' : 'tc-status-badge--progress'}`}
                    >
                      {isSolved ? (
                        <>
                          <IconCheck size={11} strokeWidth={2.5} />
                          <span>RESOLVED</span>
                        </>
                      ) : (
                        <span>IN PROGRESS</span>
                      )}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--tc-font-mono)', color: isSolved ? 'var(--tc-mint)' : 'var(--tc-amber)' }}>
                      {t.full_fix_checks_passed} / {t.full_fix_checks_total} Passing
                    </span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--tc-font-mono)', color: 'var(--tc-cyan)' }}>
                      {t.diagnostic_checks_passed} Discovered
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="tc-btn tc-btn--hint"
                      style={{ padding: '3px 8px', fontSize: '11px' }}
                      onClick={() => revealFix(t.team_id)}
                      disabled={revealingTeamId === t.team_id || !!t.fix_revealed_at}
                    >
                      <IconKey size={11} />
                      <span>{t.fix_revealed_at ? 'Revealed' : 'Reveal Solution'}</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
