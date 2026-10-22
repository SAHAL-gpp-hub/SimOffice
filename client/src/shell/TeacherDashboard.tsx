import { useEffect, useState } from 'react';
import { useShellStore } from './store';
import { TeacherDebriefScreen } from './TeacherDebriefScreen';
import { loginTeacher } from '../api/auth';

interface DashboardRosterEntry {
  rosterEntryId: string;
  displayName: string;
  connected: boolean;
  seated: boolean;
}

interface DashboardTeam {
  teamId: string;
  departmentCode: string;
  outcomeState: 'in_progress' | 'resolved' | 'unresolved';
  fullFixChecksPassed: number;
  fullFixChecksTotal: number;
  diagnosticChecksPassed: number;
  roster: DashboardRosterEntry[];
}

interface DashboardData {
  sessionStatus?: string;
  teams: DashboardTeam[];
}

export function TeacherDashboard() {
  const { workstation, reset } = useShellStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHintModal, setShowHintModal] = useState<string | null>(null); // teamId
  const [hintMessage, setHintMessage] = useState('');
  const [announcementText, setAnnouncementText] = useState('');

  // Initial session ID: from store, localStorage, or fallback to DEMO01
  const initialSession = (
    workstation.teamId && workstation.teamId !== '123' && workstation.teamId !== 'default-session'
      ? workstation.teamId
      : localStorage.getItem('teacherSessionId') || 'DEMO01'
  );
  const [currentSessionId, setCurrentSessionId] = useState(initialSession);
  const [sessionInput, setSessionInput] = useState(initialSession);

  // Teacher token
  const [token, setToken] = useState(
    workstation.token || localStorage.getItem('teacherToken') || ''
  );
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const autoLogin = async () => {
    setIsAuthenticating(true);
    setError(null);
    try {
      const res = await loginTeacher('teacher@simoffice.edu', 'Password123!');
      setToken(res.token);
      localStorage.setItem('teacherToken', res.token);
      setError(null);
      return res.token;
    } catch (err: any) {
      setError('Could not auto-login teacher: ' + (err.message || 'Check credentials'));
      return null;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const fetchDashboard = async (authToken = token, sid = currentSessionId) => {
    let effectiveToken = authToken;
    if (!effectiveToken || effectiveToken === 'MOCK_TEACHER_TOKEN') {
      effectiveToken = (await autoLogin()) || '';
      if (!effectiveToken) return;
    }

    try {
      const res = await fetch(`/api/sessions/${sid}/dashboard`, {
        headers: { Authorization: `Bearer ${effectiveToken}` },
      });
      if (!res.ok) {
        if (res.status === 401) {
          // Token might have expired, try auto-login once
          const fresh = await autoLogin();
          if (fresh) {
            const retryRes = await fetch(`/api/sessions/${sid}/dashboard`, {
              headers: { Authorization: `Bearer ${fresh}` },
            });
            if (retryRes.ok) {
              const json = await retryRes.json();
              setData(json);
              setError(null);
              return;
            }
          }
        }
        const errText = await res.text();
        throw new Error(`Failed to load dashboard (${res.status}): ${errText}`);
      }
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    }
  };

  useEffect(() => {
    fetchDashboard(token, currentSessionId);
    const interval = setInterval(() => fetchDashboard(token, currentSessionId), 4000);
    return () => clearInterval(interval);
  }, [currentSessionId, token]);

  const handleSwitchSession = (newSid: string) => {
    const clean = newSid.trim() || 'DEMO01';
    setCurrentSessionId(clean);
    setSessionInput(clean);
    localStorage.setItem('teacherSessionId', clean);
    fetchDashboard(token, clean);
  };

  const sendHint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showHintModal || !hintMessage.trim()) return;

    try {
      await fetch(`/api/sessions/${currentSessionId}/teams/${showHintModal}/hint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: hintMessage }),
      });
      setShowHintModal(null);
      setHintMessage('');
    } catch (err) {
      alert('Failed to send hint');
    }
  };

  const sendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim()) return;

    try {
      await fetch(`/api/sessions/${currentSessionId}/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: announcementText }),
      });
      setAnnouncementText('');
      alert('Announcement sent to all teams');
    } catch (err) {
      alert('Failed to send announcement');
    }
  };

  const endSession = async () => {
    if (!confirm('Are you sure you want to end the session? Any teams still in_progress will receive a non-punitive "unresolved" outcome.')) {
      return;
    }
    try {
      await fetch(`/api/sessions/${currentSessionId}/end`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchDashboard();
    } catch (err) {
      alert('Failed to end session');
    }
  };

  return (
    <div
      className="shell-panel shell-panel--wide"
      role="main"
      aria-label="Teacher Dashboard"
      style={{ maxWidth: '1200px', height: '88vh', display: 'flex', flexDirection: 'column', padding: '24px' }}
    >
      {/* Top Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px' }}>
        <div>
          <div className="shell-panel__logo" aria-hidden="true" style={{ marginBottom: '4px' }}>
            SIMOFFICE STAFF CONSOLE
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Active Session Code:</span>
            <input
              type="text"
              className="shell-field__input shell-field__input--mono"
              value={sessionInput}
              onChange={(e) => setSessionInput(e.target.value.toUpperCase())}
              style={{ width: '120px', padding: '4px 8px', fontSize: '13px', textAlign: 'center' }}
            />
            <button
              type="button"
              className="shell-btn"
              style={{ padding: '4px 12px', fontSize: '12px', background: 'rgba(59, 139, 235, 0.2)', color: '#38bdf8', border: '1px solid rgba(59, 139, 235, 0.4)' }}
              onClick={() => handleSwitchSession(sessionInput)}
            >
              Switch
            </button>
            <button
              type="button"
              className="shell-btn"
              style={{ padding: '4px 10px', fontSize: '12px', background: 'rgba(255, 255, 255, 0.06)', color: '#ccc', border: '1px solid rgba(255, 255, 255, 0.1)' }}
              onClick={() => handleSwitchSession('DEMO01')}
            >
              DEMO01
            </button>
            <button
              type="button"
              className="shell-btn"
              style={{ padding: '4px 10px', fontSize: '12px', background: 'rgba(255, 255, 255, 0.06)', color: '#ccc', border: '1px solid rgba(255, 255, 255, 0.1)' }}
              onClick={() => handleSwitchSession('DEMO02')}
            >
              DEMO02
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            className="shell-btn"
            style={{ padding: '6px 14px', fontSize: '13px', background: 'rgba(255, 255, 255, 0.08)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.15)' }}
            onClick={() => fetchDashboard()}
          >
            🔄 Refresh
          </button>
          <button
            type="button"
            className="shell-btn"
            style={{ padding: '6px 14px', fontSize: '13px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}
            onClick={() => reset()}
          >
            ↩ Exit to Lobby
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '12px 16px', margin: '14px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#fca5a5', fontSize: '13.5px' }}>{error}</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="shell-btn"
              style={{ padding: '4px 10px', fontSize: '12px', background: '#38bdf8', color: '#000' }}
              onClick={() => handleSwitchSession('DEMO01')}
            >
              Load DEMO01
            </button>
            <button
              className="shell-btn"
              style={{ padding: '4px 10px', fontSize: '12px', background: 'rgba(255, 255, 255, 0.1)', color: '#fff' }}
              onClick={autoLogin}
              disabled={isAuthenticating}
            >
              {isAuthenticating ? 'Logging in…' : 'Re-Authenticate'}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '30px', flex: 1, minHeight: 0, marginTop: '20px' }}>
        {/* Main Teams Area */}
        <div style={{ flex: 3, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {data?.sessionStatus === 'ended' || data?.sessionStatus === 'torn_down' ? (
            <TeacherDebriefScreen sessionId={currentSessionId} token={token} />
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h2 className="shell-panel__title" style={{ fontSize: '20px', margin: 0 }}>
                  Active Teams ({data?.teams?.length || 0})
                </h2>
                <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>
                  Session Status: <strong style={{ color: '#38bdf8' }}>{data?.sessionStatus || 'active'}</strong>
                </span>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '15px', alignContent: 'start' }}>
                {data?.teams?.map((team: any) => (
                  <div key={team.teamId} style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>
                        {(team.departmentCode || team.teamId).toUpperCase()} TEAM
                      </h3>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          padding: '3px 10px',
                          borderRadius: '12px',
                          background: team.outcomeState === 'resolved' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                          color: team.outcomeState === 'resolved' ? '#4ade80' : '#cbd5e1',
                          border: team.outcomeState === 'resolved' ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        {team.outcomeState === 'resolved' ? '✓ RESOLVED' : 'IN PROGRESS'}
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '14px', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span>Full-Fix Check:</span>
                        <strong style={{ color: team.fullFixChecksPassed > 0 ? '#4ade80' : '#cbd5e1' }}>
                          {team.fullFixChecksPassed} / {team.fullFixChecksTotal} passed
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Diagnostic Progress:</span>
                        <strong>{team.diagnosticChecksPassed} found</strong>
                      </div>
                    </div>

                    <h4 style={{ margin: '0 0 8px 0', fontSize: '11.5px', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Connected Roster
                    </h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 14px 0', maxHeight: '120px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
                      {team.roster.map((student: any) => (
                        <li key={student.rosterEntryId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <span style={{ color: student.connected ? '#4ade80' : '#ef4444', fontSize: '10px' }}>●</span>
                          <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#e2e8f0' }}>{student.displayName}</span>
                          {student.seated && <span style={{ fontSize: '10px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '2px 8px', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>SEATED</span>}
                        </li>
                      ))}
                      {team.roster.length === 0 && (
                        <li style={{ padding: '8px 10px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', fontSize: '12px' }}>Awaiting students to join…</li>
                      )}
                    </ul>

                    <button
                      className="shell-btn"
                      style={{ marginTop: 'auto', padding: '8px', fontSize: '13px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}
                      onClick={() => setShowHintModal(team.teamId)}
                    >
                      💡 Send Team Hint
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Sidebar Actions */}
        <div style={{ flex: 1, minWidth: '260px', display: 'flex', flexDirection: 'column', borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '24px' }}>
          <h2 className="shell-panel__title" style={{ fontSize: '18px', marginBottom: '16px' }}>Session Controls</h2>

          <form onSubmit={sendAnnouncement} className="shell-field" style={{ marginBottom: 'auto' }}>
            <label className="shell-field__label">Broadcast Announcement</label>
            <textarea
              className="shell-field__input"
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder="Send message to all students in this session…"
              rows={4}
              style={{ resize: 'none', fontSize: '13px' }}
            />
            <button type="submit" className="shell-btn shell-btn--primary" style={{ marginTop: '10px', padding: '10px 16px', fontSize: '13.5px' }}>
              📢 Broadcast to All
            </button>
          </form>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
            <label className="shell-field__label" style={{ color: '#f87171' }}>Danger Zone</label>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>
              End the active session and transition all teams to the Debrief Screen.
            </p>
            <button
              className="shell-btn"
              onClick={endSession}
              style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.35)', width: '100%', padding: '10px' }}
            >
              🏁 End Session & Debrief
            </button>
          </div>
        </div>
      </div>

      {showHintModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={sendHint} className="shell-panel" style={{ maxWidth: '420px' }}>
            <h3 className="shell-panel__title" style={{ fontSize: '18px', marginBottom: '15px' }}>💡 Send Team Hint</h3>
            <textarea
              className="shell-field__input"
              value={hintMessage}
              onChange={(e) => setHintMessage(e.target.value)}
              placeholder="Type your guidance or clue for this team…"
              rows={4}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button type="button" className="shell-btn" style={{ background: 'transparent', color: '#ccc', border: '1px solid rgba(255,255,255,0.1)' }} onClick={() => setShowHintModal(null)}>
                Cancel
              </button>
              <button type="submit" className="shell-btn shell-btn--primary" style={{ width: 'auto', margin: 0 }}>
                Send Hint
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
