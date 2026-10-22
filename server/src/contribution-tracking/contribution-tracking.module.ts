import { Module, Global } from '@nestjs/common';
import { ContributionEventWriter } from './contribution-event-writer.service';
import { DbModule } from '../db/db.module';

@Global()
@Module({
  imports: [DbModule],
  providers: [ContributionEventWriter],
  exports: [ContributionEventWriter],
})
export class ContributionTrackingModule {}
