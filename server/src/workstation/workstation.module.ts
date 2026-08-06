import { Module } from '@nestjs/common';
import { WorkstationController } from './workstation.controller';
import { WorkstationService } from './workstation.service';
import { SandboxModule } from '../sandbox/sandbox.module';
import { DbModule } from '../db/db.module';
import { VerificationModule } from '../verification/verification.module';

@Module({
  imports: [SandboxModule, DbModule, VerificationModule],
  controllers: [WorkstationController],
  providers: [WorkstationService],
})
export class WorkstationModule {}
