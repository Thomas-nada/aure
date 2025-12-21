// ===============================
// CANONICAL MINER CONTROLLER
// ===============================

export class MinerController {
  constructor() {
    this.worker = null;
    this.onFound = null;
    this.onProgress = null;
  }

  /**
   * Start mining with a fresh template
   * @param {Object} template - block template from server
   */
  start(template) {
    // Stop any existing worker immediately
    this.stop();

    // 🔒 Clone template to avoid mutation or shared state
    const blockTemplate = structuredClone(template);

    // Spawn worker
    this.worker = new Worker("./miner/worker.js", { type: "module" });

    this.worker.onmessage = (e) => {
      const msg = e.data;
      if (!msg || !msg.type) return;

      if (msg.type === "progress") {
        this.onProgress?.(msg.nonce);
        return;
      }

      if (msg.type === "found") {
        this.onFound?.(msg.block);
        return;
      }

      if (msg.type === "error") {
        console.error("⛔ Miner worker error:", msg.error, msg.received);
        return;
      }
    };

    this.worker.onerror = (err) => {
      console.error("⛔ Miner worker crashed:", err);
    };

    // 🚀 Send finalized template to worker
    this.worker.postMessage(blockTemplate);
  }

  /**
   * Stop mining immediately
   */
  stop() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
