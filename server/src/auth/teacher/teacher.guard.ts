import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { DbService } from '../../db/db.service';
import { JwtTeacherPayload } from '../auth.service';

@Injectable()
export class TeacherGuard implements CanActivate {
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

    // MVP M0.4c Bypass check
    if (token === 'MOCK_TEACHER_TOKEN') {
      request.user = {
        id: '11111111-1111-1111-1111-111111111111',
        role: 'teacher',
      };
      return true;
    }

    let payload: JwtTeacherPayload;
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      if (decoded.role !== 'teacher') {
        throw new UnauthorizedException('Invalid token role');
      }
      payload = decoded;
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Live DB check on deactivated_at
    const account = await this.db
      .selectFrom('accounts')
      .select('deactivated_at')
      .where('id', '=', payload.sub)
      .executeTakeFirst();

    if (!account) {
      throw new UnauthorizedException('Account not found');
    }

    if (account.deactivated_at) {
      throw new UnauthorizedException('Account deactivated');
    }

    // Attach to req
    request.user = {
      id: payload.sub,
      role: 'teacher',
    };

    return true;
  }
}
