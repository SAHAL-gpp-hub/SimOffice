import { Client, Room } from 'colyseus.js';
import { TeamRoomState } from './schema/TeamRoomState';

export class RoomClient {
  private client: Client;
  public room: Room<TeamRoomState> | null = null;

  constructor(endpoint: string) {
    this.client = new Client(endpoint);
  }

  async joinTeamRoom(teamId: string, sessionId: string, token: string, colorScheme?: string): Promise<Room<TeamRoomState>> {
    const RECONNECT_KEY = `simoffice_room_${teamId}`;
    const stored = sessionStorage.getItem(RECONNECT_KEY);
    
    if (stored) {
      try {
        const { roomId, reconnectionToken } = JSON.parse(stored);
        console.log("Attempting to reconnect to room:", roomId);
        this.room = await this.client.reconnect(roomId, reconnectionToken);
        console.log("Reconnection successful!");
        return this.room;
      } catch (e) {
        console.warn("Reconnection failed, joining new room instead:", e);
        sessionStorage.removeItem(RECONNECT_KEY);
      }
    }

    try {
      this.room = await this.client.joinOrCreate<TeamRoomState>("team_room", { teamId, sessionId, token, colorScheme });
      console.log("Joined new room successfully!");
      
      // Store reconnection token (only if server provided one — requires
      // allowReconnection() to be active, which is set up in TeamRoom.onLeave)
      if (this.room.reconnectionToken) {
        sessionStorage.setItem(RECONNECT_KEY, JSON.stringify({
          roomId: this.room.id,
          reconnectionToken: this.room.reconnectionToken,
        }));
      }

      return this.room;
    } catch (e) {
      console.error("Failed to join or create room", e);
      throw e;
    }
  }

  leaveRoom() {
    if (this.room) {
      this.room.leave(true);
      this.room = null;
    }
  }
}
