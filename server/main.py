import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from auth import get_auth_url, save_token_from_code, get_credentials, CLIENT_SECRETS_FILE
from calendar_service import get_calendar_events, create_calendar_event, update_calendar_event, delete_calendar_event

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Event(BaseModel):
    summary: str
    description: Optional[str] = None
    start_time: str
    end_time: str
    is_all_day: bool = False
    recurrence: Optional[List[str]] = None

@app.get("/auth/url")
def auth_url(redirect_uri: str):
    if not os.path.exists(CLIENT_SECRETS_FILE):
        raise HTTPException(status_code=400, detail="credentials.json not found. Please provide it in the server/data directory.")
    url, code_verifier = get_auth_url(redirect_uri)
    return {"url": url, "code_verifier": code_verifier}

@app.get("/auth/callback")
def auth_callback(code: str, redirect_uri: str, code_verifier: Optional[str] = None):
    try:
        save_token_from_code(code, redirect_uri, code_verifier)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/auth/status")
def auth_status():
    creds = get_credentials()
    return {"is_authenticated": creds is not None}

@app.get("/events")
def list_events():
    events = get_calendar_events()
    if events is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return events

@app.post("/events")
def create_event(event: Event):
    result = create_calendar_event(event.summary, event.description, event.start_time, event.end_time, event.is_all_day, event.recurrence)
    if result is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return result

@app.put("/events/{event_id}")
def update_event(event_id: str, event: Event):
    result = update_calendar_event(event_id, event.summary, event.description, event.start_time, event.end_time, event.is_all_day, event.recurrence)
    if result is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return result

@app.delete("/events/{event_id}")
def delete_event(event_id: str):
    result = delete_calendar_event(event_id)
    if result is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"status": "success"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
