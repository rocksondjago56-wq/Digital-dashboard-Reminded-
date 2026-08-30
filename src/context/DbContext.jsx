import React, { useState, useEffect } from 'react';
import { DbContext } from './DbContextDefinition';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { createClassGroupTitle } from '../utils/whatsapp';

// Mock Initial Data
const initialUsers = [
  { id: '1', email: 'admin@ttu.edu.gh', name: 'Dr. Rockson (Head of Admin)', role: 'admin', password: 'admin123', department: 'Graphic Design' },
  { id: '2', email: 'lecturer@ttu.edu.gh', name: 'Prof. Andrews K. Mensah', role: 'lecturer', password: 'lecturer123', department: 'Graphic Design', courses: ['Layout Design II', 'Vector Graphics I', 'Visual Portfolio Prep'] },
  { id: '3', email: 'student@ttu.edu.gh', name: 'Emmanuel Rockson', role: 'student', password: 'student123', department: 'Graphic Design', year: 'Year 3', studentId: '0420210088', indexNumber: '0420210088', completedDeadlines: [] },
  { id: '4', email: 'studenthead@ttu.edu.gh', name: 'Class Representative', role: 'student_head', password: 'head123', department: 'Graphic Design', year: 'Year 3', studentId: '0420210001', indexNumber: '0420210001', completedDeadlines: [] }
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

const USERS_STORAGE_KEY = 'ttu_users';
const CURRENT_USER_STORAGE_KEY = 'ttu_current_user';
const TIMETABLE_STORAGE_KEY = 'ttu_timetable';
const CLASS_GROUPS_STORAGE_KEY = 'ttu_class_whatsapp_groups';
const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const sortTimetable = (items) => [...items].sort((a, b) => {
  const dayDiff = DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day);
  if (dayDiff !== 0) return dayDiff;
  return a.time.localeCompare(b.time);
});

const mergeSeedUsers = (savedUsers) => {
  const savedEmails = new Set(savedUsers.map(user => user.email?.toLowerCase()).filter(Boolean));
  const missingUsers = initialUsers.filter(user => !savedEmails.has(user.email.toLowerCase()));
  return missingUsers.length ? [...savedUsers, ...missingUsers] : savedUsers;
};

const getSavedUsers = () => {
  try {
    const savedUsers = localStorage.getItem(USERS_STORAGE_KEY);
    return savedUsers ? JSON.parse(savedUsers) : null;
  } catch {
    // A corrupt browser record should not prevent users from accessing the app.
    localStorage.removeItem(USERS_STORAGE_KEY);
    return null;
  }
};

const getSavedCurrentUser = () => {
  try {
    const savedUser = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
    return savedUser ? JSON.parse(savedUser) : null;
  } catch {
    localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    return null;
  }
};

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

  // Initialize data from localStorage or fallback
  useEffect(() => {
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
    }
    else {
      setUsers(initialUsers);
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(initialUsers));
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

    setLoading(false);
  }, []);

  const refreshRemoteData = async () => {
    if (!isSupabaseConfigured) return;

    const [profilesResult, deadlinesResult, announcementsResult, eventsResult, completionsResult] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('deadlines').select('*').order('due_date', { ascending: true }),
      supabase.from('announcements').select('*').order('created_at', { ascending: false }),
      supabase.from('events').select('*').order('event_date', { ascending: true }),
      supabase.from('deadline_completions').select('*')
    ]);

    if (profilesResult.error) return;
    const profiles = profilesResult.data || [];
    const profileById = new Map(profiles.map(profile => [profile.id, profile]));
    const mappedUsers = profiles.map(profile => ({
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      department: profile.department,
      year: profile.year,
      studentId: profile.student_id,
      indexNumber: profile.student_id,
      courses: profile.courses || [],
      profilePic: profile.profile_picture_url,
      completedDeadlines: (completionsResult.data || [])
        .filter(completion => completion.student_id === profile.id)
        .map(completion => completion.deadline_id)
    }));

    setUsers(mappedUsers);
    if (!deadlinesResult.error) {
      setDeadlines((deadlinesResult.data || []).map(deadline => {
        const author = profileById.get(deadline.author_id);
        return {
          id: deadline.id,
          title: deadline.title,
          description: deadline.description,
          course: deadline.course,
          dueDate: deadline.due_date,
          type: deadline.type,
          status: 'pending',
          author: author?.name || 'Department',
          authorRole: author?.role || 'lecturer',
          attachment: deadline.attachment_url ? { name: deadline.attachment_name, dataUrl: deadline.attachment_url } : null
        };
      }));
    }
    if (!announcementsResult.error) {
      setAnnouncements((announcementsResult.data || []).map(announcement => {
        const author = profileById.get(announcement.author_id);
        return {
          id: announcement.id,
          title: announcement.title,
          content: announcement.content,
          category: announcement.category,
          isPinned: announcement.is_pinned,
          date: announcement.created_at.slice(0, 10),
          author: author?.name || 'Department',
          authorRole: author?.role || 'lecturer'
        };
      }));
    }
    if (!eventsResult.error) {
      setEvents((eventsResult.data || []).map(event => {
        const author = profileById.get(event.author_id);
        return {
          id: event.id,
          title: event.title,
          description: event.description,
          location: event.location,
          date: event.event_date,
          time: event.event_time,
          type: event.type,
          organizer: event.organizer,
          author: author?.name || 'Department',
          authorRole: author?.role || 'admin'
        };
      }));
    }
  };

  useEffect(() => {
    if (isSupabaseConfigured) refreshRemoteData();
  }, []);

  // Supabase keeps the authenticated session itself. Restore the associated
  // protected department profile whenever the application is opened again.
  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;

    const loadProfile = async (authUser) => {
      if (!authUser) {
        setCurrentUser(getSavedCurrentUser());
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (!profile) {
        setCurrentUser(getSavedCurrentUser());
        return;
      }
      setCurrentUser({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        department: profile.department,
        year: profile.year,
        studentId: profile.student_id,
        indexNumber: profile.student_id,
        courses: profile.courses || [],
        profilePic: profile.profile_picture_url
      });
    };

    supabase.auth.getUser().then(({ data }) => loadProfile(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadProfile(session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Synchronizers
  const syncUsers = (data) => {
    setUsers(data);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(data));
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

  // Auth Operations
  const login = async (identifier, password) => {
    const term = identifier.trim().toLowerCase();
    const savedUsers = getSavedUsers();
    const accountRecords = savedUsers || users;

    const user = accountRecords.find(u =>
      u.email?.toLowerCase() === term ||
      (u.studentId && u.studentId.toLowerCase() === term) ||
      (u.indexNumber && u.indexNumber.toLowerCase() === term) ||
      (u.staffId && u.staffId.toLowerCase() === term)
    );

    if (user) {
      const expectedPassword = user.password || `${user.role}123`;
      if (password === expectedPassword) {
        setCurrentUser(user);
        localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user));
        addNotification(`User ${user.name} logged in successfully.`);
        return { success: true, user };
      }
      return { success: false, message: 'Incorrect password.' };
    }

    if (isSupabaseConfigured && term.includes('@')) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: term,
          password
        });

        if (!error && data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (profile) {
            const user = {
              id: profile.id,
              name: profile.name,
              email: profile.email,
              role: profile.role,
              department: profile.department,
              year: profile.year,
              studentId: profile.student_id,
              indexNumber: profile.student_id,
              courses: profile.courses || [],
              profilePic: profile.profile_picture_url
            };
            setCurrentUser(user);
            localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user));
            return { success: true, user };
          }
        }
      } catch (e) {
        console.warn('Supabase auth signIn error, checking local records:', e);
      }
    }

    return { success: false, message: 'User or Index Number not found in department records.' };
  };

  const signUp = async (name, email, password, role = 'student', extraFields = {}) => {
    const emailLower = email.trim().toLowerCase();
    const savedUsers = getSavedUsers();
    const accountRecords = savedUsers || users;

    const exists = accountRecords.some(u => u.email?.toLowerCase() === emailLower);
    if (exists) {
      return { success: false, message: 'This email is already registered. Use Sign In instead.' };
    }

    const createAndSetLocalUser = () => {
      const newUser = {
        id: `u_${Date.now()}`,
        name: name.trim(),
        email: emailLower,
        password,
        role,
        department: 'Graphic Design',
        ...extraFields
      };

      if (role === 'student' || role === 'student_head') {
        newUser.completedDeadlines = [];
        newUser.year = extraFields.year || 'Year 1';
        newUser.studentId = extraFields.studentId || `04${Math.floor(10000000 + Math.random() * 90000000)}`;
        newUser.indexNumber = newUser.studentId;
      } else if (role === 'lecturer') {
        newUser.courses = extraFields.courses
          ? (typeof extraFields.courses === 'string' ? extraFields.courses.split(',').map(s => s.trim()).filter(Boolean) : extraFields.courses)
          : ['General Design'];
        newUser.staffId = extraFields.staffId || `LEC-${Math.floor(1000 + Math.random() * 9000)}`;
      } else if (role === 'admin') {
        newUser.designation = extraFields.designation || 'Department Administrator';
        newUser.staffId = extraFields.staffId || `ADM-${Math.floor(1000 + Math.random() * 9000)}`;
      }

      const updatedUsers = [...accountRecords.filter(u => u.email.toLowerCase() !== emailLower), newUser];
      syncUsers(updatedUsers);
      setCurrentUser(newUser);
      localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(newUser));
      addNotification(`New user registered: ${name} (${role})`);
      return newUser;
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: emailLower,
          password,
          options: {
            data: {
              name: name.trim(),
              requested_role: role,
              designation: extraFields.designation || '',
              staff_id: extraFields.staffId || '',
              requested_courses: role === 'lecturer'
                ? (extraFields.courses || '').split(',').map(course => course.trim()).filter(Boolean)
                : []
            }
          }
        });

        if (error) {
          console.warn('Supabase auth signUp error, activating local fallback:', error.message);
          // If rate limit or other provider error occurs, create locally so the user is never locked out
          const localUser = createAndSetLocalUser();
          return {
            success: true,
            user: localUser,
            message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created and signed in successfully!`
          };
        }

        // Successfully created via Supabase or pending confirmation -> establish session locally too
        const localUser = createAndSetLocalUser();
        return {
          success: true,
          user: localUser,
          message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully!`
        };
      } catch (err) {
        console.warn('Supabase exception, activating local fallback:', err);
        const localUser = createAndSetLocalUser();
        return { success: true, user: localUser, message: 'Account created successfully!' };
      }
    }

    const newUser = createAndSetLocalUser();
    return { success: true, user: newUser };
  };

  const logout = async () => {
    localStorage.removeItem(CURRENT_USER_STORAGE_KEY);

    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
      setCurrentUser(null);
      return;
    }

    if (currentUser) {
      addNotification(`User ${currentUser.name} logged out.`);
    }
    setCurrentUser(null);
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

  // Timetable Operations
  const addTimetableSlot = (slot) => {
    const newSlot = {
      id: `tt_${Date.now()}`,
      year: 'All Years',
      ...slot
    };
    syncTimetable([...timetable, newSlot]);
    addNotification(`Timetable updated: ${newSlot.course} added on ${newSlot.day}.`);
  };

  const updateTimetableSlot = (id, updatedFields) => {
    const updated = timetable.map(slot => (
      slot.id === id ? { ...slot, ...updatedFields } : slot
    ));
    syncTimetable(updated);
    addNotification(`Timetable updated: ${updatedFields.course || id}.`);
  };

  const deleteTimetableSlot = (id) => {
    const slotToDelete = timetable.find(slot => slot.id === id);
    syncTimetable(timetable.filter(slot => slot.id !== id));
    if (slotToDelete) {
      addNotification(`Timetable class removed: ${slotToDelete.course}.`);
    }
  };

  // WhatsApp Class Group Operations
  const saveClassWhatsAppGroup = (group) => {
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

  const deleteClassWhatsAppGroup = (id) => {
    const groupToDelete = classGroups.find(group => group.id === id);
    syncClassGroups(classGroups.filter(group => group.id !== id));
    if (groupToDelete) {
      addNotification(`${groupToDelete.title} WhatsApp contact removed.`);
    }
  };

  // Deadlines Operations (CRUD)
  const addDeadline = (deadline) => {
    if (isSupabaseConfigured) {
      return supabase.from('deadlines').insert({
        title: deadline.title,
        description: deadline.description,
        course: deadline.course,
        due_date: deadline.dueDate,
        type: deadline.type,
        author_id: currentUser.id,
        attachment_name: deadline.attachment?.name || null,
        attachment_url: deadline.attachment?.dataUrl || null
      }).then(async ({ error }) => {
        if (!error) await refreshRemoteData();
        return { success: !error, message: error?.message };
      });
    }
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
    if (isSupabaseConfigured) {
      return supabase.from('deadlines').update({
        title: updatedFields.title,
        description: updatedFields.description,
        course: updatedFields.course,
        due_date: updatedFields.dueDate,
        type: updatedFields.type
      }).eq('id', id).then(async ({ error }) => {
        if (!error) await refreshRemoteData();
        return { success: !error, message: error?.message };
      });
    }
    const updated = deadlines.map(d => d.id === id ? { ...d, ...updatedFields } : d);
    syncDeadlines(updated);
    addNotification(`Deadline updated: "${updatedFields.title || id}".`);
  };

  const deleteDeadline = (id) => {
    if (isSupabaseConfigured) {
      return supabase.from('deadlines').delete().eq('id', id).then(async ({ error }) => {
        if (!error) await refreshRemoteData();
        return { success: !error, message: error?.message };
      });
    }
    const deadlineToDelete = deadlines.find(d => d.id === id);
    const updated = deadlines.filter(d => d.id !== id);
    syncDeadlines(updated);
    if (deadlineToDelete) {
      addNotification(`Deadline deleted: "${deadlineToDelete.title}".`);
    }
  };

  // Student Deadline Actions
  const toggleDeadlineCompleted = (deadlineId) => {
    if (!currentUser || !['student', 'student_head'].includes(currentUser.role)) return;

    if (isSupabaseConfigured) {
      const completed = currentUser.completedDeadlines || [];
      const request = completed.includes(deadlineId)
        ? supabase.from('deadline_completions').delete().eq('student_id', currentUser.id).eq('deadline_id', deadlineId)
        : supabase.from('deadline_completions').insert({ student_id: currentUser.id, deadline_id: deadlineId });
      return request.then(async ({ error }) => {
        if (!error) {
          await refreshRemoteData();
          const updatedCompleted = completed.includes(deadlineId)
            ? completed.filter(id => id !== deadlineId)
            : [...completed, deadlineId];
          setCurrentUser({ ...currentUser, completedDeadlines: updatedCompleted });
        }
        return { success: !error, message: error?.message };
      });
    }
    
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
        localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(updatedUser));
        
        return updatedUser;
      }
      return u;
    });

    syncUsers(updatedUsers);
  };

  // Events Operations (CRUD)
  const addEvent = (event) => {
    if (isSupabaseConfigured) {
      return supabase.from('events').insert({
        title: event.title,
        description: event.description || null,
        location: event.location,
        event_date: event.date,
        event_time: event.time || null,
        type: event.type,
        organizer: event.organizer,
        author_id: currentUser.id
      }).then(async ({ error }) => {
        if (!error) await refreshRemoteData();
        return { success: !error, message: error?.message };
      });
    }
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
    if (isSupabaseConfigured) {
      return supabase.from('events').delete().eq('id', id).then(async ({ error }) => {
        if (!error) await refreshRemoteData();
        return { success: !error, message: error?.message };
      });
    }
    const eventToDelete = events.find(e => e.id === id);
    const updated = events.filter(e => e.id !== id);
    syncEvents(updated);
    if (eventToDelete) {
      addNotification(`Event deleted: "${eventToDelete.title}".`);
    }
  };

  // Announcements Operations (CRUD)
  const addAnnouncement = (announcement) => {
    if (isSupabaseConfigured) {
      return supabase.from('announcements').insert({
        title: announcement.title,
        content: announcement.content,
        category: announcement.category,
        is_pinned: announcement.isPinned,
        author_id: currentUser.id
      }).then(async ({ error }) => {
        if (!error) await refreshRemoteData();
        return { success: !error, message: error?.message };
      });
    }
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
    if (isSupabaseConfigured) {
      return supabase.from('announcements').delete().eq('id', id).then(async ({ error }) => {
        if (!error) await refreshRemoteData();
        return { success: !error, message: error?.message };
      });
    }
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
      localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(updatedUser));
    }
    addNotification(`User role updated for user ID: ${userId} to ${newRole}.`);
  };

  const updateUserProfilePic = (userId, newProfilePic) => {
    if (isSupabaseConfigured) {
      if (!(newProfilePic instanceof File)) return;
      const extension = newProfilePic.name.split('.').pop() || 'jpg';
      const path = `${userId}/${Date.now()}.${extension}`;
      return supabase.storage.from('profile-pictures').upload(path, newProfilePic, {
        cacheControl: '3600',
        upsert: false
      }).then(async ({ error }) => {
        if (error) return { success: false, message: error.message };
        const { data: urlData } = supabase.storage.from('profile-pictures').getPublicUrl(path);
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ profile_picture_url: urlData.publicUrl })
          .eq('id', userId);
        if (!profileError) {
          setCurrentUser({ ...currentUser, profilePic: urlData.publicUrl });
          await refreshRemoteData();
        }
        return { success: !profileError, message: profileError?.message };
      });
    }

    const updatedUsers = users.map(u => u.id === userId ? { ...u, profilePic: newProfilePic } : u);
    syncUsers(updatedUsers);

    if (currentUser && currentUser.id === userId) {
      const updatedUser = { ...currentUser, profilePic: newProfilePic };
      setCurrentUser(updatedUser);
      localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(updatedUser));
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
      timetable,
      classGroups,
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
      addTimetableSlot,
      updateTimetableSlot,
      deleteTimetableSlot,
      saveClassWhatsAppGroup,
      deleteClassWhatsAppGroup,
      updateUserRole,
      updateUserProfilePic,
      markAllNotificationsAsRead
    }}>
      {children}
    </DbContext.Provider>
  );
};
