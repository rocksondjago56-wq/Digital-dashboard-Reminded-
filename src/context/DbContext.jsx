import React, { createContext, useState, useEffect } from 'react';

export const DbContext = createContext();

// Mock Initial Data
const initialUsers = [
  { id: '1', email: 'admin@ttu.edu.gh', name: 'Dr. Rockson (Head of Admin)', role: 'admin', password: 'admin123', department: 'Graphic Design' },
  { id: '2', email: 'lecturer@ttu.edu.gh', name: 'Prof. Andrews K. Mensah', role: 'lecturer', password: 'lecturer123', department: 'Graphic Design', courses: ['Layout Design II', 'Vector Graphics I', 'Visual Portfolio Prep'] },
  { id: '3', email: 'student@ttu.edu.gh', name: 'Emmanuel Rockson', role: 'student', password: 'student123', department: 'Graphic Design', year: 'Year 3', studentId: '0420210088', indexNumber: '0420210088', completedDeadlines: [] }
];

const initialDeadlines = [
  {
    id: 'd1',
    title: 'Layout & Page Design Project',
    description: 'Design and submit a 16-page magazine layout using Adobe InDesign. Export as PDF with print marks.',
    course: 'Layout Design II',
    dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 4 days from now
    type: 'assignment',
    status: 'pending',
    author: 'Prof. Andrews K. Mensah',
    authorRole: 'lecturer'
  },
  {
    id: 'd2',
    title: 'Typography & Logo Presentation',
    description: 'Submit vector design concepts for the TTU Campus Beautification brand identity project.',
    course: 'Vector Graphics I',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
    type: 'project',
    status: 'pending',
    author: 'Prof. Andrews K. Mensah',
    authorRole: 'lecturer'
  },
  {
    id: 'd3',
    title: 'End of Semester Theory Exam',
    description: 'Written exam testing core layout grids, typesetting rules, and prepress processes.',
    course: 'Layout Design II',
    dueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 12 days from now
    type: 'examination',
    status: 'pending',
    author: 'Dr. Rockson (Head of Admin)',
    authorRole: 'admin'
  }
];

const initialEvents = [
  {
    id: 'e1',
    title: 'UX/UI Industry Seminar & Workshop',
    description: 'A practical masterclass on Figma and UX research led by senior designers from Google and TTU Alumni.',
    location: 'TTU Creative Arts Main Auditorium',
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '10:00 AM',
    type: 'workshop',
    organizer: 'Graphic Design Dept',
    author: 'Graphic Design Dept',
    authorRole: 'admin'
  },
  {
    id: 'e2',
    title: 'Annual Department Design Competition',
    description: 'Theme: "Design for Social Change in Ghana". Submit posters and branding items to win laptops and internship opportunities.',
    location: 'Graphic Design Exhibition Gallery',
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '09:00 AM',
    type: 'competition',
    organizer: 'TTU Creative Arts Guild',
    author: 'TTU Creative Arts Guild',
    authorRole: 'admin'
  },
  {
    id: 'e3',
    title: 'Emergency Faculty Board Meeting',
    description: 'Urgent meeting regarding the upcoming end-of-semester examinations and studio cleanups.',
    location: 'Department Board Room',
    date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '02:00 PM',
    type: 'meeting',
    organizer: 'HOD Office',
    author: 'HOD Office',
    authorRole: 'admin'
  }
];

const initialAnnouncements = [
  {
    id: 'a1',
    title: 'Welcome to the Second Semester',
    content: 'We welcome all graphic design students back to campus. Studio card collections are now active at the HOD Office.',
    author: 'HOD Office',
    authorRole: 'admin',
    date: new Date().toISOString().split('T')[0],
    category: 'notice',
    isPinned: true
  },
  {
    id: 'a2',
    title: 'Vectr Studio License Extension',
    content: 'TTU has extended student licenses for Adobe Creative Cloud. Retrieve your custom code from your class representative.',
    author: 'IT Desk',
    authorRole: 'admin',
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    category: 'update',
    isPinned: false
  },
  {
    id: 'a3',
    title: 'Postponement of Practical Submissions',
    content: 'Please note that the deadline for Vector Graphics Studio Work 1 has been moved to next Friday due to computer lab maintenance.',
    author: 'Prof. Andrews K. Mensah',
    authorRole: 'lecturer',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    category: 'calendar',
    isPinned: false
  }
];

const initialNotifications = [
  { id: 'n1', text: 'Prof. Andrews added Layout & Page Design Project due in 4 days.', timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(), isRead: false },
  { id: 'n2', text: 'HOD Office scheduled Emergency Faculty Board Meeting for tomorrow.', timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), isRead: false },
  { id: 'n3', text: 'IT Desk published CC license code extension.', timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), isRead: true }
];

export const DbProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [events, setEvents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Initialize data from localStorage or fallback
  useEffect(() => {
    const localUsers = localStorage.getItem('ttu_users');
    const localDeadlines = localStorage.getItem('ttu_deadlines');
    const localEvents = localStorage.getItem('ttu_events');
    const localAnnouncements = localStorage.getItem('ttu_announcements');
    const localNotifications = localStorage.getItem('ttu_notifications');
    const localCurrentUser = localStorage.getItem('ttu_current_user');

    if (localUsers) setUsers(JSON.parse(localUsers));
    else {
      setUsers(initialUsers);
      localStorage.setItem('ttu_users', JSON.stringify(initialUsers));
    }

    if (localDeadlines) setDeadlines(JSON.parse(localDeadlines));
    else {
      setDeadlines(initialDeadlines);
      localStorage.setItem('ttu_deadlines', JSON.stringify(initialDeadlines));
    }

    if (localEvents) setEvents(JSON.parse(localEvents));
    else {
      setEvents(initialEvents);
      localStorage.setItem('ttu_events', JSON.stringify(initialEvents));
    }

    if (localAnnouncements) setAnnouncements(JSON.parse(localAnnouncements));
    else {
      setAnnouncements(initialAnnouncements);
      localStorage.setItem('ttu_announcements', JSON.stringify(initialAnnouncements));
    }

    if (localNotifications) setNotifications(JSON.parse(localNotifications));
    else {
      setNotifications(initialNotifications);
      localStorage.setItem('ttu_notifications', JSON.stringify(initialNotifications));
    }

    if (localCurrentUser) {
      setCurrentUser(JSON.parse(localCurrentUser));
    }

    setLoading(false);
  }, []);

  // Synchronizers
  const syncUsers = (data) => {
    setUsers(data);
    localStorage.setItem('ttu_users', JSON.stringify(data));
  };

  const syncDeadlines = (data) => {
    setDeadlines(data);
    localStorage.setItem('ttu_deadlines', JSON.stringify(data));
  };

  const syncEvents = (data) => {
    setEvents(data);
    localStorage.setItem('ttu_events', JSON.stringify(data));
  };

  const syncAnnouncements = (data) => {
    setAnnouncements(data);
    localStorage.setItem('ttu_announcements', JSON.stringify(data));
  };

  const syncNotifications = (data) => {
    setNotifications(data);
    localStorage.setItem('ttu_notifications', JSON.stringify(data));
  };

  // Auth Operations
  const login = (identifier, password) => {
    const term = identifier.trim().toLowerCase();
    const user = users.find(u => 
      u.email.toLowerCase() === term ||
      (u.studentId && u.studentId.toLowerCase() === term) ||
      (u.indexNumber && u.indexNumber.toLowerCase() === term)
    );

    if (user) {
      const expectedPassword = user.password || `${user.role}123`;
      if (password === expectedPassword) {
        setCurrentUser(user);
        localStorage.setItem('ttu_current_user', JSON.stringify(user));
        addNotification(`User ${user.name} logged in successfully.`);
        return { success: true, user };
      }
      return { success: false, message: 'Incorrect password.' };
    }
    return { success: false, message: 'User or Index Number not found in department records.' };
  };

  const signUp = (name, email, password, role, extraFields = {}) => {
    const emailLower = email.toLowerCase();
    const exists = users.some(u => u.email.toLowerCase() === emailLower);
    if (exists) {
      return { success: false, message: 'This email is already registered.' };
    }

    const newUser = {
      id: `u_${Date.now()}`,
      name,
      email: emailLower,
      password,
      role,
      department: 'Graphic Design',
      ...extraFields
    };

    if (role === 'student') {
      newUser.completedDeadlines = [];
      newUser.year = extraFields.year || 'Year 1';
    } else if (role === 'lecturer') {
      newUser.courses = extraFields.courses ? extraFields.courses.split(',').map(s => s.trim()) : ['General Design'];
    }

    const updatedUsers = [...users, newUser];
    syncUsers(updatedUsers);
    
    // Automatically log in newly created user
    setCurrentUser(newUser);
    localStorage.setItem('ttu_current_user', JSON.stringify(newUser));
    addNotification(`New user registered: ${name} (${role})`);
    
    return { success: true, user: newUser };
  };

  const logout = () => {
    if (currentUser) {
      addNotification(`User ${currentUser.name} logged out.`);
    }
    setCurrentUser(null);
    localStorage.removeItem('ttu_current_user');
  };

  // Notifications Helpers
  const addNotification = (text) => {
    const newNotif = {
      id: `n_${Date.now()}`,
      text,
      timestamp: new Date().toISOString(),
      isRead: false
    };
    const updated = [newNotif, ...notifications];
    syncNotifications(updated);
  };

  const markAllNotificationsAsRead = () => {
    const updated = notifications.map(n => ({ ...n, isRead: true }));
    syncNotifications(updated);
  };

  // Deadlines Operations (CRUD)
  const addDeadline = (deadline) => {
    const newDeadline = {
      id: `d_${Date.now()}`,
      author: currentUser ? currentUser.name : 'Administration',
      authorRole: currentUser ? currentUser.role : 'admin',
      ...deadline,
      status: 'pending'
    };
    const updated = [newDeadline, ...deadlines];
    syncDeadlines(updated);
    addNotification(`New deadline added by ${newDeadline.author}: "${newDeadline.title}" due on ${newDeadline.dueDate}.`);
  };

  const updateDeadline = (id, updatedFields) => {
    const updated = deadlines.map(d => d.id === id ? { ...d, ...updatedFields } : d);
    syncDeadlines(updated);
    addNotification(`Deadline updated: "${updatedFields.title || id}".`);
  };

  const deleteDeadline = (id) => {
    const deadlineToDelete = deadlines.find(d => d.id === id);
    const updated = deadlines.filter(d => d.id !== id);
    syncDeadlines(updated);
    if (deadlineToDelete) {
      addNotification(`Deadline deleted: "${deadlineToDelete.title}".`);
    }
  };

  // Student Deadline Actions
  const toggleDeadlineCompleted = (deadlineId) => {
    if (!currentUser || currentUser.role !== 'student') return;
    
    const updatedUsers = users.map(u => {
      if (u.id === currentUser.id) {
        const completed = u.completedDeadlines || [];
        const isAlreadyDone = completed.includes(deadlineId);
        const updatedCompleted = isAlreadyDone 
          ? completed.filter(id => id !== deadlineId)
          : [...completed, deadlineId];
        
        const updatedUser = { ...u, completedDeadlines: updatedCompleted };
        
        // Sync currentUser state too
        setCurrentUser(updatedUser);
        localStorage.setItem('ttu_current_user', JSON.stringify(updatedUser));
        
        return updatedUser;
      }
      return u;
    });

    syncUsers(updatedUsers);
  };

  // Events Operations (CRUD)
  const addEvent = (event) => {
    const newEvent = {
      id: `e_${Date.now()}`,
      author: currentUser ? currentUser.name : 'Administration',
      authorRole: currentUser ? currentUser.role : 'admin',
      ...event
    };
    const updated = [newEvent, ...events];
    syncEvents(updated);
    addNotification(`New event published by ${newEvent.author}: "${newEvent.title}" scheduled for ${newEvent.date}.`);
  };

  const updateEvent = (id, updatedFields) => {
    const updated = events.map(e => e.id === id ? { ...e, ...updatedFields } : e);
    syncEvents(updated);
    addNotification(`Event updated: "${updatedFields.title || id}".`);
  };

  const deleteEvent = (id) => {
    const eventToDelete = events.find(e => e.id === id);
    const updated = events.filter(e => e.id !== id);
    syncEvents(updated);
    if (eventToDelete) {
      addNotification(`Event deleted: "${eventToDelete.title}".`);
    }
  };

  // Announcements Operations (CRUD)
  const addAnnouncement = (announcement) => {
    const newAnn = {
      id: `a_${Date.now()}`,
      author: currentUser ? currentUser.name : 'Administration',
      authorRole: currentUser ? currentUser.role : 'admin',
      date: new Date().toISOString().split('T')[0],
      ...announcement
    };
    const updated = [newAnn, ...announcements];
    syncAnnouncements(updated);
    addNotification(`New announcement posted by ${newAnn.author}: "${newAnn.title}".`);
  };

  const updateAnnouncement = (id, updatedFields) => {
    const updated = announcements.map(a => a.id === id ? { ...a, ...updatedFields } : a);
    syncAnnouncements(updated);
    addNotification(`Announcement updated: "${updatedFields.title || id}".`);
  };

  const deleteAnnouncement = (id) => {
    const annToDelete = announcements.find(a => a.id === id);
    const updated = announcements.filter(a => a.id !== id);
    syncAnnouncements(updated);
    if (annToDelete) {
      addNotification(`Announcement deleted: "${annToDelete.title}".`);
    }
  };

  // User Administration
  const updateUserRole = (userId, newRole) => {
    const updated = users.map(u => u.id === userId ? { ...u, role: newRole } : u);
    syncUsers(updated);
    
    // If updating current logged in user
    if (currentUser && currentUser.id === userId) {
      const updatedUser = { ...currentUser, role: newRole };
      setCurrentUser(updatedUser);
      localStorage.setItem('ttu_current_user', JSON.stringify(updatedUser));
    }
    addNotification(`User role updated for user ID: ${userId} to ${newRole}.`);
  };

  const updateUserProfilePic = (userId, newProfilePic) => {
    const updatedUsers = users.map(u => u.id === userId ? { ...u, profilePic: newProfilePic } : u);
    syncUsers(updatedUsers);

    if (currentUser && currentUser.id === userId) {
      const updatedUser = { ...currentUser, profilePic: newProfilePic };
      setCurrentUser(updatedUser);
      localStorage.setItem('ttu_current_user', JSON.stringify(updatedUser));
    }
    addNotification(`Profile picture updated successfully.`);
  };

  return (
    <DbContext.Provider value={{
      currentUser,
      users,
      deadlines,
      events,
      announcements,
      notifications,
      loading,
      login,
      logout,
      signUp,
      addDeadline,
      updateDeadline,
      deleteDeadline,
      toggleDeadlineCompleted,
      addEvent,
      updateEvent,
      deleteEvent,
      addAnnouncement,
      updateAnnouncement,
      deleteAnnouncement,
      updateUserRole,
      updateUserProfilePic,
      markAllNotificationsAsRead
    }}>
      {children}
    </DbContext.Provider>
  );
};
