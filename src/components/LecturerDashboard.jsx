import React, { useContext, useState } from 'react';
import { DbContext } from '../context/DbContextDefinition';
import './LecturerDashboard.css';
import {
  openWhatsApp,
  formatAnnouncementForWhatsApp,
  formatDeadlineForWhatsApp
} from '../utils/whatsapp';

const CERTIFICATE_OPTIONS = ['BTech', 'HND', 'Diploma'];
const YEAR_OPTIONS = ['Year 1', 'Year 2', 'Year 3', 'Year 4'];

const asCourseList = (courses) => {
  if (Array.isArray(courses)) return courses.filter(Boolean);
  if (typeof courses === 'string') return courses.split(',').map(course => course.trim()).filter(Boolean);
  return [];
};

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
  const lecturerCourses = asCourseList(currentUser?.courses);
  const availableCourses = lecturerCourses.length ? lecturerCourses : ['General Graphic Design'];
  const [dlTitle, setDlTitle] = useState('');
  const [dlDesc, setDlDesc] = useState('');
  const [dlCourse, setDlCourse] = useState(availableCourses[0]);
  const [dlCertificate, setDlCertificate] = useState('BTech');
  const [dlYear, setDlYear] = useState('Year 1');
  const [dlDate, setDlDate] = useState('');
  const [dlType, setDlType] = useState('assignment');
  const [dlAttachment, setDlAttachment] = useState(null);
  const [attachmentError, setAttachmentError] = useState('');
  const [publishStatus, setPublishStatus] = useState('');
  const [publishError, setPublishError] = useState('');

  // Announcement Fields
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annCategory, setAnnCategory] = useState('notice');
  const [annPinned, setAnnPinned] = useState(false);
  const [annCertificate, setAnnCertificate] = useState('All Certificates');
  const [annYear, setAnnYear] = useState('All Years');

  const handleCreateDeadline = async (e) => {
    e.preventDefault();
    if (!dlTitle || !dlDesc || !dlDate) return;

    setPublishStatus('');
    setPublishError('');

    const result = await addDeadline({
      title: dlTitle,
      description: dlDesc,
      course: dlCourse,
      certificate: dlCertificate,
      year: dlYear,
      dueDate: dlDate,
      type: dlType,
      attachment: dlAttachment,
      author: currentUser.name,
      authorRole: 'lecturer'
    });

    if (result?.success === false) {
      setPublishError(result.message || 'Your deadline could not be published.');
      return;
    }

    // Reset Form
    setDlTitle('');
    setDlDesc('');
    setDlDate('');
    setDlCertificate('BTech');
    setDlYear('Year 1');
    setDlAttachment(null);
    setAttachmentError('');
    setPublishStatus('Deadline published. It is now listed below for the selected class.');
    setShowDeadlineForm(false);
  };

  const handleDeadlineAttachment = (e) => {
    const file = e.target.files?.[0];
    setAttachmentError('');

    if (!file) {
      setDlAttachment(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setDlAttachment(null);
      setAttachmentError('Please choose a file smaller than 5 MB.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setDlAttachment({
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: (file.size / 1024).toFixed(1) + ' KB',
        dataUrl: reader.result
      });
    };
    reader.readAsDataURL(file);
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!annTitle || !annContent) return;

    setPublishStatus('');
    setPublishError('');

    const result = await addAnnouncement({
      title: annTitle,
      content: annContent,
      author: currentUser.name,
      authorRole: 'lecturer',
      category: annCategory,
      isPinned: annPinned,
      certificate: annCertificate,
      year: annYear
    });

    if (result?.success === false) {
      setPublishError(result.message || 'Your announcement could not be published.');
      return;
    }

    // Reset Form
    setAnnTitle('');
    setAnnContent('');
    setAnnPinned(false);
    setAnnCertificate('All Certificates');
    setAnnYear('All Years');
    setPublishStatus('Announcement published. It is now listed in Your Posted Bulletins.');
    setShowAnnounceForm(false);
  };

  // Include posts authored by this lecturer even if their course list later changes.
  const filteredDeadlines = deadlines.filter(d => (
    d.authorId === currentUser.id || d.author === currentUser.name || lecturerCourses.includes(d.course)
  ));

  // Filter announcements posted by this lecturer
  const filteredAnnouncements = announcements.filter(a => a.authorId === currentUser.id || a.author === currentUser.name);

  return (
    <div className="dashboard-content container animate-fade-in">
      {/* Lecturer Portal Hero */}
      <header className="dashboard-hero glass-panel lecturer-hero">
        <div className="hero-text">
          <h1>{currentUser?.name || 'Lecturer Dashboard'}</h1>
          <p>Signed in as <strong>{currentUser.name}</strong>. Manage course deadlines, upload assignment briefs, and publish notices for your students.</p>
          <div className="lecturer-courses-pills mt-2">
            {availableCourses.map((c, i) => (
              <span key={i} className="course-pill">📘 {c}</span>
            ))}
          </div>
        </div>
        <div className="hero-actions">
          <button onClick={() => setShowDeadlineForm(!showDeadlineForm)} className="btn btn-primary">
            {showDeadlineForm ? 'Close Deadline Form' : 'Upload Course Deadline'}
          </button>
          <button onClick={() => setShowAnnounceForm(!showAnnounceForm)} className="btn btn-accent">
            {showAnnounceForm ? 'Close Portal' : '📢 Post Notice'}
          </button>
        </div>
      </header>

      {publishStatus && <p className="publish-feedback publish-success" role="status">{publishStatus}</p>}
      {publishError && <p className="publish-feedback publish-error" role="alert">{publishError}</p>}

      {/* Forms Drawer */}
      <div className="lecturer-forms-row mt-2">
        {showDeadlineForm && (
          <div className="glass-panel form-card animate-fade-in">
            <h2>Upload Course Deadline & Assignment Brief</h2>
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
                    {availableCourses.map((c, i) => (
                      <option key={i} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Certificate Programme</label>
                  <select value={dlCertificate} onChange={(e) => setDlCertificate(e.target.value)}>
                    {CERTIFICATE_OPTIONS.map(certificate => (
                      <option key={certificate} value={certificate}>{certificate}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label>Class / Year Group</label>
                  <select value={dlYear} onChange={(e) => setDlYear(e.target.value)}>
                    {YEAR_OPTIONS.map(year => <option key={year} value={year}>{year}</option>)}
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
                <label>Submission Instructions / Brief Notes</label>
                <textarea 
                  rows="3" 
                  placeholder="Provide submission specifications, required software, format instructions..."
                  value={dlDesc} 
                  onChange={(e) => setDlDesc(e.target.value)} 
                  required
                ></textarea>
              </div>
              <div className="form-group">
                <label htmlFor="deadline-attachment">Upload Assignment Document / Notes (PDF, DOCX, ZIP, Images)</label>
                <input
                  id="deadline-attachment"
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.rtf,.zip,.png,.jpg,.jpeg"
                  onChange={handleDeadlineAttachment}
                />
                <small className="form-help-text">
                  Students will be able to view and download this assignment document / brief (Max: 5 MB).
                </small>
                {dlAttachment && (
                  <p className="attachment-selected" style={{ color: '#25D366', fontWeight: 600, marginTop: '6px' }}>
                    📎 Attached: {dlAttachment.name} ({dlAttachment.size})
                  </p>
                )}
                {attachmentError && <p className="form-error-text" style={{ color: '#ef4444' }}>⚠️ {attachmentError}</p>}
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
              <div className="form-row-2">
                <div className="form-group">
                  <label>Certificate Programme</label>
                  <select value={annCertificate} onChange={(e) => setAnnCertificate(e.target.value)}>
                    <option value="All Certificates">All Certificates</option>
                    {CERTIFICATE_OPTIONS.map(certificate => <option key={certificate} value={certificate}>{certificate}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Class / Year Group</label>
                  <select value={annYear} onChange={(e) => setAnnYear(e.target.value)}>
                    <option value="All Years">All Years</option>
                    {YEAR_OPTIONS.map(year => <option key={year} value={year}>{year}</option>)}
                  </select>
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
                        <span className="target-pill">{d.certificate || 'All Certificates'}</span>
                        <span className="target-pill">{d.year || 'All Years'}</span>
                      </div>
                      <h3>{d.title}</h3>
                      <p>{d.description}</p>
                      {d.attachment?.dataUrl && (
                        <div style={{ marginTop: '8px' }}>
                          <a
                            href={d.attachment.dataUrl}
                            download={d.attachment.name}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: 'rgba(37, 99, 235, 0.12)',
                              border: '1px solid rgba(37, 99, 235, 0.3)',
                              color: '#2563eb',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              textDecoration: 'none'
                            }}
                          >
                            📄 Uploaded Brief: {d.attachment.name} 📥
                          </a>
                        </div>
                      )}
                      <div className="date-info mt-2">
                        <span>📅 Due: <strong>{d.dueDate}</strong></span>
                      </div>
                    </div>
                    <div className="item-card-actions" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => openWhatsApp({ text: formatDeadlineForWhatsApp(d) })}
                        style={{
                          background: 'rgba(37, 211, 102, 0.12)',
                          border: '1px solid rgba(37, 211, 102, 0.35)',
                          color: '#16a34a',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="Broadcast deadline directly to student class WhatsApp group"
                      >
                        📲 WhatsApp Blast
                      </button>
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
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => openWhatsApp({ text: formatAnnouncementForWhatsApp(a) })}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#25D366',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                          title="Share to WhatsApp"
                        >
                          📲 Share
                        </button>
                        <button onClick={() => deleteAnnouncement(a.id)} className="btn-text-danger">🗑️ Remove</button>
                      </div>
                    </div>
                    <h3>{a.title} {a.isPinned && '📌'}</h3>
                    <div className="announcement-target">{a.certificate || 'All Certificates'} - {a.year || 'All Years'}</div>
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
