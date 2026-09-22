import pandas as pd
from pathlib import Path

INPUT_FILE = Path("data/processed_dataset.csv")
OUTPUT_FILE = Path("data/final_dataset.csv")

print("Loading processed dataset...")

df = pd.read_csv(INPUT_FILE)

print("Rows:", len(df))

# Create project class
df["Class"] = df["Label"].apply(
    lambda x: "BENIGN" if x.strip().upper() == "BENIGN" else "MALICIOUS"
)

print("\nProject classes:")
print(df["Class"].value_counts())

# Save final dataset
df.to_csv(OUTPUT_FILE, index=False)

print("\nFinal dataset saved to:")
print(OUTPUT_FILE)