// aure1/main.js
// STEP 3D.6 — browser bootstrap

import { AureWS } from "./ws.js";

// CHANGE THIS if server is remote
const SERVER_URL = "ws://16.171.60.136:8080";

console.log("🚀 Aure browser miner starting");

const aure = new AureWS(SERVER_URL);

// nothing else yet — mining starts on start_block
