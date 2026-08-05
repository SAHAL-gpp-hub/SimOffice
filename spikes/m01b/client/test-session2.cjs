const Colyseus = require("colyseus.js");
const client = new Colyseus.Client("http://localhost:2567");
client.joinOrCreate("office").then(room => {
  console.log("My sessionId:", room.sessionId);
  
  room.onStateChange.once((state) => {
    console.log("First state:", Object.keys(state.players));
    state.players.forEach((player, key) => {
        console.log("Player in state:", key, player.x);
    });
  });

  room.state.players.onAdd((player, sessionId) => {
    console.log("Player joined onAdd sessionId:", sessionId);
    console.log("isMe:", sessionId === room.sessionId);
  });
  
  setTimeout(() => process.exit(0), 1000);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
