from fastapi import FastAPI  # Import the FastAPI class from the fastapi library

app = FastAPI()  # Create a FastAPI "application" — this is the core object that handles all requests


@app.get("/")  # Register a route: when someone sends a GET request to "/", run the function below
def read_root():  # Define the function that will run for that route
    return {"message": "What's Next? API is running"}  # Return a JSON response automatically — FastAPI converts dicts to JSON for you
