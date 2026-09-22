import pandas as pd
from pathlib import Path

DATA_DIR = Path("data/raw/MachineLearningCVE")

csv_files = list(DATA_DIR.glob("*.csv"))

print(f"Found {len(csv_files)} CSV files\n")

for file in csv_files:
    print("=" * 70)
    print(f"FILE: {file.name}")

    df = pd.read_csv(file, nrows=5)

    print("\nColumns:")
    print(df.columns.tolist())

    print("\nFirst 5 rows:")
    print(df.head())

    print("\nShape of sample:")
    print(df.shape)