/**
 * Utility functions for TimeZone: +5:30 Asia/Kolkata
 */

const TIMEZONE = 'Asia/Kolkata';

/**
 * Format a Date or timestamp string into Asia/Kolkata Date and Time
 * @param {Date|string|number} dateInput 
 * @returns {{ date: string, time: string, full: string }}
 */
function formatKolkataTime(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();

  // Validate date
  if (isNaN(d.getTime())) {
    return { date: 'N/A', time: 'N/A', full: 'N/A' };
  }

  // Format Date in Asia/Kolkata: "24/09/2026" or "24 Sep 2026"
  const dateStr = new Intl.DateTimeFormat('en-IN', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(d);

  // Format Time in Asia/Kolkata: "01:23:45 PM"
  const timeStr = new Intl.DateTimeFormat('en-IN', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(d);

  return {
    date: dateStr,
    time: timeStr,
    full: `${dateStr} ${timeStr}`
  };
}

module.exports = {
  TIMEZONE,
  formatKolkataTime
};
