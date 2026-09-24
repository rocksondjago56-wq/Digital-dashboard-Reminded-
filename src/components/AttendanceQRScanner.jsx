import React, { useState, useEffect, useRef, useContext } from 'react';
import { DbContext } from '../context/DbContextDefinition';
import './AttendanceQRScanner.css';

const ATTENDANCE_RECORDS_KEY = 'ttu_attendance_records';

function decodeAttendancePayload(text) {
  if (!text || typeof text !== 'string') return null;
  if (!text.startsWith('TTU_ATTEND:')) return null;
  const token = text.slice('TTU_ATTEND:'.length);
  try {
    const jsonStr = atob(token);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function loadAllRecords() {
  try { return JSON.parse(localStorage.getItem(ATTENDANCE_RECORDS_KEY) || '[]'); }
  catch { return []; }
}

function saveAllRecords(records) {
  localStorage.setItem(ATTENDANCE_RECORDS_KEY, JSON.stringify(records));
}

export default function AttendanceQRScanner({ onClose }) {
  const { currentUser } = useContext(DbContext);

  const [activeTab, setActiveTab]         = useState('camera'); // 'camera' | 'upload' | 'history'
  const [scannerReady, setScannerReady]   = useState(false);
  const [scanResult, setScanResult]       = useState(null); // { status: 'success'|'already'|'expired'|'invalid', message, session, record }
  const [cameraError, setCameraError]     = useState('');
  const [isProcessing, setIsProcessing]   = useState(false);
  const [myRecords, setMyRecords]         = useState([]);

  const html5QrCodeRef = useRef(null);
  const readerElementId = 'ttu-attendance-reader';

  // Load student's own attendance history
  useEffect(() => {
    const all = loadAllRecords();
    const mine = all.filter(r => 
      r.studentId === currentUser?.id || 
      (currentUser?.studentId && r.studentIndex === currentUser?.studentId)
    );
    setMyRecords(mine.slice().reverse());
  }, [currentUser, scanResult]);

  // Handle a decoded string (from live camera or file upload)
  const handleDecodedText = (decodedText) => {
    if (isProcessing) return;
    setIsProcessing(true);

    const session = decodeAttendancePayload(decodedText);

    if (!session || !session.sessionId || !session.course) {
      setScanResult({
        status: 'invalid',
        message: 'Invalid TTU Attendance QR code. Please scan an official code from your lecturer.'
      });
      setIsProcessing(false);
      return;
    }

    const records = loadAllRecords();
    const existing = records.find(r => 
      r.sessionId === session.sessionId && 
      (r.studentId === currentUser?.id || (currentUser?.studentId && r.studentIndex === currentUser?.studentId))
    );

    if (existing) {
      setScanResult({
        status: 'already',
        message: 'You have already checked in for this session!',
        session,
        record: existing
      });
      setIsProcessing(false);
      return;
    }

    const isExpired = new Date(session.expiresAt) < new Date();
    if (isExpired) {
      setScanResult({
        status: 'expired',
        message: 'This attendance session has already expired.',
        session
      });
      setIsProcessing(false);
      return;
    }

    // Valid check in!
    const newRecord = {
      recordId: `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      sessionId: session.sessionId,
      course: session.course,
      sessionTitle: session.sessionTitle,
      venue: session.venue || '',
      lecturerName: session.lecturerName || '',
      studentId: currentUser?.id,
      studentName: currentUser?.name || 'Student',
      studentIndex: currentUser?.studentId || currentUser?.indexNumber || '',
      studentYear: currentUser?.year || '',
      studentCertificate: currentUser?.certificate || '',
      checkedInAt: new Date().toISOString()
    };

    records.push(newRecord);
    saveAllRecords(records);

    setScanResult({
      status: 'success',
      message: 'Attendance Verified Successfully!',
      session,
      record: newRecord
    });
    setIsProcessing(false);
  };

  // Start live camera
  useEffect(() => {
    let isCancelled = false;

    if (activeTab !== 'camera' || scanResult) {
      // Stop camera if switching tabs or showing result
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.stop().then(() => {
              if (html5QrCodeRef.current) html5QrCodeRef.current.clear();
            }).catch(() => {});
          } else {
            html5QrCodeRef.current.clear();
          }
        } catch {
          // ignore
        }
      }
      return;
    }

    async function initCamera() {
      try {
        setCameraError('');
        const { Html5Qrcode } = await import('html5-qrcode');
        if (isCancelled) return;

        // Ensure reader container exists
        const container = document.getElementById(readerElementId);
        if (!container) return;

        const qrScanner = new Html5Qrcode(readerElementId);
        html5QrCodeRef.current = qrScanner;

        // Try back environment camera first (phones), fall back to front/user
        try {
          await qrScanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 240, height: 240 } },
            (text) => {
              handleDecodedText(text);
            },
            () => {}
          );
          if (!isCancelled) setScannerReady(true);
        } catch {
          // Try user camera
          try {
            await qrScanner.start(
              { facingMode: 'user' },
              { fps: 10, qrbox: { width: 240, height: 240 } },
              (text) => {
                handleDecodedText(text);
              },
              () => {}
            );
            if (!isCancelled) setScannerReady(true);
          } catch {
            if (!isCancelled) {
              setCameraError('Camera access unavailable or permission denied. You can switch to the "Upload Photo" tab to scan.');
            }
          }
        }
      } catch (err) {
        if (!isCancelled) {
          setCameraError('Failed to initialize camera scanner: ' + err.message);
        }
      }
    }

    const timer = setTimeout(() => {
      initCamera();
    }, 150);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.stop().then(() => {
              if (html5QrCodeRef.current) html5QrCodeRef.current.clear();
            }).catch(() => {});
          } else {
            html5QrCodeRef.current.clear();
          }
        } catch {
          // ignore
        }
      }
    };
  }, [activeTab, scanResult]);

  // Handle image file upload for scanning
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      // Create a temporary instance to scan file
      const tempId = 'ttu-temp-file-reader';
      let tempDiv = document.getElementById(tempId);
      if (!tempDiv) {
        tempDiv = document.createElement('div');
        tempDiv.id = tempId;
        tempDiv.style.display = 'none';
        document.body.appendChild(tempDiv);
      }

      const fileScanner = new Html5Qrcode(tempId);
      const text = await fileScanner.scanFile(file, true);
      fileScanner.clear();
      if (tempDiv.parentNode) tempDiv.parentNode.removeChild(tempDiv);

      handleDecodedText(text);
    } catch {
      setScanResult({
        status: 'invalid',
        message: 'Could not read a QR code from this image. Please ensure the QR is clear and well lit.'
      });
    }
  };

  const handleResetScan = () => {
    setScanResult(null);
    setIsProcessing(false);
  };

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose}>
      <div className="att-scanner-modal glass-panel" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="att-scanner-header">
          <div className="att-scanner-title">
            <span className="att-scanner-icon">📷</span>
            <div>
              <h3>Class Attendance Check-In</h3>
              <p>TTU Department of Graphic Design</p>
            </div>
          </div>
          <button className="att-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Tabs */}
        <div className="att-scanner-tabs">
          <button
            className={`att-scan-tab ${activeTab === 'camera' ? 'active' : ''}`}
            onClick={() => { setActiveTab('camera'); handleResetScan(); }}
          >
            📹 Live Camera
          </button>
          <button
            className={`att-scan-tab ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => { setActiveTab('upload'); handleResetScan(); }}
          >
            🖼️ Upload Photo
          </button>
          <button
            className={`att-scan-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📜 My History {myRecords.length > 0 && <span className="att-tab-badge">{myRecords.length}</span>}
          </button>
        </div>

        {/* Content Body */}
        <div className="att-scanner-body">
          {scanResult ? (
            /* Result Screen */
            <div className={`att-result-card att-result-${scanResult.status} animate-fade-in`}>
              <div className="att-result-icon">
                {scanResult.status === 'success' && '✅'}
                {scanResult.status === 'already' && 'ℹ️'}
                {scanResult.status === 'expired' && '⏰'}
                {scanResult.status === 'invalid' && '⚠️'}
              </div>

              <h4>{scanResult.message}</h4>

              {scanResult.session && (
                <div className="att-result-details">
                  <div className="att-detail-row">
                    <span className="att-detail-label">Course:</span>
                    <span className="att-detail-val font-bold">{scanResult.session.course}</span>
                  </div>
                  <div className="att-detail-row">
                    <span className="att-detail-label">Session:</span>
                    <span className="att-detail-val">{scanResult.session.sessionTitle}</span>
                  </div>
                  {scanResult.session.venue && (
                    <div className="att-detail-row">
                      <span className="att-detail-label">Venue:</span>
                      <span className="att-detail-val">📍 {scanResult.session.venue}</span>
                    </div>
                  )}
                  {scanResult.session.lecturerName && (
                    <div className="att-detail-row">
                      <span className="att-detail-label">Lecturer:</span>
                      <span className="att-detail-val">👨‍🏫 {scanResult.session.lecturerName}</span>
                    </div>
                  )}
                  <div className="att-detail-row">
                    <span className="att-detail-label">Student:</span>
                    <span className="att-detail-val">{currentUser?.name} ({currentUser?.studentId || 'ID: OK'})</span>
                  </div>
                  {scanResult.record?.checkedInAt && (
                    <div className="att-detail-row">
                      <span className="att-detail-label">Timestamp:</span>
                      <span className="att-detail-val">
                        {new Date(scanResult.record.checkedInAt).toLocaleTimeString('en-GH', {
                          hour: '2-digit', minute: '2-digit', second: '2-digit'
                        })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="att-result-actions">
                {scanResult.status === 'success' ? (
                  <button className="btn btn-primary" onClick={onClose}>
                    Done & Close
                  </button>
                ) : (
                  <button className="btn btn-secondary" onClick={handleResetScan}>
                    Scan Another Code
                  </button>
                )}
                <button
                  className="btn btn-accent"
                  onClick={() => setActiveTab('history')}
                >
                  View My Attendance
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Tab: Camera */}
              {activeTab === 'camera' && (
                <div className="att-camera-view">
                  <div className="att-viewfinder-wrap">
                    <div id={readerElementId} className="att-reader-container"></div>
                    <div className="att-viewfinder-overlay">
                      <div className="att-corner top-left"></div>
                      <div className="att-corner top-right"></div>
                      <div className="att-corner bottom-left"></div>
                      <div className="att-corner bottom-right"></div>
                      <div className="att-scan-laser"></div>
                    </div>
                  </div>

                  {cameraError ? (
                    <div className="att-camera-error">
                      <p>{cameraError}</p>
                      <button
                        className="btn btn-primary mt-2"
                        onClick={() => setActiveTab('upload')}
                      >
                        Switch to Photo Upload
                      </button>
                    </div>
                  ) : (
                    <p className="att-scan-hint">
                      Point camera at the lecturer's attendance QR code to check in automatically.
                    </p>
                  )}
                </div>
              )}

              {/* Tab: Upload Photo */}
              {activeTab === 'upload' && (
                <div className="att-upload-view">
                  <div className="att-upload-box">
                    <span className="att-upload-icon">📸</span>
                    <h4>Select a photo of the QR code</h4>
                    <p>Take a screenshot or photo of the screen and upload it here.</p>
                    <label className="btn btn-primary att-file-btn">
                      Choose QR Image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Tab: History */}
              {activeTab === 'history' && (
                <div className="att-my-history">
                  <div className="att-my-history-header">
                    <h4>My Attendance Record</h4>
                    <span className="att-my-badge">{myRecords.length} sessions attended</span>
                  </div>

                  {myRecords.length === 0 ? (
                    <div className="att-history-empty">
                      <span>📝</span>
                      <p>You haven't checked into any classes yet.</p>
                      <p className="att-empty-hint">Use the Camera or Photo tab to scan when your lecturer shows a QR code.</p>
                    </div>
                  ) : (
                    <div className="att-my-list">
                      {myRecords.map(r => (
                        <div key={r.recordId} className="att-my-item">
                          <div className="att-my-item-left">
                            <span className="att-my-dot"></span>
                            <div>
                              <strong>{r.course}</strong>
                              <span className="att-my-title">{r.sessionTitle}</span>
                              {r.venue && <span className="att-my-venue">📍 {r.venue}</span>}
                              {r.lecturerName && <span className="att-my-lect">👨‍🏫 {r.lecturerName}</span>}
                            </div>
                          </div>
                          <div className="att-my-item-right">
                            <span className="att-my-time">
                              {new Date(r.checkedInAt).toLocaleDateString('en-GH', {
                                month: 'short', day: 'numeric'
                              })}
                            </span>
                            <span className="att-my-subtime">
                              {new Date(r.checkedInAt).toLocaleTimeString('en-GH', {
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                            <span className="att-verified-pill">Verified</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
