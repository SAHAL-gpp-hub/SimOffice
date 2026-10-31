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
import { CharacterCreationScreen } from './CharacterCreationScreen';
import { WorkstationOverlay } from './WorkstationOverlay';
import { ChatPanel } from './ChatPanel';
import { TeacherDashboard } from './TeacherDashboard';
import { DebriefScreen } from './DebriefScreen';
import { MissionHudBanner } from './MissionHudBanner';

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

      {/* Character Creation Screen */}
      {screen === 'character-creation' && (
        <div className="shell-container">
          <div className="shell-overlay-bg"></div>
          <CharacterCreationScreen />
        </div>
      )}

      {/* SCR-15 Teacher Dashboard */}
      {screen === 'teacher-dashboard' && (
        <div className="shell-container">
          <div className="shell-overlay-bg"></div>
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

      {/* In-World Mission Tracker HUD (while walking / standing up) */}
      {screen === 'in-world' && <MissionHudBanner />}

      {/* SCR-14: always mounted while in-world, shown when workstation is open */}
      {screen === 'in-world' && <WorkstationOverlay />}

      {/* SCR-12: Chat Panel */}
      {screen === 'in-world' && <ChatPanel />}
    </>
  );
}
