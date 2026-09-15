import React, { useContext, useEffect } from 'react';
import { DbContext } from './context/DbContextDefinition';
import Login from './components/Login';
import Navbar from './components/Navbar';
import StudentDashboard from './components/StudentDashboard';
import LecturerDashboard from './components/LecturerDashboard';
import AdminDashboard from './components/AdminDashboard';
import WhatsAppWidget from './components/WhatsAppWidget';

const DASHBOARD_BY_ROLE = {
  student: 'Student Dashboard',
  student_head: 'Student Dashboard',
  lecturer: 'Lecturer Dashboard',
  admin: 'Administration Dashboard'
};

export default function App() {
  const ctx = useContext(DbContext);

  useEffect(() => {
    const user = ctx?.currentUser;
    if (import.meta.env.DEV && user) {
      console.info('[TTU Auth] Dashboard decision', {
        userId: user.id,
        email: user.email,
        role: user.role,
        selectedDashboard: DASHBOARD_BY_ROLE[user.role] || 'Access denied'
      });
    }
  }, [ctx?.currentUser]);

  // Guard against context being undefined (e.g. during HMR reload)
  if (!ctx) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: '100vh', color: '#fff', fontFamily: 'Outfit, sans-serif', flexDirection: 'column', gap: '16px'
      }}>
        <div style={{
          width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)',
          borderTopColor: '#ffb300', borderRadius: '50%', animation: 'spin 1s linear infinite'
        }}></div>
        <p>Initializing...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const { currentUser, loading, googleVerificationPending } = ctx;

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        gap: '16px',
        color: '#fff',
        fontFamily: 'Outfit, sans-serif'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid rgba(255, 255, 255, 0.1)',
          borderTopColor: '#ffb300',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p>Loading Department Records...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // If user is not authenticated, show Login Screen
  if (!currentUser || googleVerificationPending) {
    return (
      <>
        <Login />
        <WhatsAppWidget />
      </>
    );
  }

  if (!DASHBOARD_BY_ROLE[currentUser.role]) {
    return (
      <main className="login-container">
        <section className="login-card glass-panel">
          <h1>Access denied</h1>
          <p className="subtitle">Profile not found, contact administrator.</p>
          <button className="btn btn-primary" type="button" onClick={ctx.logout}>Sign out</button>
        </section>
      </main>
    );
  }

  // Render Navbar and corresponding Dashboard based on Role
  return (
    <>
      <Navbar />
      {currentUser.role === 'admin' && <AdminDashboard />}
      {currentUser.role === 'lecturer' && <LecturerDashboard />}
      {(currentUser.role === 'student' || currentUser.role === 'student_head') && <StudentDashboard />}
      <WhatsAppWidget />
    </>
  );
}
