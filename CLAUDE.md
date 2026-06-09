# What's Next? — Book Recommendation Web App

A personalized book recommendation app where users upload books they've read and get suggestions based on their reading history and mood/genre preferences.

## Stack

| Layer    | Technology                          | Hosting |
|----------|-------------------------------------|---------|
| Frontend | React                               | Vercel  |
| Backend  | FastAPI (Python)                    | Render  |
| Database | Firebase Firestore (Python Admin SDK) | Firebase |
| ML       | TF-IDF content filtering (in backend) | —      |

## Folder Structure

```
whats-next/
├── frontend/   # React app
├── backend/    # FastAPI app + ML logic
└── data/       # Dataset and ML scripts
```

## Developer Preferences

- **Small, focused changes** — avoid large rewrites; make one change at a time
- **Explain commands before running** — describe what a command does before executing it
- **Beginner-friendly conventions** — simple, readable code over clever abstractions
- **No unnecessary comments** — only comment when something would genuinely confuse a reader
- This is a learning project; when introducing a new concept or pattern, a one-line explanation is welcome
- When generating React components, use functional components with hooks
- Python version: 3.10+
- When in doubt, ask before creating new files or folders

## Running the App

Frontend: cd frontend && npm run dev  (runs on localhost:5173)
Backend: cd backend && python -m uvicorn main:app --reload  (runs on localhost:8000)
Note: use "python -m uvicorn" instead of just "uvicorn" on Windows

## Common commands
   - frontend: cd frontend && npm run dev
   - backend: cd backend && uvicorn main:app --reload
   - install backend deps: pip install -r requirements.txt


## Key Features

- Users upload/log books they've read
- Personalized recommendations via TF-IDF content filtering on reading history
- Genre and mood based book discovery
- Using Kaggle Books dataset (CSV), stored in /data folder
- Do not commit the CSV to git


## Deployment

- Frontend deploys to Vercel (connected to `main` branch)
- Backend deploys to Render
- Environment variables (API keys, Firebase credentials) are never committed — use `.env` files locally and set secrets in Vercel/Render dashboards
