import React, { useState } from 'react';
import './DiscussionThread.css';

export default function DiscussionThread({
  parentId,
  parentType = 'deadline', // 'deadline' | 'announcement'
  comments = [],
  currentUser,
  onAddComment,
  onDeleteComment
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [newText, setNewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const itemComments = comments.filter(c => c.parentId === parentId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newText.trim() || !currentUser) return;

    setIsSubmitting(true);
    try {
      await onAddComment({
        parentId,
        parentType,
        text: newText.trim()
      });
      setNewText('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="comm-badge comm-admin">👑 Admin</span>;
      case 'lecturer':
        return <span className="comm-badge comm-lecturer">👨‍🏫 Lecturer</span>;
      case 'student_head':
        return <span className="comm-badge comm-head">⭐ Class Head</span>;
      default:
        return <span className="comm-badge comm-student">🎓 Student</span>;
    }
  };

  return (
    <div className="discussion-thread-container">
      <button
        type="button"
        className="discussion-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Open questions and discussion thread"
      >
        <span>💬 Q&A &amp; Discussion</span>
        <span className="comment-count-chip">{itemComments.length}</span>
        <span className="toggle-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="discussion-drawer animate-fade-in">
          <div className="comments-list">
            {itemComments.length === 0 ? (
              <p className="no-comments-text">No questions or comments yet. Ask a question below!</p>
            ) : (
              itemComments.map(c => {
                const canDelete = currentUser?.role === 'admin' ||
                  currentUser?.role === 'lecturer' ||
                  c.authorId === currentUser?.id;

                return (
                  <div key={c.id} className="comment-bubble">
                    <div className="comment-header">
                      <div className="comment-author-info">
                        <strong>{c.authorName}</strong>
                        {getRoleBadge(c.authorRole)}
                      </div>
                      <div className="comment-meta-right">
                        <small className="comment-date">
                          {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; {new Date(c.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </small>
                        {canDelete && (
                          <button
                            type="button"
                            className="comment-del-btn"
                            onClick={() => onDeleteComment(c.id)}
                            title="Delete this comment"
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="comment-body">{c.text}</p>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleSubmit} className="new-comment-form">
            <input
              type="text"
              placeholder={`Ask a question or reply as ${currentUser?.name || 'User'}...`}
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              required
              className="comment-input"
            />
            <button type="submit" className="btn btn-primary btn-sm comment-submit-btn" disabled={isSubmitting}>
              {isSubmitting ? '...' : 'Send'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
