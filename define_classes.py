import pandas as pd
from pathlib import Path

INPUT_FILE = Path("data/final_dataset.csv")
OUTPUT_FILE = Path("data/final_dataset.csv")

print("Loading dataset...")

df = pd.read_csv(INPUT_FILE)

# Activity treated as suspicious rather than confirmed malicious
suspicious_labels = {
    "PortScan",
    "Bot"
}

def assign_class(label):
    label = label.strip()

    if label.upper() == "BENIGN":
        return "BENIGN"

    if label in suspicious_labels:
        return "SUSPICIOUS"

    return "MALICIOUS"


# Create the final project class
df["Class"] = df["Label"].apply(assign_class)

print("\nFinal project classes:")
print(df["Class"].value_counts())

# Save
df.to_csv(OUTPUT_FILE, index=False)

print("\nDataset updated successfully:")
print(OUTPUT_FILE)