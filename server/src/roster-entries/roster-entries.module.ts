import { Module } from '@nestjs/common';
import { RosterEntriesController } from './roster-entries.controller';
import { RosterEntriesService } from './roster-entries.service';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [RosterEntriesController],
  providers: [RosterEntriesService],
})
export class RosterEntriesModule {}
