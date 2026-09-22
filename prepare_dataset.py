import pandas as pd
from pathlib import Path

DATA_DIR = Path("data/raw/MachineLearningCVE")
OUTPUT_FILE = Path("data/processed_dataset.csv")

all_data = []

print("Starting dataset preparation...\n")

for file in DATA_DIR.glob("*.csv"):

    print(f"Reading: {file.name}")

    df = pd.read_csv(file)

    # Clean column names
    df.columns = df.columns.str.strip()

    # Clean label values
    df["Label"] = df["Label"].astype(str).str.strip()

    # Replace infinity values
    df = df.replace([float("inf"), float("-inf")], pd.NA)

    # Remove rows containing missing values
    df = df.dropna()

    all_data.append(df)

# Combine all files
data = pd.concat(all_data, ignore_index=True)

print("\nAll files combined.")
print("Dataset shape:", data.shape)

# Save processed dataset
data.to_csv(OUTPUT_FILE, index=False)

print("\nProcessed dataset saved to:")
print(OUTPUT_FILE)

print("\nFinal labels:")
print(data["Label"].value_counts())