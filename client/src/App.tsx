import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const hasHandledCallback = useRef(false);

  useEffect(() => {
    checkAuthStatus();
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code && !hasHandledCallback.current) {
      hasHandledCallback.current = true;
      handleCallback(code);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchEvents();
    }
  }, [isAuthenticated]);

  const checkAuthStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/status`);
      const data = await res.json();
      setIsAuthenticated(data.is_authenticated);
    } catch (err) {
      console.error('Failed to check auth status', err);
    }
  };

  const handleLogin = async () => {
    const redirectUri = window.location.origin;
    const res = await fetch(`${API_URL}/auth/url?redirect_uri=${encodeURIComponent(redirectUri)}`);
    const data = await res.json();
    if (data.url && data.code_verifier) {
      sessionStorage.setItem('code_verifier', data.code_verifier);
      window.location.href = data.url;
    } else {
      alert(data.detail || 'Failed to get auth URL');
    }
  };

  const handleCallback = async (code: string) => {
    try {
      const redirectUri = window.location.origin;
      const codeVerifier = sessionStorage.getItem('code_verifier');
      const res = await fetch(`${API_URL}/auth/callback?code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}&code_verifier=${codeVerifier}`);
      if (res.ok) {
        sessionStorage.removeItem('code_verifier');
        window.history.replaceState({}, document.title, "/");
        await checkAuthStatus();
      } else {
        const data = await res.json();
        alert(`Authentication failed: ${data.detail}`);
      }
    } catch (err) {
      console.error('Failed to handle callback', err);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch(`${API_URL}/events`);
      if (res.ok) {
        const data = await res.json();
        const formattedEvents = data.map((event: any) => ({
          id: event.id,
          title: event.summary,
          start: event.start.dateTime || event.start.date,
          end: event.end.dateTime || event.end.date,
          description: event.description,
          backgroundColor: '#4285f4',
          borderColor: '#4285f4'
        }));
        setEvents(formattedEvents);
      }
    } catch (err) {
      console.error('Failed to fetch events', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary,
          description,
          start_time: new Date(startTime).toISOString(),
          end_time: new Date(endTime).toISOString(),
        }),
      });
      if (res.ok) {
        setSummary('');
        setDescription('');
        setStartTime('');
        setEndTime('');
        setIsFormOpen(false);
        fetchEvents();
      } else {
        const data = await res.json();
        alert(data.detail || 'Failed to add event');
      }
    } catch (err) {
      console.error('Failed to create event', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (selectInfo: any) => {
    setStartTime(selectInfo.startStr.slice(0, 16));
    setEndTime(selectInfo.endStr.slice(0, 16));
    setIsFormOpen(true);
  };

  if (!isAuthenticated) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <img src="https://www.gstatic.com/images/branding/product/2x/calendar_2020q4_64dp.png" alt="Google Calendar" />
          <h1>Shared Calendar</h1>
          <p>Sign in to manage shared events</p>
          <button className="login-btn" onClick={handleLogin}>Authorize with Google</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-left">
          <img src="https://www.gstatic.com/images/branding/product/1x/calendar_2020q4_32dp.png" alt="logo" />
          <span className="brand-name">Calendar</span>
        </div>
        <div className="header-right">
          <button className="create-btn" onClick={() => setIsFormOpen(true)}>
            <span className="plus-icon">+</span> Create
          </button>
        </div>
      </header>

      <main className="main-content">
        <div className="calendar-container">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            events={events}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={true}
            select={handleDateSelect}
            height="100%"
          />
        </div>
      </main>

      {isFormOpen && (
        <div className="modal-overlay">
          <div className="event-modal">
            <div className="modal-header">
              <h3>New Event</h3>
              <button className="close-btn" onClick={() => setIsFormOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <input 
                className="input-title"
                placeholder="Add title"
                value={summary}
                onChange={e => setSummary(e.target.value)}
                required
                autoFocus
              />
              <div className="form-group">
                <label>Start</label>
                <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>End</label>
                <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} required />
              </div>
              <textarea 
                className="input-desc"
                placeholder="Add description"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
              <div className="modal-footer">
                <button type="button" className="cancel-btn" onClick={() => setIsFormOpen(false)}>Cancel</button>
                <button type="submit" className="save-btn" disabled={loading}>
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
