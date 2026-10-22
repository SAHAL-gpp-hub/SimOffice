import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Req,
  HttpCode,
} from '@nestjs/common';
import { DebriefService } from './debrief.service';
import { TeacherGuard } from '../auth/teacher/teacher.guard';
import { RosterGuard } from '../sessions/roster/roster.guard';

@Controller('sessions')
export class DebriefController {
  constructor(private readonly debriefService: DebriefService) {}

  @Get(':id/debrief')
  @UseGuards(TeacherGuard)
  async getTeacherDebrief(@Req() req, @Param('id') id: string) {
    return this.debriefService.getTeacherDebrief(id, req.user.id);
  }

  @Get(':id/debrief/me')
  @UseGuards(RosterGuard)
  async getStudentDebrief(@Req() req, @Param('id') id: string) {
    const rosterEntryId = req.user?.id || req.user?.sub;
    return this.debriefService.getStudentDebrief(id, rosterEntryId);
  }

  @Post([':id/teams/:teamId/reveal-fix', ':id/debrief/:teamId/reveal'])
  @HttpCode(204)
  @UseGuards(TeacherGuard)
  async revealFix(
    @Req() req,
    @Param('id') id: string,
    @Param('teamId') teamId: string,
  ) {
    await this.debriefService.revealFix(id, teamId, req.user.id);
  }
}
