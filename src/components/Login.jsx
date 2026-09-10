import React, { useEffect, useRef, useState, useContext } from 'react';
import { DbContext } from '../context/DbContextDefinition';
import './Login.css';
import ttuLogo from '../ttu-logo.png.png';
import { getSupabaseSession, signInWithGoogle } from '../lib/supabase';
import { openWhatsApp, getWhatsAppConfig } from '../utils/whatsapp';

export default function Login() {
  const { login, googleSignIn } = useContext(DbContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handledSession = useRef(false);

  useEffect(() => {
    const finishGoogleSignIn = async () => {
      const session = await getSupabaseSession();
      if (!session?.access_token || handledSession.current) return;

      handledSession.current = true;
      setIsSubmitting(true);
      setError('');
      const result = await googleSignIn(session.access_token, session.user);
      if (!result.success) {
        setError(result.message || 'Google sign-in could not create your portal profile.');
        handledSession.current = false;
      }
      setIsSubmitting(false);
    };

    finishGoogleSignIn().catch(() => setError('Could not restore your Google sign-in session. Please try again.'));
  }, [googleSignIn]);

  const handleSignIn = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setError('');
    if (!email || !password) {
      setError('Enter your email and password, or continue with Google.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(email, password);
    if (!result.success) setError(result.message);
    setIsSubmitting(false);
  };

  const handleGoogleSignIn = async () => {
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (googleError) {
      setError(googleError.message || 'Google sign-in could not be started.');
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppHelp = () => {
    const config = getWhatsAppConfig();
    openWhatsApp({
      phone: config.departmentPhone,
      text: 'Hello TTU Graphic Design Department Desk, I need help signing in to the department portal.'
    });
  };

  return (
    <div className="login-container animate-fade-in">
      <div className="login-card glass-panel">
        <div className="login-header">
          <div className="ttu-logo-sim">
            <img src={ttuLogo} alt="Takoradi Technical University Logo" className="ttu-logo-img" />
          </div>
          <h1>Department Portal Sign In</h1>
          <p className="subtitle">Graphic Design Dept · Reminder & Announcement System</p>
        </div>

        {error && <div className="login-error-alert"><span>Warning: {error}</span></div>}

        <form onSubmit={handleSignIn} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              placeholder="name@ttu.edu.gh"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </div>

          <button type="button" className="btn google-sign-in w-full" disabled={isSubmitting} onClick={handleGoogleSignIn}>
            <span className="google-mark" aria-hidden="true">G</span>
            {isSubmitting ? 'Connecting to Google...' : 'Continue with Google'}
          </button>

          <div className="sign-in-divider" aria-hidden="true"><span>or</span></div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              placeholder="Enter password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn btn-primary w-full mt-2" disabled={isSubmitting}>
            {isSubmitting ? 'Signing In...' : 'Secure Sign In'}
          </button>
        </form>

        <div className="google-account-note">New student profiles are created automatically after Google sign-in.</div>

        <div className="whatsapp-help">
          <div className="whatsapp-help-copy">
            <strong>WhatsApp Help Desk</strong>
            <span>Need help with login or access?</span>
          </div>
          <button type="button" onClick={handleWhatsAppHelp} className="whatsapp-help-button">Chat Now</button>
        </div>

        <div className="login-footer">
          <p>© 2026 Takoradi Technical University</p>
          <p>Faculty of Applied Arts & Technology</p>
        </div>
      </div>
    </div>
  );
}
