import os
import requests
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from recommender import get_recommendations, get_fallback_recommendations, get_recommendations_from_list, search_books


class LibraryRequest(BaseModel):
    titles: list[str]

# Read variables from backend/.env into os.environ so os.getenv() can find them
load_dotenv()

GOOGLE_BOOKS_API_KEY = os.getenv("GOOGLE_BOOKS_API_KEY")

app = FastAPI()

# CORS (Cross-Origin Resource Sharing) is a browser security rule that blocks requests
# made from one domain/port to a different one. Our React app runs on localhost:5173
# and our API runs on localhost:8000 — different ports counts as different origins,
# so without this the browser would refuse to let the frontend talk to the backend.
app.add_middleware(
    CORSMiddleware,
   allow_origins=["*"],  # Only allow requests from the React dev server
    allow_methods=["*"],   # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],   # Allow all headers
)


@app.get("/")  # Register a route: when someone sends a GET request to "/", run the function below
def read_root():  # Define the function that will run for that route
    return {"message": "What's Next? API is running"}  # Return a JSON response automatically — FastAPI converts dicts to JSON for you


@app.get("/recommendations")
def recommendations(title: str, n: int = 5):
    # Try the fast path first: look up the title directly in our local dataset
    results = get_recommendations(title, n)

    # get_recommendations returns [{"error": "..."}] when the title isn't found.
    # We only call Google Books in that case — no point spending API quota
    # on books we already have in the dataset.
    if len(results) == 1 and "error" in results[0]:
        # Fetch the book's description from Google Books using the title as a query
        api_url = (
            f"https://www.googleapis.com/books/v1/volumes"
            f"?q={requests.utils.quote(title)}&key={GOOGLE_BOOKS_API_KEY}&maxResults=1"
        )
        response = requests.get(api_url)
        data = response.json()

        # Pull the description from the first result, if one exists
        items = data.get("items", [])
        description = (
            items[0]["volumeInfo"].get("description") if items else None
        )

        if description:
            # Use the description as a query against our TF-IDF matrix —
            # this finds dataset books with similar themes even though the
            # exact title isn't in our dataset
            return get_fallback_recommendations(description, n)

        # No description available, so we can't do better than the not-found error
        return results

    return results


@app.get("/search")
def search(q: str, n: int = 8):
    return search_books(q, n)


@app.post("/recommendations-from-library")
def recommendations_from_library(body: LibraryRequest):
    return get_recommendations_from_list(body.titles)
