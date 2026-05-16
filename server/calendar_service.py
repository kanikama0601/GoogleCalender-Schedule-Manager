from googleapiclient.discovery import build
from auth import get_credentials

def get_calendar_events():
    creds = get_credentials()
    if not creds:
        return None
    
    service = build('calendar', 'v3', credentials=creds)
    events_result = service.events().list(calendarId='primary', maxResults=10, singleEvents=True, orderBy='startTime').execute()
    return events_result.get('items', [])

def create_calendar_event(summary, description, start_time, end_time):
    creds = get_credentials()
    if not creds:
        return None
    
    service = build('calendar', 'v3', credentials=creds)
    event = {
        'summary': summary,
        'description': description,
        'start': {
            'dateTime': start_time,
            'timeZone': 'Asia/Tokyo',
        },
        'end': {
            'dateTime': end_time,
            'timeZone': 'Asia/Tokyo',
        },
    }
    event = service.events().insert(calendarId='primary', body=event).execute()
    return event
