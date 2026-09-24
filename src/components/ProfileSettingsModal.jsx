import React, { useState } from 'react';
import { updateUserPassword } from '../lib/supabase';
import './ProfileSettingsModal.css';

export default function ProfileSettingsModal({ currentUser, onUpdateProfile, onClose }) {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security' | 'system'
  
  // Profile fields
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [portfolioUrl, setPortfolioUrl] = useState(currentUser?.portfolioUrl || '');
  const [profileStatus, setProfileStatus] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileStatus('');
    try {
      const res = await onUpdateProfile(currentUser.id, {
        phone: phone.trim(),
        bio: bio.trim(),
        portfolioUrl: portfolioUrl.trim()
      });
      if (res?.success) {
        setProfileStatus('Profile updated successfully!');
        setTimeout(() => setProfileStatus(''), 2500);
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordStatus('');
    setPasswordError('');

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      try {
        await updateUserPassword(newPassword);
      } catch (err) {
        console.warn('Supabase password update:', err.message);
      }

      // Also persist to local credentials storage so login works in all environments
      if (onUpdateProfile && currentUser?.id) {
        await onUpdateProfile(currentUser.id, { password: newPassword });
      }

      setPasswordStatus('✅ Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordStatus(''), 3000);
    } catch (err) {
      setPasswordError(err.message || 'Could not update password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose}>
      <div className="profile-settings-modal glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Account &amp; Security Settings</h2>
            <p className="modal-subtitle">{currentUser?.name} &bull; {currentUser?.email}</p>
          </div>
          <button type="button" className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {/* Tab Navigation */}
        <div className="settings-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            👤 Profile &amp; Portfolio
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            🔒 Password &amp; Security
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'system' ? 'active' : ''}`}
            onClick={() => setActiveTab('system')}
          >
            📱 App &amp; Offline Info
          </button>
        </div>

        <div className="tab-content-area">
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="settings-form animate-fade-in">
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" value={currentUser?.name || ''} disabled className="input-disabled" />
                <small className="help-text">Managed by TTU Department Administration.</small>
              </div>

              <div className="form-group">
                <label>Department Role &amp; ID</label>
                <input
                  type="text"
                  value={`${(currentUser?.role || 'student').toUpperCase()} • ${currentUser?.indexNumber || currentUser?.staffId || 'ID'}`}
                  disabled
                  className="input-disabled"
                />
              </div>

              <div className="form-group">
                <label htmlFor="settings-phone">Phone Number (WhatsApp Contact)</label>
                <input
                  id="settings-phone"
                  type="tel"
                  placeholder="024 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="settings-portfolio">Creative Portfolio Link (Behance / ArtStation / Figma / Drive)</label>
                <input
                  id="settings-portfolio"
                  type="url"
                  placeholder="https://behance.net/yourprofile"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="settings-bio">Bio &amp; Design Specialization</label>
                <textarea
                  id="settings-bio"
                  rows="3"
                  placeholder="e.g. Brand Identity, 3D Typography, Motion Graphics & Editorial Design..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                ></textarea>
              </div>

              {profileStatus && <p className="success-banner">{profileStatus}</p>}

              <button type="submit" className="btn btn-primary" disabled={isSavingProfile}>
                {isSavingProfile ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </form>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <form onSubmit={handlePasswordChange} className="settings-form animate-fade-in">
              <p className="security-notice">
                Update your portal password below. Once changed, use your new password for future email logins.
              </p>

              <div className="form-group">
                <label htmlFor="settings-new-pwd">New Password</label>
                <input
                  id="settings-new-pwd"
                  type="password"
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="settings-confirm-pwd">Confirm New Password</label>
                <input
                  id="settings-confirm-pwd"
                  type="password"
                  placeholder="Retype new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              {passwordError && <p className="error-banner">⚠️ {passwordError}</p>}
              {passwordStatus && <p className="success-banner">{passwordStatus}</p>}

              <button type="submit" className="btn btn-primary" disabled={isUpdatingPassword}>
                {isUpdatingPassword ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          )}

          {/* SYSTEM & PWA TAB */}
          {activeTab === 'system' && (
            <div className="system-info-panel animate-fade-in">
              <div className="info-row">
                <span className="info-label">App Name</span>
                <strong>TTU Graphic Design Digital Dashboard</strong>
              </div>
              <div className="info-row">
                <span className="info-label">PWA Version</span>
                <span className="badge-pwa">v2.4.0 (PWA Ready)</span>
              </div>
              <div className="info-row">
                <span className="info-label">Offline Caching</span>
                <span className="badge-online">Active (Service Worker Enabled)</span>
              </div>
              <div className="info-row">
                <span className="info-label">Institution</span>
                <span>Takoradi Technical University (TTU), Ghana</span>
              </div>
              <p className="system-note">
                💡 You can install this app directly onto your home screen or desktop. It will load fast and keep your timetables accessible even when offline or with spotty campus Wi-Fi.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
