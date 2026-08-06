import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { VerificationService } from './verification.service';
import {
  ROOM_BROADCASTER,
  RoomBroadcaster,
  VerificationRunRecord,
} from './verification.types';
import { Logger } from '@nestjs/common';

// Dummy implementation for M0.2e. M0.2f/Colyseus will replace this.
class DummyRoomBroadcaster implements RoomBroadcaster {
  private readonly logger = new Logger(DummyRoomBroadcaster.name);

  broadcastVerificationResult(
    teamId: string,
    run: VerificationRunRecord,
    checkType: 'full_fix' | 'diagnostic',
  ): void {
    this.logger.log(
      `[MOCK BROADCAST] team ${teamId} check ${run.verificationCheckId} type ${checkType} -> ${run.result}`,
    );
  }
}

@Module({
  imports: [DbModule],
  providers: [
    VerificationService,
    {
      provide: ROOM_BROADCASTER,
      useClass: DummyRoomBroadcaster,
    },
  ],
  exports: [VerificationService],
})
export class VerificationModule {}
