import React, { useContext, useEffect, useRef, useState } from 'react';
import { DbContext } from '../context/DbContextDefinition';
import './Login.css';
import ttuLogo from '../ttu-logo.png.png';
import { getSupabaseSession, saveSupabaseProfile, signInWithEmailPassword, signInWithGoogle, signUpWithEmailPassword, signOutOfGoogle, sendPasswordReset, updateUserPassword, supabase } from '../lib/supabase';

const EMPTY_PROFILE = { role: 'student', fullName: '', indexNumber: '', email: '', password: '', program: '', certificate: 'BTech', year: 'Year 1', lecturerId: '', phone: '', department: 'Graphic Design', courses: [], position: 'Department Administrator', accessCode: '' };

export default function Login({ isPasswordRecovery: initialPasswordRecovery = false }) {
  const { login, googleSignIn, googleVerificationPending, confirmGoogleVerification, passwordPortalSignIn } = useContext(DbContext);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showEmailSignIn, setShowEmailSignIn] = useState(false);
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(() => {
    if (initialPasswordRecovery) return true;
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      return hash.includes('type=recovery') || search.includes('type=recovery');
    }
    return false;
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

    // 2. Listen for Supabase PASSWORD_RECOVERY event
    let authListener = null;
    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsResettingPassword(true);
          setShowEmailSignIn(true);
          setError('');
          if (session?.user?.email) {
            setEmail(session.user.email);
          }
        }
      });
      authListener = data;
    }

    const isRecovery = (typeof window !== 'undefined') && (
      window.location.hash.includes('type=recovery') ||
      window.location.search.includes('type=recovery')
    );
    if (isRecovery || isResettingPassword) {
      return () => {
        authListener?.subscription?.unsubscribe();
      };
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

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [googleSignIn, googleVerificationPending, isResettingPassword]);

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setIsSubmitting(true);
    try {
      if (isRegistering) {
        let required = [];
        if (profile.role === 'student') {
          required = [profile.fullName, profile.indexNumber, profile.email, profile.password, profile.program];
        } else if (profile.role === 'admin') {
          required = [profile.fullName, profile.email, profile.password, profile.phone, profile.department, profile.accessCode];
        } else {
          required = [profile.fullName, profile.email, profile.password, profile.phone, profile.department];
        }
        if (required.some(value => !String(value).trim())) throw new Error('Complete all required registration fields.');
        const result = await signUpWithEmailPassword(profile, profile.password);
        if (!result.session?.access_token) {
          throw new Error('Supabase email confirmation is enabled. Disable Confirm email in Supabase Authentication > Providers > Email to allow immediate portal access.');
        }
        const { password: _password, ...portalProfile } = profile;
        const portal = await passwordPortalSignIn(result.session.access_token, portalProfile);
        if (!portal.success) throw new Error(portal.message);
      } else {
        let signedIn = false;
        let lastError = null;
        try {
          const result = await signInWithEmailPassword(email, password);
          if (result?.session?.access_token) {
            const portal = await passwordPortalSignIn(result.session.access_token);
            if (portal?.success) {
              signedIn = true;
            } else {
              lastError = new Error(portal?.message || 'Portal sign-in failed.');
            }
          }
        } catch (supabaseErr) {
          lastError = supabaseErr;
        }

        // Fallback to database / local login if Supabase auth fails (e.g. system accounts, admin@ttu.edu.gh, etc.)
        if (!signedIn) {
          const portalLogin = await login(email, password);
          if (portalLogin?.success) {
            signedIn = true;
          } else if (lastError) {
            throw lastError;
          } else {
            throw new Error(portalLogin?.message || 'Incorrect email or password.');
          }
        }
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
    try {
      if (isRegistering && profile.role === 'admin' && !profile.accessCode?.trim()) {
        throw new Error('Please enter your Administrator Access Code before continuing with Google.');
      }
      setIsSubmitting(true);
      await signInWithGoogle(isRegistering ? profile : null);
    } catch (googleError) {
      setError(googleError.message || 'Google sign-in could not be started.');
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Enter your email address above, then click "Forgot Password?".');
      return;
    }
    setIsSubmitting(true);
    setError('');
    setNotice('');
    try {
      await sendPasswordReset(trimmedEmail);
      setForgotPasswordSent(true);
      setNotice(`Password reset link sent to ${trimmedEmail}! Check your inbox and spam folder.`);
    } catch (resetErr) {
      console.error('[TTU Auth] Forgot password error:', resetErr);
      const msg = resetErr?.message || '';
      if (msg.toLowerCase().includes('rate limit')) {
        setError('Too many reset requests sent. Please wait a few minutes before trying again.');
      } else {
        setError(msg || 'Could not send password reset email. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePasswordSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateUserPassword(newPassword);
      await signOutOfGoogle().catch(() => {});
      window.history.replaceState(null, '', window.location.pathname);
      setIsResettingPassword(false);
      setNewPassword('');
      setConfirmPassword('');
      setShowEmailSignIn(true);
      setNotice('Password updated successfully! Please sign in with your new password.');
    } catch (updateErr) {
      console.error('[TTU Auth] Password update failed:', updateErr);
      setError(updateErr?.message || 'Could not update your password. The reset link may have expired.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (googleVerificationPending) {
    return <div className="login-container animate-fade-in"><div className="login-card glass-panel verified-card"><div className="login-header"><div className="ttu-logo-sim"><img src={ttuLogo} alt="Takoradi Technical University Logo" className="ttu-logo-img" /></div></div><div className="verification-check" aria-hidden="true">OK</div><h1>Your Google account has been verified.</h1><p className="subtitle verification-copy">Your TTU Design Hub profile is ready.</p><button type="button" className="btn btn-primary w-full" onClick={confirmGoogleVerification}>Continue to TTU Design Hub</button></div></div>;
  }

  return (
    <div className="login-container animate-fade-in">
      <main className="login-card glass-panel google-login-card">
        <div className="login-header">
          <div className="ttu-logo-sim">
            <img src={ttuLogo} alt="Takoradi Technical University Logo" className="ttu-logo-img" />
          </div>
          <h1>{isResettingPassword ? 'Reset Your Password' : isRegistering ? 'Create Your Account' : 'Welcome Back'}</h1>
          <p className="subtitle">
            {isResettingPassword
              ? 'Enter your new password below to secure your TTU portal account.'
              : isRegistering
                ? 'Set up your TTU Design Hub portal account.'
                : 'Sign in to your academic workspace.'}
          </p>
        </div>

        {error && <div className="login-error-alert"><span>{error}</span></div>}
        {notice && <div className="login-success-alert"><span>{notice}</span></div>}

        {isResettingPassword ? (
          <form className="email-signin-section animate-fade-in" onSubmit={handleUpdatePasswordSubmit}>
            <div className="form-group">
              <label htmlFor="reset-new-password">New Password</label>
              <input
                id="reset-new-password"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="At least 6 characters"
                minLength={6}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="reset-confirm-password">Confirm New Password</label>
              <input
                id="reset-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Re-enter your new password"
                minLength={6}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Updating Password...' : 'Save New Password'}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary w-full"
              style={{ marginTop: '10px' }}
              onClick={() => {
                setIsResettingPassword(false);
                window.history.replaceState(null, '', window.location.pathname);
              }}
            >
              Cancel &amp; Back to Sign In
            </button>
          </form>
        ) : !isRegistering ? (
          <div className="google-hero-signin">
            <div className="google-large-logo-wrap">
              <svg className="google-large-icon" width="56" height="56" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            </div>

            <p className="google-signin-instruction">
              Sign in with your Google account to securely access your student, lecturer, or administration dashboard.
            </p>

            <button
              type="button"
              className="btn google-sign-in google-sign-in-prominent w-full"
              disabled={isSubmitting}
              onClick={handleGoogleSignIn}
            >
              <svg className="google-icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="sign-in-divider"><span>or sign in with email</span></div>

            {showEmailSignIn ? (
              <form className="email-signin-section animate-fade-in" onSubmit={handlePasswordSubmit}>
                <div className="form-group">
                  <label htmlFor="signin-email">Email Address</label>
                  <input
                    id="signin-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="your@email.com"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="signin-password">Password</label>
                  <input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="Your password"
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Signing in...' : 'Sign In with Email'}
                </button>
                {forgotPasswordSent ? (
                  <p className="forgot-password-sent">✅ Reset link sent! Check your inbox.</p>
                ) : (
                  <button type="button" className="forgot-password-link" onClick={handleForgotPassword} disabled={isSubmitting}>
                    Forgot Password?
                  </button>
                )}
                <div className="demo-accounts-helper">
                  <span className="demo-accounts-label">Demo accounts:</span>
                  <div className="demo-chips">
                    <button
                      type="button"
                      className="demo-chip"
                      onClick={() => {
                        setEmail('admin@ttu.edu.gh');
                        setPassword('admin123');
                      }}
                    >
                      👑 Admin
                    </button>
                    <button
                      type="button"
                      className="demo-chip"
                      onClick={() => {
                        setEmail('lecturer@ttu.edu.gh');
                        setPassword('lecturer123');
                      }}
                    >
                      👨‍🏫 Lecturer
                    </button>
                    <button
                      type="button"
                      className="demo-chip"
                      onClick={() => {
                        setEmail('student@ttu.edu.gh');
                        setPassword('student123');
                      }}
                    >
                      🎓 Student
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <button
                type="button"
                className="btn btn-outline-secondary w-full"
                onClick={() => setShowEmailSignIn(true)}
              >
                Sign in with Email &amp; Password
              </button>
            )}
          </div>
        ) : (
          <>
            <form className="login-form registration-form" onSubmit={handlePasswordSubmit}>
              <RegistrationFields profile={profile} updateProfile={updateProfile} />
              <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Please wait...' : 'Create Account'}
              </button>
            </form>

            <div className="sign-in-divider">
              <span>or</span>
            </div>

            <button
              type="button"
              className="btn google-sign-in w-full"
              disabled={isSubmitting}
              onClick={handleGoogleSignIn}
            >
              <svg className="google-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </button>
          </>
        )}

        {!isResettingPassword && (
          <div className="switch-mode-text">
            <button
              type="button"
              className="text-link"
              onClick={() => {
                setIsRegistering(value => !value);
                setError('');
                setNotice('');
              }}
            >
              {isRegistering ? 'Already registered? Sign in' : 'New to TTU Design Hub? Register your profile'}
            </button>
          </div>
        )}

        <div className="login-footer">
          <p>Copyright 2026 Takoradi Technical University</p>
          <p>Faculty of Applied Arts and Technology</p>
        </div>
      </main>
    </div>
  );
}

function RegistrationFields({ profile, updateProfile }) {
  return (
    <>
      <div className="form-group">
        <label>Role</label>
        <select value={profile.role} onChange={event => updateProfile('role', event.target.value)}>
          <option value="student">Student</option>
          <option value="lecturer">Lecturer</option>
          <option value="admin">Administrator</option>
        </select>
      </div>
      <div className="form-group">
        <label>Full Name</label>
        <input value={profile.fullName} onChange={event => updateProfile('fullName', event.target.value)} required />
      </div>
      <div className="form-group">
        <label>Email Address</label>
        <input type="email" value={profile.email} onChange={event => updateProfile('email', event.target.value)} autoComplete="email" required />
      </div>
      <div className="form-group">
        <label>Password</label>
        <input type="password" value={profile.password} onChange={event => updateProfile('password', event.target.value)} autoComplete="new-password" minLength="6" required />
      </div>

      {profile.role === 'student' ? (
        <>
          <div className="form-group">
            <label>Index Number</label>
            <input value={profile.indexNumber} onChange={event => updateProfile('indexNumber', event.target.value)} required />
          </div>
          <div className="form-group">
            <label>Program</label>
            <input value={profile.program} onChange={event => updateProfile('program', event.target.value)} required />
          </div>
          <div className="student-signup-row">
            <div className="form-group">
              <label>Certificate Type</label>
              <select value={profile.certificate} onChange={event => updateProfile('certificate', event.target.value)}>
                <option>BTech</option>
                <option>HND</option>
                <option>Diploma</option>
              </select>
            </div>
            <div className="form-group">
              <label>Level</label>
              <select value={profile.year} onChange={event => updateProfile('year', event.target.value)}>
                {['Year 1', 'Year 2', 'Year 3', 'Year 4'].map(year => <option key={year}>{year}</option>)}
              </select>
            </div>
          </div>
        </>
      ) : profile.role === 'admin' ? (
        <>
          <div className="form-group">
            <label>Staff / Employee ID <span className="optional-label">(optional)</span></label>
            <input placeholder="e.g. ADM-0420" value={profile.lecturerId} onChange={event => updateProfile('lecturerId', event.target.value)} />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input type="tel" placeholder="e.g. +233 24 123 4567" value={profile.phone} onChange={event => updateProfile('phone', event.target.value)} required />
          </div>
          <div className="form-group">
            <label>Department / Office</label>
            <input value={profile.department} onChange={event => updateProfile('department', event.target.value)} required />
          </div>
          <div className="form-group">
            <label>Administrative Position</label>
            <input placeholder="e.g. Department Administrator" value={profile.position} onChange={event => updateProfile('position', event.target.value)} />
          </div>
          <div className="form-group admin-access-code-group">
            <label>Administrator Access Code <span className="required-badge">*</span></label>
            <input
              type="password"
              placeholder="Enter secret administrator access code"
              value={profile.accessCode}
              onChange={event => updateProfile('accessCode', event.target.value)}
              autoComplete="off"
              required
            />
            <small className="field-hint">Required to authorize administrator privileges.</small>
          </div>
        </>
      ) : (
        <>
          <div className="form-group">
            <label>Lecturer ID <span className="optional-label">(optional)</span></label>
            <input value={profile.lecturerId} onChange={event => updateProfile('lecturerId', event.target.value)} />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input type="tel" value={profile.phone} onChange={event => updateProfile('phone', event.target.value)} required />
          </div>
          <div className="form-group">
            <label>Department</label>
            <input value={profile.department} onChange={event => updateProfile('department', event.target.value)} required />
          </div>
          <div className="form-group">
            <label>Courses Taught <span className="optional-label">(comma-separated)</span></label>
            <input placeholder="e.g. Layout Design II, Vector Graphics I" value={Array.isArray(profile.courses) ? profile.courses.join(', ') : profile.courses || ''} onChange={event => updateProfile('courses', event.target.value.split(',').map(c => c.trim()).filter(Boolean))} />
          </div>
        </>
      )}
    </>
  );
}
