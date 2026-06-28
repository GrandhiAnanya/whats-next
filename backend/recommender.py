import pandas as pd
from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Build a path to books_cleaned.csv relative to this file's location,
# so it works no matter which directory you run the server from
DATA_PATH = Path(__file__).parent.parent / "data" / "books_cleaned.csv"

# Load the cleaned dataset into a DataFrame
df = pd.read_csv(DATA_PATH).reset_index(drop=True)

# Combine description and categories into one text column called "content"
# TF-IDF works on a single string, so we merge the two most meaningful text fields
df["content"] = df["categories"].fillna("") + " " + df["description"].fillna("")

# TF-IDF (Term Frequency–Inverse Document Frequency) turns each book's text
# into a vector of numbers — common words get lower weight, unique words get higher weight
# stop_words="english" removes filler words like "the", "a", "is"
vectorizer = TfidfVectorizer(stop_words="english")
tfidf_matrix = vectorizer.fit_transform(df["content"])

# Cosine similarity measures how similar two vectors are (0 = nothing in common, 1 = identical)
# We compute this for every pair of books upfront so lookups are instant later
cosine_sim = cosine_similarity(tfidf_matrix, tfidf_matrix)

# Build a lookup from book title → row index so we can find a book quickly
# .str.lower() makes the lookup case-insensitive
title_to_index = pd.Series(df.index, index=df["title"].str.lower())


def get_fallback_recommendations(description: str, n: int = 5) -> list[dict]:
    # transform() reuses the vocabulary and IDF weights learned from the original
    # dataset — it does NOT relearn from this new text. This keeps the vector
    # space consistent so cosine similarity scores are meaningful comparisons.
    desc_vector = vectorizer.transform([description])

    # Compare the description vector against every book in the dataset
    sim_scores = cosine_similarity(desc_vector, tfidf_matrix)[0]

    # Sort by similarity score, highest first, as (index, score) pairs
    top_matches = sorted(enumerate(sim_scores), key=lambda x: x[1], reverse=True)[:n]

    results = []
    for book_idx, _ in top_matches:
        row = df.iloc[book_idx]
        results.append({
            "title": row["title"],
            "authors": row["authors"],
            "categories": row["categories"],
            "thumbnail": row["thumbnail"] if pd.notna(row["thumbnail"]) else None,
        })

    return results


def get_recommendations(title: str, n: int = 5) -> list[dict]:
    # Normalise the input title to lowercase to match our index
    key = title.strip().lower()

    # Return an error dict if the title isn't in the dataset
    if key not in title_to_index:
        return [{"error": f"Book '{title}' not found in dataset"}]

    # Get the row number of the requested book
    idx = title_to_index[key]

    # Pull the similarity scores for this book against every other book,
    # then sort them highest-first — enumerate gives us (index, score) pairs
    sim_scores = sorted(enumerate(cosine_sim[idx]), key=lambda x: x[1], reverse=True)

    # Skip the first result (index 0) because it's always the book itself (similarity = 1.0)
    top_matches = sim_scores[1 : n + 1]

    # Build the response list — only return the fields the frontend needs
    results = []
    for book_idx, _ in top_matches:
        row = df.iloc[book_idx]
        results.append({
            "title": row["title"],
            "authors": row["authors"],
            "categories": row["categories"],
            "thumbnail": row["thumbnail"] if pd.notna(row["thumbnail"]) else None,
        })

    return results
