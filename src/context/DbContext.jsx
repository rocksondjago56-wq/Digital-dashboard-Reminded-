import React, { useState, useEffect, useCallback } from 'react';
import { DbContext } from './DbContextDefinition';
import { api, isApiAvailable, getToken, setToken, clearToken } from '../lib/api';
import { createClassGroupTitle } from '../utils/whatsapp';

// ─── Mock / Fallback Data ───────────────────────────────────────────────────
// Used when the backend server is not running (localStorage mode).

const initialUsers = [
  { id: '1', email: 'admin@ttu.edu.gh', name: 'Dr. Rockson (Head of Admin)', role: 'admin', password: 'admin123', department: 'Graphic Design' },
  { id: '2', email: 'lecturer@ttu.edu.gh', name: 'Prof. Andrews K. Mensah', role: 'lecturer', password: 'lecturer123', department: 'Graphic Design', courses: ['Layout Design II', 'Vector Graphics I', 'Visual Portfolio Prep'] },
  { id: '3', email: 'student@ttu.edu.gh', name: 'Emmanuel Rockson', role: 'student', password: 'student123', department: 'Graphic Design', certificate: 'BTech', year: 'Year 3', studentId: '0420210088', indexNumber: '0420210088', completedDeadlines: [] },
  { id: '4', email: 'studenthead@ttu.edu.gh', name: 'Class Representative', role: 'student_head', password: 'head123', department: 'Graphic Design', certificate: 'BTech', year: 'Year 3', studentId: '0420210001', indexNumber: '0420210001', completedDeadlines: [] }
];

const initialDeadlines = [
  {
    id: 'd1',
    title: 'Layout & Page Design Project',
    description: 'Design and submit a 16-page magazine layout using Adobe InDesign. Export as PDF with print marks.',
    course: 'Layout Design II',
    dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    type: 'assignment',
    status: 'pending',
    author: 'Prof. Andrews K. Mensah',
    authorRole: 'lecturer',
    attachment: {
      name: 'Magazine_Layout_Project_Brief_2026.pdf',
      type: 'application/pdf',
      size: '142.5 KB',
      dataUrl: 'data:text/plain;charset=utf-8,TTU%20Graphic%20Design%20Department%20-%20Magazine%20Layout%20Project%20Brief%20and%20Specifications%0A%0ACourse%3A%20Layout%20Design%20II%0ALecturer%3A%20Prof.%20Andrews%20K.%20Mensah%0A%0AInstructions%3A%0A1.%20Use%20Adobe%20InDesign%20with%20a%2012-column%20modular%20grid.%0A2.%20Minimum%2016%20pages%20including%20front%20and%20back%20covers.%0A3.%20Export%20as%20High%20Quality%20Print%20PDF%20with%203mm%20bleed.'
    }
  },
  {
    id: 'd2',
    title: 'Typography & Logo Presentation',
    description: 'Submit vector design concepts for the TTU Campus Beautification brand identity project.',
    course: 'Vector Graphics I',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
    dueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    type: 'examination',
    status: 'pending',
    author: 'Dr. Rockson (Head of Admin)',
    authorRole: 'admin',
    attachment: {
      name: 'Exam_Guidelines_and_Revision_Notes.pdf',
      type: 'application/pdf',
      size: '98.0 KB',
      dataUrl: 'data:text/plain;charset=utf-8,TTU%20Graphic%20Design%20-%20Department%20Examinations%20Office%0A%0AEnd%20of%20Semester%20Exam%20Guidelines%20and%20Revision%20Notes%0A%0ATopics%20Covered%3A%0A1.%20History%20of%20Typography%20and%20Font%20Classifications%0A2.%20Pre-press%20CMYK%20Color%20Separation%20and%20Trapping%0A3.%20Paper%20Grammages%2C%20Imposition%2C%20and%20Binding%20Methods.'
    }
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

const initialTimetable = [
  { id: 'tt1', day: 'Monday', time: '08:30 AM - 11:30 AM', course: 'Layout Design II', room: 'Lab 3 (Mac Lab)', year: 'All Years' },
  { id: 'tt2', day: 'Tuesday', time: '01:00 PM - 03:00 PM', course: 'Art History & Theory', room: 'Lecture Hall C', year: 'All Years' },
  { id: 'tt3', day: 'Wednesday', time: '10:00 AM - 01:00 PM', course: 'Vector Graphics I', room: 'Lab 1', year: 'All Years' },
  { id: 'tt4', day: 'Thursday', time: '08:30 AM - 10:30 AM', course: 'Visual Portfolio Prep', room: 'Studio B', year: 'All Years' },
  { id: 'tt5', day: 'Friday', time: '02:00 PM - 04:00 PM', course: 'Design Workshop Seminar', room: 'Auditorium', year: 'All Years' }
];

// ─── localStorage Keys ──────────────────────────────────────────────────────

const USERS_STORAGE_KEY = 'ttu_users';
const CURRENT_USER_STORAGE_KEY = 'ttu_current_user';
const TIMETABLE_STORAGE_KEY = 'ttu_timetable';
const CLASS_GROUPS_STORAGE_KEY = 'ttu_class_whatsapp_groups';
const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const ALL_CERTIFICATES = 'All Certificates';
const ALL_YEARS = 'All Years';

const normalizeTarget = (item) => ({
  ...item,
  certificate: item?.certificate || ALL_CERTIFICATES,
  year: item?.year || ALL_YEARS
});

const sortTimetable = (items) => [...items].sort((a, b) => {
  const dayDiff = DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day);
  if (dayDiff !== 0) return dayDiff;
  return a.time.localeCompare(b.time);
});

const sanitizeProfilePic = (profilePic) => (
  typeof profilePic === 'string' && profilePic.trim() ? profilePic : ''
);

const normalizeUserProfilePic = (user) => (
  user ? {
    ...user,
    certificate: user.certificate || (['student', 'student_head'].includes(user.role) ? 'BTech' : undefined),
    profilePic: sanitizeProfilePic(user.profilePic)
  } : user
);

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Could not read the selected image.'));
  reader.onload = () => {
    if (typeof reader.result === 'string') {
      resolve(reader.result);
    } else {
      reject(new Error('Could not prepare the selected image.'));
    }
  };
  reader.readAsDataURL(file);
});

const resizeImageToAvatarDataUrl = (file) => new Promise((resolve, reject) => {
  if (typeof Image === 'undefined' || typeof document === 'undefined' || typeof URL === 'undefined') {
    fileToDataUrl(file).then(resolve, reject);
    return;
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();

  image.onload = () => {
    const canvas = document.createElement('canvas');
    const targetSize = 512;
    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
    const sourceX = Math.max(0, (image.naturalWidth - sourceSize) / 2);
    const sourceY = Math.max(0, (image.naturalHeight - sourceSize) / 2);

    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      URL.revokeObjectURL(objectUrl);
      fileToDataUrl(file).then(resolve, reject);
      return;
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetSize, targetSize);
    ctx.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, targetSize, targetSize);
    URL.revokeObjectURL(objectUrl);
    resolve(canvas.toDataURL('image/jpeg', 0.84));
  };

  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    fileToDataUrl(file).then(resolve, reject);
  };

  image.src = objectUrl;
});

const prepareProfilePic = async (profilePic) => {
  if (typeof File !== 'undefined' && profilePic instanceof File) {
    if (!profilePic.type.startsWith('image/')) {
      throw new Error('Please choose an image file.');
    }
    return resizeImageToAvatarDataUrl(profilePic);
  }

  return sanitizeProfilePic(profilePic);
};

// ─── localStorage Helpers ───────────────────────────────────────────────────

const mergeSeedUsers = (savedUsers) => {
  const savedEmails = new Set(savedUsers.map(user => user.email?.toLowerCase()).filter(Boolean));
  const missingUsers = initialUsers.filter(user => !savedEmails.has(user.email.toLowerCase()));
  return missingUsers.length ? [...savedUsers, ...missingUsers] : savedUsers;
};

const getSavedUsers = () => {
  try {
    const savedUsers = localStorage.getItem(USERS_STORAGE_KEY);
    return savedUsers ? JSON.parse(savedUsers).map(normalizeUserProfilePic) : null;
  } catch {
    localStorage.removeItem(USERS_STORAGE_KEY);
    return null;
  }
};

const getSavedCurrentUser = () => {
  try {
    const savedUser = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
    return savedUser ? normalizeUserProfilePic(JSON.parse(savedUser)) : null;
  } catch {
    localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    return null;
  }
};

const parseCourses = (courses) => {
  if (Array.isArray(courses)) return courses;
  if (typeof courses === 'string') {
    return courses.split(',').map(course => course.trim()).filter(Boolean);
  }
  return [];
};

// ─── Provider Component ─────────────────────────────────────────────────────

export const DbProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [events, setEvents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [classGroups, setClassGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [useApi, setUseApi] = useState(false); // true when backend is available

  // ─── Notifications (always local) ──────────────────────────────────────
  const addNotification = useCallback((text) => {
    const newNotif = {
      id: `n_${Date.now()}`,
      text,
      timestamp: new Date().toISOString(),
      isRead: false
    };
    setNotifications(prev => {
      const updated = [newNotif, ...prev];
      localStorage.setItem('ttu_notifications', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, isRead: true }));
      localStorage.setItem('ttu_notifications', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // ─── localStorage Sync Helpers ─────────────────────────────────────────

  const syncUsers = (data) => {
    setUsers(data);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(data));
  };

  const syncDeadlines = (data) => {
    const normalized = data.map(normalizeTarget);
    setDeadlines(normalized);
    localStorage.setItem('ttu_deadlines', JSON.stringify(normalized));
  };

  const syncEvents = (data) => {
    setEvents(data);
    localStorage.setItem('ttu_events', JSON.stringify(data));
  };

  const syncAnnouncements = (data) => {
    const normalized = data.map(normalizeTarget);
    setAnnouncements(normalized);
    localStorage.setItem('ttu_announcements', JSON.stringify(normalized));
  };

  const syncTimetable = (data) => {
    const sorted = sortTimetable(data);
    setTimetable(sorted);
    localStorage.setItem(TIMETABLE_STORAGE_KEY, JSON.stringify(sorted));
  };

  const syncClassGroups = (data) => {
    const sorted = [...data].sort((a, b) => (a.year || '').localeCompare(b.year || ''));
    setClassGroups(sorted);
    localStorage.setItem(CLASS_GROUPS_STORAGE_KEY, JSON.stringify(sorted));
  };

  // ─── Fetch All Remote Data (API mode) ──────────────────────────────────

  const refreshRemoteData = useCallback(async () => {
    try {
      const [deadlinesRes, announcementsRes, eventsRes, timetableRes, classGroupsRes, usersRes] = await Promise.all([
        api.deadlines.list(),
        api.announcements.list(),
        api.events.list(),
        api.timetable.list(),
        api.timetable.listClassGroups(),
        api.users.list()
      ]);

      if (deadlinesRes.success) setDeadlines(deadlinesRes.deadlines.map(normalizeTarget));
      if (announcementsRes.success) setAnnouncements(announcementsRes.announcements.map(normalizeTarget));
      if (eventsRes.success) setEvents(eventsRes.events);
      if (timetableRes.success) setTimetable(timetableRes.timetable);
      if (classGroupsRes.success) setClassGroups(classGroupsRes.classGroups);
      if (usersRes.success) setUsers(usersRes.users);
    } catch (error) {
      console.warn('Failed to refresh remote data:', error);
    }
  }, []);

  // ─── Initialization ───────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      // Check if backend API is available
      const apiReady = await isApiAvailable();
      setUseApi(apiReady);

      if (apiReady) {
        console.log('🟢 Backend API detected — using PostgreSQL database');

        // Check for existing token (auto-login)
        const token = getToken();
        if (token) {
          try {
            const meResult = await api.auth.me();
            if (meResult.success) {
              setCurrentUser(meResult.user);
            }
          } catch {
            clearToken(); // Token expired or invalid
          }
        }

        // Load all data from the API
        try {
          await refreshRemoteData();
        } catch {
          console.warn('Could not load data from API');
        }

        // Load notifications from localStorage (they're always local)
        const localNotifications = localStorage.getItem('ttu_notifications');
        if (localNotifications) setNotifications(JSON.parse(localNotifications));
        else setNotifications(initialNotifications);
      } else {
        console.log('🟡 Backend API not available — using localStorage fallback');

        // Original localStorage initialization
        const localUsers = getSavedUsers();
        const localDeadlines = localStorage.getItem('ttu_deadlines');
        const localEvents = localStorage.getItem('ttu_events');
        const localAnnouncements = localStorage.getItem('ttu_announcements');
        const localNotifications = localStorage.getItem('ttu_notifications');
        const localTimetable = localStorage.getItem(TIMETABLE_STORAGE_KEY);
        const localClassGroups = localStorage.getItem(CLASS_GROUPS_STORAGE_KEY);
        const localCurrentUser = getSavedCurrentUser();

        if (localUsers) {
          const mergedUsers = mergeSeedUsers(localUsers);
          setUsers(mergedUsers);
          if (mergedUsers.length !== localUsers.length) {
            localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(mergedUsers));
          }
        } else {
          setUsers(initialUsers);
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(initialUsers));
        }

        if (localDeadlines) setDeadlines(JSON.parse(localDeadlines).map(normalizeTarget));
        else {
          setDeadlines(initialDeadlines);
          localStorage.setItem('ttu_deadlines', JSON.stringify(initialDeadlines));
        }

        if (localEvents) setEvents(JSON.parse(localEvents));
        else {
          setEvents(initialEvents);
          localStorage.setItem('ttu_events', JSON.stringify(initialEvents));
        }

        if (localAnnouncements) setAnnouncements(JSON.parse(localAnnouncements).map(normalizeTarget));
        else {
          setAnnouncements(initialAnnouncements);
          localStorage.setItem('ttu_announcements', JSON.stringify(initialAnnouncements));
        }

        if (localNotifications) setNotifications(JSON.parse(localNotifications));
        else {
          setNotifications(initialNotifications);
          localStorage.setItem('ttu_notifications', JSON.stringify(initialNotifications));
        }

        if (localTimetable) setTimetable(sortTimetable(JSON.parse(localTimetable)));
        else {
          setTimetable(initialTimetable);
          localStorage.setItem(TIMETABLE_STORAGE_KEY, JSON.stringify(initialTimetable));
        }

        if (localClassGroups) setClassGroups(JSON.parse(localClassGroups));
        else {
          setClassGroups([]);
          localStorage.setItem(CLASS_GROUPS_STORAGE_KEY, JSON.stringify([]));
        }

        if (localCurrentUser) setCurrentUser(localCurrentUser);
      }

      setLoading(false);
    };

    init();
  }, [refreshRemoteData]);

  // ─── Auth Operations ──────────────────────────────────────────────────

  const login = async (identifier, password) => {
    // API Mode
    if (useApi) {
      try {
        const result = await api.auth.login(identifier, password);
        if (result.success) {
          setToken(result.token);
          setCurrentUser(result.user);
          await refreshRemoteData();
          addNotification(`User ${result.user.name} logged in successfully.`);
          return { success: true, user: result.user };
        }
        return { success: false, message: result.error || 'Login failed.' };
      } catch (error) {
        return { success: false, message: error.message };
      }
    }

    // localStorage Mode (original logic)
    const term = identifier.trim().toLowerCase();
    const savedUsers = getSavedUsers();
    const accountRecords = savedUsers || users;

    const user = accountRecords.find(u =>
      u.email?.toLowerCase() === term ||
      u.name?.toLowerCase() === term ||
      (u.studentId && u.studentId.toLowerCase() === term) ||
      (u.indexNumber && u.indexNumber.toLowerCase() === term) ||
      (u.staffId && u.staffId.toLowerCase() === term)
    );

    if (user) {
      const expectedPassword = user.password || `${user.role}123`;
      if (password === expectedPassword) {
        const updatedUsers = [
          ...accountRecords.filter(u => u.email?.toLowerCase() !== user.email.toLowerCase()),
          user
        ];
        syncUsers(updatedUsers);
        setCurrentUser(user);
        localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user));
        addNotification(`User ${user.name} logged in successfully.`);
        return { success: true, user };
      }
      return { success: false, message: 'Incorrect password.' };
    }

    return { success: false, message: 'Account not found. Use your email, full name, index number, or staff ID.' };
  };

  const signUp = async (name, email, password, role = 'student', extraFields = {}) => {
    // API Mode
    if (useApi) {
      try {
        const result = await api.auth.signup({
          name,
          email,
          password,
          role,
          ...extraFields
        });

        if (result.success) {
          setToken(result.token);
          setCurrentUser(result.user);
          addNotification(`New user registered: ${result.user.name} (${result.user.role})`);
          return { success: true, user: result.user, message: result.message };
        }
        return { success: false, message: result.error || 'Signup failed.' };
      } catch (error) {
        return { success: false, message: error.message };
      }
    }

    // localStorage Mode (original logic)
    const emailLower = email.trim().toLowerCase();
    const savedUsers = getSavedUsers();
    const accountRecords = savedUsers || users;

    const exists = accountRecords.some(u => u.email?.toLowerCase() === emailLower);
    if (exists) {
      return { success: false, message: 'This email is already registered. Use Sign In instead.' };
    }

    const newUser = {
      id: `u_${Date.now()}`,
      name: name.trim(),
      email: emailLower,
      password,
      role,
      department: 'Graphic Design',
      ...extraFields,
      completedDeadlines: (role === 'student' || role === 'student_head') ? [] : undefined,
      year: extraFields.year || (role === 'student' || role === 'student_head' ? 'Year 1' : undefined),
      certificate: extraFields.certificate || (role === 'student' || role === 'student_head' ? 'BTech' : undefined),
      studentId: extraFields.studentId || extraFields.indexNumber || (role === 'student' || role === 'student_head' ? `04${Math.floor(10000000 + Math.random() * 90000000)}` : undefined),
      courses: parseCourses(extraFields.courses).length ? parseCourses(extraFields.courses) : (role === 'lecturer' ? ['General Design'] : [])
    };

    const updatedUsers = [...accountRecords, newUser];
    syncUsers(updatedUsers);
    setCurrentUser(newUser);
    localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(newUser));
    addNotification(`New local user registered: ${newUser.name} (${newUser.role})`);
    return { success: true, user: newUser };
  };

  const requestVerification = async (identifier) => {
    if (useApi) {
      try {
        return await api.auth.requestVerification(identifier);
      } catch (error) {
        return { success: false, message: error.message };
      }
    }
    const user = (getSavedUsers() || users).find(item => [item.email, item.studentId, item.staffId].filter(Boolean).some(value => value.toLowerCase() === identifier.trim().toLowerCase()));
    if (!user) return { success: false, message: 'No preloaded department identity was found.' };
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const updated = users.map(item => item.id === user.id ? { ...item, verificationCode: code, isVerified: false } : item);
    syncUsers(updated);
    return { success: true, message: 'Verification code created for this preloaded identity.', developmentCode: code };
  };

  const activateAccount = async (identifier, code, password) => {
    if (useApi) {
      try {
        return await api.auth.activateAccount(identifier, code, password);
      } catch (error) {
        return { success: false, message: error.message };
      }
    }
    const term = identifier.trim().toLowerCase();
    const user = users.find(item => [item.email, item.studentId, item.staffId].filter(Boolean).some(value => value.toLowerCase() === term));
    if (!user || user.verificationCode !== code) return { success: false, message: 'The verification code is incorrect.' };
    const updatedUsers = users.map(item => item.id === user.id ? { ...item, password, isVerified: true, verificationCode: undefined } : item);
    syncUsers(updatedUsers);
    return { success: true, message: 'Account verified. You can now sign in.' };
  };

  const logout = async () => {
    if (currentUser) {
      addNotification(`User ${currentUser.name} logged out.`);
    }
    clearToken();
    localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    setCurrentUser(null);
  };

  // ─── Deadlines ────────────────────────────────────────────────────────

  const addDeadline = async (deadline) => {
    if (useApi) {
      try {
        const result = await api.deadlines.create(deadline);
        if (result.success) {
          await refreshRemoteData();
          addNotification(`New deadline added: "${deadline.title}" due on ${deadline.dueDate}.`);
        }
        return result;
      } catch (error) {
        return { success: false, message: error.message };
      }
    }

    const newDeadline = {
      id: `d_${Date.now()}`,
      authorId: currentUser?.id || '',
      author: currentUser ? currentUser.name : 'Administration',
      authorRole: currentUser ? currentUser.role : 'admin',
      ...deadline,
      certificate: deadline.certificate || ALL_CERTIFICATES,
      year: deadline.year || ALL_YEARS,
      status: 'pending'
    };
    syncDeadlines([newDeadline, ...deadlines]);
    addNotification(`New deadline added by ${newDeadline.author}: "${newDeadline.title}" due on ${newDeadline.dueDate}.`);
  };

  const updateDeadline = async (id, updatedFields) => {
    if (useApi) {
      try {
        const result = await api.deadlines.update(id, updatedFields);
        if (result.success) await refreshRemoteData();
        return result;
      } catch (error) {
        return { success: false, message: error.message };
      }
    }

    const updated = deadlines.map(d => d.id === id ? { ...d, ...updatedFields } : d);
    syncDeadlines(updated);
    addNotification(`Deadline updated: "${updatedFields.title || id}".`);
  };

  const deleteDeadline = async (id) => {
    if (useApi) {
      try {
        const result = await api.deadlines.delete(id);
        if (result.success) await refreshRemoteData();
        return result;
      } catch (error) {
        return { success: false, message: error.message };
      }
    }

    const deadlineToDelete = deadlines.find(d => d.id === id);
    syncDeadlines(deadlines.filter(d => d.id !== id));
    if (deadlineToDelete) {
      addNotification(`Deadline deleted: "${deadlineToDelete.title}".`);
    }
  };

  const toggleDeadlineCompleted = async (deadlineId) => {
    if (!currentUser || !['student', 'student_head'].includes(currentUser.role)) return;

    if (useApi) {
      try {
        const result = await api.deadlines.toggleComplete(deadlineId);
        if (result.success) {
          setCurrentUser(prev => ({ ...prev, completedDeadlines: result.completedDeadlines }));
        }
        return result;
      } catch (error) {
        return { success: false, message: error.message };
      }
    }

    const updatedUsers = users.map(u => {
      if (u.id === currentUser.id) {
        const completed = u.completedDeadlines || [];
        const isAlreadyDone = completed.includes(deadlineId);
        const updatedCompleted = isAlreadyDone
          ? completed.filter(id => id !== deadlineId)
          : [...completed, deadlineId];

        const updatedUser = { ...u, completedDeadlines: updatedCompleted };
        setCurrentUser(updatedUser);
        localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(updatedUser));
        return updatedUser;
      }
      return u;
    });
    syncUsers(updatedUsers);
  };

  // ─── Events ───────────────────────────────────────────────────────────

  const addEvent = async (event) => {
    if (useApi) {
      try {
        const result = await api.events.create(event);
        if (result.success) {
          await refreshRemoteData();
          addNotification(`New event published: "${event.title}" scheduled for ${event.date}.`);
        }
        return result;
      } catch (error) {
        return { success: false, message: error.message };
      }
    }

    const newEvent = {
      id: `e_${Date.now()}`,
      author: currentUser ? currentUser.name : 'Administration',
      authorRole: currentUser ? currentUser.role : 'admin',
      ...event
    };
    syncEvents([newEvent, ...events]);
    addNotification(`New event published by ${newEvent.author}: "${newEvent.title}" scheduled for ${newEvent.date}.`);
  };

  const updateEvent = async (id, updatedFields) => {
    if (useApi) {
      try {
        const result = await api.events.update(id, updatedFields);
        if (result.success) await refreshRemoteData();
        return result;
      } catch (error) {
        return { success: false, message: error.message };
      }
    }

    const updated = events.map(e => e.id === id ? { ...e, ...updatedFields } : e);
    syncEvents(updated);
    addNotification(`Event updated: "${updatedFields.title || id}".`);
  };

  const deleteEvent = async (id) => {
    if (useApi) {
      try {
        const result = await api.events.delete(id);
        if (result.success) await refreshRemoteData();
        return result;
      } catch (error) {
        return { success: false, message: error.message };
      }
    }

    const eventToDelete = events.find(e => e.id === id);
    syncEvents(events.filter(e => e.id !== id));
    if (eventToDelete) {
      addNotification(`Event deleted: "${eventToDelete.title}".`);
    }
  };

  // ─── Announcements ───────────────────────────────────────────────────

  const addAnnouncement = async (announcement) => {
    if (useApi) {
      try {
        const result = await api.announcements.create(announcement);
        if (result.success) {
          await refreshRemoteData();
          addNotification(`New announcement posted: "${announcement.title}".`);
        }
        return result;
      } catch (error) {
        return { success: false, message: error.message };
      }
    }

    const newAnn = {
      id: `a_${Date.now()}`,
      authorId: currentUser?.id || '',
      author: currentUser ? currentUser.name : 'Administration',
      authorRole: currentUser ? currentUser.role : 'admin',
      date: new Date().toISOString().split('T')[0],
      ...announcement,
      certificate: announcement.certificate || ALL_CERTIFICATES,
      year: announcement.year || ALL_YEARS
    };
    syncAnnouncements([newAnn, ...announcements]);
    addNotification(`New announcement posted by ${newAnn.author}: "${newAnn.title}".`);
  };

  const updateAnnouncement = async (id, updatedFields) => {
    if (useApi) {
      try {
        const result = await api.announcements.update(id, updatedFields);
        if (result.success) await refreshRemoteData();
        return result;
      } catch (error) {
        return { success: false, message: error.message };
      }
    }

    const updated = announcements.map(a => a.id === id ? { ...a, ...updatedFields } : a);
    syncAnnouncements(updated);
    addNotification(`Announcement updated: "${updatedFields.title || id}".`);
  };

  const deleteAnnouncement = async (id) => {
    if (useApi) {
      try {
        const result = await api.announcements.delete(id);
        if (result.success) await refreshRemoteData();
        return result;
      } catch (error) {
        return { success: false, message: error.message };
      }
    }

    const annToDelete = announcements.find(a => a.id === id);
    syncAnnouncements(announcements.filter(a => a.id !== id));
    if (annToDelete) {
      addNotification(`Announcement deleted: "${annToDelete.title}".`);
    }
  };

  // ─── Timetable ────────────────────────────────────────────────────────

  const addTimetableSlot = async (slot) => {
    if (useApi) {
      try {
        const result = await api.timetable.create({ year: 'All Years', ...slot });
        if (result.success) {
          await refreshRemoteData();
          addNotification(`Timetable updated: ${slot.course} added on ${slot.day}.`);
        }
        return result;
      } catch (error) {
        return { success: false, message: error.message };
      }
    }

    const newSlot = { id: `tt_${Date.now()}`, year: 'All Years', ...slot };
    syncTimetable([...timetable, newSlot]);
    addNotification(`Timetable updated: ${newSlot.course} added on ${newSlot.day}.`);
  };

  const updateTimetableSlot = async (id, updatedFields) => {
    if (useApi) {
      try {
        const result = await api.timetable.update(id, updatedFields);
        if (result.success) {
          await refreshRemoteData();
          addNotification(`Timetable updated: ${updatedFields.course || id}.`);
        }
        return result;
      } catch (error) {
        return { success: false, message: error.message };
      }
    }

    const updated = timetable.map(s => s.id === id ? { ...s, ...updatedFields } : s);
    syncTimetable(updated);
    addNotification(`Timetable updated: ${updatedFields.course || id}.`);
  };

  const deleteTimetableSlot = async (id) => {
    if (useApi) {
      try {
        const result = await api.timetable.delete(id);
        if (result.success) await refreshRemoteData();
        return result;
      } catch (error) {
        return { success: false, message: error.message };
      }
    }

    const slotToDelete = timetable.find(s => s.id === id);
    syncTimetable(timetable.filter(s => s.id !== id));
    if (slotToDelete) {
      addNotification(`Timetable class removed: ${slotToDelete.course}.`);
    }
  };

  // ─── WhatsApp Class Groups ────────────────────────────────────────────

  const saveClassWhatsAppGroup = async (group) => {
    if (useApi) {
      try {
        const year = group.year || currentUser?.year || 'Year 1';
        const result = await api.timetable.saveClassGroup({
          year,
          title: createClassGroupTitle(year),
          headName: group.headName || currentUser?.name || 'Class Head',
          headId: group.headId || currentUser?.id || '',
          headPhone: group.headPhone || '',
          inviteLink: group.inviteLink || ''
        });
        if (result.success) {
          await refreshRemoteData();
          addNotification(`${result.group.title} WhatsApp contact updated.`);
        }
        return result.group;
      } catch (error) {
        console.error('Save class group error:', error);
        return null;
      }
    }

    // localStorage fallback
    const year = group.year || currentUser?.year || 'Year 1';
    const cleanPhone = (group.headPhone || '').replace(/[^0-9]/g, '');
    const savedGroup = {
      id: group.id || `wg_${year.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`,
      year,
      title: createClassGroupTitle(year),
      headName: group.headName || currentUser?.name || 'Class Head',
      headId: group.headId || currentUser?.id || '',
      headPhone: cleanPhone,
      inviteLink: (group.inviteLink || '').trim(),
      updatedAt: new Date().toISOString()
    };
    const hasExistingYear = classGroups.some(item => item.year === year);
    const updated = hasExistingYear
      ? classGroups.map(item => item.year === year ? { ...item, ...savedGroup, id: item.id || savedGroup.id } : item)
      : [...classGroups, savedGroup];
    syncClassGroups(updated);
    addNotification(`${savedGroup.title} WhatsApp contact updated.`);
    return savedGroup;
  };

  const deleteClassWhatsAppGroup = async (id) => {
    if (useApi) {
      try {
        const result = await api.timetable.deleteClassGroup(id);
        if (result.success) await refreshRemoteData();
        return result;
      } catch (error) {
        return { success: false, message: error.message };
      }
    }

    const groupToDelete = classGroups.find(group => group.id === id);
    syncClassGroups(classGroups.filter(group => group.id !== id));
    if (groupToDelete) {
      addNotification(`${groupToDelete.title} WhatsApp contact removed.`);
    }
  };

  // ─── User Admin ───────────────────────────────────────────────────────

  const updateUserRole = async (userId, newRole) => {
    if (useApi) {
      try {
        const result = await api.users.updateRole(userId, newRole);
        if (result.success) {
          await refreshRemoteData();
          addNotification(`User role updated for ${result.user.name} to ${newRole}.`);
        }
        return result;
      } catch (error) {
        return { success: false, message: error.message };
      }
    }

    const updated = users.map(u => u.id === userId ? { ...u, role: newRole } : u);
    syncUsers(updated);

    if (currentUser && currentUser.id === userId) {
      const updatedUser = { ...currentUser, role: newRole };
      setCurrentUser(updatedUser);
      localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(updatedUser));
    }
    addNotification(`User role updated for user ID: ${userId} to ${newRole}.`);
  };

  const provisionIdentity = async (identity) => {
    if (useApi) {
      try {
        const result = await api.users.provision(identity);
        if (result.success) await refreshRemoteData();
        return result;
      } catch (error) {
        return { success: false, message: error.message };
      }
    }
    const identifier = identity.role === 'student' ? identity.indexNumber?.trim() : identity.staffId?.trim();
    if (!identifier) return { success: false, message: 'An index number or lecturer ID is required.' };
    if (identity.role === 'admin' && !identity.email?.trim()) return { success: false, message: 'Administrator email is required.' };
    const email = identity.role === 'admin'
      ? identity.email.trim().toLowerCase()
      : `${identifier.replace(/[^a-z0-9]/gi, '').toLowerCase()}@ttu.edu.gh`;
    if (users.some(user => user.email === email || user.studentId === identifier || user.staffId === identifier)) return { success: false, message: 'An identity with this email or ID already exists.' };
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const user = {
      id: `u_${Date.now()}`,
      name: identity.name.trim(), email, role: identity.role, department: 'Graphic Design', isVerified: false, verificationCode: code,
      studentId: identity.role === 'student' ? identifier : undefined,
      indexNumber: identity.role === 'student' ? identifier : undefined,
      staffId: identity.role === 'student' ? undefined : identifier,
      year: identity.role === 'student' ? identity.year : undefined,
      certificate: identity.role === 'student' ? identity.certificate : undefined,
      courses: identity.role === 'lecturer' ? parseCourses(identity.courses) : [],
      designation: identity.role === 'admin' ? identity.designation || 'Department Administrator' : undefined
    };
    syncUsers([...users, user]);
    return { success: true, user, message: 'Identity provisioned.', developmentCode: code };
  };

  const updateUserProfilePic = async (userId, newProfilePic) => {
    let picData = '';
    try {
      picData = await prepareProfilePic(newProfilePic);
    } catch (error) {
      return { success: false, message: error.message };
    }

    if (!picData) {
      return { success: false, message: 'Please choose a valid image file.' };
    }

    if (useApi) {
      try {
        const result = await api.users.updateProfilePic(userId, picData);
        if (result.success) {
          setCurrentUser(prev => prev && prev.id === userId ? { ...prev, profilePic: picData } : prev);
          addNotification('Profile picture updated successfully.');
        }
        return result;
      } catch (error) {
        return { success: false, message: error.message };
      }
    }

    // localStorage fallback
    const updatedUsers = users.map(u => u.id === userId ? { ...u, profilePic: picData } : u);
    syncUsers(updatedUsers);

    if (currentUser && currentUser.id === userId) {
      const updatedUser = { ...currentUser, profilePic: picData };
      setCurrentUser(updatedUser);
      localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(updatedUser));
    }
    addNotification('Profile picture updated successfully.');
    return { success: true };
  };

  // ─── Context Value ────────────────────────────────────────────────────

  return (
    <DbContext.Provider value={{
      currentUser,
      users,
      deadlines,
      events,
      announcements,
      notifications,
      timetable,
      classGroups,
      loading,
      login,
      logout,
      signUp,
      requestVerification,
      activateAccount,
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
      addTimetableSlot,
      updateTimetableSlot,
      deleteTimetableSlot,
      saveClassWhatsAppGroup,
      deleteClassWhatsAppGroup,
      updateUserRole,
      provisionIdentity,
      updateUserProfilePic,
      markAllNotificationsAsRead
    }}>
      {children}
    </DbContext.Provider>
  );
};
