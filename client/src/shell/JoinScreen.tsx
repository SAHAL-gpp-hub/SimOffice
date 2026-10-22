/**
 * SCR-06 — Join Session & Access Terminal (UIUXD v2.1 §SCR-06, API Spec §3.2)
 *
 * Provides:
 * 1. Student Session Join (Join code + display name + optional passcode)
 * 2. Staff / Teacher Authentication (Email + password -> Teacher Dashboard)
 *
 * Implements the glassmorphism terminal UI with deferred Just-in-Time 3D initialization.
 */

import React, { useState, useId } from 'react';
import { joinSession, isApiError } from '../api/roster';
import { loginTeacher } from '../api/auth';
import { useShellStore } from './store';
import { enterWorld, ensureEngineInitialized } from './engineBridge';

const ERROR_MESSAGES: Record<number, Record<string, string>> = {
  404: {
    INVALID_JOIN_CODE: "That join code doesn't match any open session.",
    default: 'Session not found.',
  },
  409: {
    SESSION_NOT_JOINABLE: 'This session has already ended.',
    SESSION_ROSTER_FULL: "This session's roster is full — ask your teacher to raise the cap.",
    default: 'Could not join the session.',
  },
  401: {
    INVALID_ROSTER_PASSCODE: "That passcode didn't match any student in this class.",
    default: 'Authentication failed.',
  },
  429: {
    default: 'Too many attempts — please wait a moment and try again.',
  },
};

function getErrorMessage(status: number, code: string): string {
  const byStatus = ERROR_MESSAGES[status];
  if (!byStatus) return 'Something went wrong. Please try again.';
  return byStatus[code] ?? byStatus['default'] ?? 'Something went wrong.';
}

/* ────────────────────────── Inline Vector Icons ────────────────────────── */

function SimOfficeLogo({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="so-cyan-bright" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#bae6fd" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
        <linearGradient id="so-cyan-mid" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
        <linearGradient id="so-cyan-dark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>
        <filter id="so-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#38bdf8" floodOpacity="0.5" />
        </filter>
      </defs>
      <g filter="url(#so-glow)">
        {/* Upper S ribbon */}
        <polygon points="32,6 52,17.5 36,26.5 16,15" fill="url(#so-cyan-bright)" />
        <polygon points="52,17.5 52,31 36,40 36,26.5" fill="url(#so-cyan-mid)" />
        <polygon points="16,15 36,26.5 36,33 16,21.5" fill="url(#so-cyan-dark)" />
        {/* Lower S ribbon */}
        <polygon points="12,28.5 28,37.5 28,51 12,42" fill="url(#so-cyan-mid)" />
        <polygon points="28,37.5 48,26 48,39.5 28,51" fill="url(#so-cyan-dark)" />
        <polygon points="28,44.5 48,33 40,28.5 20,40" fill="url(#so-cyan-bright)" opacity="0.85" />
      </g>
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function GradCapIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}

function StaffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function HashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" x2="20" y1="9" y2="9" />
      <line x1="4" x2="20" y1="15" y2="15" />
      <line x1="10" x2="8" y1="3" y2="21" />
      <line x1="16" x2="14" y1="3" y2="21" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="terminal-spin">
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="#ffffff" strokeLinecap="round" />
    </svg>
  );
}

/* ────────────────────────── Main Component ────────────────────────── */

export function JoinScreen() {
  const joinCodeId = useId();
  const displayNameId = useId();
  const passcodeId = useId();
  const emailId = useId();
  const teacherPasswordId = useId();
  const teacherSessionId = useId();

  // Mode state: 'student' or 'teacher'
  const urlParams = new URLSearchParams(window.location.search);
  const [activeTab, setActiveTab] = useState<'student' | 'teacher'>(
    urlParams.get('teacher') === '1' ? 'teacher' : 'student'
  );

  // Student form state
  const [joinCode, setJoinCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);

  // Teacher form state
  const [email, setEmail] = useState('teacher@simoffice.edu');
  const [teacherPassword, setTeacherPassword] = useState('Password123!');
  const [sessionId, setSessionId] = useState('DEMO01');

  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const { enterCharacterCreation, enterWorldWithExistingAppearance, enterTeacherDashboard } = useShellStore();

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setLoadingStatus('Authenticating...');

    try {
      const res = await loginTeacher(email.trim(), teacherPassword);
      const token = res.token;
      const targetSession = sessionId.trim() || 'DEMO01';
      
      localStorage.setItem('teacherToken', token);
      localStorage.setItem('teacherSessionId', targetSession);
      
      enterTeacherDashboard(targetSession, token);
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate teacher account.');
    } finally {
      setLoading(false);
      setLoadingStatus('');
    }
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setLoadingStatus('Verifying session...');

    try {
      const result = await joinSession({
        joinCode: joinCode.trim().toUpperCase(),
        displayName: displayName.trim(),
        rosterPasscode: passcode.trim() || undefined,
      });

      sessionStorage.setItem('studentToken', result.token);
      if (result.sessionId) {
        sessionStorage.setItem('studentSessionId', result.sessionId);
      }

      setLoadingStatus('Entering simulation...');

      // JIT initialization: spin up the 3D Babylon engine now that user has authenticated
      await ensureEngineInitialized();

      // Branch on appearance emptiness, NOT on HTTP 200 vs 201 (API Spec §14.6 / UIUXD SCR-06)
      const hasAppearance = Object.keys(result.appearance || {}).length > 0;
      if (hasAppearance) {
        enterWorldWithExistingAppearance(result);
        enterWorld(result.appearance as { colorScheme: string });
      } else {
        enterCharacterCreation(result);
      }
    } catch (err) {
      if (isApiError(err)) {
        setError(getErrorMessage(err.status, err.code));
      } else {
        setError('Network error — check your connection and try again.');
      }
    } finally {
      setLoading(false);
      setLoadingStatus('');
    }
  };

  return (
    <div className="terminal-card" role="main" aria-label={activeTab === 'teacher' ? "Staff Login" : "Join Simulation"}>
      {/* Header & Isometric Brand Logo */}
      <div className="terminal-header">
        <div className="terminal-logo-wrap">
          <SimOfficeLogo size={52} />
        </div>
        <h1 className="terminal-title">SimOffice</h1>
        <p className="terminal-subtitle">Collaborative Engineering Simulation</p>
      </div>

      {/* Segmented Pill Role Switcher */}
      <div className="terminal-pill-toggle" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'student'}
          className={`terminal-pill-btn ${activeTab === 'student' ? 'terminal-pill-btn--active' : ''}`}
          onClick={() => { setActiveTab('student'); setError(null); }}
        >
          <GradCapIcon />
          <span>Student Join</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'teacher'}
          className={`terminal-pill-btn ${activeTab === 'teacher' ? 'terminal-pill-btn--active' : ''}`}
          onClick={() => { setActiveTab('teacher'); setError(null); }}
        >
          <StaffIcon />
          <span>Staff Login</span>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="terminal-alert" role="alert">
          <InfoIcon />
          <span>{error}</span>
        </div>
      )}

      {/* Student Join Form */}
      {activeTab === 'student' ? (
        <form onSubmit={handleStudentSubmit} className="terminal-form" noValidate>
          {/* Join Code Field */}
          <div className="terminal-field">
            <label htmlFor={joinCodeId} className="terminal-label">
              Join Code
            </label>
            <div className="terminal-input-wrap">
              <span className="terminal-input-icon">
                <KeyIcon />
              </span>
              <input
                id={joinCodeId}
                className="terminal-input terminal-input--mono"
                type="text"
                value={joinCode}
                onChange={(e) =>
                  setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 36))
                }
                placeholder="D E M O 0 1"
                autoComplete="off"
                spellCheck={false}
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Display Name Field */}
          <div className="terminal-field">
            <label htmlFor={displayNameId} className="terminal-label">
              Display Name / Call-sign
            </label>
            <div className="terminal-input-wrap">
              <span className="terminal-input-icon">
                <UserIcon />
              </span>
              <input
                id={displayNameId}
                className="terminal-input"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value.slice(0, 30))}
                placeholder="e.g. Sahal, RedFox, CyberNova..."
                maxLength={30}
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Returning Student Passcode Accordion */}
          <div className="terminal-passcode-row">
            <button
              type="button"
              className="terminal-passcode-toggle"
              onClick={() => setShowPasscode((v) => !v)}
              aria-expanded={showPasscode}
              disabled={loading}
            >
              {showPasscode ? '▾ Hide roster passcode' : '▸ Returning student? Enter your passcode'}
            </button>
          </div>

          {showPasscode && (
            <div className="terminal-field terminal-field--fadeIn">
              <label htmlFor={passcodeId} className="terminal-label">
                Roster Passcode
              </label>
              <div className="terminal-input-wrap">
                <span className="terminal-input-icon">
                  <LockIcon />
                </span>
                <input
                  id={passcodeId}
                  className="terminal-input terminal-input--mono"
                  type="text"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value.toUpperCase())}
                  placeholder="WOLF-42"
                  autoComplete="off"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Enter Simulation CTA */}
          <button
            type="submit"
            className="terminal-cta-btn"
            disabled={loading || joinCode.length < 4 || displayName.trim().length < 1}
          >
            {loading ? (
              <>
                <SpinnerIcon />
                <span>{loadingStatus || 'ENTERING SIMULATION...'}</span>
              </>
            ) : (
              <>
                <span>ENTER SIMULATION</span>
                <ArrowRightIcon />
              </>
            )}
          </button>
        </form>
      ) : (
        /* Teacher / Staff Authentication Form */
        <form onSubmit={handleTeacherLogin} className="terminal-form" noValidate>
          <div className="terminal-field">
            <label htmlFor={emailId} className="terminal-label">
              Staff Email
            </label>
            <div className="terminal-input-wrap">
              <span className="terminal-input-icon">
                <EmailIcon />
              </span>
              <input
                id={emailId}
                className="terminal-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@simoffice.edu"
                autoComplete="email"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="terminal-field">
            <label htmlFor={teacherPasswordId} className="terminal-label">
              Password
            </label>
            <div className="terminal-input-wrap">
              <span className="terminal-input-icon">
                <LockIcon />
              </span>
              <input
                id={teacherPasswordId}
                className="terminal-input"
                type="password"
                value={teacherPassword}
                onChange={(e) => setTeacherPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="terminal-field">
            <label htmlFor={teacherSessionId} className="terminal-label">
              Session Code / ID
            </label>
            <div className="terminal-input-wrap">
              <span className="terminal-input-icon">
                <HashIcon />
              </span>
              <input
                id={teacherSessionId}
                className="terminal-input terminal-input--mono"
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="DEMO01"
                autoComplete="off"
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="terminal-cta-btn"
            disabled={loading || !email.trim() || !teacherPassword}
          >
            {loading ? (
              <>
                <SpinnerIcon />
                <span>{loadingStatus || 'AUTHENTICATING...'}</span>
              </>
            ) : (
              <>
                <span>ACCESS DASHBOARD</span>
                <ArrowRightIcon />
              </>
            )}
          </button>
        </form>
      )}

      {/* Footer Info */}
      <div className="terminal-footer-hint">
        <InfoIcon />
        <span>Don't have a join code? Ask your instructor.</span>
      </div>
    </div>
  );
}
