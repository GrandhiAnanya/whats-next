import pandas as pd

# Load the raw dataset
df = pd.read_csv("books.csv")
original_count = len(df)

# Drop books with no description — TF-IDF needs text to work with, so these rows are useless
df = df.dropna(subset=["description"])

# Drop books with no categories — we need this for genre-based filtering
df = df.dropna(subset=["categories"])

# Reset the index so row numbers are continuous again after dropping rows
df = df.reset_index(drop=True)

# Keep only the columns we'll actually use — removes noise like isbn, subtitle, etc.
df = df[["title", "authors", "categories", "description", "thumbnail", "average_rating"]]

# Save the cleaned data to a new file — we never overwrite the original
df.to_csv("books_cleaned.csv", index=False)

# Report what changed so we know how much data we lost
rows_dropped = original_count - len(df)
print(f"Rows dropped:  {rows_dropped}")
print(f"Rows remaining: {len(df)}")
