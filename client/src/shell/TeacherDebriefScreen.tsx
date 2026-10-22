import React, { useEffect, useState } from 'react';

interface Props {
  sessionId: string;
  token: string;
}

export const TeacherDebriefScreen: React.FC<Props> = ({ sessionId, token }) => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      setError(err.message || 'Failed to load debrief');
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
    try {
      await fetch(`/api/sessions/${sessionId}/teams/${teamId}/reveal-fix`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      // Refresh immediately
      fetchDebrief();
    } catch (err) {
      alert('Failed to reveal fix');
    }
  };

  if (loading && !data) {
    return (
      <div style={{ padding: '20px', color: '#38bdf8', fontSize: '14px' }}>
        Loading classroom debrief analytics…
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ padding: '20px' }}>
        <p className="shell-error" style={{ margin: 0 }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="shell-panel__title" style={{ fontSize: '20px', margin: 0 }}>
          🏁 Classroom Session Debrief Summary
        </h2>
        <span style={{ fontSize: '12px', color: '#4ade80', background: 'rgba(34, 197, 94, 0.15)', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
          Session Finalized
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', alignContent: 'start' }}>
        {data?.teams?.map((team: any) => {
          const isResolved = team.outcome_state === 'resolved';
          return (
            <div
              key={team.team_id}
              style={{
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>
                  {team.label || team.department_name || team.team_id}
                </h3>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: '12px',
                    background: isResolved ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.15)',
                    color: isResolved ? '#4ade80' : '#facc15',
                    border: isResolved ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(234, 179, 8, 0.3)',
                  }}
                >
                  {isResolved ? '✓ RESOLVED' : 'UNRESOLVED'}
                </span>
              </div>

              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', background: 'rgba(0,0,0,0.2)', padding: '10px 12px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Full-Fix Check:</span>
                  <strong style={{ color: isResolved ? '#4ade80' : '#cbd5e1' }}>
                    {team.full_fix_checks_passed} / {team.full_fix_checks_total}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Diagnostic Milestones:</span>
                  <strong>{team.diagnostic_checks_passed} / {team.diagnostic_checks_total}</strong>
                </div>
                {team.first_pass_at && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4ade80', fontSize: '12px' }}>
                    <span>First Resolved:</span>
                    <span>{new Date(team.first_pass_at).toLocaleTimeString()}</span>
                  </div>
                )}
              </div>

              {!team.fix_revealed_at ? (
                <button
                  className="shell-btn shell-btn--primary"
                  style={{ marginTop: 'auto', padding: '9px', fontSize: '13px' }}
                  onClick={() => revealFix(team.team_id)}
                >
                  🔓 Reveal Solution to Team
                </button>
              ) : (
                <div
                  style={{
                    marginTop: 'auto',
                    fontSize: '12px',
                    color: '#4ade80',
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.25)',
                    padding: '8px',
                    borderRadius: '6px',
                    textAlign: 'center',
                    fontStyle: 'italic',
                  }}
                >
                  ✓ Solution revealed at {new Date(team.fix_revealed_at).toLocaleTimeString()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
