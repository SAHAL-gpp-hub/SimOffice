import * as Colyseus from "colyseus.js";
const client = new Colyseus.Client("http://localhost:2567");
client.joinOrCreate("office").then(room => {
  console.log("Joined successfully!");
  process.exit(0);
}).catch(e => {
  console.error("Failed!", e);
  process.exit(1);
});
