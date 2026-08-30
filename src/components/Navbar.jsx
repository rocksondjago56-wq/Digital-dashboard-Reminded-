import React, { useContext, useState, useRef, useEffect } from 'react';
import { DbContext } from '../context/DbContextDefinition';
import './Navbar.css';
import ttuLogo from '../ttu-logo.png.png';
import { openWhatsApp, getWhatsAppConfig } from '../utils/whatsapp';

export default function Navbar() {
  const { currentUser, logout, notifications, markAllNotificationsAsRead, updateUserProfilePic } = useContext(DbContext);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);
  const fileInputRef = useRef(null);

  // Close notifications dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!currentUser) return null;

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    updateUserProfilePic(currentUser.id, file);
    e.target.value = '';
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleToggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      markAllNotificationsAsRead();
    }
  };

  const handleWhatsAppQuickChat = () => {
    const config = getWhatsAppConfig();
    openWhatsApp({
      phone: config.departmentPhone,
      text: `Hello TTU Graphic Design Department Desk, this is ${currentUser.name} (${currentUser.role}).`
    });
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin': return 'badge-role-admin';
      case 'lecturer': return 'badge-role-lecturer';
      case 'student_head': return 'badge-role-student-head';
      default: return 'badge-role-student';
    }
  };

  const getRoleLabel = (role) => {
    if (role === 'student_head') return 'STUDENT HEAD';
    return role.toUpperCase();
  };

  const formatTimestamp = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <nav className="navbar-container glass-panel">
      <div className="navbar-left">
        <div className="navbar-logo">
          <img src={ttuLogo} alt="TTU Logo" className="navbar-logo-img" />
          <span className="logo-department">Graphic Design Dept</span>
        </div>
      </div>

      <div className="navbar-right">
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="image/*" 
          onChange={handleFileChange} 
        />
        <div className="user-profile-widget" onClick={handleAvatarClick} title="Click to change profile picture">
          <div className="user-avatar clickable-avatar">
            {currentUser.profilePic ? (
              <img src={currentUser.profilePic} alt={currentUser.name} className="user-avatar-img" />
            ) : (
              currentUser.name.charAt(0)
            )}
            <span className="avatar-camera-badge">📷</span>
          </div>
          <div className="user-info desktop-only">
            <span className="user-name">{currentUser.name}</span>
            <span className={`user-role ${getRoleBadgeClass(currentUser.role)}`}>
              {getRoleLabel(currentUser.role)}
            </span>
          </div>
        </div>

        {/* WhatsApp Desk Button */}
        <button
          className="navbar-icon-btn"
          onClick={handleWhatsAppQuickChat}
          aria-label="WhatsApp Department Desk"
          title="Chat with Department Desk on WhatsApp"
          style={{ background: 'rgba(37, 211, 102, 0.15)', color: '#25D366' }}
        >
          <span>💬</span>
        </button>

        {/* Notification Bell */}
        <div className="notification-bell-container" ref={dropdownRef}>
          <button 
            className="navbar-icon-btn" 
            onClick={handleToggleNotifications}
            aria-label="Notifications"
          >
            <span className="bell-emoji">🔔</span>
            {unreadCount > 0 && (
              <span className="bell-badge">{unreadCount}</span>
            )}
          </button>

          {/* Notifications Dropdown Drawer */}
          {showNotifications && (
            <div className="notifications-dropdown glass-panel animate-fade-in">
              <div className="notifications-header">
                <h3>Notifications Feed</h3>
                <span className="notifications-count">{notifications.length} logged</span>
              </div>
              <div className="notifications-list">
                {notifications.length === 0 ? (
                  <div className="empty-notifications">
                    <span>🔔</span>
                    <p>All quiet! No notifications yet.</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={`notification-item ${!n.isRead ? 'unread' : ''}`}>
                      <div className="notification-bullet"></div>
                      <div className="notification-content">
                        <p>{n.text}</p>
                        <span className="notification-time">{formatTimestamp(n.timestamp)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button onClick={logout} className="btn btn-secondary logout-btn">
          <span>🚪</span> <span className="desktop-only">Sign Out</span>
        </button>
      </div>
    </nav>
  );
}
