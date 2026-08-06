import { Module } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { SessionsController, ClassesController } from './sessions.controller';
import { DbModule } from '../db/db.module';
import { RoomActivityTracker } from './room-activity-tracker.service';
import { ScheduledJobsService } from './scheduled-jobs.service';

@Module({
  imports: [DbModule],
  providers: [SessionsService, RoomActivityTracker, ScheduledJobsService],
  controllers: [SessionsController, ClassesController],
  exports: [RoomActivityTracker],
})
export class SessionsModule {}
