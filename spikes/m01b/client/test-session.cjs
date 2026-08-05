const Colyseus = require("colyseus.js");
const client = new Colyseus.Client("http://localhost:2567");
client.joinOrCreate("office").then(room => {
  console.log("My sessionId:", room.sessionId);
  room.state.players.onAdd((player, sessionId) => {
    console.log("Player joined onAdd sessionId:", sessionId);
    console.log("isMe:", sessionId === room.sessionId);
  });
  setTimeout(() => process.exit(0), 1000);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
