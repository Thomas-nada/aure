# Aure v1.0

> ⚠️ **IMPORTANT — READ BEFORE STARTING**
>
> **Starting a seed node creates a NEW and SEPARATE Aure blockchain.**
>
> - If you want to **join the existing public Aure network**, **DO NOT start a seed node**.
> - If you start your own seed, you will be running an **independent network** that will NOT connect to the public Aure chain.
>
> 👉 Choose **Option A** only if you intentionally want your own blockchain.  
> 👉 Choose **Option B** if you want to connect to the existing Aure network.



Aure is a minimal peer-to-peer blockchain written in Node.js. Each node can mine blocks, synchronize with peers, recover after crashes, and persist its ledger and peer list to disk.

This README clearly documents **two distinct use cases**:

1. **Running your own Aure blockchain** (your own seed, your own network)
2. **Connecting to the existing public Aure network**

Follow the section that applies to you.

---

## ✨ Features (v1.0)

* Peer-to-peer TCP network
* Manual or continuous mining
* Automatic chain synchronization (longest chain wins)
* Persistent blockchain storage (`ledger.json`)
* Persistent peer discovery (`peers.json`)
* Crash-safe restarts
* Interactive CLI

---

## 📦 Requirements

* **Node.js v18+** (v20 recommended)
* Terminal (Linux/macOS) or PowerShell (Windows)
* Public network connectivity (for peer-to-peer operation)

Check Node.js:

```bash
node -v
```

---

## 📥 Installation

```bash
git clone https://github.com/Thomas-nada/aure.git
cd aure
npm install
```

---

## 📁 Data Storage

Each node stores data in a directory named after its port:

```
data/
 ├─ 6000/
 │   ├─ ledger.json
 │   └─ peers.json
 ├─ 6001/
 │   ├─ ledger.json
 │   └─ peers.json
```

This allows multiple nodes to run on the same machine without conflicts.

---

## 🌐 Networking Model (Important)

Aure does **not** auto-detect your public IP.

Every node must be started with:

* `PUBLIC_IP` – the publicly reachable IP of the machine
* `P2P_PORT` – the TCP port the node listens on
* `SEED_PEERS` – peers used only for **initial discovery**

If you start your own seed node, you create a **new and separate Aure network**.

---

## 🌍 How to Find Your Public IP

Each node operator must know **their own public IP**.

### Linux / macOS

```bash
curl ifconfig.me
```

### Windows (PowerShell)

```powershell
curl ifconfig.me
```

You may also use any IP-checking website (e.g. whatismyipaddress.com).

Use the returned value wherever `PUBLIC_IP` is required.

---

# 🟢 Option A: Run Your Own Aure Network (Custom Seed)

Choose this option **only if you want to start an independent Aure blockchain**.

Anyone who connects to your seed will join **your private network**, not the public Aure network.

### Start Seed Node (One-Liners)

Pick a machine with a public IP and an open TCP port.

#### Mac / Linux

```bash
PUBLIC_IP="PUBLIC_IP" P2P_PORT=6000 node p2p_node.js
```

#### Windows (PowerShell)

```powershell
$env:PUBLIC_IP="PUBLIC_IP"; $env:P2P_PORT=6000; node p2p_node.js
```

Leave this node running.

This node becomes the **genesis seed** of your Aure network.

### Connecting Peers to Your Custom Network

Peers must use **your seed’s IP and port** in `SEED_PEERS`.

Example format:

```
SEED_PUBLIC_IP:6000
```

---

# 🔵 Option B: Connect to the Existing Aure Network

Choose this option if you simply want to **run a node on the existing public Aure network**.

⚠️ Do **not** start your own seed node in this case.

---

## 🟢 Public Aure Seed Node

The public Aure network uses a **fixed, known seed node**.

**Seed PUBLIC_IP:** `16.171.60.136`

---

## ▶️ Start Peer Node (One-Liners)

Peer operators only need to set **their own public IP**.

### Mac / Linux

```bash
PUBLIC_IP="YOUR_PUBLIC_IP" P2P_PORT=6001 SEED_PEERS="16.171.60.136:6000" node p2p_node.js
```

### Windows (PowerShell)

```powershell
$env:PUBLIC_IP="YOUR_PUBLIC_IP"; $env:P2P_PORT=6001; $env:SEED_PEERS="16.171.60.136:6000"; node p2p_node.js
```

Run additional peers by changing the port:

```
6002, 6003, 6004, ...
```

Each peer must use a **unique port**.

---

## 🔁 Restarting Nodes

After a node has connected once, it remembers peers on disk.

On restart, you can omit `SEED_PEERS`.

### Mac / Linux

```bash
PUBLIC_IP="YOUR_PUBLIC_IP" P2P_PORT=6001 node p2p_node.js
```

### Windows (PowerShell)

```powershell
$env:PUBLIC_IP="YOUR_PUBLIC_IP"; $env:P2P_PORT=6001; node p2p_node.js
```

The node will automatically reload its blockchain and reconnect.

---

## ⛏️ Mining

Inside any running node:

* `mine` → mine a single block
* `c` → continuous mining

Mining pauses automatically when new blocks arrive from peers.

---

## 🖥️ CLI Commands

| Command   | Description         |
| --------- | ------------------- |
| `help`    | Show help           |
| `status`  | Node & chain status |
| `peers`   | Known peers         |
| `network` | Active connections  |
| `height`  | Chain height        |
| `tip`     | Latest block        |
| `block`   | Recent blocks       |
| `stats`   | Mining statistics   |
| `uptime`  | Node uptime         |
| `c`       | Continuous mining   |
| `ledger`  | Export ledger       |

---

## 💾 Persistence

* Blockchain stored in `ledger.json`
* Peer list stored in `peers.json`
* Files written after successful connections
* Longest valid chain wins on restart

---

## 🧠 Design Notes

* Fully decentralized
* No leader or coordinator
* Seed node is used only for discovery
* Networks are isolated by seed choice
* Nodes self-heal on reconnect

---

## 🏷️ Version

**Aure v1.0**

Focus:

* Correct peer connectivity
* Explicit network bootstrapping
* Reliable persistence and recovery

---

## ✅ Quick Decision Guide

* Want your **own blockchain** → Option A (Custom Seed)
* Want to **join Aure** → Option B (Public Network)
