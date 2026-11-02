import React, { useEffect, useState } from 'react';

interface HintEventDetail {
  message: string;
  sender?: string;
  timestamp?: number;
}

interface Props {
  onOpenChat?: () => void;
}

export const TacticalHintToast: React.FC<Props> = ({ onOpenChat }) => {
  const [hint, setHint] = useState<HintEventDetail | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleHint = (e: Event) => {
      const customEvent = e as CustomEvent<HintEventDetail>;
      if (customEvent.detail) {
        setHint(customEvent.detail);
        setVisible(true);
      }
    };

    window.addEventListener('simoffice:teacherHint', handleHint);
    return () => window.removeEventListener('simoffice:teacherHint', handleHint);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      setVisible(false);
    }, 9000); // 9 seconds visible
    return () => clearTimeout(timer);
  }, [visible, hint]);

  if (!visible || !hint) return null;

  return (
    <aside className="tactical-hint-toast" role="alert" aria-live="assertive">
      <div className="tactical-hint-toast__glow" aria-hidden="true" />
      <div className="tactical-hint-toast__header">
        <div className="tactical-hint-toast__badge">
          <span className="tactical-hint-toast__beacon" aria-hidden="true" />
          <svg className="tactical-hint-toast__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 18.75h.007v.008H12v-.008z" />
          </svg>
          <span>TACTICAL DISPATCH · INSTRUCTOR GUIDANCE</span>
        </div>
        <button
          type="button"
          className="tactical-hint-toast__close"
          onClick={() => setVisible(false)}
          aria-label="Dismiss hint"
        >
          ✕
        </button>
      </div>

      <div className="tactical-hint-toast__body">
        <p className="tactical-hint-toast__text">{hint.message}</p>
      </div>

      <div className="tactical-hint-toast__footer">
        <span className="tactical-hint-toast__meta">Received just now</span>
        {onOpenChat && (
          <button
            type="button"
            className="tactical-hint-toast__action"
            onClick={() => {
              setVisible(false);
              onOpenChat();
            }}
          >
            Open Comms Console ➔
          </button>
        )}
      </div>
      <div className="tactical-hint-toast__progress-bar" />
    </aside>
  );
};
