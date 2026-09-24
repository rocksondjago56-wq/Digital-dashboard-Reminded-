import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import './LecturerSubmissionsModal.css';

export default function LecturerSubmissionsModal({ deadline, submissions = [], onGrade, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [gradingState, setGradingState] = useState({});
  const [saveStatus, setSaveStatus] = useState({});

  const deadlineSubmissions = submissions.filter(s => s.deadlineId === deadline.id);
  const filtered = deadlineSubmissions.filter(s => {
    const q = searchTerm.toLowerCase();
    return (
      (s.studentName || '').toLowerCase().includes(q) ||
      (s.studentIndex || '').toLowerCase().includes(q) ||
      (s.studentCertificate || '').toLowerCase().includes(q)
    );
  });

  const handleGradeChange = (subId, field, val) => {
    setGradingState(prev => ({
      ...prev,
      [subId]: {
        ...prev[subId],
        [field]: val
      }
    }));
  };

  const handleSaveGrade = async (sub) => {
    const subGradeData = gradingState[sub.id] || {};
    const grade = subGradeData.grade !== undefined ? subGradeData.grade : (sub.grade || '');
    const feedback = subGradeData.feedback !== undefined ? subGradeData.feedback : (sub.feedback || '');

    if (!grade.trim()) {
      alert('Please enter a grade before saving.');
      return;
    }

    const res = await onGrade(sub.id, { grade: grade.trim(), feedback: feedback.trim() });
    if (res?.success) {
      setSaveStatus(prev => ({ ...prev, [sub.id]: 'Saved!' }));
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, [sub.id]: '' }));
      }, 2000);
    }
  };

  const handleExportExcel = () => {
    if (!deadlineSubmissions.length) {
      alert('No submissions recorded to export.');
      return;
    }

    const rows = deadlineSubmissions.map((s, idx) => ({
      'No.': idx + 1,
      'Student Name': s.studentName,
      'Index Number': s.studentIndex,
      'Programme': s.studentCertificate,
      'Year Group': s.studentYear,
      'Submission Status': s.isLate ? 'Late' : 'On Time',
      'Submitted At': new Date(s.submittedAt).toLocaleString(),
      'Attached File': s.file ? s.file.name : 'N/A',
      'External Link': s.link || 'N/A',
      'Student Notes': s.notes || '',
      'Awarded Grade': s.grade || 'Ungraded',
      'Lecturer Feedback': s.feedback || ''
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Submissions');
    
    const safeTitle = (deadline.title || 'Assignment').replace(/[^a-z0-9]/gi, '_').slice(0, 25);
    XLSX.writeFile(wb, `${safeTitle}_Submissions_Report.xlsx`);
  };

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose}>
      <div className="lecturer-submissions-modal glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="modal-badge">{deadline.course}</span>
            <h2>Student Submissions Tray</h2>
            <p className="modal-subtitle">{deadline.title} &bull; Due: {deadline.dueDate}</p>
          </div>
          <button type="button" className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="submissions-toolbar">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by student name or index number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="submissions-search-input"
            />
          </div>

          <div className="toolbar-stats">
            <span className="stat-badge">
              <strong>{deadlineSubmissions.length}</strong> Total Submissions
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm export-btn"
              onClick={handleExportExcel}
              title="Download full submissions grade sheet as Excel spreadsheet"
            >
              📊 Export to Excel (.xlsx)
            </button>
          </div>
        </div>

        <div className="submissions-list">
          {filtered.length === 0 ? (
            <div className="empty-submissions">
              <span className="empty-emoji">📂</span>
              <h3>No Submissions Found</h3>
              <p>
                {deadlineSubmissions.length === 0
                  ? 'No students have submitted work for this assignment brief yet.'
                  : 'No student matches your search query.'}
              </p>
            </div>
          ) : (
            filtered.map((s) => {
              const currentGradeVal = gradingState[s.id]?.grade !== undefined
                ? gradingState[s.id].grade
                : (s.grade || '');
              const currentFeedbackVal = gradingState[s.id]?.feedback !== undefined
                ? gradingState[s.id].feedback
                : (s.feedback || '');

              return (
                <div key={s.id} className="submission-card">
                  <div className="submission-top-row">
                    <div className="student-info">
                      <h4>{s.studentName}</h4>
                      <div className="student-meta">
                        <span className="meta-pill">{s.studentIndex}</span>
                        <span className="meta-pill">{s.studentCertificate || 'BTech'}</span>
                        <span className="meta-pill">{s.studentYear || 'Year 1'}</span>
                      </div>
                    </div>
                    <div className="submission-timing">
                      <span className={`status-pill ${s.isLate ? 'pill-late' : 'pill-ontime'}`}>
                        {s.isLate ? '⚠️ Late Submission' : '✅ On Time'}
                      </span>
                      <small className="time-text">{new Date(s.submittedAt).toLocaleString()}</small>
                    </div>
                  </div>

                  {/* Submission Work Assets */}
                  <div className="submission-assets">
                    {s.file?.dataUrl ? (
                      <a
                        href={s.file.dataUrl}
                        download={s.file.name}
                        className="asset-download-btn"
                        title="Download student submitted file"
                      >
                        📥 Download File: <strong>{s.file.name}</strong> ({s.file.size})
                      </a>
                    ) : (
                      <span className="no-asset">No file uploaded</span>
                    )}

                    {s.link && (
                      <a
                        href={s.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="asset-link-btn"
                      >
                        🔗 View External Link: {s.link}
                      </a>
                    )}
                  </div>

                  {s.notes && (
                    <div className="submission-notes-box">
                      <strong>Student Notes:</strong>
                      <p>{s.notes}</p>
                    </div>
                  )}

                  {/* Inline Grading Area */}
                  <div className="grading-row">
                    <div className="grade-input-group">
                      <label htmlFor={`grade-${s.id}`}>Award Grade / Score</label>
                      <input
                        id={`grade-${s.id}`}
                        type="text"
                        placeholder="e.g. 85 or A"
                        value={currentGradeVal}
                        onChange={(e) => handleGradeChange(s.id, 'grade', e.target.value)}
                        className="grade-input"
                      />
                    </div>

                    <div className="feedback-input-group">
                      <label htmlFor={`feedback-${s.id}`}>Critique / Feedback Notes</label>
                      <input
                        id={`feedback-${s.id}`}
                        type="text"
                        placeholder="Feedback on typography, grid, concept..."
                        value={currentFeedbackVal}
                        onChange={(e) => handleGradeChange(s.id, 'feedback', e.target.value)}
                        className="feedback-input"
                      />
                    </div>

                    <div className="grade-action-wrap">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm save-grade-btn"
                        onClick={() => handleSaveGrade(s)}
                      >
                        {saveStatus[s.id] || 'Save Grade'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
