console.log("🔥 AURE SERVER BOOT 🔥 PID:", process.pid);

import { WebSocketServer } from "ws";
import fs from "fs";
import path from "path";
import crypto from "crypto";

import {
  getDifficulty,
  setDifficulty,
  getTargetHex,
  getTargetHexLinear
} from "./difficulty.js";




/* ======================
   CHAIN (CANONICAL)
====================== */
import {
  createGenesisBlock,
  hashBlock,
  validHash,
  validateBlock
} from "./chain.js";

/* ======================
   CONFIG
====================== */
const PORT = 8080;
const DATA_DIR = "./data";
const CHAIN_FILE = path.join(DATA_DIR, "chain.json");
const KEYS_FILE = path.join(DATA_DIR, "keys.json");
const BLOCK_REWARD = 50;

// ⛏️ Difficulty policy (NETWORK RULES)
const DIFFICULTY_POLICY = {
  targetBlockTimeMs: 60_000, // 1 minute per block
  adjustEvery: 10            // adjust every 10 blocks
};

/* ======================
   COINBASE RULES (CONSENSUS)
====================== */
function validateCoinbase(block) {
  if (!Array.isArray(block.transactions)) return false;
  if (block.transactions.length === 0) return false;

  const coinbases = block.transactions.filter(
    tx => tx.type === "coinbase"
  );

  // Exactly one coinbase
  if (coinbases.length !== 1) return false;

  // Must be first transaction
  if (block.transactions[0] !== coinbases[0]) return false;

  const cb = coinbases[0];

  if (!cb.to) return false;
  if (cb.from !== undefined) return false;
  if (cb.amount !== BLOCK_REWARD) return false;

  return true;
}

/* ======================
   TRANSACTION SHAPE (STEP 3.1)
====================== */
function isWellFormedTransaction(tx) {
  if (!tx || typeof tx !== "object") return false;

  // Coinbase is always allowed
  if (tx.type === "coinbase") return true;

  // For now, only recognize transfers
  if (tx.type === "transfer") return true;

  return false;
}

/* ======================
   TRANSFER SHAPE (STEP 3.2)
====================== */
function isWellFormedTransfer(tx) {
  if (tx.type !== "transfer") return false;

  if (typeof tx.from !== "string") return false;
  if (typeof tx.to !== "string") return false;
  if (typeof tx.amount !== "number") return false;
  if (!Number.isFinite(tx.amount)) return false;
  if (typeof tx.nonce !== "number") return false;
  if (!Number.isInteger(tx.nonce)) return false;

  return true;
}

/* ======================
   CANONICAL SIGN PAYLOAD (STEP 3.3)
====================== */
function transferSigningPayload(tx) {
  return [
    tx.type,
    tx.from,
    tx.to,
    String(tx.amount),
    String(tx.nonce)
  ].join("|");
}

/* ======================
   SIGNATURE VERIFY (STEP 3.4)
====================== */
function verifyTransferSignature(tx) {
  if (!hasSignature(tx)) return false;

  const payload = transferSigningPayload(tx);

  const record = keyDB[tx.from];
  if (!record || !record.publicJwk) return false;

  try {
    return verifySig(record.publicJwk, payload, tx.signature);
  } catch {
    return false;
  }
}

/* ======================
   SIGNATURE PRESENCE (STEP 3.4)
====================== */
function hasSignature(tx) {
  return typeof tx.signature === "string" && tx.signature.length > 0;
}

/* ======================
   ACCOUNT EXISTENCE (STEP 3.7)
====================== */
function accountExists(address) {
  return typeof address === "string" && !!keyDB[address];
}

/* ======================
   FS INIT
====================== */
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

/* ======================
   CHAIN STATE (CANONICAL)
====================== */
let chain = [];
let mempool = [];
let balances = {};

/* ======================
   BALANCES
====================== */
function recomputeBalances() {
  const b = {};
  for (const blk of chain) {
    for (const tx of blk.transactions || []) {
      if (tx.from && tx.from !== "system") {
        b[tx.from] = (b[tx.from] || 0) - tx.amount;
      }
      if (tx.to) {
        b[tx.to] = (b[tx.to] || 0) + tx.amount;
      }
    }
  }
  balances = b;
}

/* ======================
   LOAD / SAVE CHAIN
====================== */
function loadChain() {
  if (!fs.existsSync(CHAIN_FILE)) {
    chain = [createGenesisBlock()];
    mempool = [];
    recomputeBalances();
    saveChain();
    return;
  }

  const saved = JSON.parse(fs.readFileSync(CHAIN_FILE, "utf8"));

  if (Array.isArray(saved.chain) && saved.chain.length > 0) {
    chain = saved.chain;
  } else {
    chain = [createGenesisBlock()];
  }

  mempool = Array.isArray(saved.mempool) ? saved.mempool : [];
  recomputeBalances();
}

function saveChain() {
  fs.writeFileSync(
    CHAIN_FILE,
    JSON.stringify(
      { chain, mempool },
      null,
      2
    )
  );
}

/* ======================
   INIT
====================== */
loadChain();

/* ======================
   KEY DATABASE
====================== */
function loadKeyDB() {
  if (!fs.existsSync(KEYS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(KEYS_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveKeyDB(db) {
  fs.writeFileSync(KEYS_FILE, JSON.stringify(db, null, 2));
}

let keyDB = loadKeyDB();

/* ======================
   CRYPTO HELPERS
====================== */
function addressFromPublicJwk(jwk) {
  const raw = crypto
    .createHash("sha256")
    .update(`${jwk.x}.${jwk.y}`)
    .digest("hex")
    .slice(0, 32)
    .toUpperCase();

  const checksum = crypto
    .createHash("sha256")
    .update(raw)
    .digest("hex")
    .slice(0, 4)
    .toUpperCase();

  return `AUR${raw}${checksum}`;
}

function canonicalStringify(obj) {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(canonicalStringify).join(",")}]`;
  const keys = Object.keys(obj).sort();
  return `{${keys.map(k => `${JSON.stringify(k)}:${canonicalStringify(obj[k])}`).join(",")}}`;
}

function rawSigToDer(raw) {
  const r = raw.subarray(0, 32);
  const s = raw.subarray(32);

  const toInt = (b) => {
    if (b[0] & 0x80) b = Buffer.concat([Buffer.from([0]), b]);
    return Buffer.concat([Buffer.from([0x02, b.length]), b]);
  };

  return Buffer.concat([
    Buffer.from([0x30, r.length + s.length + 4]),
    toInt(r),
    toInt(s)
  ]);
}

function verifySig(publicJwk, payload, signatureBase64) {
  const verify = crypto.createVerify("SHA256");
  verify.update(payload);
  verify.end();

  const sigBuf = Buffer.from(signatureBase64, "base64");

  return verify.verify(
    { key: publicJwk, format: "jwk" },
    sigBuf
  );
}


/* ======================
   MINING TEMPLATE (CANONICAL)
====================== */
function miningTemplate() {
  const prev = chain[chain.length - 1];

  const difficulty =
    prev.nextDifficulty !== undefined
      ? prev.nextDifficulty
      : prev.difficulty;

  // 🔁 SWITCH TO LINEAR TARGET
  const target = getTargetHexLinear(difficulty);

  return {
    height: prev.height + 1,
    prevHash: prev.hash,
    timestamp: Date.now(),
    difficulty,
    target,
    nonce: 0,
    miner: null,
    transactions: []
  };
}


/* ======================
   WEBSOCKET SERVER
====================== */
const wss = new WebSocketServer({ port: PORT });
console.log(`🚀 Aure Server listening on :${PORT}`);

wss.on("connection", (ws) => {
  console.log("🟢 Client connected");

  let authed = false;
  let operator = null;
  let challenge = crypto.randomBytes(32).toString("hex");

  /* ===== CONNECTED ===== */
  ws.send(JSON.stringify({
    type: "connected",
    chain,
    balances,
    mempool,
    miningData: null
  }));

  /* ===== SEND MINING TEMPLATE (STEP 3B) ===== */
  const tpl = miningTemplate();
  if (tpl) {
    ws.send(JSON.stringify({
      type: "start_block",
      data: tpl
    }));
  }
/* ======================
     MESSAGE HANDLER
====================== */
ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());

  /* ===== CREATE KEY ===== */
  if (msg.type === "create_key") {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
      namedCurve: "prime256v1",
      publicKeyEncoding: { format: "jwk" },
      privateKeyEncoding: { format: "jwk" }
    });

    const address = addressFromPublicJwk(publicKey);
    keyDB[address] = { publicJwk: publicKey, createdAt: Date.now() };
    saveKeyDB(keyDB);

    ws.send(JSON.stringify({
      type: "created_key",
      address,
      publicJwk: publicKey,
      privateJwk: privateKey
    }));

    challenge = crypto.randomBytes(32).toString("hex");
    ws.send(JSON.stringify({
      type: "auth_challenge",
      challenge
    }));
    return;
  }

  /* ===== LOGIN ===== */
  if (msg.type === "login") {
    const { address, publicJwk, signature } = msg;
    const record = keyDB[address];

    if (!record) {
      ws.send(JSON.stringify({ type: "login_error", reason: "no_record" }));
      return;
    }

    if (addressFromPublicJwk(publicJwk) !== address) {
      ws.send(JSON.stringify({ type: "login_error", reason: "address_mismatch" }));
      return;
    }

    if (!verifySig(publicJwk, challenge, signature)) {
      ws.send(JSON.stringify({ type: "login_error", reason: "bad_signature" }));
      return;
    }

    authed = true;
    operator = { address, publicJwk };

    ws.send(JSON.stringify({
      type: "identity_info",
      address
    }));

    challenge = crypto.randomBytes(32).toString("hex");
    ws.send(JSON.stringify({
      type: "auth_challenge",
      challenge
    }));
    return;
  }

  /* ===== GET MINING DATA ===== */
  if (msg.type === "get_mining_data") {
    ws.send(JSON.stringify({
      type: "start_block",
      data: miningTemplate()
    }));
    return;
  }

/* ===== SUBMIT BLOCK (CANONICAL, FULLY ENFORCED) ===== */
if (msg.type === "submit_block") {
  const block = msg.data;
  const prev = chain[chain.length - 1];

  // 1️⃣ Structural checks
  if (block.height !== prev.height + 1) {
    console.log("REJECT: bad height");
    return;
  }

  if (block.prevHash !== prev.hash) {
    console.log("REJECT: bad prevHash");
    return;
  }

  // 2️⃣ Hash integrity
  const expectedHash = hashBlock(block);
  if (block.hash !== expectedHash) {
    console.log("REJECT: hash mismatch");
    return;
  }

  // 3️⃣ Proof-of-work
  if (!validHash(block.hash, block.target)) {
    console.log("REJECT: PoW invalid");
    return;
  }

  // 4️⃣ Coinbase rules
  if (!validateCoinbase(block)) {
    console.log("REJECT: invalid coinbase");
    return;
  }

  // 5️⃣ Transfer shape validation
  for (let i = 1; i < block.transactions.length; i++) {
    const tx = block.transactions[i];

    if (tx.type === "transfer" && !isWellFormedTransfer(tx)) {
      console.log("REJECT: malformed transfer");
      return;
    }
  }

  // 6️⃣ Signature presence enforcement
  for (let i = 1; i < block.transactions.length; i++) {
    const tx = block.transactions[i];

    if (tx.type === "transfer" && !hasSignature(tx)) {
      console.log("REJECT: unsigned transfer");
      return;
    }
  }

  // 7️⃣ Signature validity enforcement
  for (let i = 1; i < block.transactions.length; i++) {
    const tx = block.transactions[i];

    if (tx.type === "transfer" && !verifyTransferSignature(tx)) {
      console.log("REJECT: invalid transfer signature");
      return;
    }
  }

  // 8️⃣ Sender account existence
  for (let i = 1; i < block.transactions.length; i++) {
    const tx = block.transactions[i];

    if (tx.type === "transfer" && !accountExists(tx.from)) {
      console.log("REJECT: unknown sender account");
      return;
    }
  }

  // 9️⃣ Apply coinbase
  const cb = block.transactions[0];
  balances[cb.to] = (balances[cb.to] || 0) + cb.amount;

  console.log(
    "💰 COINBASE",
    cb.to,
    "+",
    cb.amount,
    "→",
    balances[cb.to]
  );

  // 🔟 Accept block
  chain.push(block);
  saveChain();

  console.log(
    "✅ ACCEPTED BLOCK",
    "height =", block.height,
    "difficulty =", block.difficulty,
    "target =", block.target
  );
  // 📡 Broadcast updated chain state to client
ws.send(JSON.stringify({
  type: "chain_update",
  chain,
  balances
}));


  /* ======================
     DIFFICULTY ADJUSTMENT (FRACTIONAL, SMOOTH)
  ====================== */
  if (block.height % DIFFICULTY_POLICY.adjustEvery === 0) {
    const window = DIFFICULTY_POLICY.adjustEvery;

    if (chain.length >= window + 1) {
      const first = chain[chain.length - window];
      const last = block;

      const actualTime = last.timestamp - first.timestamp;
      const expectedTime =
        DIFFICULTY_POLICY.targetBlockTimeMs * window;

      const ratio = expectedTime / actualTime;
      const clampedRatio = Math.max(0.9, Math.min(1.1, ratio));

      let nextDifficulty = block.difficulty * clampedRatio;
      nextDifficulty = Math.max(0.01, nextDifficulty);

      block.nextDifficulty = nextDifficulty;

      console.log(
        "⛏️ DIFFICULTY CHECK",
        "actual(ms) =", actualTime,
        "expected(ms) =", expectedTime,
        "ratio =", clampedRatio.toFixed(4),
        "next =", nextDifficulty.toFixed(4)
      );
    }
  }

  // Send next mining template
  ws.send(JSON.stringify({
    type: "start_block",
    data: miningTemplate()
  }));

  return;
}


});

});
