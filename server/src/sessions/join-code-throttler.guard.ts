import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class JoinCodeThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const joinCode = req.body?.joinCode;
    if (joinCode) {
      return `joinCode:${joinCode}`;
    }
    // Fallback to IP if joinCode is missing (though validation will catch it)
    return req.ips?.length ? req.ips[0] : req.ip;
  }
}
