import React, { useContext, useEffect, useRef, useState } from 'react';
import { DbContext } from '../context/DbContextDefinition';
import './Login.css';
import ttuLogo from '../ttu-logo.png.png';
import { getSupabaseSession, signInWithGoogle } from '../lib/supabase';

export default function Login() {
  const { googleSignIn, googleVerificationPending, confirmGoogleVerification } = useContext(DbContext);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
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
      const result = await googleSignIn(session.access_token, session.user);
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
      await signInWithGoogle();
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
        <div className="login-header"><div className="ttu-logo-sim"><img src={ttuLogo} alt="Takoradi Technical University Logo" className="ttu-logo-img" /></div><h1>Welcome to TTU Design Hub</h1><p className="subtitle">Sign in with your Google account to access your academic workspace, course updates, and class reminders.</p></div>
        {error && <div className="login-error-alert"><span>Warning: {error}</span></div>}
        {notice && <div className="login-success-alert"><span>{notice}</span></div>}
        <button type="button" className="btn google-sign-in w-full" disabled={isSubmitting} onClick={handleGoogleSignIn}><span className="google-mark" aria-hidden="true">G</span>{isSubmitting ? 'Connecting to Google...' : 'Continue with Google'}</button>
        <p className="google-account-note">First-time users receive a secure TTU Design Hub profile automatically.</p>
        <div className="login-footer"><p>© 2026 Takoradi Technical University</p><p>Faculty of Applied Arts & Technology</p></div>
      </main>
    </div>
  );
}
