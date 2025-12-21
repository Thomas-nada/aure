import crypto from "crypto";
import { getTargetHexLinear } from "./difficulty.js";

/* ======================
   CONSTANTS
====================== */
export const GENESIS_TIMESTAMP = 1734560000000;
export const GENESIS_HASH = "0".repeat(64);
export const BLOCK_REWARD = 50;

/* ======================
   GENESIS BLOCK (LINEAR)
====================== */
export function createGenesisBlock() {
  const genesis = {
    height: 0,
    prevHash: GENESIS_HASH,
    timestamp: GENESIS_TIMESTAMP,

    // ✅ LINEAR DIFFICULTY (clean start)
    difficulty: 1,

    target: null, // computed canonically
    nonce: 0,
    miner: "network",
    transactions: []
  };

  // Canonical target derivation
  genesis.target = getTargetHexLinear(genesis.difficulty);

  return {
    ...genesis,
    hash: hashBlock(genesis)
  };
}

/* ======================
   CANONICAL HASHING
====================== */
export function hashBlock(block) {
  const payload =
    String(block.height) +
    String(block.prevHash) +
    String(block.timestamp) +
    String(block.difficulty) +
    String(block.target) +
    String(block.nonce) +
    String(block.miner || "") +
    JSON.stringify(block.transactions || []);

  return crypto
    .createHash("sha256")
    .update(payload)
    .digest("hex");
}

/* ======================
   PROOF OF WORK
====================== */
export function validHash(hash, target) {
  return BigInt("0x" + hash) < BigInt("0x" + target);
}

/* ======================
   BLOCK VALIDATION
====================== */
export function validateBlock(block, prev) {
  if (block.height !== prev.height + 1) return false;
  if (block.prevHash !== prev.hash) return false;

  const expected = hashBlock(block);
  if (block.hash !== expected) return false;

  if (!validHash(block.hash, block.target)) return false;

  return true;
}
