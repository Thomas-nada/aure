import hashlib
import json


class Block:
    def __init__(self, index, prev_hash, timestamp, transactions, nonce):
        self.index = index
        self.prev_hash = prev_hash
        self.timestamp = timestamp
        self.transactions = transactions
        self.nonce = nonce

    def to_dict(self):
        return {
            "index": self.index,
            "prev_hash": self.prev_hash,
            "timestamp": self.timestamp,
            "transactions": self.transactions,
            "nonce": self.nonce,
        }

    def hash(self):
        encoded = json.dumps(self.to_dict(), sort_keys=True).encode()
        return hashlib.sha256(encoded).hexdigest()
