from googleapiclient.discovery import build
from auth import get_credentials
from datetime import datetime, timedelta

def get_calendar_events():
    creds = get_credentials()
    if not creds:
        return None
    
    service = build('calendar', 'v3', credentials=creds)
    events_result = service.events().list(calendarId='tinlab.share@gmail.com', maxResults=50, singleEvents=True, orderBy='startTime').execute()
    items = events_result.get('items', [])
    
    # Add a flag to indicate if it's an all-day event
    for item in items:
        item['isAllDay'] = 'date' in item['start']
        
    return items

def create_calendar_event(summary, description, start_time, end_time, is_all_day=False, recurrence=None):
    creds = get_credentials()
    if not creds:
        return None
    
    service = build('calendar', 'v3', credentials=creds)
    
    event = {
        'summary': summary,
        'description': description,
    }
    
    if recurrence:
        event['recurrence'] = recurrence
    
    if is_all_day:
        # For all-day events, use 'date' (YYYY-MM-DD)
        # Google API end date is exclusive, so we add 1 day to the inclusive end date from UI
        start_date = start_time.split('T')[0]
        end_date_obj = datetime.strptime(end_time.split('T')[0], '%Y-%m-%d') + timedelta(days=1)
        end_date = end_date_obj.strftime('%Y-%m-%d')
        
        event['start'] = {'date': start_date}
        event['end'] = {'date': end_date}
    else:
        event['start'] = {'dateTime': start_time, 'timeZone': 'Asia/Tokyo'}
        event['end'] = {'dateTime': end_time, 'timeZone': 'Asia/Tokyo'}
        
    event = service.events().insert(calendarId='primary', body=event).execute()
    return event

def update_calendar_event(event_id, summary, description, start_time, end_time, is_all_day=False, recurrence=None):
    creds = get_credentials()
    if not creds:
        return None
    
    service = build('calendar', 'v3', credentials=creds)
    
    event = {
        'summary': summary,
        'description': description,
    }
    
    if recurrence:
        event['recurrence'] = recurrence
    
    if is_all_day:
        # Google API end date is exclusive
        start_date = start_time.split('T')[0]
        end_date_obj = datetime.strptime(end_time.split('T')[0], '%Y-%m-%d') + timedelta(days=1)
        end_date = end_date_obj.strftime('%Y-%m-%d')
        
        event['start'] = {'date': start_date}
        event['end'] = {'date': end_date}
    else:
        event['start'] = {'dateTime': start_time, 'timeZone': 'Asia/Tokyo'}
        event['end'] = {'dateTime': end_time, 'timeZone': 'Asia/Tokyo'}
        
    updated_event = service.events().update(calendarId='primary', eventId=event_id, body=event).execute()
    return updated_event

def delete_calendar_event(event_id):
    creds = get_credentials()
    if not creds:
        return None
    
    service = build('calendar', 'v3', credentials=creds)
    service.events().delete(calendarId='primary', eventId=event_id).execute()
    return True
