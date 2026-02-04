// Pure date utility functions for timeline calculations

/**
 * Get the date for a given week number (weeks start on Monday)
 * @param {Date} startDate - Timeline start date
 * @param {number} weekNum - Week number (1-based)
 * @returns {Date} Date of the Monday of that week
 */
export function getWeekDate(startDate, weekNum) {
  const date = new Date(startDate);
  const dayOfWeek = date.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  date.setDate(date.getDate() + daysToMonday);
  date.setDate(date.getDate() + (weekNum - 1) * 7);
  return date;
}

/**
 * Convert a date to week number relative to timeline start
 * @param {Date} startDate - Timeline start date
 * @param {string} dateStr - ISO date string to convert
 * @returns {number} Week number (1-based)
 */
export function dateToWeek(startDate, dateStr) {
  const targetDate = new Date(dateStr);
  const firstMonday = getWeekDate(startDate, 1);
  const diffTime = targetDate - firstMonday;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7) + 1;
}

/**
 * Calculate duration in weeks from start and end dates
 * @param {string} startDateStr - Start date ISO string
 * @param {string} endDateStr - End date ISO string
 * @returns {number} Duration in weeks (minimum 1)
 */
export function datesToDuration(startDateStr, endDateStr) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const diffTime = end - start;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.ceil(diffDays / 7));
}

/**
 * Format date as DD/MM/YYYY
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDateDDMMYYYY(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format date range from week number and duration
 * @param {Date} startDate - Timeline start date
 * @param {number} weekNum - Start week number
 * @param {number} duration - Duration in weeks
 * @returns {string} Formatted date range "DD/MM/YYYY - DD/MM/YYYY"
 */
export function formatDateRange(startDate, weekNum, duration) {
  const start = getWeekDate(startDate, weekNum);
  const end = new Date(start);
  end.setDate(end.getDate() + duration * 7 - 1);
  return `${formatDateDDMMYYYY(start)} - ${formatDateDDMMYYYY(end)}`;
}

/**
 * Get month index (0-11) for a given week
 * @param {Date} startDate - Timeline start date
 * @param {number} weekNum - Week number
 * @returns {number} Month index (0-11)
 */
export function getMonthForWeek(startDate, weekNum) {
  const date = getWeekDate(startDate, weekNum);
  return date.getMonth();
}

/**
 * Get array of month dates for monthly view
 * @param {Date} startDate - Timeline start date
 * @param {number} totalWeeks - Total weeks to show
 * @returns {Date[]} Array of first-of-month dates
 */
export function getMonthColumns(startDate, totalWeeks) {
  const months = [];
  let currentDate = new Date(startDate);
  currentDate.setDate(1);

  const endWeekDate = getWeekDate(startDate, totalWeeks);

  while (currentDate <= endWeekDate) {
    months.push(new Date(currentDate));
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  return months;
}

/**
 * Calculate task position in monthly view as percentages
 * @param {Object} task - Task with startWeek and duration
 * @param {Date} startDate - Timeline start date
 * @param {number} totalWeeks - Total weeks in timeline
 * @returns {{ left: number, width: number }} Position as percentages
 */
export function getMonthlyTaskPosition(task, startDate, totalWeeks) {
  const months = getMonthColumns(startDate, totalWeeks);
  const totalMonths = months.length;
  if (totalMonths === 0) return { left: 0, width: 0 };

  const taskStartDate = getWeekDate(startDate, task.startWeek);
  const taskEndDate = new Date(taskStartDate);
  taskEndDate.setDate(taskEndDate.getDate() + task.duration * 7 - 1);

  // Find which month the task starts in
  let startMonthIndex = 0;
  let startOffset = 0;
  for (let i = 0; i < months.length; i++) {
    const monthStart = months[i];
    const nextMonthStart = new Date(monthStart);
    nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);

    if (taskStartDate >= monthStart && taskStartDate < nextMonthStart) {
      startMonthIndex = i;
      const daysInMonth = (nextMonthStart - monthStart) / (1000 * 60 * 60 * 24);
      const dayOffset = (taskStartDate - monthStart) / (1000 * 60 * 60 * 24);
      startOffset = dayOffset / daysInMonth;
      break;
    } else if (taskStartDate < monthStart && i === 0) {
      startMonthIndex = 0;
      startOffset = 0;
      break;
    }
  }

  // Find which month the task ends in
  let endMonthIndex = months.length - 1;
  let endOffset = 1;
  for (let i = 0; i < months.length; i++) {
    const monthStart = months[i];
    const nextMonthStart = new Date(monthStart);
    nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);

    if (taskEndDate >= monthStart && taskEndDate < nextMonthStart) {
      endMonthIndex = i;
      const daysInMonth = (nextMonthStart - monthStart) / (1000 * 60 * 60 * 24);
      const dayOffset = (taskEndDate - monthStart) / (1000 * 60 * 60 * 24) + 1;
      endOffset = Math.min(dayOffset / daysInMonth, 1);
      break;
    }
  }

  const left = ((startMonthIndex + startOffset) / totalMonths) * 100;
  const right = ((endMonthIndex + endOffset) / totalMonths) * 100;
  const width = right - left;

  return { left, width: Math.max(width, 2) }; // Minimum 2% width for visibility
}

/**
 * Calculate minimum weeks needed based on task end dates
 * @param {Object[]} tasks - Array of tasks
 * @returns {number} Minimum weeks needed (at least 16)
 */
export function getMinWeeksNeeded(tasks) {
  if (tasks.length === 0) return 16;
  const maxEndWeek = Math.max(...tasks.map(t => t.startWeek + t.duration - 1));
  return maxEndWeek + 8; // Add 2 month buffer
}

/**
 * Get base weeks for view mode
 * @param {string} viewMode - 'weekly' or 'monthly'
 * @returns {number} Base number of weeks
 */
export function getBaseWeeks(viewMode) {
  if (viewMode === 'weekly') return 16;
  if (viewMode === 'monthly') return 24;
  return 16;
}

/**
 * Calculate total weeks for timeline
 * @param {string} viewMode - Current view mode
 * @param {Object[]} tasks - Array of tasks
 * @returns {number} Total weeks to display
 */
export function getTotalWeeks(viewMode, tasks) {
  return Math.max(getBaseWeeks(viewMode), getMinWeeksNeeded(tasks));
}
