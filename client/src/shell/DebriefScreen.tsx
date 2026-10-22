import React, { useEffect, useState } from 'react';
import { useShellStore } from './store';

export const DebriefScreen: React.FC = () => {
  const { debriefUrl, joinResult, workstation, reset } = useShellStore();

  // Safely resolve the student authentication token
  const token = (
    joinResult?.token ||
    workstation?.token ||
    sessionStorage.getItem('studentToken') ||
    localStorage.getItem('studentToken') ||
    ''
  );

  const sessionId = (
    joinResult?.sessionId ||
    workstation?.teamId ||
    sessionStorage.getItem('studentSessionId') ||
    'DEMO01'
  );

  const effectiveUrl = debriefUrl || `/sessions/${sessionId}/debrief/me`;

  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDebrief = async () => {
    if (!token) {
      setError('Session token missing. Please return to lobby.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api${effectiveUrl}`, {
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
    // Poll every 5s while fix is not revealed to capture real-time teacher reveal
    const intervalId = setInterval(() => {
      if (!data?.fixContent) {
        fetchDebrief();
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [effectiveUrl, token, data?.fixContent]);

  if (loading && !data) {
    return (
      <div className="shell-panel" style={{ maxWidth: '600px', textAlign: 'center', padding: '40px' }}>
        <div className="shell-panel__logo" style={{ marginBottom: '16px' }}>SIMOFFICE SESSION DEBRIEF</div>
        <div style={{ color: '#38bdf8', fontSize: '16px' }}>Gathering session analytics & team contributions…</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="shell-panel" style={{ maxWidth: '600px', textAlign: 'center', padding: '30px' }}>
        <div className="shell-panel__logo" style={{ marginBottom: '12px' }}>SIMOFFICE SESSION DEBRIEF</div>
        <p className="shell-error" style={{ marginBottom: '20px' }}>{error}</p>
        <button className="shell-btn shell-btn--primary" onClick={() => reset()}>
          ↩ Return to Lobby
        </button>
      </div>
    );
  }

  const { teamSummary, studentSummary, fixContent } = data || {};
  const isResolved = teamSummary?.outcome_state === 'resolved';

  return (
    <div
      className="shell-panel shell-panel--wide"
      role="main"
      aria-label="Student Session Debrief"
      style={{
        maxWidth: '850px',
        maxHeight: '90vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        padding: '30px',
      }}
    >
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="shell-panel__logo" aria-hidden="true" style={{ marginBottom: '4px' }}>
            SIMOFFICE POST-INCIDENT DEBRIEF
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)' }}>
            Incident Retrospective & Pedagogical Summary (PRD §13.3)
          </div>
        </div>
        <button
          className="shell-btn"
          style={{ padding: '6px 14px', fontSize: '13px', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff' }}
          onClick={() => reset()}
        >
          ↩ Return to Lobby
        </button>
      </div>

      {/* Outcome Banner */}
      <div
        style={{
          background: isResolved ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.12)',
          border: isResolved ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(234, 179, 8, 0.3)',
          borderRadius: '10px',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span style={{ fontSize: '24px' }}>{isResolved ? '🎉' : '⏳'}</span>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: isResolved ? '#4ade80' : '#facc15' }}>
            {isResolved ? 'INCIDENT RESOLVED' : 'INVESTIGATION CONCLUDED'}
          </h2>
        </div>
        <p style={{ margin: '0 0 14px 0', fontSize: '13.5px', color: isResolved ? '#dcfce7' : '#fef08a', lineHeight: '1.5' }}>
          {isResolved
            ? 'Great job! Your team successfully diagnosed and patched the inventory boundary condition.'
            : 'Your team made valuable progress during the incident response window. Review your findings and diagnostic milestones below.'}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', background: 'rgba(0,0,0,0.25)', padding: '12px 16px', borderRadius: '8px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Full-Fix Checks</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>
              {teamSummary?.full_fix_checks_passed || 0} / {teamSummary?.full_fix_checks_total || 1} Passed
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Diagnostic Milestones</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>
              {teamSummary?.diagnostic_checks_passed || 0} / {teamSummary?.diagnostic_checks_total || 1} Identified
            </div>
          </div>
        </div>
      </div>

      {/* Personal Contributions Card */}
      <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '20px' }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', fontWeight: 600, color: '#38bdf8' }}>
          📊 Your Individual Contributions
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#f8fafc' }}>
              {studentSummary?.code_edits || 0}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>Code Saves</div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#f8fafc' }}>
              {studentSummary?.chat_messages || 0}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>Chat Messages</div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#4ade80' }}>
              {studentSummary?.verifications_triggered_pass ? 'YES' : '0'}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>Verification Passed</div>
          </div>
        </div>
      </div>

      {/* Teacher Solution Reveal Card */}
      <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '20px' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>
          💡 Official Resolution & Takeaways
        </h3>
        {fixContent ? (
          <div style={{ background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '8px', padding: '14px', color: '#bbf7d0', fontSize: '13.5px', lineHeight: '1.6' }}>
            <strong>Teacher Solution Note:</strong>
            <p style={{ margin: '6px 0 0 0', fontFamily: 'monospace', color: '#f0fdf4' }}>{fixContent}</p>
          </div>
        ) : (
          <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '13px', fontStyle: 'italic' }}>
            The teacher has not yet unlocked the solution reveal for this session. It will update automatically when revealed.
          </div>
        )}
      </div>
    </div>
  );
};
