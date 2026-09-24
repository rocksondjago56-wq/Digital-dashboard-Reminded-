import React, { useState } from 'react';
import { downloadCalendarICS } from '../utils/calendarExport';
import './CalendarView.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarView({ deadlines = [], events = [], timetable = [], onClose }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedItem, setSelectedItem] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonthDays = new Date(year, month, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleExportICS = () => {
    const combined = [
      ...deadlines.map(d => ({ ...d, dueDate: d.dueDate })),
      ...events.map(e => ({ ...e, date: e.date }))
    ];
    downloadCalendarICS(combined, `TTU_Academic_Schedule_${MONTH_NAMES[month]}_${year}.ics`);
  };

  const handlePrintTimetable = () => {
    window.print();
  };

  // Group deadlines & events by Date string (YYYY-MM-DD)
  const itemsByDate = {};

  deadlines.forEach(d => {
    if (!d.dueDate) return;
    if (!itemsByDate[d.dueDate]) itemsByDate[d.dueDate] = [];
    itemsByDate[d.dueDate].push({
      id: d.id,
      type: 'deadline',
      title: d.title,
      course: d.course,
      subType: d.type,
      time: 'Due 11:59 PM',
      description: d.description,
      raw: d
    });
  });

  events.forEach(e => {
    if (!e.date) return;
    if (!itemsByDate[e.date]) itemsByDate[e.date] = [];
    itemsByDate[e.date].push({
      id: e.id,
      type: 'event',
      title: e.title,
      subType: e.type,
      location: e.location,
      time: e.time || '10:00 AM',
      description: e.description,
      raw: e
    });
  });

  // Calendar cells matrix
  const calendarCells = [];

  // Previous month trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    calendarCells.push({
      day: prevMonthDays - i,
      isCurrentMonth: false,
      dateStr: ''
    });
  }

  // Current month days
  const todayStr = new Date().toISOString().split('T')[0];
  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({
      day: d,
      isCurrentMonth: true,
      isToday: dStr === todayStr,
      dateStr: dStr,
      items: itemsByDate[dStr] || []
    });
  }

  // Next month leading days to complete row
  const remaining = 35 - calendarCells.length;
  const trailingCount = remaining > 0 ? remaining : (42 - calendarCells.length);
  for (let d = 1; d <= trailingCount; d++) {
    calendarCells.push({
      day: d,
      isCurrentMonth: false,
      dateStr: ''
    });
  }

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose}>
      <div className="calendar-modal glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="calendar-modal-header">
          <div className="header-nav-group">
            <h2>📅 {MONTH_NAMES[month]} {year}</h2>
            <div className="nav-buttons">
              <button type="button" className="btn btn-secondary btn-xs" onClick={handlePrevMonth}>◀</button>
              <button type="button" className="btn btn-secondary btn-xs" onClick={handleToday}>Today</button>
              <button type="button" className="btn btn-secondary btn-xs" onClick={handleNextMonth}>▶</button>
            </div>
          </div>

          <div className="calendar-action-buttons">
            <button
              type="button"
              className="btn btn-accent btn-sm"
              onClick={handleExportICS}
              title="Download standard .ics file for Google Calendar, Apple Calendar, or Outlook"
            >
              📥 Export to Calendar (.ics)
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handlePrintTimetable}
              title="Print schedule or save as PDF"
            >
              🖨️ Print View
            </button>
            <button type="button" className="close-btn" onClick={onClose}>&times;</button>
          </div>
        </div>

        {/* Legend */}
        <div className="calendar-legend">
          <span className="legend-item"><span className="legend-dot dot-deadline"></span> Assignment Deadline</span>
          <span className="legend-item"><span className="legend-dot dot-exam"></span> Examination</span>
          <span className="legend-item"><span className="legend-dot dot-event"></span> Workshop / Event</span>
        </div>

        {/* Days of week header */}
        <div className="calendar-days-header">
          {DAYS_OF_WEEK.map(day => (
            <div key={day} className="day-name">{day}</div>
          ))}
        </div>

        {/* Grid */}
        <div className="calendar-grid">
          {calendarCells.map((cell, index) => (
            <div
              key={index}
              className={`calendar-cell ${!cell.isCurrentMonth ? 'other-month' : ''} ${cell.isToday ? 'today-cell' : ''}`}
            >
              <div className="cell-day-num">{cell.day}</div>
              <div className="cell-items-wrapper">
                {cell.items?.map((item) => (
                  <div
                    key={item.id}
                    className={`calendar-pill pill-${item.type} ${item.subType === 'examination' ? 'pill-exam' : ''}`}
                    onClick={() => setSelectedItem(item)}
                    title={`${item.title} (${item.time})`}
                  >
                    <span className="pill-title">{item.title}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Selected Item Detail Popover */}
        {selectedItem && (
          <div className="calendar-detail-card animate-fade-in">
            <div className="detail-header">
              <span className={`detail-tag tag-${selectedItem.type}`}>
                {selectedItem.subType || selectedItem.type}
              </span>
              <button type="button" className="close-detail-btn" onClick={() => setSelectedItem(null)}>&times;</button>
            </div>
            <h3>{selectedItem.title}</h3>
            {selectedItem.course && <p className="detail-course">📘 Course: <strong>{selectedItem.course}</strong></p>}
            {selectedItem.location && <p className="detail-loc">📍 Location: <strong>{selectedItem.location}</strong></p>}
            <p className="detail-time">⏰ {selectedItem.time}</p>
            {selectedItem.description && <p className="detail-desc">{selectedItem.description}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
