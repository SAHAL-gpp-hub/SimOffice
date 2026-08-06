import { Injectable } from '@nestjs/common';

@Injectable()
export class RoomActivityTracker {
  private readonly activities = new Map<string, Date>();

  getLastActivityAt(sessionId: string): Date | undefined {
    return this.activities.get(sessionId);
  }

  // Mock method to update activity
  recordActivity(sessionId: string) {
    this.activities.set(sessionId, new Date());
  }
}
