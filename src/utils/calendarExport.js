/**
 * Utility to generate and download iCalendar (.ics) files for Deadlines and Events.
 * Enables students and lecturers to sync academic deadlines to Google Calendar, Apple Calendar, or Outlook.
 */

function formatDateToICS(dateStr, timeStr = null) {
  // dateStr is 'YYYY-MM-DD'
  if (!dateStr) return '';
  const cleanDate = dateStr.replace(/-/g, '');
  if (!timeStr) {
    // All-day event: VALUE=DATE:YYYYMMDD
    return `;VALUE=DATE:${cleanDate}`;
  }

  // Parse time string like "10:00 AM" or "02:30 PM"
  let hours = 10;
  let mins = 0;
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (match) {
    hours = parseInt(match[1], 10);
    mins = parseInt(match[2], 10);
    const meridiem = (match[3] || '').toUpperCase();
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
  }

  const pad = (n) => String(n).padStart(2, '0');
  return `:${cleanDate}T${pad(hours)}${pad(mins)}00Z`;
}

export function generateICS(items = []) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TTU Graphic Design Department//Academic Portal//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:TTU Graphic Design Academic Calendar',
    'X-WR-TIMEZONE:Africa/Accra'
  ];

  const nowStr = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  items.forEach((item, index) => {
    const isDeadline = Boolean(item.dueDate);
    const dateStr = isDeadline ? item.dueDate : item.date;
    if (!dateStr) return;

    const uid = `${item.id || index}_${Date.now()}@ttu.edu.gh`;
    const summary = isDeadline ? `[Deadline] ${item.title} (${item.course || 'Graphic Design'})` : `[Event] ${item.title}`;
    const description = (item.description || item.content || '').replace(/\n/g, '\\n').replace(/,/g, '\\,');
    const location = (item.location || (isDeadline ? `TTU Graphic Design Studio (${item.course || ''})` : 'TTU Campus')).replace(/,/g, '\\,');

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${nowStr}`);
    
    if (isDeadline) {
      // Due at 23:59:00 on the due date
      const cleanDate = dateStr.replace(/-/g, '');
      lines.push(`DTSTART:${cleanDate}T090000Z`);
      lines.push(`DTEND:${cleanDate}T170000Z`);
    } else {
      const timeVal = item.time || '10:00 AM';
      const dtStart = formatDateToICS(dateStr, timeVal);
      lines.push(`DTSTART${dtStart}`);
      // Default to 2 hours later
      const dtEnd = formatDateToICS(dateStr, '01:00 PM');
      lines.push(`DTEND${dtEnd}`);
    }

    lines.push(`SUMMARY:${summary}`);
    if (description) lines.push(`DESCRIPTION:${description}`);
    if (location) lines.push(`LOCATION:${location}`);
    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadCalendarICS(items, filename = 'TTU_Academic_Schedule.ics') {
  const icsData = generateICS(items);
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
