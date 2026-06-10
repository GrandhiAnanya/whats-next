import pandas as pd

df = pd.read_csv("books.csv")

# How many books (rows) and data fields (columns) we have
print("Shape:", df.shape)

# The names of every column — tells us what data is available
print("\nColumns:", df.columns.tolist())

# A preview of the first 3 books to see what the data looks like
print("\nFirst 3 rows:")
print(df.head(3))

# How many missing values are in each column — important before building recommendations
print("\nNull counts per column:")
print(df.isnull().sum())
