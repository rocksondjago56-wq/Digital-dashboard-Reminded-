import React, { useContext, useEffect, useRef, useState } from 'react';
import { DbContext } from '../context/DbContextDefinition';
import './Login.css';
import ttuLogo from '../ttu-logo.png.png';
import { getSupabaseSession, saveSupabaseProfile, signInWithEmailPassword, signInWithGoogle, signUpWithEmailPassword, signOutOfGoogle } from '../lib/supabase';

const EMPTY_PROFILE = { role: 'student', fullName: '', indexNumber: '', email: '', password: '', program: '', certificate: 'BTech', year: 'Year 1', lecturerId: '', phone: '', department: 'Graphic Design', courses: [] };

export default function Login() {
  const { googleSignIn, googleVerificationPending, confirmGoogleVerification, passwordPortalSignIn } = useContext(DbContext);
  const [isRegistering, setIsRegistering] = useState(false);
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handledGoogleSession = useRef(false);

  const updateProfile = (field, value) => setProfile(current => ({ ...current, [field]: value }));

  useEffect(() => {
    // 1. Check if OAuth redirected back with an error in URL hash or query params
    const parseUrlError = () => {
      try {
        const hash = window.location.hash?.substring(1) || '';
        const search = window.location.search?.substring(1) || '';
        const params = new URLSearchParams(hash || search);
        const errorDesc = params.get('error_description') || params.get('error');
        if (errorDesc) {
          window.history.replaceState(null, '', window.location.pathname);
          return decodeURIComponent(errorDesc.replace(/\+/g, ' '));
        }
      } catch {
        // ignore url parsing issues
      }
      return null;
    };

    const urlError = parseUrlError();
    if (urlError) {
      setError(urlError);
      signOutOfGoogle().catch(() => {});
      return;
    }

    const restoreGoogleSession = async () => {
      let session = null;
      try {
        session = await getSupabaseSession();
      } catch (sessionErr) {
        console.warn('[TTU Auth] Error reading Supabase session:', sessionErr);
        setError(sessionErr?.message || 'Could not verify your authentication session. Please try again.');
        await signOutOfGoogle().catch(() => {});
        return;
      }

      const isGoogleSession = session?.user?.app_metadata?.providers?.includes('google');
      if (!session?.access_token || !isGoogleSession || handledGoogleSession.current || googleVerificationPending) return;
      handledGoogleSession.current = true;
      setIsSubmitting(true);

      const rawSavedProfile = JSON.parse(sessionStorage.getItem('ttu_registration_profile') || 'null');
      const savedProfile = (rawSavedProfile && typeof rawSavedProfile === 'object') ? rawSavedProfile : {};
      if (savedProfile?.role) {
        const { accessCode: _accessCode, password: _password, ...metadata } = savedProfile;
        try {
          await saveSupabaseProfile(metadata);
        } catch (profileErr) {
          console.warn('[TTU Auth] Could not update profile metadata:', profileErr);
        }
      }

      try {
        const result = await googleSignIn(session.access_token, session.user, savedProfile);
        sessionStorage.removeItem('ttu_registration_profile');
        if (!result.success) {
          setError(result.message || 'Your Google account could not be linked to the TTU portal.');
          handledGoogleSession.current = false;
          await signOutOfGoogle().catch(() => {});
        }
      } catch (signInErr) {
        console.error('[TTU Auth] Google sign-in failed:', signInErr);
        setError(signInErr?.message || 'The secure TTU sign-in service is unavailable. Please try again.');
        handledGoogleSession.current = false;
        await signOutOfGoogle().catch(() => {});
      } finally {
        setIsSubmitting(false);
      }
    };

    restoreGoogleSession().catch((err) => {
      console.error('[TTU Auth] Unexpected session restore error:', err);
      setError(err?.message || 'Could not restore your Google session. Please try again.');
      signOutOfGoogle().catch(() => {});
      setIsSubmitting(false);
    });
  }, [googleSignIn, googleVerificationPending]);

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setIsSubmitting(true);
    try {
      if (isRegistering) {
        const required = profile.role === 'student'
          ? [profile.fullName, profile.indexNumber, profile.email, profile.password, profile.program]
          : [profile.fullName, profile.email, profile.password, profile.phone, profile.department];
        if (required.some(value => !String(value).trim())) throw new Error('Complete all required registration fields.');
        const result = await signUpWithEmailPassword(profile, profile.password);
        if (!result.session?.access_token) {
          throw new Error('Supabase email confirmation is enabled. Disable Confirm email in Supabase Authentication > Providers > Email to allow immediate portal access.');
        }
        const { password: _password, ...portalProfile } = profile;
        const portal = await passwordPortalSignIn(result.session.access_token, portalProfile);
        if (!portal.success) throw new Error(portal.message);
      } else {
        const result = await signInWithEmailPassword(email, password);
        if (!result.session?.access_token) {
          throw new Error('Could not establish an authenticated session. Please check your credentials.');
        }
        const portal = await passwordPortalSignIn(result.session.access_token);
        if (!portal.success) throw new Error(portal.message);
      }
    } catch (submitError) {
      const msg = submitError.message || 'Could not complete sign-in.';
      if (msg.toLowerCase().includes('invalid login credentials')) {
        setError('Incorrect email or password. Please verify your credentials and try again.');
      } else {
        setError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      await signInWithGoogle(null);
    } catch (googleError) {
      setError(googleError.message || 'Google sign-in could not be started.');
      setIsSubmitting(false);
    }
  };

  if (googleVerificationPending) {
    return <div className="login-container animate-fade-in"><div className="login-card glass-panel verified-card"><div className="login-header"><div className="ttu-logo-sim"><img src={ttuLogo} alt="Takoradi Technical University Logo" className="ttu-logo-img" /></div></div><div className="verification-check" aria-hidden="true">OK</div><h1>Your Google account has been verified.</h1><p className="subtitle verification-copy">Your TTU Design Hub profile is ready.</p><button type="button" className="btn btn-primary w-full" onClick={confirmGoogleVerification}>Continue to TTU Design Hub</button></div></div>;
  }

  return <div className="login-container animate-fade-in"><main className="login-card glass-panel google-login-card"><div className="login-header"><div className="ttu-logo-sim"><img src={ttuLogo} alt="Takoradi Technical University Logo" className="ttu-logo-img" /></div><h1>{isRegistering ? 'Digital Dashboard Reminded' : 'Welcome'}</h1><p className="subtitle">{isRegistering ? 'Create your portal account with your email and password.' : 'Sign in to your academic workspace.'}</p></div>{error && <div className="login-error-alert"><span>{error}</span></div>}{notice && <div className="login-success-alert"><span>{notice}</span></div>}<form className="login-form registration-form" onSubmit={handlePasswordSubmit}>{isRegistering ? <RegistrationFields profile={profile} updateProfile={updateProfile} /> : <><div className="form-group"><label>Email Address</label><input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" required /></div><div className="form-group"><label>Password</label><input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required /></div></>}<button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? 'Please wait...' : isRegistering ? 'Create Account' : 'Sign In'}</button></form><button type="button" className="btn google-sign-in w-full" disabled={isSubmitting} onClick={handleGoogleSignIn}><span className="google-mark" aria-hidden="true">G</span>Continue with Google</button><div className="switch-mode-text"><button type="button" className="text-link" onClick={() => { setIsRegistering(value => !value); setError(''); setNotice(''); }}>{isRegistering ? 'Already registered? Sign in' : 'New to TTU Design Hub? Register your profile'}</button></div><div className="login-footer"><p>Copyright 2026 Takoradi Technical University</p><p>Faculty of Applied Arts and Technology</p></div></main></div>;
}

function RegistrationFields({ profile, updateProfile }) {
  return <><div className="form-group"><label>Role</label><select value={profile.role} onChange={event => updateProfile('role', event.target.value)}><option value="student">Student</option><option value="lecturer">Lecturer</option></select></div><div className="form-group"><label>Full Name</label><input value={profile.fullName} onChange={event => updateProfile('fullName', event.target.value)} required /></div><div className="form-group"><label>Email Address</label><input type="email" value={profile.email} onChange={event => updateProfile('email', event.target.value)} autoComplete="email" required /></div><div className="form-group"><label>Password</label><input type="password" value={profile.password} onChange={event => updateProfile('password', event.target.value)} autoComplete="new-password" minLength="6" required /></div>{profile.role === 'student' ? <><div className="form-group"><label>Index Number</label><input value={profile.indexNumber} onChange={event => updateProfile('indexNumber', event.target.value)} required /></div><div className="form-group"><label>Program</label><input value={profile.program} onChange={event => updateProfile('program', event.target.value)} required /></div><div className="student-signup-row"><div className="form-group"><label>Certificate Type</label><select value={profile.certificate} onChange={event => updateProfile('certificate', event.target.value)}><option>BTech</option><option>HND</option><option>Diploma</option></select></div><div className="form-group"><label>Level</label><select value={profile.year} onChange={event => updateProfile('year', event.target.value)}>{['Year 1', 'Year 2', 'Year 3', 'Year 4'].map(year => <option key={year}>{year}</option>)}</select></div></div></> : <><div className="form-group"><label>Lecturer ID <span className="optional-label">(optional)</span></label><input value={profile.lecturerId} onChange={event => updateProfile('lecturerId', event.target.value)} /></div><div className="form-group"><label>Phone Number</label><input type="tel" value={profile.phone} onChange={event => updateProfile('phone', event.target.value)} required /></div><div className="form-group"><label>Department</label><input value={profile.department} onChange={event => updateProfile('department', event.target.value)} required /></div><div className="form-group"><label>Courses Taught <span className="optional-label">(comma-separated)</span></label><input placeholder="e.g. Layout Design II, Vector Graphics I" value={Array.isArray(profile.courses) ? profile.courses.join(', ') : profile.courses || ''} onChange={event => updateProfile('courses', event.target.value.split(',').map(c => c.trim()).filter(Boolean))} /></div></>}</>;
}
