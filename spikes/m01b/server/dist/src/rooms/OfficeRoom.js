"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfficeRoom = exports.OfficeState = exports.Player = void 0;
const schema_1 = require("@colyseus/schema");
const colyseus_1 = require("colyseus");
class Player extends schema_1.Schema {
    x = 0;
    y = 0;
    z = 0;
    animState = "idle";
}
exports.Player = Player;
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "z", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Player.prototype, "animState", void 0);
class OfficeState extends schema_1.Schema {
    players = new schema_1.MapSchema();
}
exports.OfficeState = OfficeState;
__decorate([
    (0, schema_1.type)({ map: Player }),
    __metadata("design:type", Object)
], OfficeState.prototype, "players", void 0);
class OfficeRoom extends colyseus_1.Room {
    maxClients = 50;
    // Track delayed updates if latency simulation is enabled
    updateQueue = [];
    simulateLatency = process.env.SIMULATE_LATENCY === "true";
    onCreate(options) {
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
            }
            else {
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
    processMovement(client, data) {
        const player = this.state.players.get(client.sessionId);
        if (player) {
            if (typeof data.x === 'number')
                player.x = data.x;
            if (typeof data.y === 'number')
                player.y = data.y;
            if (typeof data.z === 'number')
                player.z = data.z;
            if (typeof data.animState === 'string')
                player.animState = data.animState;
        }
    }
    onJoin(client, options) {
        console.log(client.sessionId, "joined!");
        const player = new Player();
        // Start slightly above ground and randomly offset
        player.x = (Math.random() - 0.5) * 4;
        player.y = 1;
        player.z = (Math.random() - 0.5) * 4;
        this.state.players.set(client.sessionId, player);
    }
    onLeave(client, consented) {
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
exports.OfficeRoom = OfficeRoom;
