import { Schema, MapSchema, ArraySchema, type } from '@colyseus/schema';

export class ChatMessage extends Schema {
  @type('string') rosterEntryId: string = '';
  @type('string') senderName: string = '';
  @type('string') message: string = '';
  @type('number') timestamp: number = 0;
}

export class PlayerState extends Schema {
  @type('string') rosterEntryId: string = '';
  @type('string') displayName: string = '';
  @type('number') x: number = 0;
  @type('number') y: number = 0;
  @type('number') z: number = 0;
  @type('string') animState: string = 'idle';
  @type('string') colorScheme: string = '';
  @type('boolean') connected: boolean = true;
}

export class TeamRoomState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type([ChatMessage]) chatLog = new ArraySchema<ChatMessage>();
}
