// aure1/miner/hash.js
// MUST MATCH server-side hashBlock EXACTLY

export async function sha256Hex(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function hashBlock(block) {
  const payload =
    String(block.height) +
    String(block.prevHash) +
    String(block.timestamp) +
    String(block.difficulty) +
    String(block.target) +   
    String(block.nonce) +
    String(block.miner) +
    JSON.stringify(block.transactions || []);

  return sha256Hex(payload);
}
