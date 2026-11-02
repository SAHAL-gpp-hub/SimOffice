/**
 * Root React component for the Shell layer (TDD §9).
 *
 * Mounts over the Babylon.js canvas. Routes between the pre-game screens
 * (Join, Character Creation) based on the Zustand store. Once the state
 * transitions to 'in-world', the shell unmounts its UI completely, leaving
 * only the 3D scene and the workstation overlay (SCR-14).
 *
 * WorkstationOverlay is ALWAYS MOUNTED (never unmounts) so editor state
 * persists across React re-renders during a session. It is visually hidden
 * via display:none when workstation.isOpen is false.
 */

import { useShellStore } from './store';
import { JoinScreen } from './JoinScreen';
import { WorkstationOverlay } from './WorkstationOverlay';
import { ChatPanel } from './ChatPanel';
import { TacticalHintToast } from './TacticalHintToast';
import { TeacherDashboard } from './TeacherDashboard';
import { DebriefScreen } from './DebriefScreen';
// MissionHudBanner removed per user request (incident report now displayed on the 3D wall monitor)

export function Shell() {
  const screen = useShellStore((state) => state.screen);

  return (
    <>
      {/* Join Screen: Loaded immediately with zero bundle delay */}
      {screen === 'join' && (
        <div className="shell-container shell-container--cinematic">
          <JoinScreen />
        </div>
      )}

      {/* SCR-15 Teacher Dashboard: Full-bleed enterprise operations workspace */}
      {screen === 'teacher-dashboard' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, width: '100vw', height: '100vh', overflow: 'hidden', background: '#040711', pointerEvents: 'auto' }}>
          <TeacherDashboard />
        </div>
      )}

      {/* M0.4d Post-Session Debrief */}
      {screen === 'debrief' && (
        <div className="shell-container">
          <div className="shell-overlay-bg"></div>
          <DebriefScreen />
        </div>
      )}

      {/* In-World Mission Tracker HUD removed from 2D screen per user request (now displayed on 3D wall monitor) */}
      {/* {screen === 'in-world' && <MissionHudBanner />} */}

      {/* SCR-14: always mounted while in-world, shown when workstation is open */}
      {screen === 'in-world' && <WorkstationOverlay />}

      {/* High-priority tactical teacher guidance toast */}
      {screen === 'in-world' && <TacticalHintToast />}

      {/* SCR-12: Chat Panel */}
      {screen === 'in-world' && <ChatPanel />}
    </>
  );
}
