import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

export interface JwtTeacherPayload {
  sub: string;
  role: 'teacher';
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtSecret = process.env.JWT_SECRET || 'dev-secret';

  constructor(private readonly db: DbService) {}

  async login(
    email: string,
    passwordPlain: string,
  ): Promise<{ token: string }> {
    const account = await this.db
      .selectFrom('accounts')
      .select(['id', 'password_hash', 'deactivated_at', 'role'])
      .where('email', '=', email.toLowerCase())
      .executeTakeFirst();

    if (!account) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (account.deactivated_at) {
      throw new ForbiddenException('Account deactivated');
    }

    const isValid = await bcrypt.compare(passwordPlain, account.password_hash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (account.role !== 'teacher') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtTeacherPayload = {
      sub: account.id,
      role: 'teacher',
    };

    const token = jwt.sign(payload, this.jwtSecret, { expiresIn: '12h' });
    return { token };
  }
}
