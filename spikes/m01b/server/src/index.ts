import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import { OfficeRoom } from "./rooms/OfficeRoom";
import * as dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.PORT || 2567);
const app = express();

import path from "path";

app.use(cors());
app.use(express.json());
// Serve the built Vite client from spikes/m01b/client/dist
app.use(express.static(path.join(__dirname, "../../client/dist")));

const server = new Server({
  transport: new WebSocketTransport({
    server: createServer(app)
  })
});

server.define("office", OfficeRoom);

server.listen(port).then(() => {
  console.log(`[M0.1b] Colyseus server listening on http://localhost:${port}`);
  if (process.env.SIMULATE_LATENCY === "true") {
    console.log(`[WARNING] Latency simulation is ENABLED (50-150ms).`);
  }
});
