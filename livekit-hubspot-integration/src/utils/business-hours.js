/**
 * Business Hours Utility
 * Validates if calls can be made during business hours
 * Monday - Friday, 9:00 AM - 5:00 PM Central Standard Time (CST)
 */

/**
 * Checks if the current time is within business hours
 * @returns {Object} - { isBusinessHours: boolean, message: string, currentTime: string }
 */
function isBusinessHours() {
  // Get current time in Central Time (handles both CST and CDT automatically)
  const now = new Date();
  
  // Format time in Central timezone for display
  const centralTime = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short'
  }).formatToParts(now);

  // Extract components for display
  const weekday = centralTime.find(part => part.type === 'weekday').value;
  const hour = parseInt(centralTime.find(part => part.type === 'hour').value);
  const minute = parseInt(centralTime.find(part => part.type === 'minute').value);
  const ampm = centralTime.find(part => part.type === 'dayPeriod').value;
  const timeZoneName = centralTime.find(part => part.type === 'timeZoneName').value;

  // Convert to 24-hour format
  let hour24 = hour;
  if (ampm === 'PM' && hour !== 12) {
    hour24 = hour + 12;
  } else if (ampm === 'AM' && hour === 12) {
    hour24 = 0;
  }

  // Format current time string
  const currentTimeStr = `${weekday}, ${hour}:${minute.toString().padStart(2, '0')} ${ampm} ${timeZoneName}`;

  // Check if it's a weekday (Monday - Friday)
  const isWeekday = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(weekday);

  // Check if within business hours (9:00 AM - 5:00 PM)
  const isWithinHours = hour24 >= 9 && hour24 < 17;

  const isBusinessHours = isWeekday && isWithinHours;

  let message;
  if (!isWeekday) {
    message = `Calls are only allowed Monday-Friday. Current time: ${currentTimeStr}`;
  } else if (!isWithinHours) {
    message = `Calls are only allowed between 9:00 AM - 5:00 PM CST. Current time: ${currentTimeStr}`;
  } else {
    message = `Business hours: ${currentTimeStr}`;
  }

  return {
    isBusinessHours,
    message,
    currentTime: currentTimeStr,
    weekday,
    hour24,
    timeZone: timeZoneName
  };
}

/**
 * Validates business hours and throws an error if outside business hours
 * @throws {Error} If outside business hours
 */
function validateBusinessHours() {
  const check = isBusinessHours();
  if (!check.isBusinessHours) {
    throw new Error(check.message);
  }
  return check;
}

module.exports = {
  isBusinessHours,
  validateBusinessHours,
};
