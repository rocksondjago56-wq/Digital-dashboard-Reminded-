import React, { useContext, useState } from 'react';
import { DbContext } from '../context/DbContextDefinition';
import './AdminDashboard.css';
import {
  openWhatsApp,
  formatAnnouncementForWhatsApp,
  formatDeadlineForWhatsApp,
  formatEventForWhatsApp,
  createClassGroupTitle
} from '../utils/whatsapp';

const CLASS_YEAR_OPTIONS = ['Year 1', 'Year 2', 'Year 3', 'Year 4'];

export default function AdminDashboard() {
  const {
    currentUser,
    users,
    deadlines,
    events,
    announcements,
    timetable,
    classGroups,
    addDeadline,
    deleteDeadline,
    addAnnouncement,
    deleteAnnouncement,
    addEvent,
    deleteEvent,
    addTimetableSlot,
    updateTimetableSlot,
    deleteTimetableSlot,
    saveClassWhatsAppGroup,
    deleteClassWhatsAppGroup,
    updateUserRole,
    provisionIdentity,
    deleteUser
  } = useContext(DbContext);

  const [adminTab, setAdminTab] = useState('announcements'); // announcements, events, deadlines, timetable, whatsapp, users

  // Form toggles
  const [showForm, setShowForm] = useState(false);
  const [editingTimetableId, setEditingTimetableId] = useState(null);

  // Forms Fields State
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annCategory, setAnnCategory] = useState('notice');
  const [annAuthor, setAnnAuthor] = useState(currentUser?.name || 'HOD Office');
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
  const [dlAttachment, setDlAttachment] = useState(null);
  const [attachmentError, setAttachmentError] = useState('');

  const [ttDay, setTtDay] = useState('Monday');
  const [ttTime, setTtTime] = useState('');
  const [ttCourse, setTtCourse] = useState('');
  const [ttRoom, setTtRoom] = useState('');
  const [ttYear, setTtYear] = useState('All Years');

  const [wgYear, setWgYear] = useState('Year 1');
  const [wgHeadName, setWgHeadName] = useState('');
  const [wgHeadPhone, setWgHeadPhone] = useState('');
  const [wgInviteLink, setWgInviteLink] = useState('');
  const [wgStatus, setWgStatus] = useState('');
  const [identityRole, setIdentityRole] = useState('student');
  const [identityName, setIdentityName] = useState('');
  const [identityIndex, setIdentityIndex] = useState('');
  const [identityStaffId, setIdentityStaffId] = useState('');
  const [identityYear, setIdentityYear] = useState('Year 1');
  const [identityCertificate, setIdentityCertificate] = useState('BTech');
  const [identityCourses, setIdentityCourses] = useState('');
  const [identityEmail, setIdentityEmail] = useState('');
  const [identityDesignation, setIdentityDesignation] = useState('Department Administrator');
  const [identityStatus, setIdentityStatus] = useState('');
  const [identityError, setIdentityError] = useState('');

  const handleProvisionIdentity = async (e) => {
    e.preventDefault();
    setIdentityStatus('');
    setIdentityError('');
    const result = await provisionIdentity({ name: identityName, role: identityRole, indexNumber: identityIndex, staffId: identityStaffId, email: identityEmail, designation: identityDesignation, year: identityYear, certificate: identityCertificate, courses: identityCourses });
    if (!result?.success) {
      setIdentityError(result?.message || 'Could not provision this identity.');
      return;
    }
    setIdentityStatus(`${result.user.email} provisioned.${result.developmentCode ? ` Development code: ${result.developmentCode}` : ''}`);
    setIdentityName('');
    setIdentityIndex('');
    setIdentityStaffId('');
    setIdentityCourses('');
    setIdentityEmail('');
  };

  // Submit handlers
  const handleAnnSubmit = (e) => {
    e.preventDefault();
    if (!annTitle || !annContent) return;
    addAnnouncement({
      title: annTitle,
      content: annContent,
      author: annAuthor || currentUser?.name || 'HOD Office',
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
      author: currentUser?.name || evtOrg || 'HOD Office',
      authorRole: 'admin'
    });
    setEvtTitle('');
    setEvtDesc('');
    setEvtLoc('');
    setEvtDate('');
    setShowForm(false);
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
      setAttachmentError('Please choose a document smaller than 5 MB.');
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

  const handleDlSubmit = (e) => {
    e.preventDefault();
    if (!dlTitle || !dlDesc || !dlDate) return;
    addDeadline({
      title: dlTitle,
      description: dlDesc,
      course: dlCourse,
      dueDate: dlDate,
      type: dlType,
      attachment: dlAttachment,
      author: currentUser?.name || 'Department Administration',
      authorRole: 'admin'
    });
    setDlTitle('');
    setDlDesc('');
    setDlDate('');
    setDlAttachment(null);
    setAttachmentError('');
    setShowForm(false);
  };

  const resetTimetableForm = () => {
    setTtDay('Monday');
    setTtTime('');
    setTtCourse('');
    setTtRoom('');
    setTtYear('All Years');
    setEditingTimetableId(null);
    setShowForm(false);
  };

  const handleTimetableSubmit = (e) => {
    e.preventDefault();
    if (!ttTime.trim() || !ttCourse.trim() || !ttRoom.trim()) return;

    const payload = {
      day: ttDay,
      time: ttTime.trim(),
      course: ttCourse.trim(),
      room: ttRoom.trim(),
      year: ttYear
    };

    if (editingTimetableId) {
      updateTimetableSlot(editingTimetableId, payload);
    } else {
      addTimetableSlot(payload);
    }

    resetTimetableForm();
  };

  const startTimetableEdit = (slot) => {
    setTtDay(slot.day || 'Monday');
    setTtTime(slot.time || '');
    setTtCourse(slot.course || '');
    setTtRoom(slot.room || '');
    setTtYear(slot.year || 'All Years');
    setEditingTimetableId(slot.id);
    setShowForm(true);
  };

  const resetWhatsAppGroupForm = () => {
    setWgYear('Year 1');
    setWgHeadName('');
    setWgHeadPhone('');
    setWgInviteLink('');
    setWgStatus('');
    setShowForm(false);
  };

  const handleWhatsAppGroupSubmit = (e) => {
    e.preventDefault();
    if (!wgHeadPhone.trim() || !wgInviteLink.trim() || !saveClassWhatsAppGroup) return;

    const savedGroup = saveClassWhatsAppGroup({
      year: wgYear,
      headName: wgHeadName.trim() || 'Class Head',
      headPhone: wgHeadPhone,
      inviteLink: wgInviteLink
    });

    setWgStatus(`${savedGroup.title} saved`);
    setTimeout(() => setWgStatus(''), 2500);
  };

  const startWhatsAppGroupEdit = (group) => {
    setWgYear(group.year || 'Year 1');
    setWgHeadName(group.headName || '');
    setWgHeadPhone(group.headPhone || '');
    setWgInviteLink(group.inviteLink || '');
    setShowForm(true);
  };

  const copyAdminGroupTitle = () => {
    navigator.clipboard.writeText(createClassGroupTitle(wgYear));
    setWgStatus('Class title copied');
    setTimeout(() => setWgStatus(''), 2500);
  };

  const openWhatsAppHome = () => {
    window.open('https://web.whatsapp.com/', '_blank', 'noopener,noreferrer');
  };

  const switchAdminTab = (tab) => {
    setAdminTab(tab);
    setShowForm(false);
    setEditingTimetableId(null);
  };

  const formatRoleLabel = (role) => {
    if (role === 'student_head') return 'student head';
    return role;
  };

  return (
    <div className="dashboard-content container animate-fade-in">
      
      {/* Admin Hero */}
      <header className="dashboard-hero glass-panel admin-hero">
        <div className="hero-text">
          <h1>{currentUser?.name || 'Department Administrator'}</h1>
          <p>Signed in as <strong>{currentUser?.name}</strong> ({currentUser?.designation || 'Administrator'}). Departmental control center for Graphic Design notices, academic deadlines, and course events.</p>
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
        <div className="metric-card glass-panel">
          <span className="metric-icon">TT</span>
          <div className="metric-details">
            <span className="metric-number">{timetable.length}</span>
            <span className="metric-label">Timetable Classes</span>
          </div>
        </div>
        <div className="metric-card glass-panel">
          <span className="metric-icon">WA</span>
          <div className="metric-details">
            <span className="metric-number">{(classGroups || []).length}</span>
            <span className="metric-label">Class WhatsApp</span>
          </div>
        </div>
      </div>

      {/* Admin Nav tabs */}
      <div className="admin-tab-nav mt-4">
        <button 
          className={`admin-nav-btn ${adminTab === 'announcements' ? 'active' : ''}`} 
          onClick={() => switchAdminTab('announcements')}
        >
          📢 Manage Announcements
        </button>
        <button 
          className={`admin-nav-btn ${adminTab === 'events' ? 'active' : ''}`} 
          onClick={() => switchAdminTab('events')}
        >
          📅 Manage Events
        </button>
        <button 
          className={`admin-nav-btn ${adminTab === 'deadlines' ? 'active' : ''}`} 
          onClick={() => switchAdminTab('deadlines')}
        >
          📝 Manage Deadlines
        </button>
        <button
          className={`admin-nav-btn ${adminTab === 'timetable' ? 'active' : ''}`}
          onClick={() => switchAdminTab('timetable')}
        >
          Manage Timetable
        </button>
        <button
          className={`admin-nav-btn ${adminTab === 'whatsapp' ? 'active' : ''}`}
          onClick={() => switchAdminTab('whatsapp')}
        >
          Manage WhatsApp Groups
        </button>
        <button 
          className={`admin-nav-btn ${adminTab === 'users' ? 'active' : ''}`} 
          onClick={() => switchAdminTab('users')}
        >
          👥 User Administration
        </button>
        <button
          className={`admin-nav-btn ${adminTab === 'identities' ? 'active' : ''}`}
          onClick={() => switchAdminTab('identities')}
        >
          Provision Identities
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
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => openWhatsApp({ text: formatAnnouncementForWhatsApp(a) })}
                      style={{
                        background: 'rgba(37, 211, 102, 0.12)',
                        border: '1px solid rgba(37, 211, 102, 0.35)',
                        color: '#16a34a',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Broadcast to WhatsApp"
                    >
                      📲 WhatsApp
                    </button>
                    <button onClick={() => deleteAnnouncement(a.id)} className="btn-icon-danger">🗑️ Remove</button>
                  </div>
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
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => openWhatsApp({ text: formatEventForWhatsApp(e) })}
                      style={{
                        background: 'rgba(37, 211, 102, 0.12)',
                        border: '1px solid rgba(37, 211, 102, 0.35)',
                        color: '#16a34a',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Broadcast to WhatsApp"
                    >
                      📲 WhatsApp
                    </button>
                    <button onClick={() => deleteEvent(e.id)} className="btn-icon-danger">🗑️ Remove</button>
                  </div>
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
                  <label>Instructions & Assignment Notes</label>
                  <textarea rows="3" value={dlDesc} onChange={(e) => setDlDesc(e.target.value)} placeholder="Provide assignment instructions, grading criteria, notes..." required></textarea>
                </div>
                <div className="form-group">
                  <label htmlFor="admin-dl-attachment">Assignment Document / Notes (PDF, DOCX, ZIP, Images)</label>
                  <input
                    type="file"
                    id="admin-dl-attachment"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.rtf,.zip,.png,.jpg,.jpeg"
                    onChange={handleDeadlineAttachment}
                  />
                  <small style={{ color: '#64748b', fontSize: '11px', display: 'block', marginTop: '4px' }}>
                    Attach assignment brief, lecture notes, or PDF specifications for students (Max 5 MB).
                  </small>
                  {dlAttachment && (
                    <p style={{ color: '#25D366', fontSize: '12px', marginTop: '6px', fontWeight: 600 }}>
                      📎 Attached: {dlAttachment.name} ({dlAttachment.size})
                    </p>
                  )}
                  {attachmentError && (
                    <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                      ⚠️ {attachmentError}
                    </p>
                  )}
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
                    {d.attachment?.dataUrl && (
                      <div style={{ marginTop: '6px' }}>
                        <a
                          href={d.attachment.dataUrl}
                          download={d.attachment.name}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'rgba(30, 64, 175, 0.15)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            color: '#2563eb',
                            fontSize: '12px',
                            fontWeight: 600,
                            textDecoration: 'none'
                          }}
                        >
                          📄 Attached Document: {d.attachment.name} 📥
                        </a>
                      </div>
                    )}
                    <span className="row-meta">Subject: {d.course} | Due: {d.dueDate} | Type: {d.type}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => openWhatsApp({ text: formatDeadlineForWhatsApp(d) })}
                      style={{
                        background: 'rgba(37, 211, 102, 0.12)',
                        border: '1px solid rgba(37, 211, 102, 0.35)',
                        color: '#16a34a',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Broadcast to WhatsApp"
                    >
                      📲 WhatsApp
                    </button>
                    <button onClick={() => deleteDeadline(d.id)} className="btn-icon-danger">🗑️ Remove</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: TIMETABLE MANAGER */}
        {adminTab === 'timetable' && (
          <div>
            <div className="tab-actions-row">
              <h3>Student Weekly Timetable</h3>
              <button
                onClick={() => {
                  if (showForm) {
                    resetTimetableForm();
                  } else {
                    setShowForm(true);
                  }
                }}
                className="btn btn-primary btn-sm"
              >
                {showForm ? 'Cancel' : 'Add Class'}
              </button>
            </div>

            {showForm && (
              <form onSubmit={handleTimetableSubmit} className="admin-action-form animate-fade-in">
                <div className="form-row-3">
                  <div className="form-group">
                    <label>Day</label>
                    <select value={ttDay} onChange={(e) => setTtDay(e.target.value)}>
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
                    <input type="text" placeholder="08:30 AM - 11:30 AM" value={ttTime} onChange={(e) => setTtTime(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Year Group</label>
                    <select value={ttYear} onChange={(e) => setTtYear(e.target.value)}>
                      <option value="All Years">All Years</option>
                      <option value="Year 1">Year 1</option>
                      <option value="Year 2">Year 2</option>
                      <option value="Year 3">Year 3</option>
                      <option value="Year 4">Year 4</option>
                    </select>
                  </div>
                </div>
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Course Name</label>
                    <input type="text" placeholder="Layout Design II" value={ttCourse} onChange={(e) => setTtCourse(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Room / Studio</label>
                    <input type="text" placeholder="Lab 3 (Mac Lab)" value={ttRoom} onChange={(e) => setTtRoom(e.target.value)} required />
                  </div>
                </div>
                <button type="submit" className="btn btn-accent">
                  {editingTimetableId ? 'Save Class Update' : 'Publish Class'}
                </button>
              </form>
            )}

            <div className="admin-data-list mt-2">
              {timetable.length === 0 ? (
                <div className="empty-state">
                  <p>No timetable classes have been published yet.</p>
                </div>
              ) : (
                timetable.map(slot => (
                  <div key={slot.id} className="admin-data-row admin-timetable-row">
                    <div className="admin-row-info">
                      <h4>{slot.course}</h4>
                      <p>{slot.day} | {slot.time}</p>
                      <span className="row-meta">Room: {slot.room} | Year: {slot.year || 'All Years'}</span>
                    </div>
                    <div className="admin-row-actions">
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => startTimetableEdit(slot)}>
                        Edit
                      </button>
                      <button type="button" onClick={() => deleteTimetableSlot(slot.id)} className="btn-icon-danger">
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 5: WHATSAPP GROUPS */}
        {adminTab === 'whatsapp' && (
          <div>
            <div className="tab-actions-row">
              <h3>Class Head WhatsApp Numbers</h3>
              <button
                onClick={() => {
                  if (showForm) {
                    resetWhatsAppGroupForm();
                  } else {
                    setShowForm(true);
                  }
                }}
                className="btn btn-primary btn-sm"
              >
                {showForm ? 'Cancel' : 'Add Class Number'}
              </button>
            </div>

            {showForm && (
              <form onSubmit={handleWhatsAppGroupSubmit} className="admin-action-form animate-fade-in">
                <div className="admin-generated-title">
                  <span>Auto class title</span>
                  <strong>{createClassGroupTitle(wgYear)}</strong>
                </div>
                <div className="admin-whatsapp-actions">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={copyAdminGroupTitle}>
                    Copy Title
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={openWhatsAppHome}>
                    Open WhatsApp
                  </button>
                </div>
                <div className="form-row-3">
                  <div className="form-group">
                    <label>Class / Year</label>
                    <select value={wgYear} onChange={(e) => setWgYear(e.target.value)}>
                      {CLASS_YEAR_OPTIONS.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Class Head Name</label>
                    <input
                      type="text"
                      value={wgHeadName}
                      onChange={(e) => setWgHeadName(e.target.value)}
                      placeholder="Class Representative"
                    />
                  </div>
                  <div className="form-group">
                    <label>Class Head WhatsApp Number</label>
                    <input
                      type="tel"
                      value={wgHeadPhone}
                      onChange={(e) => setWgHeadPhone(e.target.value)}
                      placeholder="233241234567"
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>WhatsApp Group Invite Link</label>
                  <input
                    type="url"
                    value={wgInviteLink}
                    onChange={(e) => setWgInviteLink(e.target.value)}
                    placeholder="https://chat.whatsapp.com/..."
                    required
                  />
                </div>
                <button type="submit" className="btn btn-accent">Save Group Link</button>
                {wgStatus && <p className="admin-form-status">{wgStatus}</p>}
              </form>
            )}

            <div className="admin-data-list mt-2">
              {(classGroups || []).length === 0 ? (
                <div className="empty-state">
                  <p>No class WhatsApp numbers have been saved yet.</p>
                </div>
              ) : (
                classGroups.map(group => (
                  <div key={group.id} className="admin-data-row">
                    <div className="admin-row-info">
                      <h4>{group.title}</h4>
                      <p>Class Head: {group.headName || 'Class Head'}</p>
                      <span className="row-meta">
                        Year: {group.year} | WhatsApp: +{group.headPhone || 'Not set'} {group.inviteLink ? '| Invite link added' : ''}
                      </span>
                    </div>
                    <div className="admin-row-actions">
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => startWhatsAppGroupEdit(group)}>
                        Edit
                      </button>
                      <button type="button" onClick={() => deleteClassWhatsAppGroup(group.id)} className="btn-icon-danger">
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 6: USERS MANAGER */}
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
                    <th>Actions</th>
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
                          u.role === 'lecturer' ? 'badge-gold' :
                          u.role === 'student_head' ? 'badge-success' : 'badge-blue'
                        }`}>
                          {formatRoleLabel(u.role)}
                        </span>
                      </td>
                      <td>
                        <select 
                          value={u.role} 
                          onChange={(e) => updateUserRole(u.id, e.target.value)}
                          className="user-role-select"
                        >
                          <option value="student">Student</option>
                          <option value="student_head">Student Head</option>
                          <option value="lecturer">Lecturer</option>
                          <option value="admin">Administrator</option>
                        </select>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => {
                            const isSelf = u.id === currentUser?.id;
                            const promptMsg = isSelf
                              ? "You are about to delete your OWN administrator account! Are you sure? You will be signed out immediately."
                              : `Are you sure you want to delete the account for ${u.name} (${u.email})? This action cannot be undone.`;
                            if (window.confirm(promptMsg)) {
                              deleteUser(u.id);
                            }
                          }}
                          className="btn-icon-danger btn-sm"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', borderRadius: '6px' }}
                        >
                          Delete Account
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {adminTab === 'identities' && (
          <div>
            <div className="tab-actions-row"><h3>Student and Lecturer Identity Provisioning</h3></div>
            <form onSubmit={handleProvisionIdentity} className="admin-action-form identity-form">
              <div className="form-row-2">
                <div className="form-group">
                  <label>Identity Type</label>
                  <select value={identityRole} onChange={(e) => setIdentityRole(e.target.value)}>
                    <option value="student">Student</option><option value="lecturer">Lecturer</option><option value="admin">Department Administrator</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Full Name</label>
                  <input value={identityName} onChange={(e) => setIdentityName(e.target.value)} placeholder="Full legal name" required />
                </div>
              </div>
              {identityRole === 'student' ? (
                <>
                  <div className="form-row-3">
                    <div className="form-group"><label>Approved Index Number</label><input value={identityIndex} onChange={(e) => setIdentityIndex(e.target.value)} placeholder="0420210088" required /></div>
                    <div className="form-group"><label>Certificate</label><select value={identityCertificate} onChange={(e) => setIdentityCertificate(e.target.value)}><option value="BTech">BTech</option><option value="HND">HND</option><option value="Diploma">Diploma</option></select></div>
                    <div className="form-group"><label>Class / Year</label><select value={identityYear} onChange={(e) => setIdentityYear(e.target.value)}>{CLASS_YEAR_OPTIONS.map(year => <option key={year} value={year}>{year}</option>)}</select></div>
                  </div>
                  <p className="identity-help">The system creates the TTU email as indexnumber@ttu.edu.gh and sends an activation code.</p>
                </>
              ) : identityRole === 'lecturer' ? (
                <>
                  <div className="form-row-2">
                    <div className="form-group"><label>Lecturer ID</label><input value={identityStaffId} onChange={(e) => setIdentityStaffId(e.target.value)} placeholder="LEC-0492" required /></div>
                    <div className="form-group"><label>Courses Taught</label><input value={identityCourses} onChange={(e) => setIdentityCourses(e.target.value)} placeholder="Course one, Course two" required /></div>
                  </div>
                  <p className="identity-help">The system creates the TTU email from the lecturer ID and sends an activation code.</p>
                </>
              ) : (
                <>
                  <div className="form-row-2">
                    <div className="form-group"><label>Administrator Staff ID</label><input value={identityStaffId} onChange={(e) => setIdentityStaffId(e.target.value)} placeholder="ADM-1001" required /></div>
                    <div className="form-group"><label>School Email for Verification</label><input type="email" value={identityEmail} onChange={(e) => setIdentityEmail(e.target.value)} placeholder="name@ttu.edu.gh" required /></div>
                  </div>
                  <div className="form-group"><label>Administrative Designation</label><input value={identityDesignation} onChange={(e) => setIdentityDesignation(e.target.value)} placeholder="Department Administrator" required /></div>
                  <p className="identity-help">The verification code is sent to the administrator email entered here. Activation then automatically grants administrator access.</p>
                </>
              )}
              <button type="submit" className="btn btn-primary">Provision Identity and Send Code</button>
              {identityStatus && <p className="admin-form-status">{identityStatus}</p>}
              {identityError && <p className="identity-error">{identityError}</p>}
            </form>
            <div className="admin-data-list mt-2">
              {users.map(user => (
                <div key={user.id} className="admin-data-row">
                  <div className="admin-row-info"><h4>{user.name}</h4><p>{user.email}</p><span className="row-meta">{user.role} | {user.studentId || user.staffId || 'No institutional ID'} {user.year ? `| ${user.certificate || 'BTech'} ${user.year}` : ''}</span></div>
                  <span className={`badge ${user.isVerified === false ? 'badge-gold' : 'badge-success'}`}>{user.isVerified === false ? 'awaiting verification' : 'verified'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
