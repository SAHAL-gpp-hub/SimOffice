const Colyseus = require("colyseus.js");

const NUM_BOTS = 15;
const UPDATE_RATE_MS = 1000 / 15;

const client = new Colyseus.Client("ws://localhost:2567");

async function startBot(botId) {
    try {
        const room = await client.joinOrCreate("office");
        console.log(`Bot ${botId} joined room ${room.roomId} (sessionId: ${room.sessionId})`);

        let x = (Math.random() - 0.5) * 10;
        let y = 1;
        let z = (Math.random() - 0.5) * 10;
        let angle = Math.random() * Math.PI * 2;
        let speed = 3.5;

        setInterval(() => {
            // Random walk
            if (Math.random() < 0.05) {
                angle += (Math.random() - 0.5) * Math.PI;
            }

            x += Math.cos(angle) * speed * (UPDATE_RATE_MS / 1000);
            z += Math.sin(angle) * speed * (UPDATE_RATE_MS / 1000);

            // Keep within bounds
            if (x > 20) x = 20; if (x < -20) x = -20;
            if (z > 20) z = 20; if (z < -20) z = -20;

            room.send("movement", {
                x: x,
                y: y,
                z: z,
                animState: "walk"
            });
        }, UPDATE_RATE_MS);

    } catch (e) {
        console.error(`Bot ${botId} error:`, e);
    }
}

async function startAll() {
    console.log(`Starting ${NUM_BOTS} bots...`);
    for (let i = 0; i < NUM_BOTS; i++) {
        startBot(i + 1);
        // Stagger joins slightly
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

startAll();
