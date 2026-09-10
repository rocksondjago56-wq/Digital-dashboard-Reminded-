import React, { useContext, useEffect, useRef, useState } from 'react';
import { DbContext } from '../context/DbContextDefinition';
import './Login.css';
import ttuLogo from '../ttu-logo.png.png';
import { getSupabaseSession, saveSupabaseProfile, signInWithGoogle } from '../lib/supabase';

export default function Login() {
  const { googleSignIn, googleVerificationPending, confirmGoogleVerification } = useContext(DbContext);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [profile, setProfile] = useState({ role: 'student', fullName: '', indexNumber: '', email: '', program: '', certificate: 'BTech', year: 'Year 1', lecturerId: '', staffId: '', phone: '', department: 'Graphic Design', position: '', coursesText: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handledSession = useRef(false);

  useEffect(() => {
    const sessionNotice = sessionStorage.getItem('ttu_session_notice');
    if (sessionNotice) {
      setNotice(sessionNotice);
      sessionStorage.removeItem('ttu_session_notice');
    }
    const errorCode = new URLSearchParams(window.location.search).get('error');
    if (!errorCode) return;
    setError('Google sign-in could not be completed. Check the Google provider settings in Supabase and try again.');
    window.history.replaceState({}, document.title, window.location.pathname);
  }, []);

  useEffect(() => {
    const restoreGoogleSession = async () => {
      const session = await getSupabaseSession();
      if (!session?.access_token || handledSession.current || googleVerificationPending) return;
      handledSession.current = true;
      setIsSubmitting(true);
      const savedProfile = JSON.parse(sessionStorage.getItem('ttu_registration_profile') || 'null');
      if (savedProfile) await saveSupabaseProfile({ ...savedProfile, courses: savedProfile.coursesText?.split(',').map(course => course.trim()).filter(Boolean) || [] });
      const result = await googleSignIn(session.access_token, session.user, savedProfile ? { ...savedProfile, courses: savedProfile.coursesText?.split(',').map(course => course.trim()).filter(Boolean) || [] } : null);
      sessionStorage.removeItem('ttu_registration_profile');
      if (!result.success) {
        setError(result.message || 'Your Google account could not be linked to the TTU portal.');
        handledSession.current = false;
      }
      setIsSubmitting(false);
    };
    restoreGoogleSession().catch(() => setError('Could not restore your secure Google session. Please try again.'));
  }, [googleSignIn, googleVerificationPending]);

  const handleGoogleSignIn = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      if (isRegistering) {
        const required = profile.role === 'student'
          ? [profile.fullName, profile.indexNumber, profile.email, profile.program, profile.certificate, profile.year]
          : profile.role === 'lecturer'
            ? [profile.fullName, profile.lecturerId, profile.email, profile.phone, profile.department, profile.coursesText]
            : [profile.fullName, profile.staffId, profile.email, profile.phone, profile.department, profile.position];
        if (required.some(value => !value.trim())) throw new Error('Complete all required registration fields before continuing with Google.');
      }
      await signInWithGoogle(isRegistering ? profile : null);
    } catch (googleError) {
      setError(googleError.message || 'Google sign-in could not be started.');
      setIsSubmitting(false);
    }
  };

  if (googleVerificationPending) {
    return (
      <div className="login-container animate-fade-in">
        <div className="login-card glass-panel verified-card">
          <div className="login-header"><div className="ttu-logo-sim"><img src={ttuLogo} alt="Takoradi Technical University Logo" className="ttu-logo-img" /></div></div>
          <div className="verification-check" aria-hidden="true">✓</div>
          <h1>Your Google account has been verified.</h1>
          <p className="subtitle verification-copy">Your TTU Design Hub profile is ready. Continue securely to your dashboard.</p>
          <button type="button" className="btn btn-primary w-full" onClick={confirmGoogleVerification}>Continue to TTU Design Hub</button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container animate-fade-in">
      <main className="login-card glass-panel google-login-card">
        <div className="login-header"><div className="ttu-logo-sim"><img src={ttuLogo} alt="Takoradi Technical University Logo" className="ttu-logo-img" /></div><h1>{isRegistering ? 'Create TTU Design Hub Profile' : 'Welcome to TTU Design Hub'}</h1><p className="subtitle">{isRegistering ? 'Complete your academic profile, then verify it securely with Google.' : 'Sign in with your verified Google account to access your academic workspace.'}</p></div>
        {error && <div className="login-error-alert"><span>Warning: {error}</span></div>}
        {notice && <div className="login-success-alert"><span>{notice}</span></div>}
        {isRegistering && <div className="login-form registration-form">
          <div className="form-group"><label>Role</label><select value={profile.role} onChange={e => setProfile({ ...profile, role: e.target.value })}><option value="student">Student</option><option value="lecturer">Lecturer</option><option value="admin">Administration Staff</option></select></div>
          <div className="form-group"><label>Full Name</label><input value={profile.fullName} onChange={e => setProfile({ ...profile, fullName: e.target.value })} /></div>
          {profile.role === 'student' && <><div className="form-group"><label>Index Number</label><input value={profile.indexNumber} onChange={e => setProfile({ ...profile, indexNumber: e.target.value })} /></div><div className="form-group"><label>Gmail Address</label><input type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} /></div><div className="form-group"><label>Program</label><input value={profile.program} onChange={e => setProfile({ ...profile, program: e.target.value })} /></div><div className="student-signup-row"><div className="form-group"><label>Certificate Type</label><select value={profile.certificate} onChange={e => setProfile({ ...profile, certificate: e.target.value })}><option>BTech</option><option>HND</option><option>Diploma</option></select></div><div className="form-group"><label>Year of Study</label><select value={profile.year} onChange={e => setProfile({ ...profile, year: e.target.value })}>{['Year 1','Year 2','Year 3','Year 4'].map(year => <option key={year}>{year}</option>)}</select></div></div></>}
          {profile.role === 'lecturer' && <><div className="form-group"><label>Lecturer ID</label><input value={profile.lecturerId} onChange={e => setProfile({ ...profile, lecturerId: e.target.value })} /></div><ProfileContact profile={profile} setProfile={setProfile} /><div className="form-group"><label>Courses Taught</label><input value={profile.coursesText} onChange={e => setProfile({ ...profile, coursesText: e.target.value })} placeholder="Course A, Course B" /></div></>}
          {profile.role === 'admin' && <><div className="form-group"><label>Staff ID</label><input value={profile.staffId} onChange={e => setProfile({ ...profile, staffId: e.target.value })} /></div><ProfileContact profile={profile} setProfile={setProfile} /><div className="form-group"><label>Position</label><input value={profile.position} onChange={e => setProfile({ ...profile, position: e.target.value })} /></div></>}
        </div>}
        <button type="button" className="btn google-sign-in w-full" disabled={isSubmitting} onClick={handleGoogleSignIn}><span className="google-mark" aria-hidden="true">G</span>{isSubmitting ? 'Connecting to Google...' : 'Continue with Google'}</button>
        <p className="google-account-note">First-time users receive a secure TTU Design Hub profile automatically.</p>
        <div className="switch-mode-text"><button type="button" className="text-link" onClick={() => { setIsRegistering(!isRegistering); setError(''); }}>{isRegistering ? 'Already registered? Continue with Google' : 'New to TTU Design Hub? Register your profile'}</button></div>
        <div className="login-footer"><p>© 2026 Takoradi Technical University</p><p>Faculty of Applied Arts & Technology</p></div>
      </main>
    </div>
  );
}

function ProfileContact({ profile, setProfile }) { return <><div className="form-group"><label>Email</label><input type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} /></div><div className="form-group"><label>Phone Number</label><input type="tel" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} /></div><div className="form-group"><label>Department</label><input value={profile.department} onChange={e => setProfile({ ...profile, department: e.target.value })} /></div></>; }
