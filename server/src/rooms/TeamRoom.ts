import { Room, Client, ServerError } from '@colyseus/core';
import { TeamRoomState, PlayerState, ChatMessage } from './schema/TeamRoomState';
import * as jwt from 'jsonwebtoken';
import { ContributionEventWriter } from '../contribution-tracking/contribution-event-writer.service';

const CHAT_LOG_MAX     = 200;
const PROXIMITY_RADIUS = 8;
const MSG_MAX_LEN      = 500;

export class TeamRoom extends Room<TeamRoomState> {
  maxClients = 50;

  private teamId!: string;
  private classSessionId!: string;
  private events!: ContributionEventWriter;

  async onAuth(client: Client, options: any, request: any) {
    console.log(`[TeamRoom] onAuth called for client with options:`, options);
    if (!options.token) {
      console.log(`[TeamRoom] onAuth failed: Missing token`);
      throw new ServerError(401, 'Missing token');
    }

    try {
      const payload = jwt.verify(
        options.token,
        process.env.JWT_SECRET || 'dev-secret',
      ) as any;
      if (payload.role !== 'student' && payload.role !== 'user') {
        console.log(`[TeamRoom] onAuth failed: Invalid role`, payload.role);
        throw new ServerError(403, 'Not a student');
      }

      if (payload.teamId !== options.teamId) {
        console.log(`[TeamRoom] onAuth failed: Team mismatch. payload: ${payload.teamId}, options: ${options.teamId}`);
        throw new ServerError(403, 'Team mismatch');
      }

      console.log(`[TeamRoom] onAuth success for payload:`, payload);

      if (!this.classSessionId) {
        this.classSessionId = payload.sessionId;
      }

      return payload;
    } catch (e) {
      if (e instanceof ServerError) {
        throw e;
      }
      throw new ServerError(401, 'Invalid token');
    }
  }

  onCreate(options: any) {
    console.log(`[TeamRoom] onCreate with options:`, options);
    this.teamId = options.teamId;
    this.events = options.events;
    
    this.setState(new TeamRoomState());
    this.setMetadata({ teamId: this.teamId, sessionId: options.sessionId });

    this.onMessage('move', (client, data) => {
      // NOTE: Client-authoritative movement with zero validation is an
      // accepted gap (deferred anti-cheat work) for M0.3c.
      const player = this.state.players.get(client.sessionId);
      if (player) {
        if (typeof data.x === 'number') player.x = data.x;
        if (typeof data.y === 'number') player.y = data.y;
        if (typeof data.z === 'number') player.z = data.z;
        if (typeof data.animState === 'string') player.animState = data.animState;
      }
    });

    this.onMessage<{ channel: string; message: string }>('sendChat', (client, payload) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.connected) return;

      const channel = payload.channel === 'proximity' ? 'proximity' : 'department';
      const message = (typeof payload.message === 'string' ? payload.message : '')
        .trim().slice(0, MSG_MAX_LEN);
      if (!message) return;

      const rosterEntryId = player.rosterEntryId || client.sessionId;
      const senderName    = player.displayName   || rosterEntryId.slice(0, 6);
      const timestamp     = Date.now();

      void this.events?.writeChatMessage(
        this.teamId,
        this.classSessionId,
        rosterEntryId,
        channel,
        message,
      );

      if (channel === 'department') {
        const msg = new ChatMessage();
        msg.rosterEntryId = rosterEntryId;
        msg.senderName    = senderName;
        msg.message       = message;
        msg.timestamp     = timestamp;
        this.state.chatLog.push(msg);
        
        if (this.state.chatLog.length > CHAT_LOG_MAX) {
          this.state.chatLog.splice(0, 1);
        }
        
        this.broadcast('chatPosted', { rosterEntryId, senderName, channel, message, timestamp });
      } else {
        const px = player.x, pz = player.z;
        this.clients.forEach((c) => {
          const p2 = this.state.players.get(c.sessionId);
          if (!p2) return;
          const dist = Math.sqrt((p2.x - px) ** 2 + (p2.z - pz) ** 2);
          if (dist <= PROXIMITY_RADIUS) {
            c.send('chatPosted', { rosterEntryId, senderName, channel, message, timestamp });
          }
        });
      }
    });
  }

  onJoin(client: Client, options: any, auth: any) {
    console.log(`[TeamRoom] onJoin - client: ${client.sessionId}, teamId: ${options.teamId}`);
    const player = new PlayerState();
    
    player.rosterEntryId = auth.sub;
    player.displayName   = auth.displayName ?? auth.sub.slice(0, 6);
    
    // Start at a default point or accept starting position if we wanted to
    player.x = 28;
    player.y = 1;
    player.z = 0;
    player.colorScheme = options.colorScheme || '';
    player.connected = true;
    this.state.players.set(client.sessionId, player);
  }

  async onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId);
    
    if (consented) {
      this.state.players.delete(client.sessionId);
    } else {
      if (player) {
        player.connected = false;
      }
      try {
        // allow reconnection with 20 seconds grace period
        await this.allowReconnection(client, 20);
        // Reconnected!
        if (player) {
          player.connected = true;
        }
      } catch (e) {
        // Did not reconnect within grace period
        this.state.players.delete(client.sessionId);
      }
    }
  }

  broadcastHint(message: string) {
    this.broadcast('teacherHint', { message, timestamp: Date.now() });
  }
}
