import React, { useState, useContext } from 'react';
import { DbContext } from '../context/DbContext';
import './Login.css';
import ttuLogo from '../ttu-logo.png.png';

export default function Login() {
  const { login, signUp } = useContext(DbContext);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Sign Up State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regIndexNumber, setRegIndexNumber] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('student');
  const [regYear, setRegYear] = useState('Year 1');
  const [regCourses, setRegCourses] = useState('');

  const handleSignIn = (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    const result = login(email, password);
    if (!result.success) {
      setError(result.message);
    }
  };

  const handleSignUp = (e) => {
    e.preventDefault();
    setError('');

    if (!regName || !regEmail || !regPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    const extraFields = {};
    if (regRole === 'student') {
      extraFields.year = regYear;
      extraFields.studentId = regIndexNumber || `04${Math.floor(10000000 + Math.random() * 90000000)}`;
      extraFields.indexNumber = extraFields.studentId;
    } else if (regRole === 'lecturer') {
      extraFields.courses = regCourses || 'General Design';
    }

    const result = signUp(regName, regEmail, regPassword, regRole, extraFields);
    if (!result.success) {
      setError(result.message);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
  };

  return (
    <div className="login-container animate-fade-in">
      <div className="login-card glass-panel">
        <div className="login-header">
          <div className="ttu-logo-sim">
            <img src={ttuLogo} alt="Takoradi Technical University Logo" className="ttu-logo-img" />
          </div>
          {isSignUp && <h1>Create Account</h1>}
          <p className="subtitle">Graphic Design Dept · Reminder & Announcement System</p>
        </div>

        {error && (
          <div className="login-error-alert">
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* SIGN IN FORM */}
        {!isSignUp ? (
          <>
            <form onSubmit={handleSignIn} className="login-form">
              <div className="form-group">
                <label htmlFor="email">Departmental Email</label>
                <input
                  type="email"
                  id="email"
                  placeholder="e.g. student@ttu.edu.gh"
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
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary w-full mt-2">
                Secure Sign In
              </button>
            </form>

            <div className="switch-mode-text mt-2">
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
                  placeholder="e.g. John Doe"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="regEmail">Departmental Email</label>
                <input
                  type="email"
                  id="regEmail"
                  placeholder="e.g. jdoe@ttu.edu.gh"
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
                  placeholder="Password (minimum 6 characters)"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="regRole">Role</label>
                  <select 
                    id="regRole" 
                    value={regRole} 
                    onChange={(e) => setRegRole(e.target.value)}
                  >
                    <option value="student">Student</option>
                    <option value="lecturer">Lecturer</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                {regRole === 'student' && (
                  <div className="form-group">
                    <label htmlFor="regYear">Academic Year</label>
                    <select 
                      id="regYear" 
                      value={regYear} 
                      onChange={(e) => setRegYear(e.target.value)}
                    >
                      <option value="Year 1">Year 1</option>
                      <option value="Year 2">Year 2</option>
                      <option value="Year 3">Year 3</option>
                      <option value="Year 4">Year 4</option>
                    </select>
                  </div>
                )}
              </div>

              {regRole === 'lecturer' && (
                <div className="form-group">
                  <label htmlFor="regCourses">Courses Taught (comma separated)</label>
                  <input
                    type="text"
                    id="regCourses"
                    placeholder="e.g. Typography I, Graphic Art Studio"
                    value={regCourses}
                    onChange={(e) => setRegCourses(e.target.value)}
                    required
                  />
                </div>
              )}

              <button type="submit" className="btn btn-accent w-full mt-2">
                Create Account
              </button>
            </form>

            <div className="switch-mode-text mt-2">
              <p>Already have an account? <span onClick={toggleMode} className="switch-mode-link">Sign In Now</span></p>
            </div>
          </>
        )}

        <div className="login-footer">
          <p>© 2026 Takoradi Technical University</p>
          <p>Faculty of Applied Arts & Technology</p>
        </div>
      </div>
    </div>
  );
}
