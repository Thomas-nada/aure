from flask import Flask, request, jsonify
from uuid import uuid4
import argparse
import json
import requests

from blockchain import Blockchain
from miner import Miner
from block import Block
from node_identity import load_or_create_identity

app = Flask(__name__)

node_id = str(uuid4()).replace("-", "")
node_name = load_or_create_identity()
blockchain = Blockchain(node_id)

try:
    with open("default_seeds.json", "r") as f:
        DEFAULT_SEEDS = json.load(f)
except Exception:
    DEFAULT_SEEDS = []


@app.route("/chain", methods=["GET"])
def chain():
    return jsonify({
        "chain": [b.to_dict() for b in blockchain.chain],
        "length": len(blockchain.chain),
    })


@app.route("/receive_block", methods=["POST"])
def receive_block():
    data = request.get_json()
    block = Block(**data)

    if block.prev_hash != blockchain.last_block.hash():
        print(f"[Node {node_name}] Rejected block {block.index}")
        return jsonify({"message": "Rejected"}), 400

    blockchain.chain.append(block)
    blockchain.adjust_difficulty()
    print(f"[Node {node_name}] Accepted block {block.index}")
    return jsonify({"message": "Accepted"})


@app.route("/peers", methods=["GET"])
def peers():
    return jsonify({"peers": blockchain.peers})


@app.route("/peers", methods=["POST"])
def add_peer():
    data = request.get_json()
    peer = data.get("peer")
    name = data.get("name")

    if peer and name:
        blockchain.peers[peer] = name
        blockchain.save_peers()
        print(f"[Node {node_name}] Learned peer {name}")

    return jsonify({"message": "ok"})


@app.route("/status", methods=["GET"])
def status():
    return jsonify({
        "node_name": node_name,
        "height": len(blockchain.chain) - 1,
        "difficulty": blockchain.difficulty,
        "peer_count": len(blockchain.peers),
    })


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=5000)
    parser.add_argument("--advertise")
    args = parser.parse_args()

    advertised = args.advertise or f"http://localhost:{args.port}"

    print(f"[Node {node_name}] Advertising as {advertised}")

    if not blockchain.peers:
        for seed in DEFAULT_SEEDS:
            blockchain.peers[seed] = "Seed-Origin"

    for peer in list(blockchain.peers.keys()):
        if peer == advertised:
            continue
        try:
            requests.post(
                f"{peer}/peers",
                json={"peer": advertised, "name": node_name},
                timeout=3,
            )
        except Exception:
            pass

    blockchain.save_peers()
    blockchain.resolve_conflicts()

    Miner(blockchain, advertised, node_name).start()
    print(f"[Node {node_name}] Aure node online")

    app.run(host="0.0.0.0", port=args.port)
