import {
  Controller,
  Post,
  Body,
  UsePipes,
  HttpCode,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { z } from 'zod';
import { ZodValidationPipe } from '../zod-validation.pipe';
import { TeacherGuard } from './teacher/teacher.guard';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginDto = z.infer<typeof loginSchema>;

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(loginSchema))
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  @Get('me')
  @UseGuards(TeacherGuard)
  getMe(@Req() req) {
    return { accountId: req.user.id, role: req.user.role };
  }
}
