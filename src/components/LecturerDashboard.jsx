import React, { useContext, useState } from 'react';
import { DbContext } from '../context/DbContextDefinition';
import './LecturerDashboard.css';

export default function LecturerDashboard() {
  const { 
    currentUser, 
    deadlines, 
    announcements, 
    events,
    addDeadline, 
    deleteDeadline, 
    addAnnouncement, 
    deleteAnnouncement 
  } = useContext(DbContext);

  // Forms State
  const [showDeadlineForm, setShowDeadlineForm] = useState(false);
  const [showAnnounceForm, setShowAnnounceForm] = useState(false);

  // Deadline Fields
  const [dlTitle, setDlTitle] = useState('');
  const [dlDesc, setDlDesc] = useState('');
  const [dlCourse, setDlCourse] = useState(currentUser.courses?.[0] || 'General Graphic Design');
  const [dlDate, setDlDate] = useState('');
  const [dlType, setDlType] = useState('assignment');

  // Announcement Fields
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annCategory, setAnnCategory] = useState('notice');
  const [annPinned, setAnnPinned] = useState(false);

  const handleCreateDeadline = (e) => {
    e.preventDefault();
    if (!dlTitle || !dlDesc || !dlDate) return;

    addDeadline({
      title: dlTitle,
      description: dlDesc,
      course: dlCourse,
      dueDate: dlDate,
      type: dlType,
      author: currentUser.name,
      authorRole: 'lecturer'
    });

    // Reset Form
    setDlTitle('');
    setDlDesc('');
    setDlDate('');
    setShowDeadlineForm(false);
  };

  const handleCreateAnnouncement = (e) => {
    e.preventDefault();
    if (!annTitle || !annContent) return;

    addAnnouncement({
      title: annTitle,
      content: annContent,
      author: currentUser.name,
      authorRole: 'lecturer',
      category: annCategory,
      isPinned: annPinned
    });

    // Reset Form
    setAnnTitle('');
    setAnnContent('');
    setAnnPinned(false);
    setShowAnnounceForm(false);
  };

  // Filter deadlines belonging to the lecturer's courses
  const lecturerCourses = currentUser.courses || [];
  const filteredDeadlines = deadlines.filter(d => lecturerCourses.includes(d.course));

  // Filter announcements posted by this lecturer
  const filteredAnnouncements = announcements.filter(a => a.author === currentUser.name);

  return (
    <div className="dashboard-content container animate-fade-in">
      {/* Lecturer Portal Hero */}
      <header className="dashboard-hero glass-panel lecturer-hero">
        <div className="hero-text">
          <h1>Lecturer Console</h1>
          <p>Logged in as <strong>{currentUser.name}</strong>. Manage deadlines, assignments, and bulletins for your design courses.</p>
          <div className="lecturer-courses-pills mt-2">
            {lecturerCourses.map((c, i) => (
              <span key={i} className="course-pill">📘 {c}</span>
            ))}
          </div>
        </div>
        <div className="hero-actions">
          <button onClick={() => setShowDeadlineForm(!showDeadlineForm)} className="btn btn-primary">
            {showDeadlineForm ? 'Close Portal' : '➕ Create Deadline'}
          </button>
          <button onClick={() => setShowAnnounceForm(!showAnnounceForm)} className="btn btn-accent">
            {showAnnounceForm ? 'Close Portal' : '📢 Post Notice'}
          </button>
        </div>
      </header>

      {/* Forms Drawer */}
      <div className="lecturer-forms-row mt-2">
        {showDeadlineForm && (
          <div className="glass-panel form-card animate-fade-in">
            <h2>Add New Academic Deadline</h2>
            <form onSubmit={handleCreateDeadline} className="dashboard-form">
              <div className="form-group">
                <label>Assignment / Exam Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. InDesign Portfolio Layout"
                  value={dlTitle} 
                  onChange={(e) => setDlTitle(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label>Course Subject</label>
                  <select value={dlCourse} onChange={(e) => setDlCourse(e.target.value)}>
                    {lecturerCourses.map((c, i) => (
                      <option key={i} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Evaluation Type</label>
                  <select value={dlType} onChange={(e) => setDlType(e.target.value)}>
                    <option value="assignment">Assignment Submission</option>
                    <option value="project">Project Milestone</option>
                    <option value="examination">Examination Schedule</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Due Date</label>
                <input 
                  type="date" 
                  value={dlDate} 
                  onChange={(e) => setDlDate(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Submission Instructions / Brief</label>
                <textarea 
                  rows="3" 
                  placeholder="Provide submission specifications, PDF requirements, file size bounds..."
                  value={dlDesc} 
                  onChange={(e) => setDlDesc(e.target.value)} 
                  required
                ></textarea>
              </div>
              <div className="form-button-group">
                <button type="submit" className="btn btn-primary">Publish to Students</button>
                <button type="button" onClick={() => setShowDeadlineForm(false)} className="btn btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {showAnnounceForm && (
          <div className="glass-panel form-card animate-fade-in">
            <h2>Publish Department Announcement</h2>
            <form onSubmit={handleCreateAnnouncement} className="dashboard-form">
              <div className="form-group">
                <label>Announcement Heading</label>
                <input 
                  type="text" 
                  placeholder="e.g. Studio Lab 3 Hardware Maintenance"
                  value={annTitle} 
                  onChange={(e) => setAnnTitle(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label>Notice Category</label>
                  <select value={annCategory} onChange={(e) => setAnnCategory(e.target.value)}>
                    <option value="notice">General Notice</option>
                    <option value="update">Academic Update</option>
                    <option value="calendar">Academic Calendar Alert</option>
                  </select>
                </div>
                <div className="form-group checkbox-form-group">
                  <input 
                    type="checkbox" 
                    id="pin-ann" 
                    checked={annPinned} 
                    onChange={(e) => setAnnPinned(e.target.checked)} 
                  />
                  <label htmlFor="pin-ann" className="inline-label">📌 Pin Notice to Top</label>
                </div>
              </div>
              <div className="form-group">
                <label>Notice Content</label>
                <textarea 
                  rows="4" 
                  placeholder="Detail your message to students here..."
                  value={annContent} 
                  onChange={(e) => setAnnContent(e.target.value)} 
                  required
                ></textarea>
              </div>
              <div className="form-button-group">
                <button type="submit" className="btn btn-accent">Publish Announcement</button>
                <button type="button" onClick={() => setShowAnnounceForm(false)} className="btn btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid-main-sidebar mt-4">
        
        {/* Main: Lecturer Deadlines */}
        <main className="dashboard-main-area">
          <section className="glass-panel dashboard-section">
            <div className="section-header-simple">
              <h2>Your Assigned Course Deadlines</h2>
              <span className="count-tag">{filteredDeadlines.length} Published</span>
            </div>

            <div className="lecturer-deadlines-list">
              {filteredDeadlines.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📂</span>
                  <p>You have not published any deadlines. Use "Create Deadline" button to add one.</p>
                </div>
              ) : (
                filteredDeadlines.map(d => (
                  <div key={d.id} className="lecturer-item-card">
                    <div className="item-card-body">
                      <div className="item-meta">
                        <span className="course-name">{d.course}</span>
                        <span className={`badge ${
                          d.type === 'assignment' ? 'badge-blue' :
                          d.type === 'project' ? 'badge-gold' : 'badge-danger'
                        }`}>
                          {d.type}
                        </span>
                      </div>
                      <h3>{d.title}</h3>
                      <p>{d.description}</p>
                      <div className="date-info mt-2">
                        <span>📅 Due: <strong>{d.dueDate}</strong></span>
                      </div>
                    </div>
                    <div className="item-card-actions">
                      <button 
                        onClick={() => deleteDeadline(d.id)} 
                        className="btn-icon-danger"
                        title="Delete Deadline"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </main>

        {/* Sidebar: Lecturer Announcements & Events */}
        <aside className="dashboard-sidebar-area">
          
          {/* Announcements posted by Lecturer */}
          <section className="glass-panel sidebar-section mb-4">
            <h2>Your Posted Bulletins</h2>
            <div className="lecturer-announcements-list">
              {filteredAnnouncements.length === 0 ? (
                <p className="empty-sidebar-text">No announcements posted by you.</p>
              ) : (
                filteredAnnouncements.map(a => (
                  <div key={a.id} className="lecturer-ann-card">
                    <div className="ann-card-header">
                      <span className="ann-date">{a.date}</span>
                      <button onClick={() => deleteAnnouncement(a.id)} className="btn-text-danger">🗑️ Remove</button>
                    </div>
                    <h3>{a.title} {a.isPinned && '📌'}</h3>
                    <p>{a.content}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Department Calendar Highlights */}
          <section className="glass-panel sidebar-section">
            <h2>Academic Events</h2>
            <div className="events-vertical-list">
              {events.slice(0, 3).map(e => (
                <div key={e.id} className="event-sidebar-card">
                  <div className="event-date-block">
                    <span className="event-day-num">{e.date.split('-')[2]}</span>
                    <span className="event-month">{new Date(e.date).toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</span>
                  </div>
                  <div className="event-detail-block">
                    <h3>{e.title}</h3>
                    <p className="event-location">📍 {e.location}</p>
                    <span className="event-time">{e.time}</span>
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
