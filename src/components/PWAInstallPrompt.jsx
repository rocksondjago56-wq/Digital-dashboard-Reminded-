import React, { useState, useEffect } from 'react';
import './PWAInstallPrompt.css';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already in standalone/PWA mode
    const isStandalone = (typeof window !== 'undefined') && (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
    if (isStandalone) return;

    // Check if user dismissed recently this session
    if (sessionStorage.getItem('ttu_pwa_dismissed')) return;

    // Handle Android / Chrome / Edge beforeinstallprompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !/crios|fxios|opios/i.test(userAgent);
    if (isIosDevice && !isStandalone) {
      setIsIOS(true);
      // Show prompt after a short delay on iOS
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3500);
      return () => clearTimeout(timer);
    }

    // Hide if successfully installed
    const handleAppInstalled = () => {
      setIsVisible(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('ttu_pwa_dismissed', '1');
  };

  if (!isVisible) return null;

  return (
    <aside className="pwa-install-banner" aria-label="Install TTU Design Hub Application">
      <div className="pwa-banner-left">
        <img
          src="/icons/pwa-192x192.png"
          alt="TTU Hub App Icon"
          className="pwa-app-icon"
          width="44"
          height="44"
        />
        <div className="pwa-banner-text">
          <span className="pwa-banner-title">Install TTU Hub</span>
          {isIOS ? (
            <span className="pwa-banner-subtitle pwa-ios-instructions">
              Tap Share <span className="pwa-ios-share-icon" aria-hidden="true">⎋</span> then "Add to Home Screen"
            </span>
          ) : (
            <span className="pwa-banner-subtitle">Fast offline access &amp; instant notifications</span>
          )}
        </div>
      </div>
      <div className="pwa-banner-actions">
        {!isIOS && (
          <button
            type="button"
            className="pwa-install-btn"
            onClick={handleInstallClick}
          >
            Install
          </button>
        )}
        <button
          type="button"
          className="pwa-dismiss-btn"
          onClick={handleDismiss}
          aria-label="Dismiss install banner"
        >
          &times;
        </button>
      </div>
    </aside>
  );
}
