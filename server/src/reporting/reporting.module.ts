import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DebriefController } from './debrief.controller';
import { DebriefService } from './debrief.service';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [DashboardController, DebriefController],
  providers: [DashboardService, DebriefService],
})
export class ReportingModule {}
