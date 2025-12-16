# Aure v1.0

*A simple peer-to-peer blockchain network*

Aure is a minimal peer-to-peer blockchain written in Node.js.
Each node can mine blocks, synchronize with peers, recover after crashes, and persist its ledger and peer list to disk.

This guide walks you through **everything needed to get started**, step by step, on **Linux/macOS** and **Windows**.

---

## ✨ Features (v1.0)

* Peer-to-peer TCP network
* Continuous or manual mining
* Automatic chain synchronization (longest chain wins)
* Persistent ledger (`ledger.json`)
* Persistent peer discovery (`peers.json`)
* Survives crashes and restarts
* Human-readable miner identities
* Interactive command-line interface

---

## 📦 Requirements

* **Node.js v18+** (v20 recommended)
* A terminal (Linux/macOS) or PowerShell (Windows)
* Network connectivity between peers

Check Node.js:

```bash
node -v
```

---

## 📥 Installation

Clone the repository:

```bash
git clone https://github.com/Thomas-nada/aure/tree/main
cd aure
npm install
```

---

## 📁 Data Storage

Each node stores its own data in a port-specific directory:

```
data/
 ├─ 6000/
 │   ├─ ledger.json
 │   └─ peers.json
 ├─ 6001/
 │   ├─ ledger.json
 │   └─ peers.json
```

This allows multiple nodes to run on the same machine without conflict.

---

## 🌐 Networking Concepts (Important)

* `127.0.0.1` refers to **the local machine only**
* Nodes on **different machines** must use a **real IP address**
* One node acts as a **seed node** to help others discover the network
* After initial discovery, the network can function **without the seed**

---

## 🌍 Finding Your Public IP

You will need this if your node should accept connections from other machines.

### Linux / macOS

```bash
curl ifconfig.me
```

### Windows (PowerShell)

```powershell
curl ifconfig.me
```

You can also use:

* [https://whatismyipaddress.com](https://whatismyipaddress.com)

---

## 🟢 Seed Node (Recommended Setup)

The **seed node** is the first node in the network.
It is recommended to run the seed on a machine with:

* A **static or long-lived public IP**
* A **VM, VPS, or cloud instance**
* An open TCP port (default: 6000)

This ensures new peers can always find the network.

---

## ▶️ Starting a Seed Node

### Linux / macOS

```bash
P2P_PORT=6000 node p2p_node.js
```

### Windows (PowerShell)

```powershell
$env:P2P_PORT=6000; node p2p_node.js
```

Leave this node running.

---

## 🔵 Starting Peer Nodes

Peer nodes connect to an existing seed node to discover the network.

Replace `SEED_IP` with the **IP address of the seed node**.

### Linux / macOS

```bash
P2P_PORT=6001 SEED_PEERS=SEED_IP:6000 node p2p_node.js
```

### Windows (PowerShell)

```powershell
$env:P2P_PORT=6001; $env:SEED_PEERS="SEED_IP:6000"; node p2p_node.js
```

You can run multiple peers by changing the port:

```
6002, 6003, 6008, etc.
```

---

## 🔁 Restarting Nodes (No Seed Required)

Once a node has successfully connected at least once, it remembers peers.

On restart, you can simply run:

### Linux / macOS

```bash
P2P_PORT=6001 node p2p_node.js
```

### Windows

```powershell
$env:P2P_PORT=6001; node p2p_node.js
```

The node will:

* Load its ledger from disk
* Load known peers
* Rejoin the network automatically

---

## ⛏️ Mining

Inside any running node, type:

* `mine` → mine a single block
* `c` → start continuous mining

Mining automatically pauses when new blocks are received from the network.

---

## 🖥️ Available Commands

| Command   | Description           |
| --------- | --------------------- |
| `help`    | Show help             |
| `status`  | Node and chain status |
| `peers`   | Known peers           |
| `network` | Active connections    |
| `height`  | Current chain height  |
| `tip`     | Latest block          |
| `block`   | Show recent blocks    |
| `stats`   | Mining statistics     |
| `uptime`  | Node uptime           |
| `c`       | Continuous mining     |
| `ledger`  | Export ledger as JSON |

---

## 💾 Persistence Behavior

* `ledger.json` stores the blockchain
* `peers.json` stores known peers
* Files are written only after successful connections
* If all nodes crash, the longest valid ledger stored on disk becomes canonical on restart

---

## 🧠 Design Notes (v1.0)

* Longest valid chain always wins
* No leader, no central authority
* Seed node is only for discovery
* Network survives seed failure
* Nodes self-heal when reconnecting

---

## 🏷️ Version

**Aure v1.0**

This release focuses on:

* Stability
* Persistence
* Correct peer behavior
* Clean startup and recovery

Future versions may include:

* Transactions
* Wallets
* Improved consensus
* Network hardening

---

## ✅ Getting Started Checklist

You’re fully set up when you can:

* Start a seed node
* Connect peer nodes
* Mine blocks
* Restart nodes without losing the chain
* See peers automatically reconnect

  
