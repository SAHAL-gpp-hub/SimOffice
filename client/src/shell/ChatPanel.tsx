import React, { useEffect, useState, useRef } from 'react';
import { useShellStore } from './store';
import { ChatMessage } from '../network/schema/TeamRoomState';
import { TacticalHintToast } from './TacticalHintToast';

interface UIChatMessage {
  id: string;
  rosterEntryId: string;
  senderName: string;
  channel: 'department' | 'proximity' | 'system';
  message: string;
  timestamp: number;
  systemType?: 'hint' | 'announcement';
}

const AVATAR_COLORS = [
  '#38bdf8', // sky
  '#2dd4bf', // teal
  '#818cf8', // indigo
  '#f472b6', // pink
  '#fbbf24', // amber
  '#a78bfa', // purple
  '#34d399', // emerald
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export const ChatPanel: React.FC = () => {
  const room = useShellStore((s) => s.chat.room);
  
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'department' | 'proximity'>('department');
  const [messages, setMessages] = useState<UIChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [inputValue, setInputValue] = useState('');
  
  const expandedRef = useRef(expanded);
  useEffect(() => {
    expandedRef.current = expanded;
  }, [expanded]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (expanded && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, expanded, activeTab]);

  // Focus input on expand
  useEffect(() => {
    if (expanded && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [expanded]);

  // Global hotkey: 'c' to toggle comms if not typing in an input
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setExpanded((prev) => {
          if (!prev) setUnreadCount(0);
          return !prev;
        });
      }
    };

    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  useEffect(() => {
    if (!room) return;

    const handleNewMessage = (msg: UIChatMessage) => {
      setMessages((prev) => {
        // Deduplicate
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg].sort((a, b) => a.timestamp - b.timestamp);
      });
      
      // Auto-expand if it's a system message
      if (msg.channel === 'system' && !expandedRef.current) {
        setExpanded(true);
      } else {
        setUnreadCount((prev) => expandedRef.current ? 0 : prev + 1);
      }
    };

    // 1. Seed existing department history from chatLog
    room.state.chatLog.forEach((msg: ChatMessage) => {
      handleNewMessage({
        id: `${msg.timestamp}_${msg.rosterEntryId}`,
        rosterEntryId: msg.rosterEntryId,
        senderName: msg.senderName,
        channel: 'department',
        message: msg.message,
        timestamp: msg.timestamp,
      });
    });

    // 2. Listen for new department messages via schema sync
    const removeOnAdd = room.state.chatLog.onAdd((msg: ChatMessage) => {
      handleNewMessage({
        id: `${msg.timestamp}_${msg.rosterEntryId}`,
        rosterEntryId: msg.rosterEntryId,
        senderName: msg.senderName,
        channel: 'department',
        message: msg.message,
        timestamp: msg.timestamp,
      });
    });

    // 3. Listen for ephemeral proximity messages
    const removeOnMessage = room.onMessage('chatPosted', (msg: any) => {
      handleNewMessage({
        id: `${msg.timestamp}_${msg.rosterEntryId}`,
        rosterEntryId: msg.rosterEntryId,
        senderName: msg.senderName || msg.rosterEntryId.slice(0, 6),
        channel: msg.channel,
        message: msg.message,
        timestamp: msg.timestamp,
      });
    });

    // 4. Listen for Teacher Hints
    const removeOnHint = room.onMessage('teacherHint', (msg: any) => {
      // Dispatch toast event for immediate HUD alert
      window.dispatchEvent(new CustomEvent('simoffice:teacherHint', {
        detail: {
          message: msg.message,
          sender: 'Teacher',
          timestamp: msg.timestamp,
        }
      }));

      handleNewMessage({
        id: `hint_${msg.timestamp}`,
        rosterEntryId: 'system',
        senderName: 'Tactical Instructor',
        channel: 'department', // Render in department tab so everyone sees it
        message: msg.message,
        timestamp: msg.timestamp,
        systemType: 'hint',
      });
    });

    // 5. Listen for Teacher Announcements
    const removeOnAnnouncement = room.onMessage('teacherAnnouncement', (msg: any) => {
      handleNewMessage({
        id: `announcement_${msg.timestamp}`,
        rosterEntryId: 'system',
        senderName: 'HQ Announcement',
        channel: 'department', // Render in department tab
        message: msg.message,
        timestamp: msg.timestamp,
        systemType: 'announcement',
      });
    });

    // 6. Listen for Verification Results broadcast
    const removeOnVerification = room.onMessage('verificationResult', (msg: any) => {
      handleNewMessage({
        id: `verif_${Date.now()}_${msg.checkId || Math.random()}`,
        rosterEntryId: 'system',
        senderName: 'Verification Bot',
        channel: 'department',
        message: msg.result === 'pass'
          ? `🎉 Verification Check [${msg.checkType === 'full_fix' ? 'Full Fix' : 'Diagnostic'}] PASSED! Team is now Resolved!`
          : `⚠️ Verification Check [${msg.checkType === 'full_fix' ? 'Full Fix' : 'Diagnostic'}] ${String(msg.result).toUpperCase()}.`,
        timestamp: msg.ranAt || new Date().toISOString(),
        systemType: msg.result === 'pass' ? 'announcement' : 'hint',
      });
    });

    // 7. Listen for sessionEnded
    const removeOnSessionEnded = room.onMessage('sessionEnded', (msg: any) => {
      if (msg && msg.debriefUrl) {
        useShellStore.getState().enterDebrief(msg.debriefUrl);
      }
    });

    return () => {
      if (typeof removeOnAdd === 'function') removeOnAdd();
      if (typeof removeOnMessage === 'function') removeOnMessage();
      if (typeof removeOnHint === 'function') removeOnHint();
      if (typeof removeOnAnnouncement === 'function') removeOnAnnouncement();
      if (typeof removeOnVerification === 'function') removeOnVerification();
      if (typeof removeOnSessionEnded === 'function') removeOnSessionEnded();
    };
  }, [room]); // only depend on room

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text || !room) return;

    room.send('sendChat', { channel: activeTab, message: text });
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Stop propagation so WASD doesn't move the character
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    if (e.key === 'Enter') {
      handleSend();
    } else if (e.key === 'Escape') {
      setExpanded(false);
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const displayedMessages = messages.filter(m => m.channel === activeTab);

  if (!room) return null;

  return (
    <>
      {/* High-priority Incoming Tactical Hint Banner */}
      <TacticalHintToast onOpenChat={() => {
        setExpanded(true);
        setActiveTab('department');
      }} />

      <div className={`chat-panel ${expanded ? 'expanded' : 'collapsed'}`}>
        {!expanded ? (
          <button
            type="button"
            className="chat-toggle-capsule"
            onClick={() => {
              setExpanded(true);
              setUnreadCount(0);
            }}
            aria-label="Open Communications Console"
          >
            <div className="chat-toggle-icon">
              <span className="chat-toggle-beacon" />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a.75.75 0 01-.974-.975 5.974 5.974 0 011.05-3.328A7.838 7.838 0 013 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </div>
            <span className="chat-toggle-label">COMMS</span>
            <kbd className="hud-kbd chat-toggle-kbd">C</kbd>
            {unreadCount > 0 && (
              <span className="chat-badge">
                <span className="chat-badge-ping" />
                <span className="chat-badge-num">{unreadCount}</span>
              </span>
            )}
          </button>
        ) : (
          <div className="chat-window">
            {/* Header */}
            <div className="chat-header">
              <div className="chat-header-left">
                <span className="chat-status-dot" />
                <span className="chat-header-title">TACTICAL COMMS</span>
              </div>
              <div className="chat-tabs">
                <button 
                  type="button"
                  className={`chat-tab-btn ${activeTab === 'department' ? 'active' : ''}`} 
                  onClick={() => setActiveTab('department')}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
                    <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM5.94 5.5c.944-.575 2.1-.999 3.56-1.158a14.73 14.73 0 011.002 0c1.46.159 2.616.583 3.56 1.158.468.285.867.625 1.18 1.011A6.973 6.973 0 0010 3.5c-1.92 0-3.67.77-4.94 2.011.313-.386.712-.726 1.18-1.011zm-.815 2.457A6.972 6.972 0 003.5 10c0 .945.187 1.846.527 2.668.618-.49 1.488-.937 2.585-1.258a12.636 12.636 0 01-.004-3.41c-1.097-.321-1.967-.768-2.585-1.258zm9.75 0c-.618.49-1.488.937-2.585 1.258.003 1.139.003 2.272 0 3.41 1.097.321 1.967.768 2.585 1.258A6.972 6.972 0 0016.5 10a6.972 6.972 0 00-1.625-2.043z" clipRule="evenodd" />
                  </svg>
                  <span>Department</span>
                </button>
                <button 
                  type="button"
                  className={`chat-tab-btn ${activeTab === 'proximity' ? 'active' : ''}`} 
                  onClick={() => setActiveTab('proximity')}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
                    <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                    <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                  <span>Proximity</span>
                </button>
              </div>
              <div className="chat-header-actions">
                <button 
                  type="button" 
                  className="chat-action-btn" 
                  onClick={() => setExpanded(false)}
                  title="Minimize (ESC)"
                  aria-label="Minimize"
                >
                  ─
                </button>
                <button 
                  type="button" 
                  className="chat-action-btn chat-close-btn" 
                  onClick={() => setExpanded(false)}
                  title="Close Comms"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>
            
            {/* Messages Feed */}
            <div className="chat-messages">
              {displayedMessages.length === 0 ? (
                <div className="chat-empty-state">
                  <span className="chat-empty-icon">📡</span>
                  <p className="chat-empty-title">Channel Open · No Transmissions</p>
                  <p className="chat-empty-sub">
                    {activeTab === 'department' 
                      ? 'Broadcast messages to your entire incident resolution squad.' 
                      : 'Talk with colleagues standing immediately next to you.'}
                  </p>
                </div>
              ) : (
                displayedMessages.map((msg) => {
                  const isHint = msg.systemType === 'hint';
                  const isAnnouncement = msg.systemType === 'announcement';
                  const avatarColor = getAvatarColor(msg.senderName);
                  const initial = (msg.senderName || '?').charAt(0).toUpperCase();

                  if (isHint) {
                    return (
                      <div key={msg.id} className="chat-special-card chat-special-card--hint">
                        <div className="chat-special-header">
                          <span className="chat-special-badge chat-special-badge--amber">
                            <span className="chat-special-dot" />
                            TACTICAL GUIDANCE
                          </span>
                          <span className="chat-time">{formatTime(msg.timestamp)}</span>
                        </div>
                        <div className="chat-special-body">
                          <p>{msg.message}</p>
                        </div>
                      </div>
                    );
                  }

                  if (isAnnouncement) {
                    return (
                      <div key={msg.id} className="chat-special-card chat-special-card--announcement">
                        <div className="chat-special-header">
                          <span className="chat-special-badge chat-special-badge--sky">
                            <span className="chat-special-dot chat-special-dot--sky" />
                            OFFICIAL DISPATCH
                          </span>
                          <span className="chat-time">{formatTime(msg.timestamp)}</span>
                        </div>
                        <div className="chat-special-body">
                          <p>{msg.message}</p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className="chat-bubble-row">
                      <div className="chat-avatar" style={{ backgroundColor: avatarColor }}>
                        {initial}
                      </div>
                      <div className="chat-bubble-content">
                        <div className="chat-message-header">
                          <span className="chat-sender" style={{ color: avatarColor }}>
                            {msg.senderName}
                          </span>
                          <span className="chat-time">{formatTime(msg.timestamp)}</span>
                        </div>
                        <div className="chat-text">
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="chat-input-area">
              <div className="chat-input-wrap">
                <input
                  ref={inputRef}
                  type="text"
                  className="chat-input"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Transmit to #${activeTab}…`}
                  maxLength={500}
                />
                <button
                  type="button"
                  className="chat-send-btn"
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  title="Send Transmission (Enter)"
                  aria-label="Send Transmission"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              </div>
              <div className="chat-input-hints">
                <span>Enter ↵ Transmit</span>
                <span>ESC Minimize</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
