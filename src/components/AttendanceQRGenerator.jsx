import React, { useState, useEffect, useRef, useContext } from 'react';
import { DbContext } from '../context/DbContextDefinition';
import './AttendanceQRGenerator.css';

// ─── QR Code generation via qrcode library ──────────────────────────────────
async function generateQRDataUrl(text) {
  const QRCode = (await import('qrcode')).default;
  return QRCode.toDataURL(text, {
    width: 320,
    margin: 2,
    color: { dark: '#0f172a', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });
}

// ─── Session helpers ─────────────────────────────────────────────────────────
const ATTENDANCE_SESSIONS_KEY = 'ttu_attendance_sessions';
const ATTENDANCE_RECORDS_KEY  = 'ttu_attendance_records';

function buildSessionToken(session) {
  // Encode the session as a compact base64 URL param
  return btoa(JSON.stringify(session));
}

function loadSessions() {
  try { return JSON.parse(localStorage.getItem(ATTENDANCE_SESSIONS_KEY) || '[]'); }
  catch { return []; }
}

function saveSessions(sessions) {
  localStorage.setItem(ATTENDANCE_SESSIONS_KEY, JSON.stringify(sessions));
}

function loadRecords() {
  try { return JSON.parse(localStorage.getItem(ATTENDANCE_RECORDS_KEY) || '[]'); }
  catch { return []; }
}

// ─── Time-window options ─────────────────────────────────────────────────────
const WINDOWS = [
  { label: '5 min',  minutes: 5  },
  { label: '10 min', minutes: 10 },
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '1 hr',   minutes: 60 },
];

export default function AttendanceQRGenerator() {
  const { currentUser } = useContext(DbContext);
  const lecturerCourses = Array.isArray(currentUser?.courses)
    ? currentUser.courses
    : (typeof currentUser?.courses === 'string'
        ? currentUser.courses.split(',').map(c => c.trim()).filter(Boolean)
        : ['General Graphic Design']);

  // Form state
  const [course, setCourse]         = useState(lecturerCourses[0] || 'General Graphic Design');
  const [sessionTitle, setTitle]    = useState('');
  const [windowIdx, setWindowIdx]   = useState(1); // default 10 min
  const [venue, setVenue]           = useState('');

  // Session state
  const [activeSession, setActiveSession]   = useState(null);
  const [qrDataUrl, setQrDataUrl]           = useState('');
  const [qrLoading, setQrLoading]           = useState(false);
  const [timeLeft, setTimeLeft]             = useState(0);
  const [records, setRecords]               = useState([]);
  const [pastSessions, setPastSessions]     = useState([]);
  const [activeTab, setActiveTab]           = useState('generate'); // 'generate' | 'history'

  const timerRef = useRef(null);

  // ── Load past sessions on mount ─────────────────────────────────────────
  useEffect(() => {
    const all = loadSessions().filter(s => s.createdBy === currentUser?.id);
    setPastSessions(all.slice().reverse());
  }, [currentUser?.id]);

  // ── Countdown tick ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeSession) return;
    timerRef.current = setInterval(() => {
      const secs = Math.max(0, Math.floor((new Date(activeSession.expiresAt) - Date.now()) / 1000));
      setTimeLeft(secs);
      // Refresh attendance records every tick
      const all = loadRecords().filter(r => r.sessionId === activeSession.sessionId);
      setRecords(all);
      if (secs === 0) {
        clearInterval(timerRef.current);
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [activeSession]);

  // ── Generate QR ──────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!sessionTitle.trim()) return;
    setQrLoading(true);

    const sessionId   = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const generatedAt = new Date().toISOString();
    const expiresAt   = new Date(Date.now() + WINDOWS[windowIdx].minutes * 60 * 1000).toISOString();

    const session = {
      sessionId,
      course,
      sessionTitle: sessionTitle.trim(),
      venue: venue.trim(),
      lecturerId:   currentUser?.id,
      lecturerName: currentUser?.name,
      generatedAt,
      expiresAt,
      windowMinutes: WINDOWS[windowIdx].minutes,
      createdBy: currentUser?.id,
    };

    // Persist session
    const all = loadSessions();
    all.push(session);
    saveSessions(all);
    setPastSessions(prev => [session, ...prev]);

    // Build QR payload — encode everything students need to verify
    const token   = buildSessionToken(session);
    const payload = `TTU_ATTEND:${token}`;
    const url     = await generateQRDataUrl(payload);

    setQrDataUrl(url);
    setActiveSession(session);
    setTimeLeft(WINDOWS[windowIdx].minutes * 60);
    setRecords([]);
    setQrLoading(false);
  };

  // ── End session early ────────────────────────────────────────────────────
  const handleEndSession = () => {
    clearInterval(timerRef.current);
    setActiveSession(null);
    setQrDataUrl('');
    setTimeLeft(0);
  };

  // ── Format countdown ─────────────────────────────────────────────────────
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isExpired = activeSession && timeLeft === 0;
  const progressPct = activeSession
    ? Math.round((timeLeft / (WINDOWS[windowIdx].minutes * 60)) * 100)
    : 100;

  return (
    <div className="att-gen-root">
      {/* Tabs */}
      <div className="att-tabs">
        <button className={`att-tab ${activeTab === 'generate' ? 'active' : ''}`} onClick={() => setActiveTab('generate')}>
          📲 Generate QR
        </button>
        <button className={`att-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          📋 Session History {pastSessions.length > 0 && <span className="att-tab-badge">{pastSessions.length}</span>}
        </button>
      </div>

      {/* ── TAB: Generate ─────────────────────────────────────────────── */}
      {activeTab === 'generate' && (
        <div className="att-gen-panel">
          {!activeSession ? (
            /* Setup Form */
            <div className="att-setup-form glass-panel">
              <div className="att-form-header">
                <span className="att-form-icon">📲</span>
                <div>
                  <h3>Start Attendance Session</h3>
                  <p>Generate a QR code for students to scan and check in for this class.</p>
                </div>
              </div>

              <div className="att-form-grid">
                <div className="att-form-group">
                  <label>Course</label>
                  <select value={course} onChange={e => setCourse(e.target.value)}>
                    {lecturerCourses.map((c, i) => <option key={i} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="att-form-group">
                  <label>Session / Lecture Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Week 5 – Typography Grid Systems"
                    value={sessionTitle}
                    onChange={e => setTitle(e.target.value)}
                    maxLength={80}
                  />
                </div>

                <div className="att-form-group">
                  <label>Venue / Room</label>
                  <input
                    type="text"
                    placeholder="e.g. Mac Lab 3, Studio B..."
                    value={venue}
                    onChange={e => setVenue(e.target.value)}
                    maxLength={60}
                  />
                </div>

                <div className="att-form-group">
                  <label>QR Valid For</label>
                  <div className="att-window-chips">
                    {WINDOWS.map((w, i) => (
                      <button
                        key={i}
                        className={`att-chip ${windowIdx === i ? 'selected' : ''}`}
                        onClick={() => setWindowIdx(i)}
                        type="button"
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                className="btn btn-primary att-generate-btn"
                onClick={handleGenerate}
                disabled={!sessionTitle.trim() || qrLoading}
              >
                {qrLoading ? '⏳ Generating...' : '🔳 Generate QR Code'}
              </button>
            </div>
          ) : (
            /* Active Session Display */
            <div className="att-active-session">
              <div className="att-session-split">

                {/* Left — QR Code */}
                <div className="att-qr-panel glass-panel">
                  <div className="att-qr-header">
                    <span className={`att-status-dot ${isExpired ? 'expired' : 'live'}`}></span>
                    <span className="att-status-text">{isExpired ? 'Session Expired' : 'LIVE — Scanning Active'}</span>
                  </div>

                  {qrDataUrl && (
                    <img
                      src={qrDataUrl}
                      alt="Attendance QR Code"
                      className={`att-qr-img ${isExpired ? 'qr-expired' : ''}`}
                    />
                  )}

                  {/* Countdown ring */}
                  <div className="att-countdown-wrap">
                    <div className="att-countdown-ring" style={{ '--pct': `${progressPct}%` }}>
                      <span className="att-countdown-time">{isExpired ? 'ENDED' : formatTime(timeLeft)}</span>
                    </div>
                  </div>

                  <div className="att-session-meta">
                    <span className="att-meta-course">📘 {activeSession.course}</span>
                    <span className="att-meta-title">"{activeSession.sessionTitle}"</span>
                    {activeSession.venue && <span className="att-meta-venue">📍 {activeSession.venue}</span>}
                  </div>

                  {!isExpired && (
                    <button className="btn btn-danger att-end-btn" onClick={handleEndSession}>
                      ⏹ End Session Early
                    </button>
                  )}
                  {isExpired && (
                    <button className="btn btn-primary att-new-btn" onClick={handleEndSession}>
                      ✅ Start New Session
                    </button>
                  )}
                </div>

                {/* Right — Live Attendance List */}
                <div className="att-live-list glass-panel">
                  <div className="att-live-header">
                    <h3>Live Attendance</h3>
                    <span className="att-live-count">{records.length} checked in</span>
                  </div>

                  {records.length === 0 ? (
                    <div className="att-empty-records">
                      <span>📵</span>
                      <p>Waiting for students to scan...</p>
                      <p className="att-empty-hint">Students open the portal on their phone and tap "Scan QR"</p>
                    </div>
                  ) : (
                    <div className="att-record-list">
                      {records.map((r, i) => (
                        <div key={r.recordId} className="att-record-item animate-fade-in">
                          <span className="att-record-num">#{i + 1}</span>
                          <div className="att-record-info">
                            <strong>{r.studentName}</strong>
                            <span>{r.studentId || r.studentIndex || '—'}</span>
                          </div>
                          <span className="att-record-time">
                            {new Date(r.checkedInAt).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: History ──────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="att-history-panel">
          {pastSessions.length === 0 ? (
            <div className="att-history-empty">
              <span>📋</span>
              <p>No past sessions yet. Generate your first QR code to start taking attendance.</p>
            </div>
          ) : (
            pastSessions.map(sess => {
              const sessRecords = loadRecords().filter(r => r.sessionId === sess.sessionId);
              const expired = new Date(sess.expiresAt) < new Date();
              return (
                <div key={sess.sessionId} className="att-history-card glass-panel">
                  <div className="att-hist-meta">
                    <div className="att-hist-left">
                      <span className={`att-hist-dot ${expired ? 'expired' : 'live'}`}></span>
                      <div>
                        <strong>{sess.sessionTitle}</strong>
                        <span className="att-hist-course">📘 {sess.course}</span>
                        {sess.venue && <span className="att-hist-venue">📍 {sess.venue}</span>}
                        <span className="att-hist-date">
                          {new Date(sess.generatedAt).toLocaleDateString('en-GH', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          {' · '}{sess.windowMinutes} min window
                        </span>
                      </div>
                    </div>
                    <div className="att-hist-count">
                      <span className="att-count-big">{sessRecords.length}</span>
                      <span className="att-count-label">students</span>
                    </div>
                  </div>
                  {sessRecords.length > 0 && (
                    <div className="att-hist-names">
                      {sessRecords.map(r => (
                        <span key={r.recordId} className="att-student-chip">{r.studentName}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
