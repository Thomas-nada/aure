#!/usr/bin/env node
"use strict";

const net = require("net");
const crypto = require("crypto");
const readline = require("readline");
const fs = require("fs");
const path = require("path");

/* ================= DATA DIRECTORY ================= */

// Each node stores its own persistent state
const DATA_DIR = path.join(
  __dirname,
  "data",
  String(process.env.P2P_PORT || 6000)
);


try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (err) {
  console.error("❌ Failed to create data directory:", err.message);
  process.exit(1);
}

/* ================= LEDGER PERSISTENCE ================= */

// Stored in the data directory of each node
const LEDGER_FILE = path.join(DATA_DIR, "ledger.json");
const LEDGER_TMP_FILE = path.join(DATA_DIR, "ledger.tmp.json");

function saveLedgerToDisk(chain) {
  try {
    fs.writeFileSync(LEDGER_TMP_FILE, JSON.stringify(chain, null, 2));
    fs.renameSync(LEDGER_TMP_FILE, LEDGER_FILE); // atomic replace
  } catch (err) {
    console.error("⚠️ Failed to save ledger:", err.message);
  }
}

function loadLedgerFromDisk(validateFn, genesisBlock) {
  if (!fs.existsSync(LEDGER_FILE)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(LEDGER_FILE, "utf8"));
    if (validateFn(data)) return data;
    console.error("⚠️ Ledger on disk is invalid, ignoring");
  } catch (err) {
    console.error("⚠️ Failed to read ledger:", err.message);
  }
  return null;
}

/* ================= PEER PERSISTENCE ================= */

// Persist known peers so the network can reform without a seed
const PEERS_FILE = path.join(DATA_DIR, "peers.json");
const PEERS_TMP_FILE = path.join(DATA_DIR, "peers.tmp.json");

function savePeersToDisk(peersSet) {
  try {
    const list = Array.from(peersSet).filter(p => typeof p === "string");
    fs.writeFileSync(PEERS_TMP_FILE, JSON.stringify(list, null, 2));
    fs.renameSync(PEERS_TMP_FILE, PEERS_FILE);
  } catch (err) {
    console.error("⚠️ Failed to save peers:", err.message);
  }
}

function loadPeersFromDisk() {
  if (!fs.existsSync(PEERS_FILE)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(PEERS_FILE, "utf8"));
    if (Array.isArray(data)) return data;
  } catch (err) {
    console.error("⚠️ Failed to read peers:", err.message);
  }
  return [];
}

/* ================= CONFIG ================= */

const P2P_PORT = Number(process.env.P2P_PORT || 6000);
const PUBLIC_IP = process.env.PUBLIC_IP || "127.0.0.1";
const SEED_PEERS = (process.env.SEED_PEERS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const DIFFICULTY = 5;
const TARGET_BLOCK_TIME = 30_000;
const POST_BLOCK_DELAY = 1_000;
const GENESIS_TIME = 1700000000000;

// Seedless survivability:
const PEER_GOSSIP_INTERVAL = 5_000;
const PEER_RECONNECT_INTERVAL = 5_000;

/* ================= GLOBALS ================= */

const startTime = Date.now();
const selfId = `${PUBLIC_IP}:${P2P_PORT}`;

let mining = false;
let miningRound = 0;
let continuousMining = false;
let lastBlockTime = Date.now();

/* ================= NAME GENERATION ================= */

const TITLES = [
  "Berserker","Jarl","Raider","Warlord","Shieldmaiden",
  "Skald","Huscarl","Drengr","Sea-King","Stormcaller",
  "Warborn","Bloodsworn","Oathbound","Ironborn","Wolfcaller",
  "Ravensworn","Battle-Seer","Frostborn","Fire-Touched","Death-Singer"
];

const GODS = [
  "Odin","Thor","Tyr","Loki","Freya","Baldr","Heimdall","Ullr","Forseti","Vidar",
  "Njord","Aegir","Skadi","Hel","Bragi","Magni","Modi","Hoenir","Vili","Ve"
];

const LINEAGE = [
  "Odinson","Wolfborn","Ravenkin","Hammerblood","Stormson",
  "Ironspawn","Frostkin","Ashborn","Bloodheir","Shieldson",
  "Runeborn","Sea-Blooded","Fireborn","Grimsson","Skullkin",
  "Oathson","Crowspawn","Battleborn","Stormheir","Ironson"
];

const EPITHETS = [
  "the Violent","the Unbroken","the Ruthless","the Fearless","the Grim",
  "the Iron-Willed","the Merciless","the Stormborn","the Deathless","the Savage",
  "the Blooded","the Relentless","the Cursed","the Forsaken","the War-Mad",
  "the Unyielding","the Doombringer","the Flame-Touched","the Night-Reaver","the World-Burner"
];

function generateName(seed) {
  const h = crypto.createHash("sha256").update(seed).digest();
  return `${TITLES[h[0] % 20]} ${GODS[h[1] % 20]} ${LINEAGE[h[2] % 20]} ${EPITHETS[h[3] % 20]}`;
}

const selfName = generateName(selfId);

/* ================= PEER STATE ================= */

// Active TCP connections:
const peers = new Map();       // peerId -> socket

// Known names (authoritative via HELLO):
const peerNames = new Map();   // peerId -> name
peerNames.set(selfId, selfName);

// Known addresses to reconnect to (gossiped + seeds + past connections):
const knownPeers = new Set([selfId]);
for (const p of SEED_PEERS) knownPeers.add(p);

// ===== Load persisted peers if present =====
const persistedPeers = loadPeersFromDisk();
for (const p of persistedPeers) {
  if (p && p !== selfId) knownPeers.add(p);
}

function displayNameFor(id) {
  return peerNames.get(id) || `Unknown(${id})`;
}

/* ================= UTILS ================= */

const sha256 = d => crypto.createHash("sha256").update(d).digest("hex");
const sleep = ms => new Promise(r => setTimeout(r, ms));

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${h}h ${m}m ${r}s`;
}

/* ================= BLOCK ================= */

class Block {
  constructor(index, prevHash, timestamp, nonce, minerId) {
    this.index = index;
    this.prevHash = prevHash;
    this.timestamp = timestamp;
    this.nonce = nonce;
    this.minerId = minerId;
    this.hash = this.computeHash();
  }

  computeHash() {
    return sha256(
      `${this.index}${this.prevHash}${this.timestamp}${this.nonce}${this.minerId}`
    );
  }
}

/* ================= GENESIS ================= */

const GENESIS_BLOCK = new Block(
  0,
  "0".repeat(64),
  GENESIS_TIME,
  0,
  "network"
);

let chain = [GENESIS_BLOCK];
lastBlockTime = GENESIS_TIME;

// ===== Load persisted ledger if present =====
const persistedLedger = loadLedgerFromDisk(isValidChain, GENESIS_BLOCK);
if (persistedLedger) {
  chain = persistedLedger;
  lastBlockTime = chain[chain.length - 1].timestamp;
  console.log(`💾 Ledger loaded from disk (height=${chain.length - 1})`);
}

/* ================= NETWORK ================= */

function safeWrite(sock, msg) {
  try {
    if (!sock || sock.destroyed) return;
    sock.write(JSON.stringify(msg) + "\n");
  } catch {
    try { sock.destroy(); } catch {}
  }
}

function broadcast(msg, except = null) {
  for (const [id, sock] of peers.entries()) {
    if (id === except) continue;
    safeWrite(sock, msg);
  }
}

function sendHello(sock) {
  safeWrite(sock, { type: "HELLO", id: selfId, name: selfName });
}

function sendChain(sock) {
  safeWrite(sock, { type: "CHAIN", chain });
}

function sendPeers(sock) {
  const list = Array.from(knownPeers).filter(p => p && p !== selfId);
  safeWrite(sock, { type: "PEERS", peers: list });
}

/* ================= CONSENSUS ================= */

function isValidChain(candidate) {
  if (!candidate.length) return false;
  if (candidate[0].hash !== GENESIS_BLOCK.hash) return false;

  for (let i = 1; i < candidate.length; i++) {
    const b = candidate[i];
    const p = candidate[i - 1];
    if (b.prevHash !== p.hash) return false;
    if (!b.hash.startsWith("0".repeat(DIFFICULTY))) return false;
  }
  return true;
}

function considerChain(candidate) {
  if (isValidChain(candidate) && candidate.length > chain.length) {
    chain = candidate;
	saveLedgerToDisk(chain);
    lastBlockTime = chain[chain.length - 1].timestamp;
    mining = false;
    miningRound++;
    console.log(`🔄 Synced to longer chain. Height=${chain.length - 1}`);
  }
}

/* ================= MINING ================= */

async function mineBlock() {
  mining = true;
  const myRound = ++miningRound;

  const elapsed = Date.now() - lastBlockTime;
  if (elapsed < TARGET_BLOCK_TIME) {
    await sleep(TARGET_BLOCK_TIME - elapsed);
  }

  const prev = chain[chain.length - 1];
  let nonce = 0;

  while (mining && myRound === miningRound) {
    const b = new Block(
      prev.index + 1,
      prev.hash,
      Date.now(),
      nonce++,
      selfId
    );

    if (b.hash.startsWith("0".repeat(DIFFICULTY))) {
      if (chain[chain.length - 1].hash !== prev.hash) return;

      chain.push(b);
	  saveLedgerToDisk(chain);
      lastBlockTime = b.timestamp;

      console.log(`⛏️ Block #${b.index} mined by ${selfName}`);
      broadcast({ type: "BLOCK", block: b }, selfId);

      await sleep(POST_BLOCK_DELAY);
      return;
    }

    if (nonce % 5_000 === 0) await sleep(0);
  }
}

/* ================= MESSAGE HANDLING ================= */

function registerPeerSocket(sock, newPeerId) {
  // If this socket was previously mapped under another id (outbound guess), fix it.
  const oldId = sock._peerId;
  if (oldId && oldId !== newPeerId) {
    peers.delete(oldId);
  }

  sock._peerId = newPeerId;
  peers.set(newPeerId, sock);
  knownPeers.add(newPeerId);
  savePeersToDisk(knownPeers);
}

function handleMessage(sock, msg) {
  if (msg.type === "HELLO") {
    const pid = msg.id;
    if (typeof pid === "string" && pid.includes(":")) {
      registerPeerSocket(sock, pid);
      peerNames.set(pid, msg.name);
    }

    // Critical: reply with our HELLO so inbound peers learn our name.
    sendHello(sock);

    // Immediately share chain + peer list so they learn the network fast.
    sendChain(sock);
    sendPeers(sock);
    return;
  }

  if (msg.type === "CHAIN") {
    considerChain(msg.chain);
    return;
  }

  if (msg.type === "BLOCK") {
    mining = false;
    miningRound++;

    const b = msg.block;
    const tip = chain[chain.length - 1];

    if (b.index === tip.index + 1 && b.prevHash === tip.hash) {
      chain.push(b);
	    saveLedgerToDisk(chain);
      lastBlockTime = b.timestamp;
      console.log(`📥 Block #${b.index} mined by ${displayNameFor(b.minerId)}`);
      broadcast(msg);
    } else {
      // Recovery: send our chain; if they are longer, they'll send theirs later.
      sendChain(sock);
    }
    return;
  }

  if (msg.type === "PEERS" && Array.isArray(msg.peers)) {
    for (const p of msg.peers) {
      if (typeof p === "string" && p.includes(":")) knownPeers.add(p.trim());
    }
	savePeersToDisk(knownPeers);
    return;
  }
}

/* ================= SOCKET ================= */

function attachSocket(sock, expectedPeerId = null) {
  // Store a "best guess" peer id for outbound connects; HELLO may override it.
  sock._peerId = expectedPeerId;

  sock.on("data", d => {
    const txt = d.toString();
    txt.trim().split("\n").forEach(line => {
      if (!line) return;
      try {
        handleMessage(sock, JSON.parse(line));
      } catch {
        // ignore malformed
      }
    });
  });

  const cleanup = () => {
    const pid = sock._peerId;
    if (pid) peers.delete(pid);
    // keep knownPeers + peerNames so we can reconnect and still show identity
  };

  sock.on("error", cleanup);
  sock.on("close", cleanup);
}

function connectTo(peerId) {
  if (!peerId || peerId === selfId) return;
  if (peers.has(peerId)) return;

  const [host, portStr] = peerId.split(":");
  const port = Number(portStr);
  if (!host || !Number.isFinite(port)) return;

  const sock = net.connect(port, host);
  attachSocket(sock, peerId);

  sock.on("connect", () => {
    // Register immediately under the address we dialed; HELLO may correct it later.
    peers.set(peerId, sock);
    knownPeers.add(peerId);

    sendHello(sock);
    sendChain(sock);
    sendPeers(sock);
  });
}

/* ================= SERVER ================= */

net.createServer(sock => attachSocket(sock, null))
  .listen(P2P_PORT, "0.0.0.0", () => {
    console.log(`🌍 ${selfName} listening on ${selfId}`);
    for (const p of SEED_PEERS) connectTo(p);
  });

/* ================= PEER GOSSIP & RECONNECT ================= */

setInterval(() => {
  const list = Array.from(knownPeers).filter(p => p !== selfId);
  broadcast({ type: "PEERS", peers: list });
}, PEER_GOSSIP_INTERVAL);

setInterval(() => {
  for (const p of knownPeers) connectTo(p);
}, PEER_RECONNECT_INTERVAL);

/* ================= CLI ================= */

const rl = readline.createInterface({ input: process.stdin });

rl.on("line", async raw => {
  const line = raw.trim();
  if (!line) return;

  const parts = line.split(/\s+/);
  const cmd = parts[0].toLowerCase();

  switch (cmd) {
    case "help":
      console.log(`
Commands:
  c                 Start continuous mining
  stop              Stop continuous mining
  status            Show node & chain status
  peers             List known peers (names + ids)
  height            Show chain height
  tip               Show latest block
  uptime            Show node uptime
  stats             Mining stats per miner
  network           Network overview (known vs connected)
  block <height>    Inspect a block
  ledger            Print full ledger as JSON
  ledger save       Save ledger to JSON (ledger-<height>.json)
  help              Show this help
`);
      break;

    case "c":
      if (continuousMining) {
        console.log("⛏️ Continuous mining already running");
        break;
      }
      continuousMining = true;
      console.log(`⛏️ ${selfName} begins the raid…`);
      while (continuousMining) {
        await mineBlock();
        await sleep(100);
      }
      break;

    case "stop":
      continuousMining = false;
      mining = false;
      miningRound++;
      console.log("⛔ Continuous mining stopped");
      break;

    case "status":
      console.log(`
Name:   ${selfName}
ID:     ${selfId}
Height: ${chain.length - 1}
Peers:  connected=${peers.size} known=${knownPeers.size - 1}
Last:   ${new Date(lastBlockTime).toISOString()}
`);
      break;

    case "peers": {
      console.log("Known peers:");
      for (const p of Array.from(knownPeers).sort()) {
        if (p === selfId) continue;
        const connected = peers.has(p) ? "connected" : "offline";
        console.log(`- ${displayNameFor(p)} (${p}) [${connected}]`);
      }
      break;
    }

    case "height":
      console.log(chain.length - 1);
      break;

    case "tip": {
      const b = chain[chain.length - 1];
      console.log(`#${b.index} by ${displayNameFor(b.minerId)}`);
      console.log(`hash: ${b.hash}`);
      break;
    }

    case "uptime":
      console.log(formatUptime(Date.now() - startTime));
      break;

    case "stats": {
      const counts = new Map();
      for (const b of chain.slice(1)) {
        counts.set(b.minerId, (counts.get(b.minerId) || 0) + 1);
      }
      const rows = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
      if (!rows.length) {
        console.log("No mined blocks yet.");
        break;
      }
      for (const [id, n] of rows) {
        console.log(`${displayNameFor(id)} : ${n}`);
      }
      break;
    }

    case "network": {
      console.log(`Self:       ${selfName} (${selfId})`);
      console.log(`Connected:  ${peers.size}`);
      console.log(`Known:      ${knownPeers.size - 1}`);
      console.log("\nConnected peers:");
      for (const [id] of peers.entries()) {
        console.log(`- ${displayNameFor(id)} (${id})`);
      }
      console.log("\nKnown (not connected):");
      for (const id of Array.from(knownPeers)) {
        if (id === selfId) continue;
        if (!peers.has(id)) console.log(`- ${displayNameFor(id)} (${id})`);
      }
      break;
    }

    case "block": {
      const h = Number(parts[1]);
      if (!Number.isInteger(h) || h < 0 || h >= chain.length) {
        console.log("Usage: block <height>");
        break;
      }
      console.log(JSON.stringify(chain[h], null, 2));
      break;
    }

    case "ledger":
      if (parts[1] === "save") {
        const file = `ledger-${chain.length - 1}.json`;
        fs.writeFileSync(file, JSON.stringify(chain, null, 2));
        console.log(`💾 Ledger written to ${file}`);
      } else {
        console.log(JSON.stringify(chain, null, 2));
      }
      break;

    default:
      console.log(`Unknown command: ${cmd}. Type "help".`);
  }
});
