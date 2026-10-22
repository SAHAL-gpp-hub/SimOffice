/**
 * Zustand store for the React shell's navigation and session state.
 *
 * TDD §9: "which screen the React shell is on... the in-progress
 * character-creation form... is a genuinely small surface" → Zustand.
 *
 * The store has three mutually exclusive screens. The Babylon engine
 * (characterController.ts) listens to `screen` transitioning to 'in-world'
 * via the engineBridge and activates pointer-lock / world controls then.
 */

import { create } from 'zustand';
import type { JoinResponse } from '../api/roster';
import type { Room } from 'colyseus.js';
import type { TeamRoomState } from '../network/schema/TeamRoomState';

export type ShellScreen =
  | 'join'                 // SCR-06: student enters join code
  | 'character-creation'   // SCR-07: student picks color + name
  | 'in-world'             // engine is active, shell is hidden
  | 'teacher-dashboard'    // SCR-15: teacher dashboard
  | 'debrief';             // M0.4d: post-session summary

interface ShellState {
  screen: ShellScreen;
  // Set once POST /sessions/join succeeds; cleared on reset
  joinResult: JoinResponse | null;
  // Set once PATCH /roster-entries/.../character succeeds
  finalAppearance: { colorScheme: string } | null;
  debriefUrl: string | null;

  // Actions
  enterCharacterCreation: (result: JoinResponse) => void;
  enterWorld: (appearance: { colorScheme: string }) => void;
  // Also call enterWorld for a returning student who already has appearance
  enterWorldWithExistingAppearance: (result: JoinResponse) => void;
  enterTeacherDashboard: (sessionId: string, token: string) => void;
  enterDebrief: (debriefUrl: string) => void;
  reset: () => void;

  // ── Workstation (SCR-14) ──────────────────────────────────────────────────
  // Toggled by the engine bridge sit/stand callbacks in main.ts.
  // All editor state lives inside WorkstationOverlay; only open/close + auth
  // context are here so the overlay can be a standalone, always-mounted component.
  workstation: {
    isOpen: boolean;
    teamId: string | null;
    token: string | null;
  };
  openWorkstation: (teamId: string, token: string) => void;
  closeWorkstation: () => void;

  // ── Chat (SCR-12) ─────────────────────────────────────────────────────────
  chat: {
    room: Room<TeamRoomState> | null;
  };
  setRoom: (room: Room<TeamRoomState>) => void;
  clearRoom: () => void;
}

export const useShellStore = create<ShellState>((set) => ({
  screen: 'join',
  joinResult: null,
  finalAppearance: null,
  debriefUrl: null,

  enterCharacterCreation: (result) =>
    set({ screen: 'character-creation', joinResult: result }),

  enterWorld: (appearance) =>
    set({ screen: 'in-world', finalAppearance: appearance }),

  enterWorldWithExistingAppearance: (result) =>
    set({
      screen: 'in-world',
      joinResult: result,
      finalAppearance: result.appearance as { colorScheme: string },
    }),

  enterTeacherDashboard: (sessionId, token) => {
    // Note: Externalize session state to workstation store if needed
    set({
      screen: 'teacher-dashboard',
      workstation: { isOpen: false, teamId: sessionId, token },
    });
  },

  enterDebrief: (debriefUrl: string) => {
    set({ screen: 'debrief', debriefUrl });
  },

  reset: () =>
    set({
      screen: 'join',
      joinResult: null,
      finalAppearance: null,
      debriefUrl: null,
      workstation: { isOpen: false, teamId: null, token: null },
    }),

  // ── Workstation ──────────────────────────────────────────────────────────
  workstation: {
    isOpen: false,
    teamId: null,
    token: null,
  },

  openWorkstation: (teamId, token) =>
    set({ workstation: { isOpen: true, teamId, token } }),

  closeWorkstation: () =>
    set({ workstation: { isOpen: false, teamId: null, token: null } }),

  // ── Chat ─────────────────────────────────────────────────────────────────
  chat: {
    room: null,
  },
  setRoom: (room) => set({ chat: { room } }),
  clearRoom: () => set({ chat: { room: null } }),
}));
