import React, { useEffect, useState, useRef } from 'react';
import { useShellStore } from './store';
import { ChatMessage } from '../network/schema/TeamRoomState';

interface UIChatMessage {
  id: string;
  rosterEntryId: string;
  senderName: string;
  channel: 'department' | 'proximity' | 'system';
  message: string;
  timestamp: number;
  systemType?: 'hint' | 'announcement';
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

  // Auto-scroll on new messages
  useEffect(() => {
    if (expanded && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, expanded, activeTab]);

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
      handleNewMessage({
        id: `hint_${msg.timestamp}`,
        rosterEntryId: 'system',
        senderName: 'Teacher',
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
        senderName: 'Announcement',
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
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const displayedMessages = messages.filter(m => m.channel === activeTab);

  if (!room) return null;

  return (
    <div className={`chat-panel ${expanded ? 'expanded' : 'collapsed'}`}>
      {!expanded ? (
        <button className="chat-toggle-btn" onClick={() => {
          setExpanded(true);
          setUnreadCount(0);
        }}>
          Chat {unreadCount > 0 && <span className="chat-badge">{unreadCount}</span>}
        </button>
      ) : (
        <div className="chat-window">
          <div className="chat-header">
            <div className="chat-tabs">
              <button 
                className={activeTab === 'department' ? 'active' : ''} 
                onClick={() => setActiveTab('department')}
              >
                Department
              </button>
              <button 
                className={activeTab === 'proximity' ? 'active' : ''} 
                onClick={() => setActiveTab('proximity')}
              >
                Proximity
              </button>
            </div>
            <button className="chat-close-btn" onClick={() => setExpanded(false)}>✕</button>
          </div>
          
          <div className="chat-messages">
            {displayedMessages.map(msg => {
              const isHint = msg.systemType === 'hint';
              const isAnnouncement = msg.systemType === 'announcement';
              let messageStyle = {};
              
              if (isHint) {
                messageStyle = { background: 'rgba(251, 191, 36, 0.15)', borderLeft: '3px solid #fbbf24', paddingLeft: '10px' };
              } else if (isAnnouncement) {
                messageStyle = { background: 'rgba(56, 189, 248, 0.15)', borderLeft: '3px solid #38bdf8', paddingLeft: '10px' };
              }

              return (
                <div key={msg.id} className="chat-message" style={messageStyle}>
                  <div className="chat-message-header">
                    <span className="chat-sender" style={{ color: isHint ? '#fbbf24' : isAnnouncement ? '#38bdf8' : undefined }}>
                      {msg.senderName}
                    </span>
                    <span className="chat-time">{formatTime(msg.timestamp)}</span>
                  </div>
                  <div className="chat-text" style={{ fontStyle: msg.systemType ? 'italic' : 'normal' }}>
                    {msg.message}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area">
            <input
              type="text"
              className="chat-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${activeTab}...`}
              maxLength={500}
            />
          </div>
        </div>
      )}
    </div>
  );
};
