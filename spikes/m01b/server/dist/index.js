"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const colyseus_1 = require("colyseus");
const ws_transport_1 = require("@colyseus/ws-transport");
const http_1 = require("http");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const OfficeRoom_1 = require("./rooms/OfficeRoom");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const port = Number(process.env.PORT || 2567);
const app = (0, express_1.default)();
const path_1 = __importDefault(require("path"));
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Serve the built Vite client from spikes/m01b/client/dist
app.use(express_1.default.static(path_1.default.join(__dirname, "../../client/dist")));
const server = new colyseus_1.Server({
    transport: new ws_transport_1.WebSocketTransport({
        server: (0, http_1.createServer)(app)
    })
});
server.define("office", OfficeRoom_1.OfficeRoom);
server.listen(port).then(() => {
    console.log(`[M0.1b] Colyseus server listening on http://localhost:${port}`);
    if (process.env.SIMULATE_LATENCY === "true") {
        console.log(`[WARNING] Latency simulation is ENABLED (50-150ms).`);
    }
});
