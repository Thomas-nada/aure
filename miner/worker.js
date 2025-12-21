// aure1/miner/worker.js
// FINAL, DEFENSIVE WORKER

self.onmessage = async (e) => {
  // accept either raw block OR { data: block }
  const block = e.data?.data ?? e.data;
  await mine(block);
};

async function mine(block) {
  if (!block || !block.target) {
    self.postMessage({
      type: "error",
      error: "Missing target in block template",
      received: block
    });
    return;
  }

  let nonce = 0;
  const target = BigInt("0x" + block.target);

  while (true) {
    const hash = await hashBlock({
      ...block,
      nonce
    });

    if (nonce % 100 === 0) {
      self.postMessage({ type: "progress", nonce });
    }

    if (BigInt("0x" + hash) < target) {
      self.postMessage({
        type: "found",
        block: {
          ...block,
          nonce,
          hash
        }
      });
      return;
    }

    nonce++;
  }
}

/* ======================
   CANONICAL HASH
   MUST MATCH SERVER
====================== */
async function hashBlock(block) {
  const payload =
    String(block.height) +
    String(block.prevHash) +
    String(block.timestamp) +
    String(block.difficulty) +
    String(block.target) +
    String(block.nonce) +
    String(block.miner || "") +
    JSON.stringify(block.transactions || []);

  return sha256(payload);
}

/* ======================
   SHA256
====================== */
async function sha256(str) {
  const buf = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hashBuffer)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}
