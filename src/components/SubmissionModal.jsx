import React, { useState } from 'react';
import './SubmissionModal.css';

export default function SubmissionModal({ deadline, existingSubmission, onClose, onSubmit }) {
  const [file, setFile] = useState(null);
  const [link, setLink] = useState(existingSubmission?.link || '');
  const [notes, setNotes] = useState(existingSubmission?.notes || '');
  const [fileError, setFileError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    setFileError('');
    if (!selected) {
      setFile(null);
      return;
    }

    if (selected.size > 15 * 1024 * 1024) {
      setFileError('File exceeds 15 MB limit. Please compress or link Google Drive / Behance below.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFile({
        name: selected.name,
        type: selected.type || 'application/octet-stream',
        size: (selected.size / (1024 * 1024)).toFixed(2) + ' MB',
        dataUrl: reader.result
      });
    };
    reader.readAsDataURL(selected);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file && !link.trim() && !existingSubmission?.file) {
      setFileError('Please attach a file or provide a portfolio/drive link for your work.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage('');
    try {
      const result = await onSubmit({
        deadlineId: deadline.id,
        file: file || existingSubmission?.file,
        link: link.trim(),
        notes: notes.trim()
      });

      if (result?.success) {
        setStatusMessage('Assignment submitted successfully!');
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setFileError(result?.message || 'Could not save submission.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isOverdue = new Date() > new Date(deadline.dueDate + 'T23:59:59');

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose}>
      <div className="submission-modal glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="modal-badge">{deadline.course}</span>
            <h2>Submit Assignment Work</h2>
            <p className="modal-subtitle">{deadline.title}</p>
          </div>
          <button type="button" className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {/* Existing Grade / Feedback Banner if present */}
        {existingSubmission?.grade && (
          <div className="graded-banner animate-fade-in">
            <div className="graded-score">
              <span className="grade-label">Grade Awarded</span>
              <span className="grade-val">{existingSubmission.grade}</span>
            </div>
            {existingSubmission.feedback && (
              <div className="graded-feedback">
                <strong>Lecturer Feedback:</strong>
                <p>"{existingSubmission.feedback}"</p>
                <small>By {existingSubmission.gradedBy || 'Course Lecturer'} on {new Date(existingSubmission.gradedAt).toLocaleDateString()}</small>
              </div>
            )}
          </div>
        )}

        {/* Status of Previous Submission */}
        {existingSubmission && !existingSubmission.grade && (
          <div className="submission-status-card">
            <span className={`status-pill ${existingSubmission.isLate ? 'pill-late' : 'pill-ontime'}`}>
              {existingSubmission.isLate ? '⚠️ Submitted Late' : '✅ Submitted On Time'}
            </span>
            <span className="submitted-time">
              Recorded on {new Date(existingSubmission.submittedAt).toLocaleString()}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="submission-form">
          <div className="deadline-reminder-box">
            <span>📅 Due Date: <strong>{deadline.dueDate}</strong></span>
            <span className={isOverdue ? 'overdue-text' : 'ontime-text'}>
              {isOverdue ? '⚠️ This submission is past deadline' : '⏳ Submissions open'}
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="submission-file">
              Upload Work File (PDF, ZIP, PSD, AI, DOCX, JPG, PNG — max 15MB)
            </label>
            <input
              id="submission-file"
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.zip,.rar,.psd,.ai,.docx,.doc,.jpg,.jpeg,.png,.mp4"
            />
            {file ? (
              <p className="file-preview-tag">📎 New file selected: <strong>{file.name}</strong> ({file.size})</p>
            ) : existingSubmission?.file ? (
              <p className="file-preview-tag">
                📄 Currently submitted: <strong>{existingSubmission.file.name}</strong> ({existingSubmission.file.size})
              </p>
            ) : null}
            {fileError && <p className="error-text">⚠️ {fileError}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="submission-link">
              Portfolio / Cloud Link (Google Drive, Behance, Figma, GitHub, Dropbox)
            </label>
            <input
              id="submission-link"
              type="url"
              placeholder="https://behance.net/gallery/... or drive.google.com/..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
            <small className="help-text">Ideal for large InDesign packages, video renders, or Figma prototypes.</small>
          </div>

          <div className="form-group">
            <label htmlFor="submission-notes">Submission Notes & Remarks (Optional)</label>
            <textarea
              id="submission-notes"
              rows="3"
              placeholder="Explain design choices, fonts used, or software versions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            ></textarea>
          </div>

          {statusMessage && <p className="success-text">{statusMessage}</p>}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Uploading...' : existingSubmission ? 'Update Submission' : 'Submit Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
