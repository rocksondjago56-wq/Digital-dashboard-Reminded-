import React, { useContext, useState, useRef } from 'react';
import { DbContext } from '../context/DbContextDefinition';
import './StudentDashboard.css';

export default function StudentDashboard() {
  const { 
    currentUser, 
    deadlines, 
    events, 
    announcements, 
    toggleDeadlineCompleted,
    updateUserProfilePic
  } = useContext(DbContext);

  const [activeTab, setActiveTab] = useState('all'); // all, assignments, projects, exams, completed
  const [announcementFilter, setAnnouncementFilter] = useState('all'); // all, notice, update, calendar
  const [sourceFilter, setSourceFilter] = useState('all'); // all, admin, lecturer
  const studentFileInputRef = useRef(null);

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) {
        updateUserProfilePic(currentUser.id, evt.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Helper to resolve author role with fallback for pre-existing items
  const getAuthorRole = (item) => {
    if (item.authorRole) return item.authorRole;
    const str = `${item.author || ''} ${item.organizer || ''} ${item.course || ''}`.toLowerCase();
    if (str.includes('admin') || str.includes('hod') || str.includes('it desk') || str.includes('dept') || str.includes('guild') || str.includes('office')) {
      return 'admin';
    }
    return 'lecturer';
  };

  // Personalized Student timetable schedule
  const studentTimetable = [
    { day: 'Monday', time: '08:30 AM - 11:30 AM', course: 'Layout Design II', room: 'Lab 3 (Mac Lab)' },
    { day: 'Tuesday', time: '01:00 PM - 03:00 PM', course: 'Art History & Theory', room: 'Lecture Hall C' },
    { day: 'Wednesday', time: '10:00 AM - 01:00 PM', course: 'Vector Graphics I', room: 'Lab 1' },
    { day: 'Thursday', time: '08:30 AM - 10:30 AM', course: 'Visual Portfolio Prep', room: 'Studio B' },
    { day: 'Friday', time: '02:00 PM - 04:00 PM', course: 'Design Workshop Seminar', room: 'Auditorium' }
  ];

  // Helper for computing days remaining
  const getDaysRemaining = (dueDateStr) => {
    const due = new Date(dueDateStr);
    const today = new Date();
    // Reset time components for simple calendar date diff
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDaysRemainingText = (days) => {
    if (days < 0) return { text: `Overdue by ${Math.abs(days)}d`, class: 'overdue' };
    if (days === 0) return { text: 'Due Today', class: 'due-today' };
    if (days === 1) return { text: 'Due Tomorrow', class: 'due-tomorrow' };
    return { text: `${days} days left`, class: 'days-left' };
  };

  // Filter deadlines
  const completedList = currentUser.completedDeadlines || [];

  const filteredDeadlines = deadlines.filter(d => {
    const isCompleted = completedList.includes(d.id);
    const role = getAuthorRole(d);
    
    // Check Source Filter (Administration vs Lecturer)
    if (sourceFilter === 'admin' && role !== 'admin') return false;
    if (sourceFilter === 'lecturer' && role !== 'lecturer') return false;

    if (activeTab === 'completed') return isCompleted;
    if (isCompleted) return false; // don't show completed in active tabs

    if (activeTab === 'all') return true;
    if (activeTab === 'assignments') return d.type === 'assignment';
    if (activeTab === 'projects') return d.type === 'project';
    if (activeTab === 'exams') return d.type === 'examination';
    return true;
  });

  // Filter announcements
  const filteredAnnouncements = announcements.filter(a => {
    const role = getAuthorRole(a);
    // Check Source Filter (Administration vs Lecturer)
    if (sourceFilter === 'admin' && role !== 'admin') return false;
    if (sourceFilter === 'lecturer' && role !== 'lecturer') return false;

    if (announcementFilter === 'all') return true;
    return a.category === announcementFilter;
  });

  // Filter events
  const filteredEvents = events.filter(e => {
    const role = getAuthorRole(e);
    if (sourceFilter === 'admin' && role !== 'admin') return false;
    if (sourceFilter === 'lecturer' && role !== 'lecturer') return false;
    return true;
  });

  // Split pinned and non-pinned
  const pinnedAnnouncements = filteredAnnouncements.filter(a => a.isPinned);
  const regularAnnouncements = filteredAnnouncements.filter(a => !a.isPinned);
  const displayAnnouncements = [...pinnedAnnouncements, ...regularAnnouncements];

  return (
    <div className="dashboard-content container animate-fade-in">
      {/* Hidden File Input for Student Photo Upload */}
      <input 
        type="file" 
        ref={studentFileInputRef} 
        style={{ display: 'none' }} 
        accept="image/*" 
        onChange={handlePhotoUpload} 
      />

      {/* Welcome Banner */}
      <header className="dashboard-hero glass-panel">
        <div className="hero-student-profile">
          <div className="student-avatar-wrapper" onClick={() => studentFileInputRef.current?.click()} title="Click to upload new photo">
            {currentUser.profilePic ? (
              <img src={currentUser.profilePic} alt={currentUser.name} className="student-profile-photo" />
            ) : (
              <div className="student-profile-initial">
                {currentUser.name.charAt(0)}
              </div>
            )}
            <button type="button" className="photo-change-btn" aria-label="Change photo">
              📷
            </button>
          </div>

          <div className="hero-text">
            <h1>Creative Portal, TTU</h1>
            <p>Welcome back, <strong>{currentUser.name}</strong>.</p>
            <div className="student-identity-meta mt-1">
              <span className="id-badge">🆔 Student ID: <strong>{currentUser.studentId || '0420210088'}</strong></span>
              <span className="dept-badge">🎨 {currentUser.department || 'Graphic Design'} ({currentUser.year || 'Year 3'})</span>
              <button 
                onClick={() => studentFileInputRef.current?.click()} 
                className="btn-change-photo-link"
              >
                📸 Change Photo
              </button>
            </div>
          </div>
        </div>

        <div className="hero-stats">
          <div className="hero-stat-card">
            <span className="stat-num">{deadlines.filter(d => !completedList.includes(d.id)).length}</span>
            <span className="stat-label">Pending Deadlines</span>
          </div>
          <div className="hero-stat-card">
            <span className="stat-num">{announcements.length}</span>
            <span className="stat-label">Total Notices</span>
          </div>
        </div>
      </header>

      {/* Global Source Feed Filter Bar */}
      <div className="source-filter-bar glass-panel mt-3">
        <div className="source-filter-label">
          <span className="filter-icon">📡</span>
          <strong>Department Feed View:</strong>
        </div>
        <div className="source-filter-buttons">
          <button 
            className={`source-btn ${sourceFilter === 'all' ? 'active' : ''}`}
            onClick={() => setSourceFilter('all')}
          >
            🌟 All Updates ({deadlines.length + announcements.length})
          </button>
          <button 
            className={`source-btn btn-admin-source ${sourceFilter === 'admin' ? 'active' : ''}`}
            onClick={() => setSourceFilter('admin')}
          >
            🛡️ Administration Posts ({deadlines.filter(d => getAuthorRole(d) === 'admin').length + announcements.filter(a => getAuthorRole(a) === 'admin').length})
          </button>
          <button 
            className={`source-btn btn-lecturer-source ${sourceFilter === 'lecturer' ? 'active' : ''}`}
            onClick={() => setSourceFilter('lecturer')}
          >
            👨‍🏫 Lecturer Posts ({deadlines.filter(d => getAuthorRole(d) === 'lecturer').length + announcements.filter(a => getAuthorRole(a) === 'lecturer').length})
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid-main-sidebar mt-4">
        
        {/* Main Section: Deadlines & Announcements */}
        <main className="dashboard-main-area">
          
          {/* Deadlines Section */}
          <section className="glass-panel dashboard-section mb-4">
            <div className="section-header-tabs">
              <h2>Academic Submissions & Deadlines</h2>
              <div className="tabs-list">
                <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>Active</button>
                <button className={`tab-btn ${activeTab === 'assignments' ? 'active' : ''}`} onClick={() => setActiveTab('assignments')}>Assignments</button>
                <button className={`tab-btn ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => setActiveTab('projects')}>Projects</button>
                <button className={`tab-btn ${activeTab === 'exams' ? 'active' : ''}`} onClick={() => setActiveTab('exams')}>Exams</button>
                <button className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`} onClick={() => setActiveTab('completed')}>Completed ({completedList.length})</button>
              </div>
            </div>

            <div className="deadlines-list-container">
              {filteredDeadlines.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">🎉</span>
                  <p>No deadlines match your current filter.</p>
                </div>
              ) : (
                filteredDeadlines.map(d => {
                  const daysRemaining = getDaysRemaining(d.dueDate);
                  const remainingStatus = getDaysRemainingText(daysRemaining);
                  const isDone = completedList.includes(d.id);
                  const role = getAuthorRole(d);

                  return (
                    <div key={d.id} className={`deadline-card ${isDone ? 'completed' : ''}`}>
                      <div className="deadline-check">
                        <input
                          type="checkbox"
                          id={`chk-${d.id}`}
                          checked={isDone}
                          onChange={() => toggleDeadlineCompleted(d.id)}
                        />
                        <label htmlFor={`chk-${d.id}`} className="checkbox-custom-label"></label>
                      </div>

                      <div className="deadline-body">
                        <div className="deadline-meta-row">
                          <span className="deadline-course">{d.course}</span>
                          <span className={`badge ${
                            d.type === 'assignment' ? 'badge-blue' :
                            d.type === 'project' ? 'badge-gold' : 'badge-danger'
                          }`}>
                            {d.type}
                          </span>
                          {/* Author Badge */}
                          <span className={`author-badge ${role === 'admin' ? 'author-admin' : 'author-lecturer'}`}>
                            {role === 'admin' ? '🛡️ Admin' : '👨‍🏫 Lecturer'}: {d.author || 'Faculty'}
                          </span>
                        </div>
                        <h3 className="deadline-title">{d.title}</h3>
                        <p className="deadline-desc">{d.description}</p>
                      </div>

                      <div className="deadline-timing">
                        <span className={`days-badge ${remainingStatus.class}`}>
                          {remainingStatus.text}
                        </span>
                        <span className="due-date-calendar">📅 Due {d.dueDate}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Announcements Board */}
          <section className="glass-panel dashboard-section">
            <div className="section-header-filters">
              <h2>Department Bulletins & Announcements</h2>
              <div className="filter-select-wrapper">
                <select 
                  value={announcementFilter} 
                  onChange={(e) => setAnnouncementFilter(e.target.value)}
                  className="announcement-select"
                >
                  <option value="all">All Notice Types</option>
                  <option value="notice">General Notices</option>
                  <option value="update">Academic Updates</option>
                  <option value="calendar">Calendar Alerts</option>
                </select>
              </div>
            </div>

            <div className="announcements-list">
              {displayAnnouncements.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📢</span>
                  <p>No announcements found for this filter.</p>
                </div>
              ) : (
                displayAnnouncements.map(a => {
                  const role = getAuthorRole(a);
                  return (
                    <div key={a.id} className={`announcement-card-item ${a.isPinned ? 'pinned' : ''}`}>
                      {a.isPinned && (
                        <span className="pin-marker">📌 Pinned Bulletin</span>
                      )}
                      <div className="announcement-meta">
                        <span className={`announcement-author-badge ${role === 'admin' ? 'author-admin' : 'author-lecturer'}`}>
                          {role === 'admin' ? '🛡️ Administration' : '👨‍🏫 Lecturer'}: <strong>{a.author}</strong>
                        </span>
                        <span className="announcement-date">📅 {a.date}</span>
                      </div>
                      <h3 className="announcement-title">{a.title}</h3>
                      <p className="announcement-content-text">{a.content}</p>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </main>

        {/* Sidebar: Events & Timetable */}
        <aside className="dashboard-sidebar-area">
          
          {/* Upcoming Events Card */}
          <section className="glass-panel sidebar-section mb-4">
            <h2>Department Events</h2>
            <div className="events-vertical-list">
              {filteredEvents.length === 0 ? (
                <p className="empty-sidebar-text">No events for this filter.</p>
              ) : (
                filteredEvents.map(e => {
                  const role = getAuthorRole(e);
                  return (
                    <div key={e.id} className="event-sidebar-card">
                      <div className="event-date-block">
                        <span className="event-day-num">{e.date.split('-')[2]}</span>
                        <span className="event-month">{new Date(e.date).toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</span>
                      </div>
                      <div className="event-detail-block">
                        <h3>{e.title}</h3>
                        <p className="event-location">📍 {e.location}</p>
                        <p className="event-time">⏰ {e.time} | {e.type}</p>
                        <span className={`event-author-badge ${role === 'admin' ? 'author-admin' : 'author-lecturer'}`}>
                          {role === 'admin' ? '🛡️ Admin' : '👨‍🏫 Lecturer'}: {e.organizer || e.author}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Schedule / Timetable Card */}
          <section className="glass-panel sidebar-section">
            <h2>Your Weekly Classes</h2>
            <div className="timetable-list">
              {studentTimetable.map((slot, index) => (
                <div key={index} className="timetable-slot">
                  <div className="slot-day-tag">{slot.day}</div>
                  <div className="slot-details">
                    <h4>{slot.course}</h4>
                    <p>{slot.time}</p>
                    <span className="slot-room">{slot.room}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </aside>
      </div>
    </div>
  );
}
