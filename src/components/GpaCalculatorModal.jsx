import React, { useState } from 'react';
import './GpaCalculatorModal.css';

const GRADE_POINTS = {
  'A': { gp: 4.0, desc: '80 - 100%' },
  'B+': { gp: 3.5, desc: '75 - 79%' },
  'B': { gp: 3.0, desc: '70 - 74%' },
  'C+': { gp: 2.5, desc: '65 - 69%' },
  'C': { gp: 2.0, desc: '60 - 64%' },
  'D+': { gp: 1.5, desc: '55 - 59%' },
  'D': { gp: 1.0, desc: '50 - 54%' },
  'F': { gp: 0.0, desc: '0 - 49%' }
};

const DEFAULT_COURSES = [
  { id: 1, name: 'Layout Design II', credits: 3, grade: 'A' },
  { id: 2, name: 'Vector Graphics I', credits: 3, grade: 'B+' },
  { id: 3, name: 'Visual Portfolio Prep', credits: 2, grade: 'A' },
  { id: 4, name: 'Art History & Theory', credits: 2, grade: 'B' },
  { id: 5, name: 'Design Workshop Seminar', credits: 2, grade: 'A' }
];

export default function GpaCalculatorModal({ onClose }) {
  const [courses, setCourses] = useState(DEFAULT_COURSES);

  const handleCourseChange = (id, field, value) => {
    setCourses(prev => prev.map(c => {
      if (c.id === id) {
        return {
          ...c,
          [field]: field === 'credits' ? Math.max(1, parseInt(value, 10) || 1) : value
        };
      }
      return c;
    }));
  };

  const handleAddCourse = () => {
    setCourses(prev => [
      ...prev,
      {
        id: Date.now(),
        name: 'Graphic Design Studio',
        credits: 3,
        grade: 'A'
      }
    ]);
  };

  const handleRemoveCourse = (id) => {
    if (courses.length <= 1) return;
    setCourses(prev => prev.filter(c => c.id !== id));
  };

  // Calculate GPA
  let totalCredits = 0;
  let totalPoints = 0;

  courses.forEach(c => {
    const cred = Number(c.credits) || 0;
    const gp = GRADE_POINTS[c.grade]?.gp ?? 0;
    totalCredits += cred;
    totalPoints += cred * gp;
  });

  const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';

  const getClassification = (score) => {
    const val = parseFloat(score);
    if (val >= 3.50) return { label: 'First Class Honours 🏆', color: '#facc15' };
    if (val >= 3.00) return { label: 'Second Class (Upper Division) 🎖️', color: '#60a5fa' };
    if (val >= 2.50) return { label: 'Second Class (Lower Division)', color: '#34d399' };
    if (val >= 1.50) return { label: 'Third Class / Pass', color: '#f97316' };
    return { label: 'Fail / Academic Probation', color: '#ef4444' };
  };

  const classification = getClassification(gpa);

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose}>
      <div className="gpa-modal glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="modal-badge">TTU Academic Standards</span>
            <h2>GPA &amp; CWA Calculator</h2>
            <p className="modal-subtitle">Takoradi Technical University &bull; Graphic Design Department</p>
          </div>
          <button type="button" className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {/* GPA Hero Score Card */}
        <div className="gpa-score-card">
          <div className="gpa-big-number">
            <span className="gpa-label">Projected Semester GPA</span>
            <span className="gpa-val">{gpa}</span>
          </div>
          <div className="gpa-summary-details">
            <div className="gpa-stat">
              <span>Total Credits:</span>
              <strong>{totalCredits}</strong>
            </div>
            <div className="gpa-stat">
              <span>Total Points:</span>
              <strong>{totalPoints.toFixed(1)}</strong>
            </div>
            <div className="gpa-stat-classification" style={{ color: classification.color }}>
              <span>Projected Class:</span>
              <strong>{classification.label}</strong>
            </div>
          </div>
        </div>

        {/* Course Rows */}
        <div className="courses-table-wrap">
          <table className="courses-table">
            <thead>
              <tr>
                <th>Course Name</th>
                <th style={{ width: '80px' }}>Credits</th>
                <th style={{ width: '130px' }}>Expected Grade</th>
                <th style={{ width: '70px' }}>Points</th>
                <th style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {courses.map(c => {
                const gp = GRADE_POINTS[c.grade]?.gp ?? 0;
                const coursePoints = ((c.credits || 0) * gp).toFixed(1);

                return (
                  <tr key={c.id}>
                    <td>
                      <input
                        type="text"
                        value={c.name}
                        onChange={(e) => handleCourseChange(c.id, 'name', e.target.value)}
                        className="table-input"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        max="6"
                        value={c.credits}
                        onChange={(e) => handleCourseChange(c.id, 'credits', e.target.value)}
                        className="table-input text-center"
                      />
                    </td>
                    <td>
                      <select
                        value={c.grade}
                        onChange={(e) => handleCourseChange(c.id, 'grade', e.target.value)}
                        className="table-select"
                      >
                        {Object.entries(GRADE_POINTS).map(([letter, info]) => (
                          <option key={letter} value={letter}>
                            {letter} ({info.desc} - {info.gp.toFixed(1)})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="text-center font-bold text-yellow">{coursePoints}</td>
                    <td>
                      <button
                        type="button"
                        className="del-course-btn"
                        onClick={() => handleRemoveCourse(c.id)}
                        disabled={courses.length <= 1}
                        title="Remove Course"
                      >
                        &times;
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="gpa-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddCourse}>
            ➕ Add Another Course
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
