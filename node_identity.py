import json
import os
import random

IDENTITY_FILE = "node_identity.json"

ROLES = [
    "Warrior", "Berserker", "Farmer", "Trader", "Scout",
    "Seer", "Skald", "God", "Smith", "Guardian",
    "Hunter", "Raider", "Nomad", "Sailor", "Mystic",
    "Runekeeper", "Warden", "Herald", "Watcher", "Outrider",
]

NAMES = [
    "Odin", "Thor", "Freya", "Loki", "Tyr",
    "Skadi", "Baldur", "Heimdall", "Njord", "Frigg",
    "Vidar", "Ullr", "Forseti", "Hodr", "Hel",
    "Sif", "Bragi", "Eir", "Ran", "Aegir",
]

SUFFIXES = [
    "Wolf", "Raven", "Falcon", "Bear", "Stag",
    "Ash", "Oak", "Stone", "Hammer", "Anvil",
    "Fjord", "Flame", "Frost", "Storm", "Shadow",
    "Iron", "Gold", "Ember", "Rune", "Spire",
]

TITLES = [
    "Brave", "Cunning", "Silent", "Fierce", "Wise",
    "Restless", "Stalwart", "Bold", "Swift", "Watchful",
    "Unyielding", "Patient", "Grim", "Steadfast", "Clever",
    "Vigilant", "Untamed", "Resolute", "Wary", "Enduring",
]


def generate_name():
    return (
        f"{random.choice(ROLES)} "
        f"{random.choice(NAMES)} "
        f"{random.choice(SUFFIXES)} the "
        f"{random.choice(TITLES)}"
    )


def load_or_create_identity():
    if os.path.exists(IDENTITY_FILE):
        with open(IDENTITY_FILE, "r") as f:
            return json.load(f)["name"]

    name = generate_name()
    with open(IDENTITY_FILE, "w") as f:
        json.dump({"name": name}, f, indent=2)

    return name
