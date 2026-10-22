const { Schema, type, MapSchema } = require('@colyseus/schema');

class Player extends Schema {}
type('number')(Player.prototype, 'x');

class State extends Schema {}
type({ map: Player })(State.prototype, 'players');

const state = new State();
state.players = new MapSchema();

const clientState = new State();
clientState.players = new MapSchema();

clientState.players.onAdd((player, sessionId) => {
    console.log("onAdd called for", sessionId);
    player.listen("x", (value, prev) => {
        console.log(`x changed from ${prev} to ${value}`);
    });
});

const p = new Player();
p.x = 10;
state.players.set("player1", p);

// encode initial state
let bytes = state.encodeAll();
clientState.decode(bytes);

// modify state
p.x = 20;
bytes = state.encode();
clientState.decode(bytes);
