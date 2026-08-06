import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { WorkstationService } from './workstation.service';
import { RosterGuard } from '../sessions/roster/roster.guard';
import { Request } from 'express';

interface RosterRequest extends Request {
  user: {
    id: string;
    role: string;
    sessionId: string;
    teamId: string;
    classId: string;
  };
}

@Controller('teams/:teamId/workstation')
@UseGuards(RosterGuard)
export class WorkstationController {
  constructor(private readonly workstationService: WorkstationService) {}

  @Get('files')
  async listFiles(@Param('teamId') teamId: string) {
    return this.workstationService.listFiles(teamId);
  }

  @Get('files/:path(*)')
  async readFile(
    @Param('teamId') teamId: string,
    @Param('path') path: string,
  ) {
    return this.workstationService.readFile(teamId, path);
  }

  @Put('files/:path(*)')
  async writeFile(
    @Param('teamId') teamId: string,
    @Param('path') path: string,
    @Body('content') content: string,
    @Req() req: RosterRequest,
  ) {
    return this.workstationService.writeFile(teamId, path, content || '', req.user);
  }

  @Post('run-check')
  async runCheck(
    @Param('teamId') teamId: string,
    @Req() req: RosterRequest,
  ) {
    return this.workstationService.runCheck(teamId, req.user);
  }

  @Post('submit-verification')
  async submitVerification(
    @Param('teamId') teamId: string,
    @Req() req: RosterRequest,
  ) {
    return this.workstationService.submitVerification(teamId, req.user);
  }
}
