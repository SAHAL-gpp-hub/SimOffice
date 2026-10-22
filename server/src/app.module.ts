import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from './db/db.module';
import { AuthModule } from './auth/auth.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { SessionsModule } from './sessions/sessions.module';
import { SandboxModule } from './sandbox/sandbox.module';
import { VerificationModule } from './verification/verification.module';
import { WorkstationModule } from './workstation/workstation.module';
import { RosterEntriesModule } from './roster-entries/roster-entries.module';
import { ContributionTrackingModule } from './contribution-tracking/contribution-tracking.module';
import { ReportingModule } from './reporting/reporting.module';
import { ScheduleModule } from '@nestjs/schedule';
import Redis from 'ioredis';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          limit: 10,
          ttl: 60000,
        },
      ],
      storage: new ThrottlerStorageRedisService(
        new Redis(process.env.REDIS_URL || 'redis://localhost:6379'),
      ),
    }),
    DbModule,
    AuthModule,
    SessionsModule,
    SandboxModule,
    VerificationModule,
    WorkstationModule,
    RosterEntriesModule,
    ContributionTrackingModule,
    ReportingModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
