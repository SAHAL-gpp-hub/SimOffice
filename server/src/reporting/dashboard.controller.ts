import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  UsePipes,
  HttpCode,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { TeacherGuard } from '../auth/teacher/teacher.guard';
import { z } from 'zod';
import { ZodValidationPipe } from '../zod-validation.pipe';

const hintSchema = z.object({
  message: z.string().min(1),
});
type HintDto = z.infer<typeof hintSchema>;

@Controller('sessions')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get(':id/dashboard')
  @UseGuards(TeacherGuard)
  async getDashboard(@Req() req, @Param('id') id: string) {
    return this.dashboardService.getSessionDashboard(id, req.user.id);
  }

  @Post(':id/teams/:teamId/hint')
  @HttpCode(204)
  @UseGuards(TeacherGuard)
  @UsePipes(new ZodValidationPipe(hintSchema))
  async sendHint(
    @Req() req,
    @Param('id') id: string,
    @Param('teamId') teamId: string,
    @Body() body: HintDto,
  ) {
    await this.dashboardService.sendHint(id, teamId, req.user.id, body.message);
  }
}
