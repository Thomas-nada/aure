/* ======================
   DIFFICULTY STATE
====================== */

/*
  CURRENT (legacy, active):
    difficulty = number of leading hex zeroes

  NEW (linear, inactive for now):
    target = MAX_TARGET / difficulty

  We are ADDING the new system, not switching yet.
*/

const MAX_TARGET = BigInt("0x" + "f".repeat(64));

let currentDifficulty = 4;

/* ======================
   GET / SET
====================== */
export function getDifficulty() {
  return currentDifficulty;
}

export function setDifficulty(d) {
  const n = Number(d);
  if (!Number.isFinite(n)) return;
  currentDifficulty = Math.max(0, n);
}

/* ======================
   LEGACY TARGET (ACTIVE)
   leading-zero hex model
====================== */
export function getTargetHex(difficulty) {
  const d = Math.max(0, Math.floor(Number(difficulty)));
  if (d >= 64) return "0".repeat(64);
  return "0".repeat(d) + "f".repeat(64 - d);
}

/* ======================
   LINEAR TARGET (V2)
   ⚠️ NOT USED YET
====================== */
export function getTargetHexLinear(difficulty) {
  const d = Number(difficulty);
  if (!Number.isFinite(d) || d <= 0) {
    return MAX_TARGET.toString(16).padStart(64, "0");
  }

  const target = MAX_TARGET / BigInt(Math.floor(d * 1_000_000));
  return target.toString(16).padStart(64, "0");
}
