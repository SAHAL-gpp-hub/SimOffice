import { useEffect, useState, useMemo, useRef } from 'react';
import { useShellStore } from './store';
import { loginTeacher } from '../api/auth';
import './teacher.css';

import type { DashboardData, TeamFilterMode } from './teacher/types';
import { TeacherHeader, type TeacherNavTab } from './teacher/TeacherHeader';
import { TeacherStatsBar } from './teacher/TeacherStatsBar';
import { TeacherTeamCard } from './teacher/TeacherTeamCard';
import { TeacherSidebar } from './teacher/TeacherSidebar';
import { TeacherRosterView } from './teacher/TeacherRosterView';
import { TeacherCommsView } from './teacher/TeacherCommsView';
import { TeacherHintModal } from './teacher/TeacherHintModal';
import { TeacherEndSessionModal } from './teacher/TeacherEndSessionModal';
import { TeacherSessionSwitcherModal } from './teacher/TeacherSessionSwitcherModal';
import { TeacherDebriefScreen } from './teacher/TeacherDebriefScreen';
import {
  IconCheck,
  IconAlertCircle,
  IconSearch,
  IconCpu,
} from './teacher/icons';
import { teacherEventBus } from './teacher/eventBus';

export function TeacherDashboard() {
  const { workstation, reset } = useShellStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Active top-level navigation tab
  const initialTab =
    (new URLSearchParams(window.location.search).get('tab') as TeacherNavTab) || 'matrix';
  const [activeTab, setActiveTab] = useState<TeacherNavTab>(initialTab);

  // Modals state
  const [selectedHintTeamId, setSelectedHintTeamId] = useState<string | null>(null);
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  const [showSessionSwitcher, setShowSessionSwitcher] = useState(false);

  // Search & Filter in Incident Matrix
  const [filterMode, setFilterMode] = useState<TeamFilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Simulated Sandbox mode
  const [isSimulatedDemo, setIsSimulatedDemo] = useState(
    new URLSearchParams(window.location.search).get('sim') === '1'
  );

  // Toast alert
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Initial session ID: from store, localStorage, or fallback to DEMO01
  const initialSession =
    workstation.teamId && workstation.teamId !== '123' && workstation.teamId !== 'default-session'
      ? workstation.teamId
      : localStorage.getItem('teacherSessionId') || 'DEMO01';

  const [currentSessionId, setCurrentSessionId] = useState(initialSession);

  // Teacher token
  const [token, setToken] = useState(
    workstation.token || localStorage.getItem('teacherToken') || ''
  );
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Ref to track seen students to avoid spamming the timeline
  const seenStudentsRef = useRef<Set<string>>(new Set());
  const seenResolvedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

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

    setIsPolling(true);
    try {
      const res = await fetch(`/api/sessions/${sid}/dashboard`, {
        headers: { Authorization: `Bearer ${effectiveToken}` },
      });
      if (!res.ok) {
        if (res.status === 401) {
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
      setError(err.message || 'Failed to load telemetry dashboard');
    } finally {
      setIsPolling(false);
    }
  };

  useEffect(() => {
    fetchDashboard(token, currentSessionId);
    const interval = setInterval(() => fetchDashboard(token, currentSessionId), 4000);
    return () => clearInterval(interval);
  }, [currentSessionId, token]);

  // Telemetry event syncing
  useEffect(() => {
    if (!data?.teams) return;
    data.teams.forEach((t) => {
      const deptName = t.departmentCode ? `${t.departmentCode.toUpperCase()} Team` : 'Squad';
      if (t.outcomeState === 'resolved' && !seenResolvedRef.current.has(t.teamId)) {
        seenResolvedRef.current.add(t.teamId);
        teacherEventBus.addEvent({
          type: 'resolved',
          title: `Milestone Verified · ${deptName}`,
          desc: `${deptName} solved the incident! All verification tests passed.`,
          badge: 'SOLVED',
        });
      }
      t.roster?.forEach((r) => {
        if (r.connected && !seenStudentsRef.current.has(r.rosterEntryId)) {
          seenStudentsRef.current.add(r.rosterEntryId);
          teacherEventBus.recordStudentPresence(
            r.displayName,
            deptName,
            r.seated ? 'seated' : 'joined',
            r.deskId
          );
        }
      });
    });
  }, [data]);

  const handleSwitchSession = (newSid: string) => {
    const clean = newSid.trim() || 'DEMO01';
    setCurrentSessionId(clean);
    localStorage.setItem('teacherSessionId', clean);
    fetchDashboard(token, clean);
    showToast(`Switched active session to ${clean}`, 'success');
  };

  const handleSendHint = async (teamId: string, message: string) => {
    try {
      const res = await fetch(`/api/sessions/${currentSessionId}/teams/${teamId}/hint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      showToast('Tactical clue dispatched to sector', 'success');
    } catch (err: any) {
      showToast(`Failed to send clue: ${err.message}`, 'error');
      throw err;
    }
  };

  const handleBroadcast = async (text: string) => {
    try {
      const res = await fetch(`/api/sessions/${currentSessionId}/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      showToast('Announcement broadcast to all student workstations', 'success');
    } catch (err: any) {
      showToast(`Broadcast failed: ${err.message}`, 'error');
      throw err;
    }
  };

  const handleEndSession = async () => {
    try {
      const res = await fetch(`/api/sessions/${currentSessionId}/end`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      showToast('Session concluded. Compiling debrief analytics…', 'info');
      setActiveTab('debrief');
      await fetchDashboard();
    } catch (err: any) {
      showToast(`Failed to conclude session: ${err.message}`, 'error');
      throw err;
    }
  };

  const rawTeams = data?.teams || [];
  const teams = useMemo(() => {
    if (rawTeams.length > 0) return rawTeams;
    if (isSimulatedDemo) {
      return [
        {
          teamId: 'sim-backend-01',
          departmentCode: 'backend',
          outcomeState: 'resolved' as const,
          fullFixChecksPassed: 1,
          fullFixChecksTotal: 1,
          diagnosticChecksPassed: 1,
          roster: [
            { rosterEntryId: 'r1', displayName: 'Maya Lin', connected: true, seated: true, deskId: 'desk-1' },
            { rosterEntryId: 'r2', displayName: 'Alex Rivera', connected: true, seated: true, deskId: 'desk-2' },
            { rosterEntryId: 'r3', displayName: 'Chen Wei', connected: true, seated: true, deskId: 'desk-3' },
            { rosterEntryId: 'r4', displayName: 'Sarah Connor', connected: true, seated: true, deskId: 'desk-4' },
          ],
        },
      ];
    }
    return [];
  }, [rawTeams, isSimulatedDemo]);

  // Filtered teams for Incident Matrix
  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      if (filterMode === 'resolved' && team.outcomeState !== 'resolved') return false;
      if (filterMode === 'in_progress' && team.outcomeState === 'resolved') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const deptMatch = (team.departmentCode || team.teamId || '').toLowerCase().includes(q);
        const studentMatch = team.roster?.some((r) => r.displayName.toLowerCase().includes(q));
        return deptMatch || studentMatch;
      }
      return true;
    });
  }, [teams, filterMode, searchQuery]);

  // Total student count across all teams
  const totalStudents = useMemo(() => {
    return teams.reduce((acc, t) => acc + (t.roster?.length || 0), 0);
  }, [teams]);

  const isDebriefState =
    data?.sessionStatus === 'ended' ||
    data?.sessionStatus === 'torn_down' ||
    data?.sessionStatus === 'debriefed';

  return (
    <div className="tc-workspace" role="main" aria-label="SimOffice Instructor Command Console">
      {/* Toast Alert */}
      {toast && (
        <div
          style={{
            position: 'absolute',
            top: '72px',
            right: '24px',
            zIndex: 1000,
            background:
              toast.type === 'success'
                ? 'rgba(16, 185, 129, 0.95)'
                : toast.type === 'error'
                ? 'rgba(244, 63, 94, 0.95)'
                : 'rgba(56, 189, 248, 0.95)',
            color: '#fff',
            padding: '10px 18px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 700,
            boxShadow: '0 12px 36px rgba(0,0,0,0.65)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {toast.type === 'success' ? (
            <IconCheck size={15} />
          ) : (
            <IconAlertCircle size={15} />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Edge-to-Edge Navigation Bar */}
      <TeacherHeader
        sessionId={currentSessionId}
        sessionStatus={data?.sessionStatus || 'active'}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isPolling={isPolling}
        totalStudents={totalStudents}
        onRefresh={() => fetchDashboard()}
        onOpenSwitchSession={() => setShowSessionSwitcher(true)}
        onExit={reset}
      />

      {/* Aerospace Liquid Glass HUD Metric Strip */}
      <TeacherStatsBar
        teams={teams}
        isSimulatedDemo={isSimulatedDemo}
        onToggleSimulatedDemo={() => {
          setIsSimulatedDemo(!isSimulatedDemo);
          showToast(
            !isSimulatedDemo
              ? 'Activated 4-desk simulation sandbox preview'
              : 'Switched back to live telemetry',
            'info'
          );
        }}
      />

      {/* Error Alert Banner if any */}
      {error && (
        <div
          style={{
            background: 'var(--tc-rose-tint)',
            borderBottom: '1px solid var(--tc-rose-border)',
            padding: '10px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12.5px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fca5a5' }}>
            <IconAlertCircle size={15} color="#fca5a5" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            className="tc-btn"
            style={{ padding: '4px 10px', fontSize: '11px' }}
            onClick={autoLogin}
            disabled={isAuthenticating}
          >
            {isAuthenticating ? 'Connecting…' : 'Re-Authenticate'}
          </button>
        </div>
      )}

      {/* Main Workspace Body based on Active Tab */}
      {activeTab === 'debrief' || isDebriefState ? (
        <TeacherDebriefScreen
          sessionId={currentSessionId}
          token={token}
          onReturnToDashboard={() => setActiveTab('matrix')}
        />
      ) : activeTab === 'roster' ? (
        <TeacherRosterView
          teams={teams}
          onSendHint={(teamId) => setSelectedHintTeamId(teamId)}
        />
      ) : activeTab === 'broadcast' ? (
        <TeacherCommsView
          teams={teams}
          onBroadcast={handleBroadcast}
        />
      ) : (
        /* Default: Balanced 2-Column Workspace (65% Teams + 35% Sidebar) */
        <div className="tc-two-col-workspace">
          {/* Column 1: Left Primary Area (65%) */}
          <main className="tc-primary-area" aria-label="Active Teams and Diagnostic Progress">
            <div className="tc-stage-toolbar">
              <div className="tc-filter-pillbox" role="tablist">
                <button
                  type="button"
                  className={`tc-filter-pill ${filterMode === 'all' ? 'tc-filter-pill--active' : ''}`}
                  onClick={() => setFilterMode('all')}
                >
                  All Sectors ({teams.length})
                </button>
                <button
                  type="button"
                  className={`tc-filter-pill ${filterMode === 'in_progress' ? 'tc-filter-pill--active' : ''}`}
                  onClick={() => setFilterMode('in_progress')}
                >
                  In Progress ({teams.filter((t) => t.outcomeState !== 'resolved').length})
                </button>
                <button
                  type="button"
                  className={`tc-filter-pill ${filterMode === 'resolved' ? 'tc-filter-pill--active' : ''}`}
                  onClick={() => setFilterMode('resolved')}
                >
                  Resolved ({teams.filter((t) => t.outcomeState === 'resolved').length})
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="tc-search-wrap">
                  <span className="tc-search-icon-svg" aria-hidden="true">
                    <IconSearch size={14} />
                  </span>
                  <input
                    type="search"
                    className="tc-search-input-field"
                    placeholder="Search student, desk, or department…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Filter teams"
                  />
                </div>
              </div>
            </div>

            {/* Team Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {filteredTeams.length > 0 ? (
                filteredTeams.map((team) => (
                  <TeacherTeamCard
                    key={team.teamId}
                    team={team}
                    onSendHint={(teamId) => setSelectedHintTeamId(teamId)}
                    isSimulatedDemo={isSimulatedDemo}
                  />
                ))
              ) : (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '48px 24px',
                    background: 'var(--tc-glass-bg)',
                    borderRadius: '14px',
                    border: '1px solid var(--tc-border)',
                    boxShadow: 'var(--tc-shadow-md)',
                  }}
                >
                  <IconCpu size={32} color="var(--tc-cyan)" />
                  <h3 style={{ margin: '12px 0 6px', fontSize: '16px', color: '#fff', fontWeight: 700 }}>
                    {searchQuery ? 'No matching teams found' : 'Awaiting Student Arrivals'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--tc-text-muted)' }}>
                    {searchQuery
                      ? 'Try clearing your search query or switching filters.'
                      : `Students can join this session using join code "${currentSessionId}".`}
                  </p>
                </div>
              )}
            </div>
          </main>

          {/* Column 2: Right Sidebar (35%) */}
          <TeacherSidebar
            teams={teams}
            onBroadcast={handleBroadcast}
            onSendHint={handleSendHint}
            onOpenEndSession={() => setShowEndSessionModal(true)}
            isSimulatedDemo={isSimulatedDemo}
          />
        </div>
      )}

      {/* Accessible Hint Modal */}
      <TeacherHintModal
        isOpen={selectedHintTeamId !== null}
        teams={teams}
        selectedTeamId={selectedHintTeamId}
        onClose={() => setSelectedHintTeamId(null)}
        onSendHint={handleSendHint}
      />

      {/* Accessible End Session Modal */}
      <TeacherEndSessionModal
        isOpen={showEndSessionModal}
        teams={teams}
        onClose={() => setShowEndSessionModal(false)}
        onConfirmEnd={handleEndSession}
      />

      {/* Accessible Session Switcher Modal */}
      <TeacherSessionSwitcherModal
        isOpen={showSessionSwitcher}
        currentSessionId={currentSessionId}
        onClose={() => setShowSessionSwitcher(false)}
        onSwitchSession={handleSwitchSession}
      />
    </div>
  );
}
