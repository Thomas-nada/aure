import json
import time
import requests
from block import Block


class Blockchain:
    PEER_FILE = "known_peers.json"

    TARGET_BLOCK_TIME = 300        # 5 minutes
    DIFFICULTY_WINDOW = 5
    MIN_DIFFICULTY = 2
    MAX_DIFFICULTY = 8

    def __init__(self, node_id):
        self.node_id = node_id
        self.chain = []
        self.peers = {}  # url -> node name
        self.difficulty = 4

        self.load_peers()
        self.create_genesis_block()

    # --------------------
    # Genesis
    # --------------------
    def create_genesis_block(self):
        if not self.chain:
            self.chain.append(
                Block(
                    index=0,
                    prev_hash="0",
                    timestamp=time.time(),
                    transactions=[],
                    nonce=0,
                )
            )

    @property
    def last_block(self):
        return self.chain[-1]

    # --------------------
    # Difficulty
    # --------------------
    def adjust_difficulty(self):
        if len(self.chain) < self.DIFFICULTY_WINDOW + 1:
            return

        window = self.chain[-self.DIFFICULTY_WINDOW:]
        elapsed = window[-1].timestamp - window[0].timestamp
        avg = elapsed / self.DIFFICULTY_WINDOW

        if avg < self.TARGET_BLOCK_TIME * 0.75:
            self.difficulty = min(self.difficulty + 1, self.MAX_DIFFICULTY)
            print(f"[Difficulty] Increased to {self.difficulty}")

        elif avg > self.TARGET_BLOCK_TIME * 1.25:
            self.difficulty = max(self.difficulty - 1, self.MIN_DIFFICULTY)
            print(f"[Difficulty] Decreased to {self.difficulty}")

    # --------------------
    # Mining
    # --------------------
    def mine_block(self):
        reward = {
            "from": "network",
            "to": self.node_id,
            "amount": 50,
        }

        block = Block(
            index=len(self.chain),
            prev_hash=self.last_block.hash(),
            timestamp=time.time(),
            transactions=[reward],
            nonce=0,
        )

        while not block.hash().startswith("0" * self.difficulty):
            block.nonce += 1

        self.chain.append(block)
        self.adjust_difficulty()
        return block

    # --------------------
    # Consensus
    # --------------------
    def resolve_conflicts(self):
        longest = None
        max_len = len(self.chain)

        for peer in self.peers:
            try:
                r = requests.get(f"{peer}/chain", timeout=3)
                if r.status_code == 200:
                    data = r.json()
                    if data["length"] > max_len:
                        longest = data["chain"]
                        max_len = data["length"]
            except Exception:
                pass

        if longest:
            self.chain = [Block(**b) for b in longest]
            return True

        return False

    # --------------------
    # Peer persistence (ROBUST)
    # --------------------
    def load_peers(self):
        try:
            with open(self.PEER_FILE, "r") as f:
                data = json.load(f)

                # Old format: list of URLs
                if isinstance(data, list):
                    self.peers = {peer: "Unknown" for peer in data}
                    self.save_peers()
                    print("[Peers] Upgraded peer list format")

                # Correct format: dict
                elif isinstance(data, dict):
                    self.peers = data

                else:
                    self.peers = {}

        except Exception:
            self.peers = {}

    def save_peers(self):
        with open(self.PEER_FILE, "w") as f:
            json.dump(self.peers, f, indent=2)
