import pandas as pd
from pathlib import Path

DATA_DIR = Path("data/raw/MachineLearningCVE")

for file in DATA_DIR.glob("*.csv"):
    print("\n" + "=" * 60)
    print(file.name)

    counts = {}

    for chunk in pd.read_csv(file, chunksize=100000):
        # Remove spaces from all column names
        chunk.columns = chunk.columns.str.strip()

        # Find the label column safely
        label_column = None

        for column in chunk.columns:
            if column.lower() == "label":
                label_column = column
                break

        if label_column is None:
            print("Label column not found!")
            print("Available columns:", chunk.columns.tolist())
            break

        labels = chunk[label_column].astype(str).str.strip()

        for label, count in labels.value_counts().items():
            counts[label] = counts.get(label, 0) + count

    for label, count in counts.items():
        print(f"{label}: {count}")