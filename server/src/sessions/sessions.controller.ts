import {
  Controller,
  Post,
  Body,
  UsePipes,
  HttpCode,
  UseGuards,
  Get,
  Req,
  Patch,
  Param,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { SessionsService } from './sessions.service';
import { z } from 'zod';
import { ZodValidationPipe } from '../zod-validation.pipe';
import { JoinCodeThrottlerGuard } from './join-code-throttler.guard';
import { RosterGuard } from './roster/roster.guard';
import { TeacherGuard } from '../auth/teacher/teacher.guard';

const joinSchema = z.object({
  joinCode: z.string().min(1),
  displayName: z.string().min(1),
  rosterPasscode: z.string().optional(),
});
type JoinDto = z.infer<typeof joinSchema>;

const createSessionSchema = z
  .object({
    classId: z.string().uuid(),
    scenarioId: z.string().uuid().optional(),
    scenarioVariantId: z.string().uuid().optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    category: z
      .enum([
        'logic_bug',
        'security_vulnerability',
        'malicious_script',
        'misconfiguration',
      ])
      .optional(),
    departmentMode: z
      .enum(['single_department', 'multi_department'])
      .optional(),
    timeLimitMinutes: z.number().int().min(1),
    maxRosterSize: z.number().int().min(1).optional(),
  })
  .refine(
    (data) =>
      data.scenarioVariantId ||
      (data.scenarioId && data.difficulty && data.category),
    {
      message:
        'Either scenarioVariantId or (scenarioId, difficulty, category) must be provided',
    },
  );

const patchSessionSchema = z.object({
  timeLimitMinutes: z.number().int().min(1).optional(),
  maxRosterSize: z.number().int().min(1).optional(),
  scenarioVariantId: z.string().uuid().optional(),
});

const cloneSessionSchema = z.object({
  scenarioVariantId: z.string().uuid().optional(),
});

const announcementSchema = z.object({
  teamId: z.string().uuid().nullable().optional(),
  text: z.string().min(1),
});

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post('join')
  @HttpCode(200)
  @UseGuards(JoinCodeThrottlerGuard)
  @UsePipes(new ZodValidationPipe(joinSchema))
  async join(@Body() body: JoinDto) {
    return this.sessionsService.joinSession(
      body.joinCode,
      body.displayName,
      body.rosterPasscode,
    );
  }

  @Get('me')
  @UseGuards(RosterGuard)
  getMe(@Req() req) {
    return {
      rosterEntryId: req.user.id,
      role: req.user.role,
      sessionId: req.user.sessionId,
      teamId: req.user.teamId,
      classId: req.user.classId,
    };
  }

  @Post()
  @UseGuards(TeacherGuard)
  @UsePipes(new ZodValidationPipe(createSessionSchema))
  async createSession(@Req() req, @Body() body: any) {
    return this.sessionsService.createSession(req.user.id, body);
  }

  @Patch(':id')
  @HttpCode(204)
  @UseGuards(TeacherGuard)
  @UsePipes(new ZodValidationPipe(patchSessionSchema))
  async updateSessionDraft(
    @Req() req,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    await this.sessionsService.updateSessionDraft(id, req.user.id, body);
  }

  @Post(':id/clone')
  @UseGuards(TeacherGuard)
  @UsePipes(new ZodValidationPipe(cloneSessionSchema))
  async cloneSession(@Req() req, @Param('id') id: string, @Body() body: any) {
    return this.sessionsService.cloneSession(
      id,
      req.user.id,
      body.scenarioVariantId,
    );
  }

  @Post(':id/start')
  @UseGuards(TeacherGuard)
  async startSession(@Req() req, @Param('id') id: string) {
    return this.sessionsService.startSession(id, req.user.id);
  }

  @Get(':id')
  async getSessionStatus(@Req() req, @Param('id') id: string) {
    // Determine if caller is teacher or student from headers to use correct guard or just check auth manually
    // We can use a mixed guard or manually decode the token for this specific endpoint.
    // However, simplest way is to manually extract to allow both.
    const authHeader = req.headers.authorization;
    if (!authHeader) throw new UnauthorizedException();
    const token = authHeader.split(' ')[1];
    let payload: any;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    } catch {
      throw new UnauthorizedException();
    }
    return this.sessionsService.getSessionStatus(
      id,
      payload.sub,
      payload.role,
      payload.sessionId,
    );
  }

  @Post(':id/announcements')
  @HttpCode(204)
  @UseGuards(TeacherGuard)
  @UsePipes(new ZodValidationPipe(announcementSchema))
  async announce(@Req() req, @Param('id') id: string, @Body() body: any) {
    await this.sessionsService.announceToSession(id, req.user.id, body);
  }

  @Post(':id/end')
  @UseGuards(TeacherGuard)
  async endSession(@Req() req, @Param('id') id: string) {
    return this.sessionsService.endSession(id, req.user.id);
  }
}

@Controller('classes')
export class ClassesController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get(':id/sessions')
  @UseGuards(TeacherGuard)
  async listSessions(@Req() req, @Param('id') id: string) {
    return this.sessionsService.listClassSessions(id, req.user.id);
  }
}
