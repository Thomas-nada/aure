import time
import random
import threading
import requests


class Miner(threading.Thread):
    def __init__(self, blockchain, address, name):
        super().__init__(daemon=True)
        self.blockchain = blockchain
        self.address = address
        self.name = name

    def run(self):
        print(f"[Miner {self.name}] Started")

        while True:
            if self.blockchain.resolve_conflicts():
                print(f"[Miner {self.name}] Synced chain")

            start_height = len(self.blockchain.chain)
            block = self.blockchain.mine_block()

            if len(self.blockchain.chain) != start_height + 1:
                print(f"[Miner {self.name}] LOST block {start_height}")
                continue

            print(
                f"[Miner {self.name}] WON block {block.index} "
                f"(difficulty {self.blockchain.difficulty})"
            )

            for peer, peer_name in self.blockchain.peers.items():
                if peer == self.address:
                    continue
                try:
                    r = requests.post(
                        f"{peer}/receive_block",
                        json=block.to_dict(),
                        timeout=3,
                    )
                    if r.status_code != 200:
                        print(
                            f"[Miner {self.name}] "
                            f"{peer_name} rejected block {block.index}"
                        )
                except Exception:
                    pass

            time.sleep(random.uniform(1, 3))
