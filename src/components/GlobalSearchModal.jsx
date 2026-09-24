import React, { useState, useEffect, useRef } from 'react';
import './GlobalSearchModal.css';

export default function GlobalSearchModal({ deadlines = [], announcements = [], events = [], timetable = [], onClose }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const q = query.trim().toLowerCase();

  const matchingDeadlines = q
    ? deadlines.filter(d =>
        (d.title || '').toLowerCase().includes(q) ||
        (d.course || '').toLowerCase().includes(q) ||
        (d.description || '').toLowerCase().includes(q)
      )
    : [];

  const matchingAnnouncements = q
    ? announcements.filter(a =>
        (a.title || '').toLowerCase().includes(q) ||
        (a.content || '').toLowerCase().includes(q) ||
        (a.author || '').toLowerCase().includes(q)
      )
    : [];

  const matchingEvents = q
    ? events.filter(e =>
        (e.title || '').toLowerCase().includes(q) ||
        (e.location || '').toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q)
      )
    : [];

  const matchingTimetable = q
    ? timetable.filter(t =>
        (t.course || '').toLowerCase().includes(q) ||
        (t.room || '').toLowerCase().includes(q) ||
        (t.day || '').toLowerCase().includes(q)
      )
    : [];

  const totalResults = matchingDeadlines.length + matchingAnnouncements.length + matchingEvents.length + matchingTimetable.length;

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose}>
      <div className="global-search-modal glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="search-modal-header">
          <span className="search-modal-icon">🔍</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search assignments, bulletins, events, or timetable courses..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="global-search-input"
          />
          <button type="button" className="close-search-btn" onClick={onClose}>
            ESC
          </button>
        </div>

        <div className="search-results-tray">
          {!q ? (
            <div className="search-hint">
              <p>Type to search across everything in the Graphic Design portal:</p>
              <div className="search-tags">
                <span onClick={() => setQuery('Layout')}>Layout</span>
                <span onClick={() => setQuery('InDesign')}>InDesign</span>
                <span onClick={() => setQuery('Exam')}>Exam</span>
                <span onClick={() => setQuery('Workshop')}>Workshop</span>
                <span onClick={() => setQuery('Studio')}>Studio</span>
                <span onClick={() => setQuery('Lab 3')}>Lab 3</span>
              </div>
            </div>
          ) : totalResults === 0 ? (
            <div className="no-search-results">
              <span className="empty-icon">🔎</span>
              <p>No matches found for "{query}".</p>
            </div>
          ) : (
            <div className="search-sections">
              {matchingDeadlines.length > 0 && (
                <div className="search-group">
                  <h4>📝 Deadlines &amp; Assignments ({matchingDeadlines.length})</h4>
                  {matchingDeadlines.map(d => (
                    <div key={d.id} className="search-item-card">
                      <div className="item-badge-row">
                        <span className="search-course-badge">{d.course}</span>
                        <span className="search-date-pill">Due: {d.dueDate}</span>
                      </div>
                      <h5>{d.title}</h5>
                      <p>{d.description}</p>
                    </div>
                  ))}
                </div>
              )}

              {matchingAnnouncements.length > 0 && (
                <div className="search-group">
                  <h4>📢 Bulletins &amp; Notices ({matchingAnnouncements.length})</h4>
                  {matchingAnnouncements.map(a => (
                    <div key={a.id} className="search-item-card">
                      <div className="item-badge-row">
                        <span className="search-cat-badge">{a.category}</span>
                        <span className="search-author-pill">By {a.author}</span>
                      </div>
                      <h5>{a.title}</h5>
                      <p>{a.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {matchingEvents.length > 0 && (
                <div className="search-group">
                  <h4>📅 Events &amp; Workshops ({matchingEvents.length})</h4>
                  {matchingEvents.map(e => (
                    <div key={e.id} className="search-item-card">
                      <div className="item-badge-row">
                        <span className="search-event-pill">📍 {e.location}</span>
                        <span className="search-date-pill">{e.date} &bull; {e.time}</span>
                      </div>
                      <h5>{e.title}</h5>
                      <p>{e.description}</p>
                    </div>
                  ))}
                </div>
              )}

              {matchingTimetable.length > 0 && (
                <div className="search-group">
                  <h4>🕒 Timetable Classes ({matchingTimetable.length})</h4>
                  {matchingTimetable.map(t => (
                    <div key={t.id} className="search-item-card">
                      <div className="item-badge-row">
                        <span className="search-day-pill">{t.day}</span>
                        <span className="search-time-pill">{t.time}</span>
                      </div>
                      <h5>{t.course}</h5>
                      <p>Room: <strong>{t.room}</strong> &bull; {t.year || 'All Years'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
