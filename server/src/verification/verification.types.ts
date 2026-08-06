export type OutcomeState = 'in_progress' | 'resolved' | 'unresolved';

export interface VerificationRunRecord {
  id: string;
  teamId: string;
  verificationCheckId: string;
  triggeredByRosterEntryId: string | null;
  result: 'pass' | 'fail' | 'resource_limit_exceeded' | 'error';
  diagnosticDetails: any;
  ranAt: Date;
}

export interface RoomBroadcaster {
  broadcastVerificationResult(
    teamId: string,
    run: VerificationRunRecord,
    checkType: 'full_fix' | 'diagnostic',
  ): void;
}

export const ROOM_BROADCASTER = Symbol('ROOM_BROADCASTER');
