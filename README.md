# Aure

**Aure** is a minimal, experimental proof-of-work blockchain inspired by early Bitcoin.

It is designed to be:
- simple
- readable
- permissionless
- educational

Running a node automatically participates in:
- block validation
- mining
- peer discovery
- gossip propagation

There are no accounts, no wallets, and no central authority.

---

## ⚠️ Disclaimer

Aure is **experimental software**.

- Do **not** use it for real value
- Do **not** expose private machines carelessly
- Expect breaking changes during early development

This project is for learning, testing, and experimentation.

---

## Features

- Proof-of-Work mining
- Adjustable difficulty (target ~5 minutes per block)
- Longest-chain consensus
- Gossip-based peer discovery
- Automatic mining on node startup
- Anonymous, human-readable node names
- Global connectivity via Cloudflare quick tunnels (optional)

Example node name:
```
Smith Hel Flame the Restless
```

Names are **cosmetic only** and have no protocol meaning.

---

## Requirements

- Python **3.9+**
- pip
- (Optional) Cloudflared for global access

---

## Installation

Clone the repository:

```bash
git clone https://github.com/YOURNAME/Aure.git
cd Aure
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

## Running a Node (Mining Starts Automatically)

```bash
python node.py
```

That’s it.

The node will:
- generate a random anonymous identity
- connect to known peers
- start mining automatically
- gossip peers to others

---

## Joining the Network

New nodes use a **seed list** to find their first peer.

The current seed(s) are listed in:

```
default_seeds.json
```

Once connected to *any* peer, gossip will propagate the rest of the network.

The seed is **not authoritative** and does not control the network.

---

## Running a Public Seed (Optional)

If you want others to connect to your node from outside your local network, you can expose it using a **free Cloudflare quick tunnel**.

### Install Cloudflared

https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

---

### Start Aure locally

```bash
python node.py --port 5000
```

---

### Create a public tunnel

In a **separate terminal**:

```bash
cloudflared tunnel --url http://localhost:5000
```

Cloudflared will print a URL like:

```
https://random-words.trycloudflare.com
```

This is your **temporary public seed URL**.

---

### Restart Aure advertising the public URL

Stop Aure, then restart:

```bash
python node.py --port 5000 --advertise https://random-words.trycloudflare.com
```

Your node is now reachable globally.

⚠️ **Important**:  
Cloudflare quick tunnels are temporary.  
If cloudflared stops, the URL stops working and a new one must be created.

---

## Endpoints

Each node exposes a small HTTP API:

- `/status` – node status (height, difficulty, peers)
- `/chain` – full blockchain
- `/peers` – known peers

Example:

```bash
curl http://localhost:5000/status
```
---

## How the Network Survives

- The seed is only for **initial discovery**
- Nodes gossip peers to each other
- Once connected, the network no longer depends on the seed
- Temporary seed outages do not stop block production

This mirrors how early decentralized networks bootstrap.


---

## Final Note

Aure is intentionally small and understandable.

If you can read the code, you can understand the system.

That is the point.
