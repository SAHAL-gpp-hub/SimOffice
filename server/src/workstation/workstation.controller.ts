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

function extractWildcardPath(req: any): string {
  const p = (req.params as any)[0] ?? (req.params as any).path ?? '';
  if (Array.isArray(p)) return p.join('/');
  return String(p);
}

@Controller('teams/:teamId/workstation')
@UseGuards(RosterGuard)
export class WorkstationController {
  constructor(private readonly workstationService: WorkstationService) {}

  @Get('files')
  async listFiles(@Param('teamId') teamId: string) {
    return this.workstationService.listFiles(teamId);
  }

  @Get('files/*')
  async readFile(
    @Param('teamId') teamId: string,
    @Req() req: any,
  ) {
    const rawPath = extractWildcardPath(req);
    return this.workstationService.readFile(teamId, rawPath);
  }

  @Put('files/*')
  async writeFile(
    @Param('teamId') teamId: string,
    @Body('content') content: string,
    @Req() req: any,
  ) {
    const rawPath = extractWildcardPath(req);
    return this.workstationService.writeFile(teamId, rawPath, content || '', req.user);
  }

  @Post('run-check')
  async runCheck(
    @Param('teamId') teamId: string,
    @Req() req: any,
  ) {
    return this.workstationService.runCheck(teamId, req.user);
  }

  @Post('submit-verification')
  async submitVerification(
    @Param('teamId') teamId: string,
    @Req() req: any,
  ) {
    return this.workstationService.submitVerification(teamId, req.user);
  }
}
