from fastapi import FastAPI  # Import the FastAPI class from the fastapi library
from recommender import get_recommendations  # Import our TF-IDF recommendation function

app = FastAPI()  # Create a FastAPI "application" — this is the core object that handles all requests


@app.get("/")  # Register a route: when someone sends a GET request to "/", run the function below
def read_root():  # Define the function that will run for that route
    return {"message": "What's Next? API is running"}  # Return a JSON response automatically — FastAPI converts dicts to JSON for you


@app.get("/recommendations")
def recommendations(title: str):  # "title" here is a query parameter — FastAPI reads it from the URL automatically,
                                   # e.g. /recommendations?title=Gilead  (the ?key=value part is the query parameter)
    results = get_recommendations(title)
    return results
