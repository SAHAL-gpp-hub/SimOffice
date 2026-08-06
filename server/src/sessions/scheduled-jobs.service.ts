import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { sql } from 'kysely';
import { SessionsService } from './sessions.service';
import { RoomActivityTracker } from './room-activity-tracker.service';
import { DbService } from '../db/db.service';

@Injectable()
export class ScheduledJobsService {
  private readonly logger = new Logger(ScheduledJobsService.name);
  private readonly retentionDays = 90; // Default retention for the job

  constructor(
    private readonly db: DbService,
    private readonly sessionsService: SessionsService,
    private readonly roomActivityTracker: RoomActivityTracker,
  ) {}

  @Cron('0 3 * * *', { timeZone: 'UTC' })
  async runRetentionSweep(): Promise<void> {
    try {
      // Implement DBD v1.1 §8.1's anonymize_expired_contribution_events function
      const result =
        await sql<void>`SELECT anonymize_expired_contribution_events(${this.retentionDays})`.execute(
          this.db,
        );
      this.logger.log(
        `Retention sweep executed. Result: ${JSON.stringify(result)}`,
      );
    } catch (e) {
      this.logger.error('Error during retention sweep', e);
    }
  }

  @Cron('*/5 * * * *', { timeZone: 'UTC' })
  async sweepAbandonedSessions(): Promise<void> {
    try {
      const activeSessions = await this.db
        .selectFrom('sessions')
        .select(['id', 'created_at', 'started_at'])
        .where('status', '=', 'active')
        .execute();

      for (const session of activeSessions) {
        const lastActivity = this.roomActivityTracker.getLastActivityAt(
          session.id,
        );

        // Exemption rule: If a session has no tracked activity, it is exempt from the sweep.
        if (lastActivity === undefined || lastActivity === null) {
          continue;
        }

        const referenceTime = lastActivity;

        if (Date.now() - referenceTime.getTime() > 20 * 60 * 1000) {
          // Abandoned session logic: idle for >20 mins
          // Note: we pass dummy auth check parameters or ensure endSession has a system override.
          // Since the cron is running as system, we'll need a system override in endSession or a dedicated method.
          await this.sessionsService.endSessionSystem(
            session.id,
            'abandoned_timeout',
          );
          this.logger.log(
            `Session ${session.id} ended due to abandoned timeout.`,
          );
        }
      }
    } catch (e) {
      this.logger.error('Error during abandoned sessions sweep', e);
    }
  }
}
