import os
import re
import pandas as pd


SAMPLE_FOLDER = "data/attack_samples"

# Attack categories available in the CIC-IDS2017 dataset
ATTACK_TYPES = [
    "BENIGN",
    "Bot",
    "DDoS",
    "DoS GoldenEye",
    "DoS Hulk",
    "DoS Slowhttptest",
    "DoS slowloris",
    "FTP-Patator",
    "Heartbleed",
    "Infiltration",
    "PortScan",
    "SSH-Patator",
    "Web Attack   Brute Force",
    "Web Attack   Sql Injection",
    "Web Attack   XSS"
]

# Keeps track of which attack category comes next
current_attack_index = 0


def get_filename(label):
    """
    Convert an attack label into the filename
    created by create_attack_samples.py.
    """

    name = label.strip()
    name = name.replace(" ", "_")
    name = re.sub(r"[^a-zA-Z0-9]+", "_", name)
    name = name.strip("_").lower()

    return os.path.join(
        SAMPLE_FOLDER,
        f"{name}.csv"
    )


def load_incident(label, sample_index=0):
    """
    Load a specific sample from a specific attack category.
    """

    file_path = get_filename(label)

    if not os.path.exists(file_path):
        raise FileNotFoundError(
            f"Sample file not found for attack: {label}"
        )

    df = pd.read_csv(file_path)

    if df.empty:
        raise ValueError(
            f"No samples available for attack: {label}"
        )

    if sample_index >= len(df):
        sample_index = 0

    incident = df.iloc[sample_index].to_dict()

    return {
        "attack_type": label,
        "sample_index": sample_index + 1,
        "features": incident
    }


def load_next_incident():
    """
    Load the next attack category.

    Each call moves to the next attack type.
    After the last attack, it starts again from BENIGN.
    """

    global current_attack_index

    attack_type = ATTACK_TYPES[current_attack_index]

    # Move to the next attack for the next call
    current_attack_index += 1

    if current_attack_index >= len(ATTACK_TYPES):
        current_attack_index = 0

    # Use a different sample from the same attack
    # based on the current position
    sample_index = current_attack_index

    incident = load_incident(
        attack_type,
        sample_index=sample_index
    )

    return incident


if __name__ == "__main__":

    print("=" * 60)
    print("MULTI-ATTACK INCIDENT LOADER TEST")
    print("=" * 60)

    print("\nLoading 5 different incidents...\n")

    for i in range(5):

        incident = load_next_incident()

        print(
            f"Incident {i + 1}: "
            f"{incident['attack_type']}"
        )

        print(
            f"Sample: "
            f"{incident['sample_index']}"
        )

        print(
            f"Features: "
            f"{len(incident['features'])}"
        )

        print("-" * 60)

    print("\nIncident loader test completed.")