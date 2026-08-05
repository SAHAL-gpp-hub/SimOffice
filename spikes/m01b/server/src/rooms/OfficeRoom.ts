import { Schema, type, MapSchema } from "@colyseus/schema";
import { Room, Client } from "colyseus";

export class Player extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") z: number = 0;
  @type("number") yaw: number = 0;
  @type("string") animState: string = "idle";
}

export class OfficeState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
}

export class OfficeRoom extends Room<OfficeState> {
  maxClients = 50;

  // Track delayed updates if latency simulation is enabled
  private updateQueue: { client: Client, data: any, processTime: number }[] = [];
  private simulateLatency = process.env.SIMULATE_LATENCY === "true";

  onCreate(options: any) {
    this.setState(new OfficeState());

    // We process input at our tick rate or as they come in.
    // GDD states 15Hz send rate from client. We'll handle messages as they arrive.
    
    // Using a generic message for movement updates
    this.onMessage("movement", (client, data) => {
      if (this.simulateLatency) {
        // Add artificial latency (50-150ms)
        const delay = Math.random() * 100 + 50;
        this.updateQueue.push({
          client,
          data,
          processTime: Date.now() + delay
        });
      } else {
        this.processMovement(client, data);
      }
    });

    // If simulating latency, run a server loop to process queued messages
    if (this.simulateLatency) {
      this.setSimulationInterval((deltaTime) => {
        const now = Date.now();
        // Process all updates that are due
        while (this.updateQueue.length > 0 && this.updateQueue[0].processTime <= now) {
          const update = this.updateQueue.shift();
          if (update) {
            this.processMovement(update.client, update.data);
          }
        }
        
        // Sort just in case process times got out of order due to random delay
        this.updateQueue.sort((a, b) => a.processTime - b.processTime);
      });
    }
  }

  processMovement(client: Client, data: any) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      if (typeof data.x === 'number') player.x = data.x;
      if (typeof data.y === 'number') player.y = data.y;
      if (typeof data.z === 'number') player.z = data.z;
      if (typeof data.yaw === 'number') player.yaw = data.yaw;
      if (typeof data.animState === 'string') player.animState = data.animState;
    }
  }

  onJoin(client: Client, options: any) {
    console.log(client.sessionId, "joined!");
    const player = new Player();
    // Start slightly above ground and randomly offset
    player.x = (Math.random() - 0.5) * 4;
    player.y = 1;
    player.z = (Math.random() - 0.5) * 4;
    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client, consented?: boolean) {
    console.log(client.sessionId, "left!");
    this.state.players.delete(client.sessionId);
    
    // Clean up queue for this client if simulating latency
    if (this.simulateLatency) {
        this.updateQueue = this.updateQueue.filter(u => u.client.sessionId !== client.sessionId);
    }
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }
}
