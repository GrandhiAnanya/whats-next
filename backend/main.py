from fastapi import FastAPI  # Import the FastAPI class from the fastapi library
from fastapi.middleware.cors import CORSMiddleware  # Middleware that handles cross-origin requests
from recommender import get_recommendations  # Import our TF-IDF recommendation function

app = FastAPI()  # Create a FastAPI "application" — this is the core object that handles all requests

# CORS (Cross-Origin Resource Sharing) is a browser security rule that blocks requests
# made from one domain/port to a different one. Our React app runs on localhost:5173
# and our API runs on localhost:8000 — different ports counts as different origins,
# so without this the browser would refuse to let the frontend talk to the backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Only allow requests from the React dev server
    allow_methods=["*"],   # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],   # Allow all headers
)


@app.get("/")  # Register a route: when someone sends a GET request to "/", run the function below
def read_root():  # Define the function that will run for that route
    return {"message": "What's Next? API is running"}  # Return a JSON response automatically — FastAPI converts dicts to JSON for you


@app.get("/recommendations")
def recommendations(title: str):  # "title" here is a query parameter — FastAPI reads it from the URL automatically,
                                   # e.g. /recommendations?title=Gilead  (the ?key=value part is the query parameter)
    results = get_recommendations(title)
    return results
