import numpy as np
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
            "title": row["title"]  if pd.notna(row["title"]) else "" ,
            "authors": row["authors"] if pd.notna(row["authors"]) else "",
            "categories": row["categories"] if pd.notna(row["categories"]) else "",
            "thumbnail": row["thumbnail"] if pd.notna(row["thumbnail"]) else None,
        })

    return results

# For each genre pill: (keywords to match against the categories column,
# a richer phrase used for the TF-IDF fallback if there aren't enough
# category matches)
GENRE_KEYWORDS = {
    "Fiction": (["fiction"], "fiction novel story"),
    "Mystery": (["mystery", "detective", "crime"], "mystery detective crime investigation"),
    "Biography": (["biography", "autobiography"], "biography memoir life story"),
    "Sci-Fi": (
        ["science fiction", "life on other planets", "interplanetary", "human-alien", "dystopia"],
        "science fiction space future technology",
    ),
    "Romance": (["romance", "love stories", "man-woman relationships", "courtship"], "romance love story relationship"),
    "Thriller": (["thriller", "suspense", "espionage"], "thriller suspense crime mystery"),
    "Adventure": (["adventure"], "adventure quest journey exploration"),
}


def get_genre_recommendations(genre: str, n: int = 8) -> list[dict]:
    keywords, fallback_phrase = GENRE_KEYWORDS.get(genre, ([genre.lower()], genre.lower()))
    pattern = "|".join(keywords)

    mask = df["categories"].fillna("").str.lower().str.contains(pattern, regex=True, na=False)
    matched = df[mask].sort_values("average_rating", ascending=False, na_position="last")

    results = []
    seen_titles = set()
    for _, row in matched.iterrows():
        if len(results) >= n:
            break
        title = row["title"] if pd.notna(row["title"]) else ""
        if not title or title in seen_titles:
            continue
        seen_titles.add(title)
        results.append({
            "title": title,
            "authors": row["authors"] if pd.notna(row["authors"]) else "",
            "categories": row["categories"] if pd.notna(row["categories"]) else "",
            "thumbnail": row["thumbnail"] if pd.notna(row["thumbnail"]) else None,
            "average_rating": float(row["average_rating"]) if pd.notna(row["average_rating"]) else None,
        })

    if len(results) < n:
        remaining_needed = n - len(results)
        fallback = get_fallback_recommendations(fallback_phrase, n=remaining_needed + len(seen_titles))
        for book in fallback:
            if len(results) >= n:
                break
            if not book["title"] or book["title"] in seen_titles:
                continue
            seen_titles.add(book["title"])
            results.append(book)

    return results


def get_recommendations_from_list(titles: list, n: int = 10) -> list[dict]:
    # Find which input titles exist in the dataset
    found_indices = []
    for title in titles:
        key = title.strip().lower()
        if key not in title_to_index:
            continue
        idx = title_to_index[key]
        # Handle rare duplicate titles — take the first match
        found_indices.append(int(idx if not isinstance(idx, pd.Series) else idx.iloc[0]))

    if not found_indices:
        return []

    # Average the TF-IDF vectors of all found books into one "taste profile".
    # np.asarray avoids numpy.matrix deprecation warnings from the sparse .mean() result.
    profile = np.asarray(tfidf_matrix[found_indices].mean(axis=0))  # shape (1, n_features)
    sim_scores = cosine_similarity(profile, tfidf_matrix)[0]

    input_lower = {t.strip().lower() for t in titles}

    results = []
    for book_idx, _ in sorted(enumerate(sim_scores), key=lambda x: x[1], reverse=True):
        row = df.iloc[book_idx]
        if row["title"].strip().lower() in input_lower:
            continue
        results.append({
            "title": row["title"],
            "authors": row["authors"],
            "categories": row["categories"],
            "thumbnail": row["thumbnail"] if pd.notna(row["thumbnail"]) else None,
        })
        if len(results) == n:
            break

    return results


def search_books(query: str, n: int = 8) -> list[dict]:
    q = query.strip().lower()
    mask = df["title"].str.lower().str.contains(q, na=False)
    matches = df[mask].head(n)
    return [{"title": row["title"], "authors": row["authors"]} for _, row in matches.iterrows()]


def get_recommendations(title: str, n: int = 5) -> list[dict]:
    # Normalise the input title to lowercase to match our index
    key = title.strip().lower()

    # Return an error dict if the title isn't in the dataset
    if key not in title_to_index:
        return [{"error": f"Book '{title}' not found in dataset"}]

    # Get the row number of the requested book. Some titles appear more than
    # once in the dataset (different editions/printings), which makes
    # title_to_index[key] return a pandas Series instead of a single int.
    # Deterministically take the first match so this never crashes.
    idx = title_to_index[key]
    if isinstance(idx, pd.Series):
        idx = int(idx.iloc[0])
    else:
        idx = int(idx)

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
            "title": row["title"]  if pd.notna(row["title"]) else "" ,
            "authors": row["authors"] if pd.notna(row["authors"]) else "",
            "categories": row["categories"] if pd.notna(row["categories"]) else "",
            "thumbnail": row["thumbnail"] if pd.notna(row["thumbnail"]) else None,
            "average_rating": float(row["average_rating"]) if pd.notna(row["average_rating"]) else None
        })

    return results
