import React, { useContext, useState } from 'react';
import { DbContext } from '../context/DbContext';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const {
    users,
    deadlines,
    events,
    announcements,
    addDeadline,
    deleteDeadline,
    addAnnouncement,
    deleteAnnouncement,
    addEvent,
    deleteEvent,
    updateUserRole
  } = useContext(DbContext);

  const [adminTab, setAdminTab] = useState('announcements'); // announcements, events, deadlines, users

  // Form toggles
  const [showForm, setShowForm] = useState(false);

  // Forms Fields State
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annCategory, setAnnCategory] = useState('notice');
  const [annAuthor, setAnnAuthor] = useState('HOD Office');
  const [annPinned, setAnnPinned] = useState(false);

  const [evtTitle, setEvtTitle] = useState('');
  const [evtDesc, setEvtDesc] = useState('');
  const [evtLoc, setEvtLoc] = useState('');
  const [evtDate, setEvtDate] = useState('');
  const [evtTime, setEvtTime] = useState('10:00 AM');
  const [evtType, setEvtType] = useState('workshop');
  const [evtOrg, setEvtOrg] = useState('Graphic Design Dept');

  const [dlTitle, setDlTitle] = useState('');
  const [dlDesc, setDlDesc] = useState('');
  const [dlCourse, setDlCourse] = useState('Layout Design II');
  const [dlDate, setDlDate] = useState('');
  const [dlType, setDlType] = useState('assignment');

  // Submit handlers
  const handleAnnSubmit = (e) => {
    e.preventDefault();
    if (!annTitle || !annContent) return;
    addAnnouncement({
      title: annTitle,
      content: annContent,
      author: annAuthor || 'HOD Office',
      authorRole: 'admin',
      category: annCategory,
      isPinned: annPinned
    });
    setAnnTitle('');
    setAnnContent('');
    setAnnPinned(false);
    setShowForm(false);
  };

  const handleEvtSubmit = (e) => {
    e.preventDefault();
    if (!evtTitle || !evtLoc || !evtDate) return;
    addEvent({
      title: evtTitle,
      description: evtDesc,
      location: evtLoc,
      date: evtDate,
      time: evtTime,
      type: evtType,
      organizer: evtOrg,
      author: evtOrg || 'HOD Office',
      authorRole: 'admin'
    });
    setEvtTitle('');
    setEvtDesc('');
    setEvtLoc('');
    setEvtDate('');
    setShowForm(false);
  };

  const handleDlSubmit = (e) => {
    e.preventDefault();
    if (!dlTitle || !dlDesc || !dlDate) return;
    addDeadline({
      title: dlTitle,
      description: dlDesc,
      course: dlCourse,
      dueDate: dlDate,
      type: dlType,
      author: 'Administration Office',
      authorRole: 'admin'
    });
    setDlTitle('');
    setDlDesc('');
    setDlDate('');
    setShowForm(false);
  };

  return (
    <div className="dashboard-content container animate-fade-in">
      
      {/* Admin Hero */}
      <header className="dashboard-hero glass-panel admin-hero">
        <div className="hero-text">
          <h1>Admin Control Panel</h1>
          <p>Supervise academic schedules, coordinate public events, publish official department circulars, and manage student/lecturer access permissions.</p>
        </div>
      </header>

      {/* Metrics Row */}
      <div className="metrics-row mt-2">
        <div className="metric-card glass-panel">
          <span className="metric-icon">📢</span>
          <div className="metric-details">
            <span className="metric-number">{announcements.length}</span>
            <span className="metric-label">Announcements</span>
          </div>
        </div>
        <div className="metric-card glass-panel">
          <span className="metric-icon">📅</span>
          <div className="metric-details">
            <span className="metric-number">{events.length}</span>
            <span className="metric-label">Events & Seminars</span>
          </div>
        </div>
        <div className="metric-card glass-panel">
          <span className="metric-icon">📝</span>
          <div className="metric-details">
            <span className="metric-number">{deadlines.length}</span>
            <span className="metric-label">Active Deadlines</span>
          </div>
        </div>
        <div className="metric-card glass-panel">
          <span className="metric-icon">👥</span>
          <div className="metric-details">
            <span className="metric-number">{users.length}</span>
            <span className="metric-label">Registered Members</span>
          </div>
        </div>
      </div>

      {/* Admin Nav tabs */}
      <div className="admin-tab-nav mt-4">
        <button 
          className={`admin-nav-btn ${adminTab === 'announcements' ? 'active' : ''}`} 
          onClick={() => { setAdminTab('announcements'); setShowForm(false); }}
        >
          📢 Manage Announcements
        </button>
        <button 
          className={`admin-nav-btn ${adminTab === 'events' ? 'active' : ''}`} 
          onClick={() => { setAdminTab('events'); setShowForm(false); }}
        >
          📅 Manage Events
        </button>
        <button 
          className={`admin-nav-btn ${adminTab === 'deadlines' ? 'active' : ''}`} 
          onClick={() => { setAdminTab('deadlines'); setShowForm(false); }}
        >
          📝 Manage Deadlines
        </button>
        <button 
          className={`admin-nav-btn ${adminTab === 'users' ? 'active' : ''}`} 
          onClick={() => { setAdminTab('users'); setShowForm(false); }}
        >
          👥 User Administration
        </button>
      </div>

      {/* Main Admin Working Area */}
      <div className="admin-working-card glass-panel mt-2">
        
        {/* TAB 1: ANNOUNCEMENTS */}
        {adminTab === 'announcements' && (
          <div>
            <div className="tab-actions-row">
              <h3>Active Announcement Boards</h3>
              <button onClick={() => setShowForm(!showForm)} className="btn btn-primary btn-sm">
                {showForm ? 'Cancel Creation' : '➕ Create Announcement'}
              </button>
            </div>

            {showForm && (
              <form onSubmit={handleAnnSubmit} className="admin-action-form animate-fade-in">
                <div className="form-group">
                  <label>Announcement Title</label>
                  <input type="text" placeholder="Title heading" value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} required />
                </div>
                <div className="form-row-3">
                  <div className="form-group">
                    <label>Author Label</label>
                    <input type="text" value={annAuthor} onChange={(e) => setAnnAuthor(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Notice category</label>
                    <select value={annCategory} onChange={(e) => setAnnCategory(e.target.value)}>
                      <option value="notice">General Notice</option>
                      <option value="update">Academic Update</option>
                      <option value="calendar">Calendar Alert</option>
                    </select>
                  </div>
                  <div className="form-group checkbox-form-group-admin">
                    <input type="checkbox" id="adm-pin" checked={annPinned} onChange={(e) => setAnnPinned(e.target.checked)} />
                    <label htmlFor="adm-pin" className="inline-label">Pin Bulletin</label>
                  </div>
                </div>
                <div className="form-group">
                  <label>Announcement Body</label>
                  <textarea rows="3" value={annContent} onChange={(e) => setAnnContent(e.target.value)} required></textarea>
                </div>
                <button type="submit" className="btn btn-accent">Publish Announcement</button>
              </form>
            )}

            <div className="admin-data-list mt-2">
              {announcements.map(a => (
                <div key={a.id} className="admin-data-row">
                  <div className="admin-row-info">
                    <h4>{a.title} {a.isPinned && '📌'}</h4>
                    <p>{a.content}</p>
                    <span className="row-meta">Author: {a.author} | Published: {a.date} | Category: {a.category}</span>
                  </div>
                  <button onClick={() => deleteAnnouncement(a.id)} className="btn-icon-danger">🗑️ Remove</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: EVENTS */}
        {adminTab === 'events' && (
          <div>
            <div className="tab-actions-row">
              <h3>Department Event Calendars</h3>
              <button onClick={() => setShowForm(!showForm)} className="btn btn-primary btn-sm">
                {showForm ? 'Cancel Creation' : '➕ Create Event'}
              </button>
            </div>

            {showForm && (
              <form onSubmit={handleEvtSubmit} className="admin-action-form animate-fade-in">
                <div className="form-group">
                  <label>Event Name</label>
                  <input type="text" placeholder="Title" value={evtTitle} onChange={(e) => setEvtTitle(e.target.value)} required />
                </div>
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Event Location</label>
                    <input type="text" placeholder="Room/Aduitorium" value={evtLoc} onChange={(e) => setEvtLoc(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Scheduled Date</label>
                    <input type="date" value={evtDate} onChange={(e) => setEvtDate(e.target.value)} required />
                  </div>
                </div>
                <div className="form-row-3">
                  <div className="form-group">
                    <label>Time</label>
                    <input type="text" value={evtTime} onChange={(e) => setEvtTime(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Event Classification</label>
                    <select value={evtType} onChange={(e) => setEvtType(e.target.value)}>
                      <option value="workshop">Seminar / Workshop</option>
                      <option value="competition">Exhibition & Contest</option>
                      <option value="meeting">Departmental Meeting</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Hosting Org</label>
                    <input type="text" value={evtOrg} onChange={(e) => setEvtOrg(e.target.value)} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Event Description</label>
                  <textarea rows="3" value={evtDesc} onChange={(e) => setEvtDesc(e.target.value)} placeholder="Provide agenda..."></textarea>
                </div>
                <button type="submit" className="btn btn-accent">Publish Event</button>
              </form>
            )}

            <div className="admin-data-list mt-2">
              {events.map(e => (
                <div key={e.id} className="admin-data-row">
                  <div className="admin-row-info">
                    <h4>{e.title}</h4>
                    <p>{e.description}</p>
                    <span className="row-meta">Location: {e.location} | Date: {e.date} | Organizer: {e.organizer}</span>
                  </div>
                  <button onClick={() => deleteEvent(e.id)} className="btn-icon-danger">🗑️ Remove</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: DEADLINES */}
        {adminTab === 'deadlines' && (
          <div>
            <div className="tab-actions-row">
              <h3>Student Academic Deadlines</h3>
              <button onClick={() => setShowForm(!showForm)} className="btn btn-primary btn-sm">
                {showForm ? 'Cancel Creation' : '➕ Create Deadline'}
              </button>
            </div>

            {showForm && (
              <form onSubmit={handleDlSubmit} className="admin-action-form animate-fade-in">
                <div className="form-group">
                  <label>Deadline Subject Header</label>
                  <input type="text" placeholder="Title" value={dlTitle} onChange={(e) => setDlTitle(e.target.value)} required />
                </div>
                <div className="form-row-3">
                  <div className="form-group">
                    <label>Course Name</label>
                    <input type="text" value={dlCourse} onChange={(e) => setDlCourse(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Evaluation Type</label>
                    <select value={dlType} onChange={(e) => setDlType(e.target.value)}>
                      <option value="assignment">Assignment</option>
                      <option value="project">Project</option>
                      <option value="examination">Examination</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Due Date</label>
                    <input type="date" value={dlDate} onChange={(e) => setDlDate(e.target.value)} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Instructions Details</label>
                  <textarea rows="3" value={dlDesc} onChange={(e) => setDlDesc(e.target.value)} required></textarea>
                </div>
                <button type="submit" className="btn btn-accent">Publish Deadline</button>
              </form>
            )}

            <div className="admin-data-list mt-2">
              {deadlines.map(d => (
                <div key={d.id} className="admin-data-row">
                  <div className="admin-row-info">
                    <h4>{d.title}</h4>
                    <p>{d.description}</p>
                    <span className="row-meta">Subject: {d.course} | Due: {d.dueDate} | Type: {d.type}</span>
                  </div>
                  <button onClick={() => deleteDeadline(d.id)} className="btn-icon-danger">🗑️ Remove</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: USERS MANAGER */}
        {adminTab === 'users' && (
          <div>
            <div className="tab-actions-row">
              <h3>Member Registration & Role Permissions</h3>
            </div>
            
            <div className="users-table-container mt-2">
              <table className="admin-users-table">
                <thead>
                  <tr>
                    <th>Member Name</th>
                    <th>Email Address</th>
                    <th>Current Access Level</th>
                    <th>Edit Role Permission</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td className="user-table-name">
                        <div className="u-avatar-sm">{u.name.charAt(0)}</div>
                        <span>{u.name}</span>
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`badge ${
                          u.role === 'admin' ? 'badge-danger' : 
                          u.role === 'lecturer' ? 'badge-gold' : 'badge-blue'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <select 
                          value={u.role} 
                          onChange={(e) => updateUserRole(u.id, e.target.value)}
                          className="user-role-select"
                        >
                          <option value="student">Student</option>
                          <option value="lecturer">Lecturer</option>
                          <option value="admin">Administrator</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
