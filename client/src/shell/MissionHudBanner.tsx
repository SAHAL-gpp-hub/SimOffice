/**
 * In-World HUD Mission Tracker / Objective Widget
 * Displays the current incident briefing and active objective while walking around in 3D
 */

import { useState } from 'react';
import { useShellStore } from './store';

export function MissionHudBanner() {
  const [collapsed, setCollapsed] = useState(false);
  const isOpen = useShellStore((s) => s.workstation.isOpen);

  // Hide when inside the full workstation IDE overlay
  if (isOpen) return null;

  return (
    <aside
      className={`mission-hud ${collapsed ? 'mission-hud--collapsed' : ''}`}
      aria-label="Active Mission Tracker"
    >
      <div className="mission-hud__header">
        <div className="mission-hud__title">
          <span className="mission-hud__pulse" aria-hidden="true"></span>
          <span className="mission-hud__tag">INCIDENT BRIEFING</span>
        </div>
        <button
          type="button"
          className="mission-hud__toggle-btn"
          onClick={() => setCollapsed(!collapsed)}
          aria-expanded={!collapsed}
          title={collapsed ? 'Expand Mission Tracker' : 'Collapse Mission Tracker'}
        >
          {collapsed ? '➕ Expand' : '➖ Minimize'}
        </button>
      </div>

      {!collapsed ? (
        <div className="mission-hud__content">
          <h3 className="mission-hud__heading">OmniCart Inventory Underflow</h3>
          <p className="mission-hud__description">
            Customers report negative stock counts during high-traffic surges. Approach a computer desk and press <strong>[E]</strong> to inspect <code>src/index.js</code>.
          </p>
          <div className="mission-hud__goal">
            <span className="mission-hud__goal-icon">🎯</span>
            <span><strong>Objective:</strong> Fix logic bug so stock never drops below 0.</span>
          </div>
        </div>
      ) : (
        <div className="mission-hud__mini-text" onClick={() => setCollapsed(false)}>
          OmniCart Underflow · <strong>[E]</strong> to Sit
        </div>
      )}
    </aside>
  );
}
