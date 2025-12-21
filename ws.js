// ws.js
// Miner ↔ Server bridge
// Coinbase + transfer injection (TESTING ONLY)

import { MinerController } from "./miner/controller.js";

export class AureWS {
  constructor(url) {
    console.log("🔌 Connecting to", url);

    this.ws = new WebSocket(url);

    // TEMP: expose WS + tx hook for manual testing (DEV ONLY)
    window.aure = {
      send: (msg) => {
        console.log("🧪 aure.send", msg);
        this.send(msg);
      }
    };

    this.miner = new MinerController();

    this.ws.onopen = () => {
  console.log("🌐 WS connected");

  window.dispatchEvent(
    new CustomEvent("aure:connected")
  );
};

    this.ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);
      console.log("📩 WS MESSAGE:", msg);
      this.handleMessage(msg);
    };

    this.ws.onclose = () => {
  console.log("🔴 WS disconnected");

  window.dispatchEvent(
    new CustomEvent("aure:disconnected")
  );

    };
  }

  send(msg) {
    this.ws.send(JSON.stringify(msg));
  }

  handleMessage(msg) {
    switch (msg.type) {
      case "connected":
  this.chain = msg.chain;
  this.balances = msg.balances;
  this.mempool = msg.mempool;

  window.dispatchEvent(
    new CustomEvent("aure:update", {
      detail: {
        chain: this.chain,
        balances: this.balances
      }
    })
  );
  break;


      case "start_block":
  this.startMining(msg.data);

  // 🔄 UI auto-update on every new block
  window.dispatchEvent(
    new CustomEvent("aure:update", {
      detail: {
        chain: this.chain,
        balances: this.balances
      }
    })
  );

  break;

case "chain_update":
  this.chain = msg.chain;
  this.balances = msg.balances;

  window.dispatchEvent(
    new CustomEvent("aure:update", {
      detail: {
        chain: this.chain,
        balances: this.balances
      }
    })
  );
  break;


      case "created_key":
        console.log("🔑 KEY CREATED:", msg);
        break;

      default:
        console.log("ℹ️ Unhandled message:", msg.type);
    }
  }

  startMining(template) {
    const minerAddress = "test"; // TEMP miner address

    const coinbaseTx = {
      type: "coinbase",
      to: minerAddress,
      amount: 50
    };

    // 🔴 IMPORTANT:
    // If a signed `tx` exists in the browser console, include it.
    // Otherwise mine coinbase-only blocks.
        if (window.tx && typeof window.tx === "object" && window.tx.type === "transfer") {
      template.transactions = [
        coinbaseTx,
        window.tx
      ];

      console.log("🧪 Injecting ONE-SHOT transfer into block");

      // 🔥 ONE-SHOT: clear immediately so it cannot loop
      window.tx = null;
    } else {
      template.transactions = [
        coinbaseTx
      ];
    }


    console.log(
      "⛏️ start_block",
      "height =",
      template.height,
      "difficulty =",
      template.difficulty,
      "target =",
      template.target,
      "txs =",
      template.transactions.length
    );

    // Stop any previous mining job
    this.miner.stop();

    // Wire callbacks
    this.miner.onFound = (block) => {
      console.log("📤 Submitting block", block);
      this.send({
        type: "submit_block",
        data: block
      });
    };

    // Start mining
    this.miner.start(template);
  }
}
