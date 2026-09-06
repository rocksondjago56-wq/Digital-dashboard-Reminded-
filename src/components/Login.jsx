import React, { useState, useContext } from 'react';
import { DbContext } from '../context/DbContextDefinition';
import './Login.css';
import ttuLogo from '../ttu-logo.png.png';
import { openWhatsApp, getWhatsAppConfig } from '../utils/whatsapp';

const CERTIFICATE_OPTIONS = ['BTech', 'HND', 'Diploma'];

export default function Login() {
  const { login, signUp } = useContext(DbContext);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Sign Up State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('student');

  // Student extra fields
  const [regYear, setRegYear] = useState('Year 1');
  const [regCertificate, setRegCertificate] = useState('BTech');
  const [regIndexNumber, setRegIndexNumber] = useState('');

  // Lecturer extra fields
  const [regStaffId, setRegStaffId] = useState('');
  const [regCourses, setRegCourses] = useState('');

  // Administrator extra fields
  const [regDesignation, setRegDesignation] = useState('Head of Department');
  const [regAdminKey, setRegAdminKey] = useState('');

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError('');
    setSuccessMsg('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError('');
    setSuccessMsg('');

    if (!regName || !regEmail || !regPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    const extraFields = {};
    if (regRole === 'student') {
      extraFields.year = regYear;
      extraFields.certificate = regCertificate;
      extraFields.studentId = regIndexNumber.trim() || `04${Math.floor(10000000 + Math.random() * 90000000)}`;
      extraFields.indexNumber = extraFields.studentId;
    } else if (regRole === 'lecturer') {
      extraFields.courses = regCourses.trim() || 'General Design Studio';
      extraFields.staffId = regStaffId.trim() || `LEC-${Math.floor(1000 + Math.random() * 9000)}`;
    } else if (regRole === 'admin') {
      extraFields.designation = regDesignation || 'Department Administrator';
      extraFields.staffId = regAdminKey.trim() || `ADM-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    setIsSubmitting(true);
    try {
      const result = await signUp(regName, regEmail, regPassword, regRole, extraFields);
      if (!result.success) {
        setError(result.message);
      } else if (result.message) {
        setSuccessMsg(result.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setSuccessMsg('');
  };

  const handleWhatsAppHelp = () => {
    const config = getWhatsAppConfig();
    openWhatsApp({
      phone: config.departmentPhone,
      text: `Hello TTU Graphic Design Department Desk, I need help with ${isSignUp ? 'creating my account' : 'signing in'} on the department portal.`
    });
  };

  return (
    <div className="login-container animate-fade-in">
      <div className="login-card glass-panel">
        <div className="login-header">
          <div className="ttu-logo-sim">
            <img src={ttuLogo} alt="Takoradi Technical University Logo" className="ttu-logo-img" />
          </div>
          <h1>{isSignUp ? 'Create Portal Account' : 'Department Portal Sign In'}</h1>
          <p className="subtitle">Graphic Design Dept · Reminder & Announcement System</p>
        </div>

        {error && (
          <div className="login-error-alert">
            <span>Warning: {error}</span>
          </div>
        )}

        {successMsg && (
          <div className="login-success-alert" style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.4)',
            color: '#15803d',
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '20px',
            fontSize: '0.9rem'
          }}>
            <span>Success: {successMsg}</span>
          </div>
        )}

        {/* SIGN IN FORM */}
        {!isSignUp ? (
          <>
            <form onSubmit={handleSignIn} className="login-form">
              <div className="form-group">
                <label htmlFor="email">Email, Full Name, Index Number, or Staff ID</label>
                <input
                  type="text"
                  id="email"
                  placeholder="e.g. Ceasar Djago, student@ttu.edu.gh, or 0420210088"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary w-full mt-2" disabled={isSubmitting}>
                {isSubmitting ? 'Signing In...' : 'Secure Sign In'}
              </button>
            </form>

            <div className="switch-mode-text mt-3">
              <p>Don't have an account? <span onClick={toggleMode} className="switch-mode-link">Sign Up Now</span></p>
            </div>
          </>
        ) : (
          /* SIGN UP FORM */
          <>
            <form onSubmit={handleSignUp} className="login-form">
              <div className="form-group">
                <label htmlFor="regName">Full Name</label>
                <input
                  type="text"
                  id="regName"
                  placeholder="e.g. Emmanuel Rockson / Dr. Andrews"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="regEmail">Departmental Email Address</label>
                <input
                  type="email"
                  id="regEmail"
                  placeholder="e.g. name@ttu.edu.gh"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="regPassword">Password</label>
                <input
                  type="password"
                  id="regPassword"
                  placeholder="Minimum 6 characters"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />
              </div>

              {/* ACCOUNT TYPE SELECTION */}
              <div className="form-group">
                <label htmlFor="regRole">Select Account Role</label>
                <select
                  id="regRole"
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                  style={{ fontWeight: 600 }}
                >
                  <option value="student">Student Account</option>
                  <option value="lecturer">Lecturer / Faculty Member</option>
                  <option value="admin">Department Administrator</option>
                </select>
              </div>

              {/* STUDENT ROLE FIELDS */}
              {regRole === 'student' && (
                <>
                  <div className="student-signup-row">
                    <div className="form-group">
                      <label htmlFor="regYear">Academic Year</label>
                      <select
                        id="regYear"
                        value={regYear}
                        onChange={(e) => setRegYear(e.target.value)}
                      >
                        <option value="Year 1">Year 1 (Freshman)</option>
                        <option value="Year 2">Year 2 (Sophomore)</option>
                        <option value="Year 3">Year 3 (Junior)</option>
                        <option value="Year 4">Year 4 (Senior)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="regCertificate">Certificate Programme</label>
                      <select
                        id="regCertificate"
                        value={regCertificate}
                        onChange={(e) => setRegCertificate(e.target.value)}
                      >
                        {CERTIFICATE_OPTIONS.map(certificate => (
                          <option key={certificate} value={certificate}>{certificate}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="regIndexNumber">Index / Student ID (Optional)</label>
                    <input
                      type="text"
                      id="regIndexNumber"
                      placeholder="e.g. 0420210088"
                      value={regIndexNumber}
                      onChange={(e) => setRegIndexNumber(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* LECTURER ROLE FIELDS */}
              {regRole === 'lecturer' && (
                <>
                  <div className="form-group">
                    <label htmlFor="regStaffId">Staff ID / Lecturer ID (Optional)</label>
                    <input
                      type="text"
                      id="regStaffId"
                      placeholder="e.g. LEC-0492"
                      value={regStaffId}
                      onChange={(e) => setRegStaffId(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="regCourses">Assigned Courses Taught (comma separated)</label>
                    <input
                      type="text"
                      id="regCourses"
                      placeholder="e.g. Layout Design II, Vector Graphics I, Typography"
                      value={regCourses}
                      onChange={(e) => setRegCourses(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              {/* ADMINISTRATOR ROLE FIELDS */}
              {regRole === 'admin' && (
                <>
                  <div className="form-group">
                    <label htmlFor="regDesignation">Administrative Title / Designation</label>
                    <select
                      id="regDesignation"
                      value={regDesignation}
                      onChange={(e) => setRegDesignation(e.target.value)}
                    >
                      <option value="Head of Department">Head of Department (HOD)</option>
                      <option value="Examinations & Records Officer">Examinations & Records Officer</option>
                      <option value="Department Secretary & Admin">Department Secretary & Admin</option>
                      <option value="IT & Studio Coordinator">IT & Studio Coordinator</option>
                      <option value="Department Administrator">Department Administrator</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="regAdminKey">Admin Passcode / Staff ID (Optional)</label>
                    <input
                      type="text"
                      id="regAdminKey"
                      placeholder="e.g. ADM-TTU-2026"
                      value={regAdminKey}
                      onChange={(e) => setRegAdminKey(e.target.value)}
                    />
                    <small style={{ display: 'block', marginTop: '4px', color: '#64748b', fontSize: '11px' }}>
                      Allows immediate access to post announcements, manage deadlines, and oversee events.
                    </small>
                  </div>
                </>
              )}

              <button type="submit" className="btn btn-accent w-full mt-2" disabled={isSubmitting}>
                {isSubmitting ? 'Creating Account...' : `Create ${regRole === 'admin' ? 'Administrator' : regRole === 'lecturer' ? 'Lecturer' : 'Student'} Account`}
              </button>
            </form>

            <div className="switch-mode-text mt-3">
              <p>Already have an account? <span onClick={toggleMode} className="switch-mode-link">Sign In Now</span></p>
            </div>
          </>
        )}

        {/* WhatsApp Quick Connect Footer */}
        <div style={{
          marginTop: '24px',
          padding: '12px 14px',
          background: 'rgba(37, 211, 102, 0.08)',
          border: '1px solid rgba(37, 211, 102, 0.25)',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: '#334155'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>💬</span>
            <div>
              <strong style={{ color: '#0f172a', display: 'block' }}>WhatsApp Help Desk</strong>
              <span style={{ color: '#64748b', fontSize: '11px' }}>Need help with login or access?</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleWhatsAppHelp}
            style={{
              background: '#25D366',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 10px',
              fontWeight: 600,
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            Chat Now
          </button>
        </div>

        <div className="login-footer">
          <p>© 2026 Takoradi Technical University</p>
          <p>Faculty of Applied Arts & Technology</p>
        </div>
      </div>
    </div>
  );
}
