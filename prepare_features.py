import pandas as pd
from pathlib import Path

INPUT_FILE = Path("data/final_dataset.csv")

print("Loading dataset...")

df = pd.read_csv(INPUT_FILE)

# Remove columns that should not be used for training
X = df.drop(columns=["Label", "Class"])

# Target
y = df["Class"].map({
    "BENIGN": 0,
    "SUSPICIOUS": 1,
    "MALICIOUS": 2
})

print("\nFeature shape:", X.shape)
print("Target shape:", y.shape)

print("\nClass mapping:")
print("BENIGN     = 0")
print("SUSPICIOUS = 1")
print("MALICIOUS  = 2")

print("\nTarget distribution:")
print(y.value_counts().sort_index())

# Save feature and target datasets
X.to_csv("data/X.csv", index=False)
y.to_csv("data/y.csv", index=False)

print("\nSaved:")
print("data/X.csv")
print("data/y.csv")