import pandas as pd
import os
import re

# Original CIC-IDS2017 dataset
DATASET_FOLDER = "data/raw/MachineLearningCVE"

# Output folder
OUTPUT_FOLDER = "data/attack_samples"

# Number of real network flows to keep for each attack
SAMPLES_PER_ATTACK = 10

os.makedirs(OUTPUT_FOLDER, exist_ok=True)


def safe_filename(label):
    """
    Convert dataset label into a safe filename.
    """
    name = label.strip()
    name = name.replace(" ", "_")
    name = re.sub(r"[^a-zA-Z0-9]+", "_", name)
    return name.strip("_").lower()


print("=" * 60)
print("CREATING ATTACK-SPECIFIC SAMPLE POOLS")
print("=" * 60)

all_data = []

csv_files = [
    f for f in os.listdir(DATASET_FOLDER)
    if f.lower().endswith(".csv")
]

print(f"\nFound {len(csv_files)} CSV files.")

for filename in csv_files:
    path = os.path.join(DATASET_FOLDER, filename)

    print(f"Reading: {filename}")

    df = pd.read_csv(path, low_memory=False)

    # Remove accidental spaces from column names
    df.columns = df.columns.str.strip()

    all_data.append(df)


print("\nCombining dataset files...")

data = pd.concat(all_data, ignore_index=True)

print(f"Total rows: {len(data):,}")
print(f"Total columns: {len(data.columns)}")

# Find label column
if "Label" not in data.columns:
    raise ValueError("Label column was not found.")

data["Label"] = data["Label"].astype(str).str.strip()

print("\nAttack categories found:")
print(data["Label"].value_counts())


print("\nCreating sample files...")
print("-" * 60)

for label in sorted(data["Label"].unique()):

    attack_rows = data[data["Label"] == label]

    # Take up to 10 real rows
    samples = attack_rows.head(SAMPLES_PER_ATTACK).copy()

    filename = safe_filename(label)
    output_path = os.path.join(
        OUTPUT_FOLDER,
        f"{filename}.csv"
    )

    samples.to_csv(output_path, index=False)

    print(
        f"{label:<35} "
        f"{len(attack_rows):>10,} available -> "
        f"{len(samples):>2} samples"
    )


print("\n" + "=" * 60)
print("SAMPLE POOLS CREATED")
print("=" * 60)

print(f"\nLocation:")
print(os.path.abspath(OUTPUT_FOLDER))