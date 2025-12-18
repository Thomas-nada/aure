# ⛏ Aure Node (Browser Miner)

Aure is an experimental Proof-of-Work blockchain with a **browser-based mining node**.  
Each node connects to a central Aure server, verifies the blockchain independently, and competes to mine blocks in real time.

This repository contains the **Aure HTML Node**, which runs entirely in your browser — no installs, no build steps, no backend required.

---

## 🚀 Getting Started

### 1️⃣ Open the node

You can run the node in **any modern browser**:

- Open `index.html` locally  
**or**
- Host it (GitHub Pages works perfectly)

Once opened, the node UI will load automatically.

---

### 2️⃣ Connect to the Aure network

Click:

```

Connect

```

- The node connects to the Aure server via WebSocket
- Your node is automatically assigned a **persistent Node ID**
- The node will reconnect automatically if the server restarts

> Your Node ID is stored locally so refreshing the page does NOT create a new identity.

---

### 3️⃣ Start mining

You have two mining modes:

#### ⛏ Mine single block
- Mines **one block only**
- Stops automatically after a win
- Useful for testing

#### 🔁 Start continuous mining
- Mines every new block round
- Automatically resumes after reconnect
- Stops only when you click **Stop mining**

---

## ⚙ Mining Profiles (CPU Control)

Choose how aggressively your browser mines:

| Profile | Description |
|------|------------|
| 🐢 **Eco** | Low CPU usage, slower mining |
| ⚖ **Normal** | Balanced (default) |
| 🚀 **Aggressive** | Maximum hashing speed |

Profiles only affect **your browser’s CPU usage**.  
They do **not** change network rules or difficulty.

---

## 📊 Dashboard Overview

### 🧠 Node Panel
Shows live information about your node:

- Connection status
- Node ID
- Mining mode
- Mining profile
- Hashes per second

---

### ⛓ Block Panel
Shows the current block round:

- Block height
- Difficulty
- Round timer (seconds since block started)
- Chain verification status

---

### 🌐 Peers
Lists all currently connected nodes (by Node ID).

---

### 🏆 Recent Winners
Shows recently mined blocks:

- Green text = blocks **you mined**
- Updates live as blocks are found

---

## 📜 Ledger & Explorer

### Ledger Explorer
- Shows every block in the chain
- Click any block to inspect it
- Color-coded:
  - ✔ Green = verified
  - ✖ Red = invalid
  - Bright green = mined by you

You can **search** by:
- Block height
- Miner ID
- Hash prefix

---

### Selected Block Panel
Click a block to view:
- Full block data
- Hash
- Previous hash
- Nonce
- Difficulty
- Timestamp
- Verification result

---

### Full Ledger (Raw)
Click **“View full ledger”** to see the complete chain in raw text format.

---

## 🔐 Local Block Verification (Trustless)

Your node does **not blindly trust the server**.

For every block it:
- Recomputes the SHA-256 hash
- Verifies difficulty rules
- Verifies `prevHash` linkage

The UI clearly shows whether:
- ✔ The entire chain is valid
- ✖ A block is invalid (with the reason)

This makes the Aure node a **verifying client**, not just a miner.

---

## 📈 Charts

### ⏱ Block Time Chart
- Shows actual time between blocks
- Helps evaluate difficulty tuning

### ⚙ Difficulty Chart
- Shows how difficulty changes over time

Both charts are derived from **verified chain data**, not estimates.

---

## 📊 My Node Statistics

Your personal mining stats:

- Blocks mined
- Win percentage
- Average difficulty of your wins
- Blocks since last win (drought)
- Current win streak

These stats update automatically as new blocks are mined.

---

## 🧑‍💻 My Node History

Click **“My node history”** to see:
- All blocks mined by your node
- Hash, difficulty, timestamp per block

---

## 🏆 Achievements & Badges

The node tracks milestones locally and awards badges such as:

- 🥇 First block mined
- ⛏ 5 blocks mined
- 🧱 Marathon miner (10+ blocks)
- 🔥 High difficulty win
- 🍀 Lucky streak
- 🐢 Eco miner
- 🚀 Full throttle miner

Badges:
- Persist across refreshes
- Are stored locally in your browser
- Do not affect consensus

---

## 🔁 Reconnection & Stability

- If the server restarts, the node **automatically reconnects**
- Continuous mining resumes automatically
- Manual disconnect disables auto-reconnect until you reconnect yourself

This makes the node resilient to server restarts and network hiccups.

---

## 🧪 Experimental Nature

Aure is an **experimental blockchain** designed for learning and exploration.

- There are **no tokens** yet
- No economic value is implied
- The server is currently centralized by design

Future upgrades may include:
- Transactions
- Rewards
- Multiple coordinators
- Exportable ledgers

---

## 🛡 Security Notes

- All mining happens locally in your browser
- No private keys
- No wallets
- No transactions
- No data is sent except mined blocks

Safe to run.

---

## 🧠 Philosophy

Aure is built to be:

- Transparent
- Inspectable
- Educational
- Fun to run

Every node:
- Verifies the chain
- Competes fairly
- Sees the same data

## 🏁 Enjoy mining on **Aure** ⛏

