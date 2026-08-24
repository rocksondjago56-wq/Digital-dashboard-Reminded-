import React, { useContext } from 'react';
import { DbContext } from './context/DbContextDefinition';
import Login from './components/Login';
import Navbar from './components/Navbar';
import StudentDashboard from './components/StudentDashboard';
import LecturerDashboard from './components/LecturerDashboard';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const ctx = useContext(DbContext);

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

  const { currentUser, loading } = ctx;

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
  if (!currentUser) {
    return <Login />;
  }

  // Render Navbar and corresponding Dashboard based on Role
  return (
    <>
      <Navbar />
      {currentUser.role === 'admin' && <AdminDashboard />}
      {currentUser.role === 'lecturer' && <LecturerDashboard />}
      {currentUser.role === 'student' && <StudentDashboard />}
    </>
  );
}
