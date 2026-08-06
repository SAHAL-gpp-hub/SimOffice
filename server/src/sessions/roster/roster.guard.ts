import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { DbService } from '../../db/db.service';
import { JwtStudentPayload } from '../sessions.service';

@Injectable()
export class RosterGuard implements CanActivate {
  private readonly jwtSecret = process.env.JWT_SECRET || 'dev-secret';

  constructor(private readonly db: DbService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Missing or invalid authorization header',
      );
    }

    const token = authHeader.split(' ')[1];
    let payload: JwtStudentPayload;
    try {
      payload = jwt.verify(token, this.jwtSecret) as JwtStudentPayload;
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (payload.role !== 'student') {
      throw new UnauthorizedException('Access restricted to students');
    }

    // Verify session isn't torn down
    const session = await this.db
      .selectFrom('sessions')
      .select('status')
      .where('id', '=', payload.sessionId)
      .executeTakeFirst();

    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    if (session.status === 'torn_down') {
      throw new ForbiddenException('Session has ended');
    }

    // Attach to req
    request.user = {
      id: payload.sub,
      role: 'student',
      sessionId: payload.sessionId,
      teamId: payload.teamId,
      classId: payload.classId,
    };

    return true;
  }
}
