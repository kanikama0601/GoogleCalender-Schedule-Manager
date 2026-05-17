import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import './App.css';

// MUI Imports
import { LocalizationProvider, DatePicker, MobileTimePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const getWeekdayJapanese = (day: string) => {
  const map: { [key: string]: string } = {
    'SU': '日曜日',
    'MO': '月曜日',
    'TU': '火曜日',
    'WE': '水曜日',
    'TH': '木曜日',
    'FR': '金曜日',
    'SA': '土曜日'
  };
  return map[day] || '';
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  
  // Use dayjs for state to work with MUI
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [startTime, setStartTime] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [endTime, setEndTime] = useState<Dayjs | null>(null);
  
  const [isAllDay, setIsAllDay] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const hasHandledCallback = useRef(false);

  // Recurrence States
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFreq, setRecurrenceFreq] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>('DAILY');
  const [recurrenceEndType, setRecurrenceEndType] = useState<'NEVER' | 'COUNT' | 'UNTIL'>('NEVER');
  const [recurrenceCount, setRecurrenceCount] = useState<number>(10);
  const [recurrenceUntil, setRecurrenceUntil] = useState<Dayjs | null>(null);
  
  // Advanced Recurrence States
  const [recurrenceWeekdays, setRecurrenceWeekdays] = useState<string[]>([]);
  const [monthlyRepeatType, setMonthlyRepeatType] = useState<'DAY_OF_MONTH' | 'DAY_OF_WEEK'>('DAY_OF_MONTH');
  const [recurrenceMonthday, setRecurrenceMonthday] = useState<number>(1);
  const [recurrenceWeekNum, setRecurrenceWeekNum] = useState<number>(1);
  const [recurrenceMonthlyWeekday, setRecurrenceMonthlyWeekday] = useState<string>('MO');

  // Range Selection States
  const [showRangeSelectionModal, setShowRangeSelectionModal] = useState(false);
  const [rangeSelectionAction, setRangeSelectionAction] = useState<'EDIT' | 'DELETE' | null>(null);
  const [recurringEventId, setRecurringEventId] = useState<string | null>(null);

  const toggleWeekday = (day: string) => {
    setRecurrenceWeekdays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

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
          allDay: event.isAllDay,
          description: event.description,
          backgroundColor: '#4285f4',
          borderColor: '#4285f4',
          extendedProps: {
            description: event.description,
            isAllDay: event.isAllDay,
            recurringEventId: event.recurringEventId,
            recurrence: event.recurrence
          }
        }));
        setEvents(formattedEvents);
      }
    } catch (err) {
      console.error('Failed to fetch events', err);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEventId && recurringEventId) {
      setRangeSelectionAction('EDIT');
      setShowRangeSelectionModal(true);
    } else {
      handleSave('ALL');
    }
  };

  const handleSave = async (range: 'SINGLE' | 'ALL') => {
    if (!startDate || !endDate) return;
    
    setLoading(true);
    try {
      const targetId = (range === 'ALL' && recurringEventId) ? recurringEventId : editingEventId;
      const url = targetId ? `${API_URL}/events/${targetId}` : `${API_URL}/events`;
      const method = targetId ? 'PUT' : 'POST';

      let finalStart: string;
      let finalEnd: string;

      if (isAllDay) {
        finalStart = startDate.format('YYYY-MM-DD');
        finalEnd = endDate.format('YYYY-MM-DD');
      } else {
        if (!startTime || !endTime) return;
        // Combine date and time
        const startFull = startDate.hour(startTime.hour()).minute(startTime.minute());
        const endFull = endDate.hour(endTime.hour()).minute(endTime.minute());
        finalStart = startFull.toISOString();
        finalEnd = endFull.toISOString();
      }

      let recurrence: string[] | null = null;
      if (range === 'ALL' && isRecurring) {
        let rrule = `RRULE:FREQ=${recurrenceFreq}`;
        
        // 毎週の詳細設定
        if (recurrenceFreq === 'WEEKLY' && recurrenceWeekdays.length > 0) {
          rrule += `;BYDAY=${recurrenceWeekdays.join(',')}`;
        }
        
        // 毎月の詳細設定
        if (recurrenceFreq === 'MONTHLY') {
          if (monthlyRepeatType === 'DAY_OF_MONTH') {
            rrule += `;BYMONTHDAY=${recurrenceMonthday}`;
          } else if (monthlyRepeatType === 'DAY_OF_WEEK') {
            rrule += `;BYDAY=${recurrenceWeekNum}${recurrenceMonthlyWeekday}`;
          }
        }

        if (recurrenceEndType === 'COUNT') {
          rrule += `;COUNT=${recurrenceCount}`;
        } else if (recurrenceEndType === 'UNTIL' && recurrenceUntil) {
          if (isAllDay) {
            rrule += `;UNTIL=${recurrenceUntil.format('YYYYMMDD')}`;
          } else {
            const localEndOfDay = recurrenceUntil.hour(23).minute(59).second(59).millisecond(0);
            const isoString = localEndOfDay.toISOString();
            const utcFormatted = isoString.replace(/[-:]/g, '').split('.')[0] + 'Z';
            rrule += `;UNTIL=${utcFormatted}`;
          }
        }
        recurrence = [rrule];
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary,
          description,
          start_time: finalStart,
          end_time: finalEnd,
          is_all_day: isAllDay,
          recurrence
        }),
      });
      if (res.ok) {
        resetForm();
        fetchEvents();
      } else {
        const data = await res.json();
        alert(data.detail || 'Failed to save event');
      }
    } catch (err) {
      console.error('Failed to save event', err);
    } finally {
      setLoading(false);
      setShowRangeSelectionModal(false);
      setRangeSelectionAction(null);
    }
  };

  const handleCopyEvent = () => {
    setEditingEventId(null);
    setRecurringEventId(null);
    setSummary(prev => prev.endsWith(' (Copy)') ? prev : `${prev} (Copy)`);
  };

  const handleDeleteClick = () => {
    if (recurringEventId) {
      setRangeSelectionAction('DELETE');
      setShowRangeSelectionModal(true);
    } else {
      handleDelete('ALL');
    }
  };

  const handleDelete = async (range: 'SINGLE' | 'ALL') => {
    if (!editingEventId) return;
    
    if (!recurringEventId && !window.confirm('Are you sure you want to delete this event?')) return;
    
    setLoading(true);
    try {
      const targetId = (range === 'ALL' && recurringEventId) ? recurringEventId : editingEventId;
      const res = await fetch(`${API_URL}/events/${targetId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        resetForm();
        fetchEvents();
      } else {
        const data = await res.json();
        alert(data.detail || 'Failed to delete event');
      }
    } catch (err) {
      console.error('Failed to delete event', err);
    } finally {
      setLoading(false);
      setShowRangeSelectionModal(false);
      setRangeSelectionAction(null);
    }
  };

  const handleAllDayToggle = (checked: boolean) => {
    setIsAllDay(checked);
    if (!checked && !startTime) {
      setStartTime(dayjs().hour(9).minute(0));
      setEndTime(dayjs().hour(10).minute(0));
    }
  };

  const resetForm = () => {
    setSummary('');
    setDescription('');
    setStartDate(null);
    setStartTime(null);
    setEndDate(null);
    setEndTime(null);
    setIsAllDay(false);
    setEditingEventId(null);
    setIsFormOpen(false);
    
    // Reset recurrence states
    setIsRecurring(false);
    setRecurrenceFreq('DAILY');
    setRecurrenceEndType('NEVER');
    setRecurrenceCount(10);
    setRecurrenceUntil(null);
    setRecurrenceWeekdays([]);
    setMonthlyRepeatType('DAY_OF_MONTH');
    setRecurrenceMonthday(1);
    setRecurrenceWeekNum(1);
    setRecurrenceMonthlyWeekday('MO');

    // Reset range selection states
    setShowRangeSelectionModal(false);
    setRangeSelectionAction(null);
    setRecurringEventId(null);
  };

  const handleDateSelect = (selectInfo: any) => {
    resetForm();
    const start = dayjs(selectInfo.start);
    let end = dayjs(selectInfo.end);
    
    if (selectInfo.allDay) {
      end = end.subtract(1, 'day');
    }
    
    setStartDate(start);
    setEndDate(end);
    setIsAllDay(selectInfo.allDay);
    
    // Set smart defaults for recurrence based on selected start date
    const dayOfWeekMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    const weekdayStr = dayOfWeekMap[start.day()];
    setRecurrenceMonthlyWeekday(weekdayStr);
    setRecurrenceWeekdays([weekdayStr]);
    setRecurrenceMonthday(start.date());
    setRecurrenceWeekNum(Math.ceil(start.date() / 7));
    
    if (!selectInfo.allDay) {
      setStartTime(start);
      setEndTime(end);
    } else {
      setStartTime(dayjs().hour(9).minute(0));
      setEndTime(dayjs().hour(10).minute(0));
    }
    setIsFormOpen(true);
  };

  const parseRecurrenceRule = (recurrenceList: string[]) => {
    if (!recurrenceList || recurrenceList.length === 0) {
      setIsRecurring(false);
      return;
    }
    
    const rruleStr = recurrenceList.find(r => r.startsWith('RRULE:'));
    if (!rruleStr) {
      setIsRecurring(false);
      return;
    }

    const ruleParts = rruleStr.replace('RRULE:', '').split(';');
    const rules: { [key: string]: string } = {};
    ruleParts.forEach(part => {
      const [key, val] = part.split('=');
      if (key && val) {
        rules[key] = val;
      }
    });

    setIsRecurring(true);

    if (rules['FREQ']) {
      setRecurrenceFreq(rules['FREQ'] as any);
    }

    if (rules['BYDAY'] && rules['FREQ'] === 'WEEKLY') {
      const days = rules['BYDAY'].split(',');
      setRecurrenceWeekdays(days);
    }

    if (rules['FREQ'] === 'MONTHLY') {
      if (rules['BYMONTHDAY']) {
        setMonthlyRepeatType('DAY_OF_MONTH');
        setRecurrenceMonthday(parseInt(rules['BYMONTHDAY']) || 1);
      } else if (rules['BYDAY']) {
        setMonthlyRepeatType('DAY_OF_WEEK');
        const byDayVal = rules['BYDAY'];
        const match = byDayVal.match(/^([-]?\d+)?([A-Z]{2})$/);
        if (match) {
          const weekNum = parseInt(match[1]) || 1;
          const weekday = match[2];
          setRecurrenceWeekNum(weekNum);
          setRecurrenceMonthlyWeekday(weekday);
        }
      }
    }

    if (rules['COUNT']) {
      setRecurrenceEndType('COUNT');
      setRecurrenceCount(parseInt(rules['COUNT']) || 10);
    } else if (rules['UNTIL']) {
      setRecurrenceEndType('UNTIL');
      const untilStr = rules['UNTIL'];
      const datePart = untilStr.slice(0, 8);
      const parsedDate = dayjs(datePart, 'YYYYMMDD');
      if (parsedDate.isValid()) {
        setRecurrenceUntil(parsedDate);
      }
    } else {
      setRecurrenceEndType('NEVER');
    }
  };

  const handleEventClick = (clickInfo: any) => {
    const event = clickInfo.event;
    setEditingEventId(event.id);
    setSummary(event.title);
    setDescription(event.extendedProps.description || '');
    setIsAllDay(event.allDay);
    
    const start = dayjs(event.start);
    let end = dayjs(event.end);
    
    if (event.allDay && event.end) {
      end = end.subtract(1, 'day');
    }
    
    setStartDate(start);
    setStartTime(start);
    setEndDate(end);
    setEndTime(end);
    
    // Set smart defaults for recurrence based on clicked event start date
    const dayOfWeekMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    const weekdayStr = dayOfWeekMap[start.day()];
    setRecurrenceMonthlyWeekday(weekdayStr);
    setRecurrenceWeekdays([weekdayStr]);
    setRecurrenceMonthday(start.date());
    setRecurrenceWeekNum(Math.ceil(start.date() / 7));

    setRecurringEventId(event.extendedProps.recurringEventId || null);
    
    // 繰り返しルールのパースと復元
    if (event.extendedProps.recurrence) {
      parseRecurrenceRule(event.extendedProps.recurrence);
    } else {
      setIsRecurring(false);
    }
    
    setIsFormOpen(true);
  };

  const handleEventDrop = async (dropInfo: any) => {
    const event = dropInfo.event;
    const oldEvent = dropInfo.oldEvent;
    
    // 元の時間情報を抽出
    const oldStart = dayjs(oldEvent.start);
    const oldEnd = oldEvent.end ? dayjs(oldEvent.end) : oldStart.add(1, 'hour');
    
    // ドロップされた新しい日付情報を抽出
    const newStart = dayjs(event.start);
    
    let finalStart: string;
    let finalEnd: string;
    
    if (event.allDay) {
      // 終日予定の場合は日付のみを維持
      finalStart = newStart.format('YYYY-MM-DD');
      
      const dayDiff = newStart.startOf('day').diff(oldStart.startOf('day'), 'day');
      const finalEndDay = oldEnd.add(dayDiff, 'day');
      finalEnd = finalEndDay.format('YYYY-MM-DD');
    } else {
      // 終日予定でない場合は、新しい日付 ＋ 元の開始・終了時刻 を合成
      const finalStartObj = newStart.hour(oldStart.hour()).minute(oldStart.minute()).second(0).millisecond(0);
      
      const dayDiff = newStart.startOf('day').diff(oldStart.startOf('day'), 'day');
      const finalEndObj = oldEnd.hour(oldEnd.hour()).minute(oldEnd.minute()).second(0).millisecond(0).add(dayDiff, 'day');
      
      finalStart = finalStartObj.toISOString();
      finalEnd = finalEndObj.toISOString();
    }
    
    setLoading(true);
    try {
      // サーバーへ PUT /events/{id} を送信して位置を更新
      // 繰り返し予定の場合、event.id にはインスタンスIDがすでに入っているため、自動的にその特定の日（インスタンス）のみが例外として移動します
      const res = await fetch(`${API_URL}/events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: event.title,
          description: event.extendedProps.description || '',
          start_time: finalStart,
          end_time: finalEnd,
          is_all_day: event.allDay,
          recurrence: null // 繰り返し設定は null を渡すことで、この予定のみを移動させます
        })
      });
      
      if (res.ok) {
        // 更新成功。イベント一覧を再同期
        fetchEvents();
      } else {
        const data = await res.json();
        alert(data.detail || 'Failed to move event');
        dropInfo.revert(); // ドラッグ前の位置に戻す
      }
    } catch (err) {
      console.error('Failed to move event', err);
      alert('Failed to move event due to a network error');
      dropInfo.revert(); // ドラッグ前の位置に戻す
    } finally {
      setLoading(false);
    }
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
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <div className="app-layout">
        <header className="app-header">
          <div className="header-left">
            <img src="https://www.gstatic.com/images/branding/product/1x/calendar_2020q4_32dp.png" alt="logo" />
            <span className="brand-name">Calendar</span>
          </div>
          <div className="header-right">
            <button className="create-btn" onClick={() => { resetForm(); setIsFormOpen(true); }}>
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
              eventClick={handleEventClick}
              editable={true}
              eventDrop={handleEventDrop}
              height="100%"
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              }}
              slotLabelFormat={{
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              }}
            />
          </div>
        </main>

        {isFormOpen && (
          <div className="modal-overlay">
            <div className="event-modal">
              <div className="modal-header">
                <h3>{editingEventId ? 'Edit Event' : 'New Event'}</h3>
                <button className="close-btn" onClick={resetForm}>×</button>
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
                
                 <div className="form-group all-day-toggle">
                   <label>
                     <input 
                       type="checkbox" 
                       checked={isAllDay} 
                       onChange={e => handleAllDayToggle(e.target.checked)} 
                     />
                     All day
                   </label>
                 </div>

                 <div className="form-group repeat-toggle">
                   <label>
                     <input 
                       type="checkbox" 
                       checked={isRecurring} 
                       onChange={e => setIsRecurring(e.target.checked)} 
                     />
                     Repeat (繰り返し)
                   </label>
                 </div>

                 {isRecurring && (
                    <div className="recurrence-settings">
                      <div className="form-group">
                        <label>Frequency (頻度)</label>
                        <select 
                          value={recurrenceFreq} 
                          onChange={e => setRecurrenceFreq(e.target.value as any)}
                          className="select-input"
                        >
                          <option value="DAILY">Daily (毎日)</option>
                          <option value="WEEKLY">Weekly (毎週)</option>
                          <option value="MONTHLY">Monthly (毎月)</option>
                          <option value="YEARLY">Yearly (毎年)</option>
                        </select>
                      </div>

                      {/* Weekly details */}
                      {recurrenceFreq === 'WEEKLY' && (
                        <div className="form-group">
                          <label>Repeat on (繰り返す曜日)</label>
                          <div className="weekday-selector">
                            {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map(day => {
                              const labelMap: { [key: string]: string } = {
                                'SU': '日', 'MO': '月', 'TU': '火', 'WE': '水',
                                'TH': '木', 'FR': '金', 'SA': '土'
                              };
                              const isSelected = recurrenceWeekdays.includes(day);
                              return (
                                <button
                                  key={day}
                                  type="button"
                                  className={`weekday-btn ${isSelected ? 'selected' : ''}`}
                                  onClick={() => toggleWeekday(day)}
                                >
                                  {labelMap[day]}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Monthly details */}
                      {recurrenceFreq === 'MONTHLY' && (
                        <div className="monthly-recurrence-options">
                          <div className="form-group">
                            <label>Repeat pattern (繰り返しの形式)</label>
                            <div className="radio-group">
                              <label className="radio-label">
                                <input 
                                  type="radio" 
                                  name="monthlyRepeatType" 
                                  checked={monthlyRepeatType === 'DAY_OF_MONTH'} 
                                  onChange={() => setMonthlyRepeatType('DAY_OF_MONTH')} 
                                />
                                <span>毎月 {recurrenceMonthday} 日</span>
                              </label>
                              <label className="radio-label">
                                <input 
                                  type="radio" 
                                  name="monthlyRepeatType" 
                                  checked={monthlyRepeatType === 'DAY_OF_WEEK'} 
                                  onChange={() => setMonthlyRepeatType('DAY_OF_WEEK')} 
                                />
                                <span>第{recurrenceWeekNum === -1 ? '最終' : recurrenceWeekNum} {getWeekdayJapanese(recurrenceMonthlyWeekday)}</span>
                              </label>
                            </div>
                          </div>

                          {monthlyRepeatType === 'DAY_OF_MONTH' ? (
                            <div className="form-group sub-settings">
                              <label>Day of Month (日付を指定: 1〜31日)</label>
                              <input 
                                type="number" 
                                min={1} 
                                max={31}
                                value={recurrenceMonthday} 
                                onChange={e => setRecurrenceMonthday(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                                className="number-input"
                              />
                            </div>
                          ) : (
                            <div className="form-group sub-settings d-flex gap-2">
                              <div className="flex-1">
                                <label>Week Number (第何週)</label>
                                <select 
                                  value={recurrenceWeekNum} 
                                  onChange={e => setRecurrenceWeekNum(parseInt(e.target.value))}
                                  className="select-input"
                                >
                                  <option value={1}>第 1</option>
                                  <option value={2}>第 2</option>
                                  <option value={3}>第 3</option>
                                  <option value={4}>第 4</option>
                                  <option value={5}>第 5</option>
                                  <option value={-1}>最終</option>
                                </select>
                              </div>
                              <div className="flex-1">
                                <label>Day of Week (曜日)</label>
                                <select 
                                  value={recurrenceMonthlyWeekday} 
                                  onChange={e => setRecurrenceMonthlyWeekday(e.target.value)}
                                  className="select-input"
                                >
                                  <option value="SU">日曜日</option>
                                  <option value="MO">月曜日</option>
                                  <option value="TU">火曜日</option>
                                  <option value="WE">水曜日</option>
                                  <option value="TH">木曜日</option>
                                  <option value="FR">金曜日</option>
                                  <option value="SA">土曜日</option>
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="form-group">
                        <label>Ends (終了条件)</label>
                        <select 
                          value={recurrenceEndType} 
                          onChange={e => setRecurrenceEndType(e.target.value as any)}
                          className="select-input"
                        >
                          <option value="NEVER">Never (終了しない)</option>
                          <option value="COUNT">After occurrences (指定回数で終了)</option>
                          <option value="UNTIL">On date (指定日で終了)</option>
                        </select>
                      </div>

                      {recurrenceEndType === 'COUNT' && (
                        <div className="form-group">
                          <label>Occurrences (終了回数)</label>
                          <input 
                            type="number" 
                            min={1} 
                            value={recurrenceCount} 
                            onChange={e => setRecurrenceCount(parseInt(e.target.value) || 1)}
                            className="number-input"
                          />
                        </div>
                      )}

                      {recurrenceEndType === 'UNTIL' && (
                        <div className="form-group">
                          <label>End Date (終了日)</label>
                          <DatePicker 
                            value={recurrenceUntil} 
                            onChange={(newValue) => setRecurrenceUntil(newValue)}
                            slotProps={{ textField: { size: 'small', fullWidth: true } }}
                          />
                        </div>
                      )}
                    </div>
                 )}

                <div className="form-group">
                  <label>Start</label>
                  <div className="datetime-inputs">
                    <DatePicker 
                      value={startDate} 
                      onChange={(newValue) => setStartDate(newValue)}
                      slotProps={{ textField: { size: 'small', fullWidth: true } }}
                    />
                    {!isAllDay && (
                      <MobileTimePicker 
                        value={startTime} 
                        onChange={(newValue) => setStartTime(newValue)}
                        slotProps={{ textField: { size: 'small', fullWidth: true } }}
                        ampm={false}
                      />
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label>End</label>
                  <div className="datetime-inputs">
                    <DatePicker 
                      value={endDate} 
                      onChange={(newValue) => setEndDate(newValue)}
                      slotProps={{ textField: { size: 'small', fullWidth: true } }}
                    />
                    {!isAllDay && (
                      <MobileTimePicker 
                        value={endTime} 
                        onChange={(newValue) => setEndTime(newValue)}
                        slotProps={{ textField: { size: 'small', fullWidth: true } }}
                        ampm={false}
                      />
                    )}
                  </div>
                </div>
                <textarea 
                  className="input-desc"
                  placeholder="Add description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
                <div className="modal-footer">
                  {editingEventId && (
                    <div className="footer-left-buttons">
                      <button type="button" className="delete-btn" onClick={handleDeleteClick} disabled={loading} title="Delete">
                        Delete
                      </button>
                      <button type="button" className="copy-btn" onClick={handleCopyEvent} title="Copy event to new">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                      </button>
                    </div>
                  )}
                  <div className="footer-right">
                    <button type="button" className="cancel-btn" onClick={resetForm}>Cancel</button>
                    <button type="submit" className="save-btn" disabled={loading}>
                      {loading ? 'Saving...' : (editingEventId ? 'Update' : 'Save')}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {showRangeSelectionModal && (
          <div className="modal-overlay range-modal-overlay">
            <div className="range-modal">
              <h4>{rangeSelectionAction === 'DELETE' ? '予定の削除' : '予定の変更'}</h4>
              <p>
                この予定は繰り返し予定の一部です。<br />
                どちらの予定を{rangeSelectionAction === 'DELETE' ? '削除' : '変更'}しますか？
              </p>
              <div className="range-options">
                <button 
                  type="button" 
                  className="range-btn btn-secondary" 
                  onClick={() => rangeSelectionAction === 'DELETE' ? handleDelete('SINGLE') : handleSave('SINGLE')}
                >
                  この予定のみ (This event only)
                </button>
                <button 
                  type="button" 
                  className="range-btn btn-primary" 
                  onClick={() => rangeSelectionAction === 'DELETE' ? handleDelete('ALL') : handleSave('ALL')}
                >
                  今後すべての予定 (This and following / Series)
                </button>
              </div>
              <div className="range-footer">
                <button 
                  type="button" 
                  className="cancel-btn" 
                  onClick={() => { setShowRangeSelectionModal(false); setRangeSelectionAction(null); }}
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </LocalizationProvider>
  );
}

export default App;
