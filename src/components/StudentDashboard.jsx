import React, { useContext, useEffect, useState } from 'react';
import { DbContext } from '../context/DbContextDefinition';
import './StudentDashboard.css';
import {
  openWhatsApp,
  formatAnnouncementForWhatsApp,
  formatDeadlineForWhatsApp,
  formatEventForWhatsApp,
  createClassGroupTitle,
  formatClassGroupJoinRequest
} from '../utils/whatsapp';

const CLASS_YEAR_OPTIONS = ['Year 1', 'Year 2', 'Year 3', 'Year 4'];
const ALL_CERTIFICATES = 'All Certificates';
const ALL_YEARS = 'All Years';

const isForCurrentStudent = (item, student) => {
  const targetCertificate = item.certificate || ALL_CERTIFICATES;
  const targetYear = item.year || ALL_YEARS;
  const certificateMatches = targetCertificate === ALL_CERTIFICATES || targetCertificate === student?.certificate;
  const yearMatches = targetYear === ALL_YEARS || targetYear === student?.year;
  return certificateMatches && yearMatches;
};

export default function StudentDashboard() {
  const {
    currentUser,
    deadlines,
    events,
    announcements,
    toggleDeadlineCompleted,
    timetable,
    classGroups,
    addTimetableSlot,
    updateTimetableSlot,
    deleteTimetableSlot,
    saveClassWhatsAppGroup
  } = useContext(DbContext);

  const [activeTab, setActiveTab] = useState('all'); // all, assignments, projects, exams, completed
  const [announcementFilter, setAnnouncementFilter] = useState('all'); // all, notice, update, calendar
  const [showTimetableForm, setShowTimetableForm] = useState(false);
  const [editingTimetableId, setEditingTimetableId] = useState(null);
  const [timetableForm, setTimetableForm] = useState({
    day: 'Monday',
    time: '',
    course: '',
    room: '',
    year: 'All Years'
  });
  const [classGroupYear, setClassGroupYear] = useState(currentUser?.year || 'Year 1');
  const [classHeadPhone, setClassHeadPhone] = useState('');
  const [classInviteLink, setClassInviteLink] = useState('');
  const [classGroupStatus, setClassGroupStatus] = useState('');

  const canManageTimetable = currentUser.role === 'student_head';
  const canManageClassGroup = currentUser.role === 'student_head';
  const classGroupForForm = (classGroups || []).find(group => group.year === classGroupYear);
  const currentStudentClassGroup = (classGroups || []).find(group => group.year === currentUser?.year);
  const generatedClassTitle = createClassGroupTitle(classGroupYear);
  const visibleTimetable = (timetable || []).filter(slot => (
    canManageTimetable || isForCurrentStudent(slot, currentUser)
  ));
  const profilePhotoSrc = typeof currentUser?.profilePic === 'string' && currentUser.profilePic.trim()
    ? currentUser.profilePic
    : '';
  const profileInitial = currentUser?.name?.charAt(0)?.toUpperCase() || 'S';

  useEffect(() => {
    if (canManageClassGroup && currentUser?.year) {
      setClassGroupYear(currentUser.year);
    }
  }, [canManageClassGroup, currentUser?.id, currentUser?.year]);

  useEffect(() => {
    if (!canManageClassGroup) return;
    setClassHeadPhone(classGroupForForm?.headPhone || '');
    setClassInviteLink(classGroupForForm?.inviteLink || '');
  }, [canManageClassGroup, classGroupForForm]);

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
    if (days === 0) return { text: 'Due Today!', class: 'due-today' };
    if (days === 1) return { text: 'Due Tomorrow', class: 'urgent' };
    if (days <= 3) return { text: `${days} days left`, class: 'urgent' };
    return { text: `${days} days remaining`, class: 'normal' };
  };

  // Filter deadlines
  const completedList = currentUser.completedDeadlines || [];

  const visibleDeadlines = (deadlines || []).filter(d => isForCurrentStudent(d, currentUser));
  const filteredDeadlines = visibleDeadlines.filter(d => {
    const isCompleted = completedList.includes(d.id);

    if (activeTab === 'completed') return isCompleted;
    if (isCompleted) return false; // don't show completed in active tabs

    if (activeTab === 'all') return true;
    if (activeTab === 'assignments') return d.type === 'assignment';
    if (activeTab === 'projects') return d.type === 'project';
    if (activeTab === 'exams') return d.type === 'examination';
    return true;
  });

  // Filter announcements
  const filteredAnnouncements = (announcements || []).filter(a => {
    if (!isForCurrentStudent(a, currentUser)) return false;
    if (announcementFilter === 'all') return true;
    return a.category === announcementFilter;
  });

  // Split pinned and non-pinned
  const pinnedAnnouncements = filteredAnnouncements.filter(a => a.isPinned);
  const regularAnnouncements = filteredAnnouncements.filter(a => !a.isPinned);
  const displayAnnouncements = [...pinnedAnnouncements, ...regularAnnouncements];

  const handleShareDeadline = (d) => {
    const text = formatDeadlineForWhatsApp(d);
    openWhatsApp({ text });
  };

  const handleShareAnnouncement = (a) => {
    const text = formatAnnouncementForWhatsApp(a);
    openWhatsApp({ text });
  };

  const handleShareEvent = (e) => {
    const text = formatEventForWhatsApp(e);
    openWhatsApp({ text });
  };

  const handleClassGroupSubmit = (e) => {
    e.preventDefault();
    if (!classHeadPhone.trim() || !classInviteLink.trim() || !saveClassWhatsAppGroup) return;

    const savedGroup = saveClassWhatsAppGroup({
      year: classGroupYear,
      headName: currentUser?.name || 'Class Head',
      headId: currentUser?.id || '',
      headPhone: classHeadPhone,
      inviteLink: classInviteLink
    });

    setClassGroupStatus(`${savedGroup.title} saved`);
    setTimeout(() => setClassGroupStatus(''), 2500);
  };

  const copyGeneratedClassTitle = () => {
    navigator.clipboard.writeText(generatedClassTitle);
    setClassGroupStatus('Class title copied');
    setTimeout(() => setClassGroupStatus(''), 2500);
  };

  const openWhatsAppHome = () => {
    window.open('https://web.whatsapp.com/', '_blank', 'noopener,noreferrer');
  };

  const openClassGroupContact = (group) => {
    if (!group) return;
    if (group.inviteLink) {
      window.open(group.inviteLink, '_blank', 'noopener,noreferrer');
      return;
    }
    openWhatsApp({
      phone: group.headPhone,
      text: formatClassGroupJoinRequest(group, currentUser)
    });
  };

  const handleTimetableFieldChange = (e) => {
    const { name, value } = e.target;
    setTimetableForm(prev => ({ ...prev, [name]: value }));
  };

  const resetTimetableForm = () => {
    setTimetableForm({
      day: 'Monday',
      time: '',
      course: '',
      room: '',
      year: 'All Years'
    });
    setEditingTimetableId(null);
    setShowTimetableForm(false);
  };

  const handleTimetableSubmit = (e) => {
    e.preventDefault();
    if (!timetableForm.course.trim() || !timetableForm.time.trim() || !timetableForm.room.trim()) return;

    const payload = {
      day: timetableForm.day,
      time: timetableForm.time.trim(),
      course: timetableForm.course.trim(),
      room: timetableForm.room.trim(),
      year: timetableForm.year
    };

    if (editingTimetableId) {
      updateTimetableSlot(editingTimetableId, payload);
    } else {
      addTimetableSlot(payload);
    }

    resetTimetableForm();
  };

  const startTimetableEdit = (slot) => {
    setTimetableForm({
      day: slot.day || 'Monday',
      time: slot.time || '',
      course: slot.course || '',
      room: slot.room || '',
      year: slot.year || 'All Years'
    });
    setEditingTimetableId(slot.id);
    setShowTimetableForm(true);
  };

  return (
    <div className="dashboard-content container animate-fade-in">
      {/* Welcome Banner */}
      <header className="dashboard-hero glass-panel">
        <div className="hero-student-profile">
          <div className="student-avatar-wrapper" title="Profile picture">
            {profilePhotoSrc ? (
              <img src={profilePhotoSrc} alt={currentUser.name} className="student-profile-photo" />
            ) : (
              <div className="student-profile-initial">{profileInitial}</div>
            )}
          </div>
          <div className="hero-text">
            <h1>{currentUser?.name || 'Student Dashboard'}</h1>
            <p>Signed in as <strong>{currentUser.name}</strong> ({currentUser.certificate || 'BTech'} {currentUser.year || 'Year 1'} Graphic Design). Track your assignments, download course notes, and check submission deadlines.</p>
          </div>
        </div>
        <div className="hero-stats">
          <div className="hero-stat-card">
            <span className="stat-num">{visibleDeadlines.filter(d => !completedList.includes(d.id)).length}</span>
            <span className="stat-label">Pending Deadlines</span>
          </div>
          <div className="hero-stat-card">
            <span className="stat-num">{completedList.length}</span>
            <span className="stat-label">Tasks Completed</span>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid-main-sidebar mt-4">

        {/* Main Section: Deadlines & Announcements */}
        <main className="dashboard-main-area">

          {/* Deadlines Section */}
          <section className="glass-panel dashboard-section mb-4">
            <div className="section-header-tabs">
              <h2>Upcoming Deadlines</h2>
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
                  <p>No deadlines found in this category.</p>
                </div>
              ) : (
                filteredDeadlines.map(d => {
                  const daysRemaining = getDaysRemaining(d.dueDate);
                  const remainingStatus = getDaysRemainingText(daysRemaining);
                  const isDone = completedList.includes(d.id);

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
                          <span className={`badge ${d.type === 'assignment' ? 'badge-blue' :
                            d.type === 'project' ? 'badge-gold' : 'badge-danger'
                            }`}>
                            {d.type}
                          </span>
                          <span className="target-badge">{d.certificate || ALL_CERTIFICATES}</span>
                          <span className="target-badge">{d.year || ALL_YEARS}</span>
                        </div>
                        <h3 className="deadline-title">{d.title}</h3>
                        <p className="deadline-desc">{d.description}</p>

                        {/* Attached Assignment Document / Notes from Lecturer or Admin */}
                        {d.attachment?.dataUrl && (
                          <div className="deadline-attachment-container" style={{
                            marginTop: '12px',
                            padding: '10px 14px',
                            background: 'rgba(37, 99, 235, 0.08)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '8px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '20px' }}>📄</span>
                              <div>
                                <strong style={{ color: '#1e40af', fontSize: '13px', display: 'block' }}>
                                  {d.attachment.name}
                                </strong>
                                <span style={{ color: '#64748b', fontSize: '11px' }}>
                                  Attached by {d.author || 'Department'} {d.attachment.size ? `• ${d.attachment.size}` : ''}
                                </span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <a
                                href={d.attachment.dataUrl}
                                download={d.attachment.name}
                                style={{
                                  background: '#2563eb',
                                  color: '#fff',
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                📥 Download File / Notes
                              </a>
                              <a
                                href={d.attachment.dataUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  background: 'rgba(37, 99, 235, 0.15)',
                                  color: '#1d4ed8',
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                  textDecoration: 'none'
                                }}
                              >
                                👁️ Open
                              </a>
                            </div>
                          </div>
                        )}

                        <div className="deadline-action-row" style={{ marginTop: '10px' }}>
                          <button
                            type="button"
                            onClick={() => handleShareDeadline(d)}
                            style={{
                              background: 'rgba(37, 211, 102, 0.12)',
                              border: '1px solid rgba(37, 211, 102, 0.35)',
                              color: '#16a34a',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <span>💬 Share to WhatsApp</span>
                          </button>
                        </div>
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
              <h2>Department Announcements</h2>
              <div className="filter-select-wrapper">
                <select
                  value={announcementFilter}
                  onChange={(e) => setAnnouncementFilter(e.target.value)}
                  className="announcement-select"
                >
                  <option value="all">All Bulletins</option>
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
                  <p>No announcements listed at this time.</p>
                </div>
              ) : (
                displayAnnouncements.map(a => (
                  <div key={a.id} className={`announcement-card-item ${a.isPinned ? 'pinned' : ''}`}>
                    {a.isPinned && (
                      <span className="pin-marker">📌 Pinned Announcement</span>
                    )}
                    <div className="announcement-meta">
                      <span className="announcement-author">{a.author}</span>
                      <span className="announcement-date">📅 {a.date}</span>
                    </div>
                    <h3 className="announcement-title">{a.title}</h3>
                    <p className="announcement-content-text">{a.content}</p>
                    <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => handleShareAnnouncement(a)}
                        style={{
                          background: 'rgba(37, 211, 102, 0.12)',
                          border: '1px solid rgba(37, 211, 102, 0.35)',
                          color: '#16a34a',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span>💬 Forward on WhatsApp</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </main>

        {/* Sidebar: Events & Timetable */}
        <aside className="dashboard-sidebar-area">

          <section className="glass-panel sidebar-section mb-4 class-whatsapp-section">
            <h2>Class WhatsApp Group</h2>

            {canManageClassGroup ? (
              <form className="class-whatsapp-form" onSubmit={handleClassGroupSubmit}>
                <div className="class-group-title-preview">
                  <span>Auto title</span>
                  <strong>{generatedClassTitle}</strong>
                </div>

                <div className="class-group-quick-actions">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={copyGeneratedClassTitle}>
                    Copy Title
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={openWhatsAppHome}>
                    Open WhatsApp
                  </button>
                </div>

                <div className="form-group">
                  <label>Class / Year</label>
                  <select value={classGroupYear} onChange={(e) => setClassGroupYear(e.target.value)}>
                    {CLASS_YEAR_OPTIONS.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Class Head WhatsApp Number</label>
                  <input
                    type="tel"
                    value={classHeadPhone}
                    onChange={(e) => setClassHeadPhone(e.target.value)}
                    placeholder="233241234567"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>WhatsApp Group Invite Link</label>
                  <input
                    type="url"
                    value={classInviteLink}
                    onChange={(e) => setClassInviteLink(e.target.value)}
                    placeholder="https://chat.whatsapp.com/..."
                    required
                  />
                </div>

                <button type="submit" className="btn btn-accent w-full">
                  Save Group Link
                </button>
                {classGroupStatus && <p className="class-group-status">{classGroupStatus}</p>}
              </form>
            ) : currentStudentClassGroup?.inviteLink ? (
              <div className="class-group-student-card">
                <h3>{currentStudentClassGroup.title}</h3>
                <p>Class Head: {currentStudentClassGroup.headName}</p>
                <p>Invite link available</p>
                <button
                  type="button"
                  className="btn btn-accent w-full"
                  onClick={() => openClassGroupContact(currentStudentClassGroup)}
                >
                  Join Class Group
                </button>
              </div>
            ) : (
              <p className="empty-sidebar-text">Your class group invite link has not been saved yet.</p>
            )}
          </section>

          {/* Upcoming Events Card */}
          <section className="glass-panel sidebar-section mb-4">
            <h2>Department Events</h2>
            <div className="events-vertical-list">
              {events.length === 0 ? (
                <p className="empty-sidebar-text">No upcoming events.</p>
              ) : (
                events.map(e => (
                  <div key={e.id} className="event-sidebar-card">
                    <div className="event-date-block">
                      <span className="event-day-num">{e.date.split('-')[2]}</span>
                      <span className="event-month">{new Date(e.date).toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</span>
                    </div>
                    <div className="event-detail-block">
                      <h3>{e.title}</h3>
                      <p className="event-location">📍 {e.location}</p>
                      <p className="event-time">⏰ {e.time} | {e.type}</p>
                      <button
                        type="button"
                        onClick={() => handleShareEvent(e)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#25D366',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          padding: '2px 0',
                          marginTop: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        <span>💬 Share Event</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Schedule / Timetable Card */}
          <section className="glass-panel sidebar-section">
            <div className="student-timetable-header">
              <h2>Your Weekly Classes</h2>
              {canManageTimetable && (
                <button
                  type="button"
                  className="btn btn-primary btn-xs"
                  onClick={() => {
                    if (showTimetableForm) {
                      resetTimetableForm();
                    } else {
                      setShowTimetableForm(true);
                    }
                  }}
                >
                  {showTimetableForm ? 'Cancel' : 'Add Class'}
                </button>
              )}
            </div>

            {canManageTimetable && showTimetableForm && (
              <form onSubmit={handleTimetableSubmit} className="student-head-timetable-form">
                <div className="form-group">
                  <label>Day</label>
                  <select name="day" value={timetableForm.day} onChange={handleTimetableFieldChange}>
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                    <option value="Sunday">Sunday</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Class Time</label>
                  <input name="time" type="text" placeholder="08:30 AM - 11:30 AM" value={timetableForm.time} onChange={handleTimetableFieldChange} required />
                </div>
                <div className="form-group">
                  <label>Course</label>
                  <input name="course" type="text" placeholder="Layout Design II" value={timetableForm.course} onChange={handleTimetableFieldChange} required />
                </div>
                <div className="form-group">
                  <label>Room</label>
                  <input name="room" type="text" placeholder="Lab 3" value={timetableForm.room} onChange={handleTimetableFieldChange} required />
                </div>
                <div className="form-group">
                  <label>Year Group</label>
                  <select name="year" value={timetableForm.year} onChange={handleTimetableFieldChange}>
                    <option value="All Years">All Years</option>
                    <option value="Year 1">Year 1</option>
                    <option value="Year 2">Year 2</option>
                    <option value="Year 3">Year 3</option>
                    <option value="Year 4">Year 4</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-accent w-full">
                  {editingTimetableId ? 'Save Class' : 'Publish Class'}
                </button>
              </form>
            )}

            <div className="timetable-list">
              {visibleTimetable.length === 0 ? (
                <p className="empty-sidebar-text">No classes published yet.</p>
              ) : (
                visibleTimetable.map(slot => (
                  <div key={slot.id} className="timetable-slot">
                    <div className="slot-day-tag">{slot.day}</div>
                    <div className="slot-details">
                      <h4>{slot.course}</h4>
                      <p>{slot.time}</p>
                      <div className="slot-meta-row">
                        <span className="slot-room">{slot.room}</span>
                        {slot.year && <span className="slot-year">{slot.year}</span>}
                      </div>
                      {canManageTimetable && (
                        <div className="student-head-actions">
                          <button type="button" onClick={() => startTimetableEdit(slot)}>Edit</button>
                          <button type="button" className="danger" onClick={() => deleteTimetableSlot(slot.id)}>Remove</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

        </aside>
      </div>
    </div>
  );
}
