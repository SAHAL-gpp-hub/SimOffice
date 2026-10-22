import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { VerificationService } from './verification.service';
import {
  ROOM_BROADCASTER,
  RoomBroadcaster,
  VerificationRunRecord,
} from './verification.types';
import { Logger } from '@nestjs/common';

import { matchMaker } from 'colyseus';

class ColyseusRoomBroadcaster implements RoomBroadcaster {
  private readonly logger = new Logger(ColyseusRoomBroadcaster.name);

  async broadcastVerificationResult(
    teamId: string,
    run: VerificationRunRecord,
    checkType: 'full_fix' | 'diagnostic',
  ): Promise<void> {
    try {
      const rooms = await matchMaker.query({ name: 'team_room' });
      for (const room of rooms) {
        if (room.metadata?.teamId === teamId) {
          await matchMaker.remoteRoomCall(room.roomId, 'broadcast', [
            'verificationResult',
            {
              teamId,
              checkId: run.verificationCheckId,
              checkType,
              result: run.result,
              diagnosticDetails: run.diagnosticDetails,
              ranAt: run.ranAt,
            },
          ]);
        }
      }
    } catch (e: any) {
      this.logger.error(
        `Failed to broadcast verification result to team ${teamId}: ${e.message}`,
      );
    }
  }
}

@Module({
  imports: [DbModule],
  providers: [
    VerificationService,
    {
      provide: ROOM_BROADCASTER,
      useClass: ColyseusRoomBroadcaster,
    },
  ],
  exports: [VerificationService],
})
export class VerificationModule {}
