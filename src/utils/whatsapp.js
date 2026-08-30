/**
 * WhatsApp Integration Utilities for TTU Graphic Design Reminder & Announcement System
 */

// Default Department WhatsApp Contact & Group Details
export const DEFAULT_WHATSAPP_CONFIG = {
  departmentPhone: '233240000000', // TTU Dept Desk format: CountryCode + Number without '+'
  groupInviteUrl: 'https://chat.whatsapp.com/invite/ttu-graphic-design',
  departmentName: 'TTU Graphic Design Dept'
};

const getStoredConfig = () => {
  try {
    const saved = localStorage.getItem('ttu_whatsapp_config');
    return saved ? { ...DEFAULT_WHATSAPP_CONFIG, ...JSON.parse(saved) } : DEFAULT_WHATSAPP_CONFIG;
  } catch {
    return DEFAULT_WHATSAPP_CONFIG;
  }
};

export const saveWhatsAppConfig = (config) => {
  try {
    localStorage.setItem('ttu_whatsapp_config', JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save WhatsApp config', err);
  }
};

export const getWhatsAppConfig = () => getStoredConfig();

export const createClassGroupTitle = (year) => {
  const classYear = (year || 'Students').trim();
  return `TTU Graphic Design ${classYear} Class Group`;
};

export const formatClassGroupJoinRequest = (group, student) => {
  const classYear = student?.year || group?.year || 'my class';
  const groupTitle = group?.title || createClassGroupTitle(classYear);
  return `Hello ${group?.headName || 'Class Head'}, my name is ${student?.name || 'a student'} from ${classYear}. Please add me to ${groupTitle}.`;
};

/**
 * Generates a WhatsApp Web / Mobile direct link
 */
export const createWhatsAppUrl = ({ phone, text }) => {
  const encodedText = encodeURIComponent(text || '');
  if (phone) {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }
  return `https://api.whatsapp.com/send?text=${encodedText}`;
};

/**
 * Open WhatsApp directly in a new tab/window
 */
export const openWhatsApp = ({ phone, text }) => {
  const url = createWhatsAppUrl({ phone, text });
  window.open(url, '_blank', 'noopener,noreferrer');
};

/**
 * Pre-formatted templates for sharing
 */
export const formatAnnouncementForWhatsApp = (announcement) => {
  const categoryTag = announcement.category ? `[${announcement.category.toUpperCase()}]` : '';
  const pinTag = announcement.isPinned ? '📌 *PINNED BULLETIN*' : '';
  return `📢 *TTU GRAPHIC DESIGN ANNOUNCEMENT* ${categoryTag}
${pinTag ? `${pinTag}\n` : ''}
*${announcement.title}*

${announcement.content}

━━━━━━━━━━━━━━━━━━━
📅 *Date:* ${announcement.date || 'Today'}
👤 *Posted By:* ${announcement.author || 'Department Office'}
🏛️ *Takoradi Technical University - Graphic Design Dept*`;
};

export const formatDeadlineForWhatsApp = (deadline) => {
  const typeEmoji = deadline.type === 'examination' ? '📝' : deadline.type === 'project' ? '🎨' : '📄';
  return `⏰ *TTU ACADEMIC DEADLINE REMINDER* ${typeEmoji}

*${deadline.title}*
📚 *Course:* ${deadline.course}
📌 *Type:* ${deadline.type ? deadline.type.toUpperCase() : 'ASSIGNMENT'}
📅 *Due Date:* ${deadline.dueDate}

📝 *Instructions / Details:*
${deadline.description || 'Check the department dashboard for full instructions and attachments.'}

━━━━━━━━━━━━━━━━━━━
👤 *Issued by:* ${deadline.author || 'Department Lecturer'}
🏛️ *TTU Graphic Design Digital Dashboard*`;
};

export const formatEventForWhatsApp = (event) => {
  return `🎉 *TTU DEPARTMENT EVENT NOTIFICATION*

*${event.title}*
📍 *Venue:* ${event.location}
🗓️ *Date:* ${event.date}
⏰ *Time:* ${event.time || 'TBA'}
🏷️ *Category:* ${event.type || 'General Event'}

📝 *Overview:*
${event.description || 'All students and faculty members are invited to attend.'}

━━━━━━━━━━━━━━━━━━━
👥 *Organized by:* ${event.organizer || 'Graphic Design Dept'}
🏛️ *Takoradi Technical University*`;
};

export const formatCustomBroadcast = (message, senderName, senderRole) => {
  return `📣 *TTU GRAPHIC DESIGN BROADCAST*

${message}

━━━━━━━━━━━━━━━━━━━
👤 *From:* ${senderName || 'Department Staff'} (${(senderRole || 'Staff').toUpperCase()})
🏛️ *Takoradi Technical University*`;
};
