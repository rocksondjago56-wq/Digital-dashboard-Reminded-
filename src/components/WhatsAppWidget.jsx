import React, { useState, useContext, useEffect } from 'react';
import { DbContext } from '../context/DbContextDefinition';
import {
  getWhatsAppConfig,
  saveWhatsAppConfig,
  openWhatsApp,
  formatCustomBroadcast,
  createClassGroupTitle,
  formatClassGroupJoinRequest
} from '../utils/whatsapp';
import './WhatsAppWidget.css';

const CLASS_YEAR_OPTIONS = ['Year 1', 'Year 2', 'Year 3', 'Year 4'];

export default function WhatsAppWidget() {
  const {
    currentUser,
    classGroups = [],
    saveClassWhatsAppGroup,
    deleteClassWhatsAppGroup
  } = useContext(DbContext);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'groups', 'broadcast', 'settings'
  const [config, setConfig] = useState(getWhatsAppConfig());

  // Custom broadcast message state
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [tempPhone, setTempPhone] = useState(config.departmentPhone);
  const [tempGroupUrl, setTempGroupUrl] = useState(config.groupInviteUrl);
  const [copied, setCopied] = useState(false);
  const [copiedClassGroupId, setCopiedClassGroupId] = useState(null);
  const [classYear, setClassYear] = useState(currentUser?.year || 'Year 1');
  const [classHeadPhone, setClassHeadPhone] = useState('');
  const [classInviteLink, setClassInviteLink] = useState('');
  const [classGroupStatus, setClassGroupStatus] = useState('');

  const generatedClassTitle = createClassGroupTitle(classYear);
  const isClassHead = currentUser?.role === 'student_head';
  const visibleClassGroups = (classGroups || []).filter(group => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin' || currentUser.role === 'student_head') return true;
    return group.year === currentUser.year && Boolean(group.inviteLink);
  });

  useEffect(() => {
    setConfig(getWhatsAppConfig());
  }, []);

  useEffect(() => {
    if (isClassHead && currentUser?.year) {
      setClassYear(currentUser.year);
    }
  }, [currentUser?.id, currentUser?.year, isClassHead]);

  useEffect(() => {
    if (!isClassHead) return;
    const savedGroup = classGroups.find(group => group.year === classYear);
    setClassHeadPhone(savedGroup?.headPhone || '');
    setClassInviteLink(savedGroup?.inviteLink || '');
  }, [classGroups, classYear, isClassHead]);

  const handleOpenDirectChat = (customText = '') => {
    const defaultText = customText || (currentUser
      ? `Hello TTU Graphic Design Department, my name is ${currentUser.name} (${currentUser.role}). I have an inquiry regarding:`
      : 'Hello TTU Graphic Design Department, I have an inquiry regarding:');
    openWhatsApp({ phone: config.departmentPhone, text: defaultText });
  };

  const handleJoinGroup = () => {
    if (config.groupInviteUrl) {
      window.open(config.groupInviteUrl, '_blank', 'noopener,noreferrer');
    } else {
      alert('No WhatsApp group invite link has been configured yet.');
    }
  };

  const handleClassGroupOpen = (group) => {
    if (group.inviteLink) {
      window.open(group.inviteLink, '_blank', 'noopener,noreferrer');
      return;
    }

    openWhatsApp({
      phone: group.headPhone,
      text: formatClassGroupJoinRequest(group, currentUser)
    });
  };

  const handleSaveClassGroup = (e) => {
    e.preventDefault();
    if (!saveClassWhatsAppGroup || !classHeadPhone.trim() || !classInviteLink.trim()) return;

    const savedGroup = saveClassWhatsAppGroup({
      year: classYear,
      headName: currentUser?.name || 'Class Head',
      headId: currentUser?.id || '',
      headPhone: classHeadPhone,
      inviteLink: classInviteLink
    });

    setClassGroupStatus(`${savedGroup.title} saved`);
    setTimeout(() => setClassGroupStatus(''), 2500);
  };

  const copyGeneratedClassTitle = () => {
    navigator.clipboard.writeText(generatedClassTitle);
    setClassGroupStatus('Class title copied');
    setTimeout(() => setClassGroupStatus(''), 2500);
  };

  const openWhatsAppHome = () => {
    window.open('https://web.whatsapp.com/', '_blank', 'noopener,noreferrer');
  };

  const handleSendBroadcast = (e) => {
    e.preventDefault();
    if (!broadcastMsg.trim()) return;
    const formatted = formatCustomBroadcast(
      broadcastMsg,
      currentUser?.name || 'Department Member',
      currentUser?.role || 'Staff'
    );
    openWhatsApp({ text: formatted });
    setBroadcastMsg('');
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    const newConfig = {
      ...config,
      departmentPhone: tempPhone.trim(),
      groupInviteUrl: tempGroupUrl.trim()
    };
    saveWhatsAppConfig(newConfig);
    setConfig(newConfig);
    setShowSettings(false);
  };

  const copyGroupLink = () => {
    if (config.groupInviteUrl) {
      navigator.clipboard.writeText(config.groupInviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyClassGroupContact = (group) => {
    const valueToCopy = group.inviteLink || group.headPhone;
    if (!valueToCopy) return;
    navigator.clipboard.writeText(valueToCopy);
    setCopiedClassGroupId(group.id);
    setTimeout(() => setCopiedClassGroupId(null), 2000);
  };

  return (
    <div className="whatsapp-widget-container">
      {/* Floating Trigger Button */}
      <button
        className={`whatsapp-floating-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="WhatsApp Department Connect"
        title="Connect via WhatsApp"
      >
        <span className="whatsapp-icon">💬</span>
        <span className="whatsapp-btn-label desktop-only">WhatsApp Desk</span>
        <span className="whatsapp-pulse-ring"></span>
      </button>

      {/* WhatsApp Popup Card */}
      {isOpen && (
        <div className="whatsapp-modal glass-panel animate-fade-in">
          <div className="whatsapp-modal-header">
            <div className="whatsapp-header-brand">
              <div className="whatsapp-avatar-badge">
                <span>💬</span>
              </div>
              <div>
                <h4>TTU WhatsApp Hub</h4>
                <p className="whatsapp-substatus">● Online · Graphic Design Dept</p>
              </div>
            </div>
            <div className="whatsapp-header-actions">
              {(currentUser?.role === 'admin' || currentUser?.role === 'lecturer') && (
                <button
                  className="whatsapp-icon-btn"
                  onClick={() => setShowSettings(!showSettings)}
                  title="WhatsApp Settings"
                >
                  ⚙️
                </button>
              )}
              <button
                className="whatsapp-close-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Quick Settings View for Admins / Lecturers */}
          {showSettings ? (
            <div className="whatsapp-settings-pane">
              <h5>⚙️ Configure WhatsApp Integration</h5>
              <form onSubmit={handleSaveSettings}>
                <div className="whatsapp-input-group">
                  <label>Department WhatsApp Number (with country code):</label>
                  <input
                    type="text"
                    value={tempPhone}
                    onChange={(e) => setTempPhone(e.target.value)}
                    placeholder="e.g. 233241234567"
                    required
                  />
                </div>
                <div className="whatsapp-input-group">
                  <label>Class/Department WhatsApp Group Link:</label>
                  <input
                    type="url"
                    value={tempGroupUrl}
                    onChange={(e) => setTempGroupUrl(e.target.value)}
                    placeholder="https://chat.whatsapp.com/..."
                    required
                  />
                </div>
                <div className="whatsapp-btn-row">
                  <button type="submit" className="btn btn-accent btn-sm">Save Settings</button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowSettings(false)}>Cancel</button>
                </div>
              </form>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="whatsapp-nav-tabs">
                <button
                  className={`whatsapp-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                  onClick={() => setActiveTab('chat')}
                >
                  Help Desk
                </button>
                <button
                  className={`whatsapp-tab-btn ${activeTab === 'groups' ? 'active' : ''}`}
                  onClick={() => setActiveTab('groups')}
                >
                  Class Groups
                </button>
                <button
                  className={`whatsapp-tab-btn ${activeTab === 'broadcast' ? 'active' : ''}`}
                  onClick={() => setActiveTab('broadcast')}
                >
                  📢 Broadcast
                </button>
              </div>

              <div className="whatsapp-modal-body">
                {/* TAB 1: HELP DESK DIRECT CHAT */}
                {activeTab === 'chat' && (
                  <div className="whatsapp-chat-tab">
                    <p className="whatsapp-tab-intro">
                      Chat directly with the <strong>Takoradi Technical University Graphic Design Department Desk</strong> for instant queries, reminders, and support.
                    </p>

                    <div className="whatsapp-quick-prompts">
                      <button
                        className="whatsapp-prompt-pill"
                        onClick={() => handleOpenDirectChat('Hello, I need information regarding course timetable and deadlines.')}
                      >
                        🕒 Timetable & Deadlines
                      </button>
                      <button
                        className="whatsapp-prompt-pill"
                        onClick={() => handleOpenDirectChat('Hello, I have a question about studio project submissions.')}
                      >
                        🎨 Studio Submissions
                      </button>
                      <button
                        className="whatsapp-prompt-pill"
                        onClick={() => handleOpenDirectChat('Hello HOD Office, I am requesting assistance with my departmental portal account.')}
                      >
                        🔑 Account & Approvals
                      </button>
                    </div>

                    <button
                      className="btn btn-whatsapp-primary w-full mt-3"
                      onClick={() => handleOpenDirectChat()}
                    >
                      <span>💬 Start WhatsApp Chat</span>
                    </button>
                  </div>
                )}

                {/* TAB 2: CLASS & DEPARTMENT GROUPS */}
                {activeTab === 'groups' && (
                  <div className="whatsapp-groups-tab">
                    <p className="whatsapp-tab-intro">
                      Stay connected with instant announcements, studio files, and deadline reminders on WhatsApp.
                    </p>

                    {isClassHead && (
                      <form className="whatsapp-class-head-form" onSubmit={handleSaveClassGroup}>
                        <div className="whatsapp-generated-title">
                          <span>Auto class title</span>
                          <strong>{generatedClassTitle}</strong>
                        </div>

                        <div className="whatsapp-class-actions">
                          <button type="button" className="btn btn-secondary btn-sm" onClick={copyGeneratedClassTitle}>
                            Copy Title
                          </button>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={openWhatsAppHome}>
                            Open WhatsApp
                          </button>
                        </div>

                        <div className="whatsapp-input-group">
                          <label htmlFor="classYear">Class / Year</label>
                          <select
                            id="classYear"
                            value={classYear}
                            onChange={(e) => setClassYear(e.target.value)}
                          >
                            {CLASS_YEAR_OPTIONS.map(year => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                          </select>
                        </div>

                        <div className="whatsapp-input-group">
                          <label htmlFor="classHeadPhone">Class Head WhatsApp Number</label>
                          <input
                            id="classHeadPhone"
                            type="tel"
                            value={classHeadPhone}
                            onChange={(e) => setClassHeadPhone(e.target.value)}
                            placeholder="e.g. 233241234567"
                            required
                          />
                        </div>

                        <div className="whatsapp-input-group">
                          <label htmlFor="classInviteLink">WhatsApp Group Invite Link</label>
                          <input
                            id="classInviteLink"
                            type="url"
                            value={classInviteLink}
                            onChange={(e) => setClassInviteLink(e.target.value)}
                            placeholder="https://chat.whatsapp.com/..."
                            required
                          />
                        </div>

                        <button type="submit" className="btn btn-whatsapp-primary w-full">
                          Save Group Link
                        </button>
                        {classGroupStatus && <p className="whatsapp-save-status">{classGroupStatus}</p>}
                      </form>
                    )}

                    <div className="whatsapp-group-list">
                      {visibleClassGroups.length > 0 ? visibleClassGroups.map(group => (
                        <div className="whatsapp-group-card" key={group.id}>
                          <div className="whatsapp-group-info">
                            <span className="whatsapp-group-icon">WA</span>
                            <div>
                              <strong>{group.title}</strong>
                              <p>{group.year} - Class Head: {group.headName || 'Class Head'}</p>
                              <p>{group.inviteLink ? 'Invite link available' : `WhatsApp: +${group.headPhone}`}</p>
                            </div>
                          </div>
                          <div className="whatsapp-group-actions">
                            <button
                              className="btn btn-whatsapp-primary btn-sm"
                              onClick={() => handleClassGroupOpen(group)}
                              disabled={!group.inviteLink && !group.headPhone}
                            >
                              {group.inviteLink ? 'Join Group' : 'Message Class Head'}
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => copyClassGroupContact(group)}
                              disabled={!group.inviteLink && !group.headPhone}
                            >
                              {copiedClassGroupId === group.id ? 'Copied' : 'Copy'}
                            </button>
                            {(currentUser?.role === 'admin' || (isClassHead && group.headId === currentUser?.id)) && deleteClassWhatsAppGroup && (
                              <button
                                className="btn btn-whatsapp-danger btn-sm"
                                onClick={() => deleteClassWhatsAppGroup(group.id)}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      )) : (
                        <div className="whatsapp-empty-group">
                          No class WhatsApp group has been saved for your year yet.
                        </div>
                      )}
                    </div>

                    <div className="whatsapp-group-card">
                      <div className="whatsapp-group-info">
                        <span className="whatsapp-group-icon">👥</span>
                        <div>
                          <strong>TTU Graphic Design Official</strong>
                          <p>All Years & Faculty Notice Board</p>
                        </div>
                      </div>
                      <div className="whatsapp-group-actions">
                        <button className="btn btn-whatsapp-primary btn-sm" onClick={handleJoinGroup}>
                          Join Group
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={copyGroupLink}>
                          {copied ? '✓ Copied' : '📋 Copy Link'}
                        </button>
                      </div>
                    </div>

                    <div className="whatsapp-tip-box">
                      💡 <em>Tip: You can also click the <strong>"Share to WhatsApp"</strong> button on any announcement or deadline to forward it to your class group.</em>
                    </div>
                  </div>
                )}

                {/* TAB 3: BROADCAST */}
                {activeTab === 'broadcast' && (
                  <div className="whatsapp-broadcast-tab">
                    <p className="whatsapp-tab-intro">
                      Draft a notice or quick reminder and forward it to WhatsApp contacts or student class groups with one click.
                    </p>

                    <form onSubmit={handleSendBroadcast}>
                      <textarea
                        className="whatsapp-broadcast-input"
                        placeholder="Type your notice, reminder, or studio alert here..."
                        rows="3"
                        value={broadcastMsg}
                        onChange={(e) => setBroadcastMsg(e.target.value)}
                        required
                      ></textarea>
                      <button type="submit" className="btn btn-whatsapp-primary w-full mt-2">
                        <span>📲 Open & Share on WhatsApp</span>
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="whatsapp-modal-footer">
            <span>Faculty of Applied Arts & Technology · TTU</span>
          </div>
        </div>
      )}
    </div>
  );
}
