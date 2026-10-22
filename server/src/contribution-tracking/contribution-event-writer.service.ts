import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

@Injectable()
export class ContributionEventWriter {
  constructor(private readonly db: DbService) {}

  async writeChatMessage(
    teamId: string,
    sessionId: string,
    rosterEntryId: string,
    channel: string,
    message: string,
  ): Promise<void> {
    await this.db
      .insertInto('contribution_events')
      .values({
        session_id: sessionId,
        team_id: teamId,
        roster_entry_id: rosterEntryId,
        event_type: 'chat_message_sent',
        metadata: JSON.stringify({ channel, message_length: message.length }),
      })
      .execute();
  }
}
