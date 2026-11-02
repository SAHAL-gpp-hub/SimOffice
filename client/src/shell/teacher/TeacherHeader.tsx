import { useState, useEffect } from 'react';
import {
  IconShield,
  IconMatrix,
  IconUsers,
  IconRadio,
  IconAward,
  IconClock,
  IconRefresh,
  IconExit,
  IconCopy,
  IconCheck,
} from './icons';

export type TeacherNavTab = 'matrix' | 'roster' | 'broadcast' | 'debrief';

interface Props {
  sessionId: string;
  sessionStatus?: string;
  activeTab: TeacherNavTab;
  onSelectTab: (tab: TeacherNavTab) => void;
  isPolling: boolean;
  totalStudents: number;
  onRefresh: () => void;
  onOpenSwitchSession: () => void;
  onExit: () => void;
}

export function TeacherHeader({
  sessionId,
  sessionStatus = 'active',
  activeTab,
  onSelectTab,
  isPolling,
  totalStudents,
  onRefresh,
  onOpenSwitchSession,
  onExit,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(sessionId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="tc-navbar" role="banner">
      {/* Left: Brand Identity & Active Session Pill */}
      <div className="tc-nav-brand">
        <div className="tc-brand-badge" aria-hidden="true">
          <IconShield size={15} strokeWidth={2.2} />
        </div>
        <div className="tc-brand-titles">
          <div className="tc-brand-main">
            <span>SimOffice</span>
            <span className="tc-instructor-tag">Staff Command</span>
          </div>
        </div>

        <div className="tc-session-tag" title="Lab Join Code for students">
          <span style={{ fontSize: '10.5px', color: 'var(--tc-text-muted)' }}>ROOM:</span>
          <code>{sessionId}</code>
          <button
            type="button"
            className="tc-copy-icon-btn"
            onClick={handleCopyCode}
            aria-label="Copy session join code"
            title="Copy join code to clipboard"
          >
            {copied ? (
              <IconCheck size={12} color="var(--tc-mint)" />
            ) : (
              <IconCopy size={12} />
            )}
          </button>
        </div>
      </div>

      {/* Center: Segmented Navigation Switcher */}
      <nav className="tc-nav-tabs" role="tablist" aria-label="Console navigation">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'matrix'}
          className={`tc-nav-tab ${activeTab === 'matrix' ? 'tc-nav-tab--active' : ''}`}
          onClick={() => onSelectTab('matrix')}
        >
          <IconMatrix size={13} />
          <span>Active Lab</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'roster'}
          className={`tc-nav-tab ${activeTab === 'roster' ? 'tc-nav-tab--active' : ''}`}
          onClick={() => onSelectTab('roster')}
        >
          <IconUsers size={13} />
          <span>Class Roster ({totalStudents})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'broadcast'}
          className={`tc-nav-tab ${activeTab === 'broadcast' ? 'tc-nav-tab--active' : ''}`}
          onClick={() => onSelectTab('broadcast')}
        >
          <IconRadio size={13} />
          <span>Announcements</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'debrief'}
          className={`tc-nav-tab ${activeTab === 'debrief' ? 'tc-nav-tab--active' : ''}`}
          onClick={() => onSelectTab('debrief')}
        >
          <IconAward size={13} />
          <span>Debrief</span>
        </button>
      </nav>

      {/* Right: Timer, Telemetry & Session Actions */}
      <div className="tc-nav-right">
        {/* Active Timer Pill */}
        <div className="tc-clock-chip" title="Active session runtime">
          <IconClock size={12} />
          <span>{formatTimer(elapsedSeconds)}</span>
        </div>

        {/* Live Status Beacon */}
        <div className="tc-status-pill">
          <span className="tc-pulse-beacon" />
          <span>{sessionStatus.toUpperCase()}</span>
        </div>

        {/* Switch Session Pill Button */}
        <button
          type="button"
          className="tc-btn tc-btn--secondary"
          onClick={onOpenSwitchSession}
          style={{ padding: '4px 10px', fontSize: '11.5px' }}
          title="Switch room code or load previous session"
        >
          Switch Room
        </button>

        {/* Manual Refresh Button */}
        <button
          type="button"
          className="tc-btn tc-btn--secondary"
          onClick={onRefresh}
          disabled={isPolling}
          style={{ padding: '5px', borderRadius: '6px' }}
          aria-label="Refresh telemetry data"
          title="Force telemetry refresh"
        >
          <IconRefresh size={13} className={isPolling ? 'tc-spin' : ''} />
        </button>

        {/* Exit Session Button */}
        <button
          type="button"
          className="tc-btn tc-btn--secondary"
          onClick={onExit}
          style={{ padding: '4px 10px', fontSize: '11.5px' }}
          title="Exit to main menu"
        >
          <IconExit size={12} />
          <span>Exit</span>
        </button>
      </div>
    </header>
  );
}
