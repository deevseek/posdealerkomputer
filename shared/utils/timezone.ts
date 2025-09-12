import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { id } from 'date-fns/locale';

/**
 * Jakarta Timezone Utility Functions
 * Asia/Jakarta (GMT+7) timezone management using proper timezone-aware functions
 */

const JAKARTA_TIMEZONE = 'Asia/Jakarta';

/**
 * Gets current time in Jakarta timezone
 * @returns Date object representing current time in Jakarta timezone
 */
export function getCurrentJakartaTime(): Date {
  const now = new Date();
  return toZonedTime(now, JAKARTA_TIMEZONE);
}

/**
 * Converts any date to Jakarta timezone
 * @param date - Date to convert (assumed to be in UTC if coming from database)
 * @returns Date object adjusted to Jakarta timezone
 */
export function toJakartaTime(date: Date): Date {
  return toZonedTime(date, JAKARTA_TIMEZONE);
}

/**
 * Converts Jakarta time to UTC for database storage
 * @param jakartaDate - Date in Jakarta timezone
 * @returns Date object in UTC for database storage
 */
export function jakartaTimeToUtc(jakartaDate: Date): Date {
  return fromZonedTime(jakartaDate, JAKARTA_TIMEZONE);
}

/**
 * Formats date for database insert with proper timezone handling
 * @param date - Date in Jakarta timezone (optional, defaults to current Jakarta time)
 * @returns ISO string in UTC for database storage
 */
export function formatDateForDatabase(date?: Date): string {
  const jakartaDate = date || getCurrentJakartaTime();
  const utcDate = jakartaTimeToUtc(jakartaDate);
  return utcDate.toISOString();
}

/**
 * Formats date for user display with Jakarta timezone
 * @param date - Date to format (UTC from database or Jakarta time)
 * @param formatString - Format pattern (default: 'dd/MM/yyyy HH:mm')
 * @param fromDatabase - Whether the date comes from database (UTC) or is already in Jakarta time
 * @returns Formatted date string in Indonesian locale
 */
export function formatDateForDisplay(
  date: Date | string, 
  formatString: string = 'dd/MM/yyyy HH:mm',
  fromDatabase: boolean = true
): string {
  let dateObj: Date;
  
  if (typeof date === 'string') {
    dateObj = parseISO(date);
  } else {
    dateObj = date;
  }
  
  // Convert to Jakarta timezone if coming from database (UTC)
  const jakartaDate = fromDatabase ? toJakartaTime(dateObj) : dateObj;
  return format(jakartaDate, formatString, { locale: id });
}

/**
 * Formats date for display in short format
 * @param date - Date to format
 * @param fromDatabase - Whether the date comes from database (UTC)
 * @returns Short formatted date string (dd/MM/yyyy)
 */
export function formatDateShort(date: Date | string, fromDatabase: boolean = true): string {
  return formatDateForDisplay(date, 'dd/MM/yyyy', fromDatabase);
}

/**
 * Formats date for display with time
 * @param date - Date to format
 * @param fromDatabase - Whether the date comes from database (UTC)
 * @returns Formatted date string with time (dd/MM/yyyy HH:mm:ss)
 */
export function formatDateWithTime(date: Date | string, fromDatabase: boolean = true): string {
  return formatDateForDisplay(date, 'dd/MM/yyyy HH:mm:ss', fromDatabase);
}

/**
 * Formats date for display in long format
 * @param date - Date to format
 * @param fromDatabase - Whether the date comes from database (UTC)
 * @returns Long formatted date string (dd MMMM yyyy)
 */
export function formatDateLong(date: Date | string, fromDatabase: boolean = true): string {
  return formatDateForDisplay(date, 'dd MMMM yyyy', fromDatabase);
}

/**
 * Formats time only
 * @param date - Date to format
 * @param fromDatabase - Whether the date comes from database (UTC)
 * @returns Time string (HH:mm)
 */
export function formatTimeOnly(date: Date | string, fromDatabase: boolean = true): string {
  return formatDateForDisplay(date, 'HH:mm', fromDatabase);
}

/**
 * Parses string date with Jakarta timezone consideration
 * @param dateString - Date string to parse
 * @param isUTC - Whether the input string is in UTC (default: true for database dates)
 * @returns Date object in Jakarta timezone
 */
export function parseWithTimezone(dateString: string, isUTC: boolean = true): Date {
  const parsed = parseISO(dateString);
  
  if (isUTC) {
    // If the input is UTC (from database), convert to Jakarta time
    return toJakartaTime(parsed);
  } else {
    // If the input is already in Jakarta time
    return parsed;
  }
}

/**
 * Gets start of day in Jakarta timezone
 * @param date - Date to get start of day (optional, defaults to current Jakarta time)
 * @returns Date object at start of day in UTC for database storage
 */
export function getStartOfDayJakarta(date?: Date): Date {
  const jakartaDate = date || getCurrentJakartaTime();
  const jakartaStartOfDay = startOfDay(jakartaDate);
  return jakartaTimeToUtc(jakartaStartOfDay);
}

/**
 * Gets end of day in Jakarta timezone
 * @param date - Date to get end of day (optional, defaults to current Jakarta time)
 * @returns Date object at end of day in UTC for database storage
 */
export function getEndOfDayJakarta(date?: Date): Date {
  const jakartaDate = date || getCurrentJakartaTime();
  const jakartaEndOfDay = endOfDay(jakartaDate);
  return jakartaTimeToUtc(jakartaEndOfDay);
}

/**
 * Gets start of day in Jakarta timezone for display purposes
 * @param date - Date to get start of day (optional, defaults to current Jakarta time)
 * @returns Date object at start of day in Jakarta timezone
 */
export function getStartOfDayJakartaDisplay(date?: Date): Date {
  const jakartaDate = date || getCurrentJakartaTime();
  return startOfDay(jakartaDate);
}

/**
 * Gets end of day in Jakarta timezone for display purposes
 * @param date - Date to get end of day (optional, defaults to current Jakarta time)
 * @returns Date object at end of day in Jakarta timezone
 */
export function getEndOfDayJakartaDisplay(date?: Date): Date {
  const jakartaDate = date || getCurrentJakartaTime();
  return endOfDay(jakartaDate);
}

/**
 * Checks if a date is today in Jakarta timezone
 * @param date - Date to check (UTC from database or Jakarta time)
 * @param fromDatabase - Whether the date comes from database (UTC)
 * @returns Boolean indicating if date is today
 */
export function isToday(date: Date | string, fromDatabase: boolean = true): boolean {
  const today = getCurrentJakartaTime();
  let checkDate: Date;
  
  if (typeof date === 'string') {
    checkDate = parseISO(date);
  } else {
    checkDate = date;
  }
  
  const jakartaCheckDate = fromDatabase ? toJakartaTime(checkDate) : checkDate;
  
  return (
    today.getFullYear() === jakartaCheckDate.getFullYear() &&
    today.getMonth() === jakartaCheckDate.getMonth() &&
    today.getDate() === jakartaCheckDate.getDate()
  );
}

/**
 * Gets date range for today in Jakarta timezone (UTC for database queries)
 * @returns Object with start and end of today in UTC for database queries
 */
export function getTodayRange(): { start: Date; end: Date } {
  return {
    start: getStartOfDayJakarta(),
    end: getEndOfDayJakarta()
  };
}

/**
 * Gets date range for today in Jakarta timezone for display
 * @returns Object with start and end of today in Jakarta timezone
 */
export function getTodayRangeDisplay(): { start: Date; end: Date } {
  return {
    start: getStartOfDayJakartaDisplay(),
    end: getEndOfDayJakartaDisplay()
  };
}

/**
 * Formats relative time (e.g., "2 jam yang lalu")
 * @param date - Date to format (UTC from database or Jakarta time)
 * @param fromDatabase - Whether the date comes from database (UTC)
 * @returns Relative time string in Indonesian
 */
export function formatRelativeTime(date: Date | string, fromDatabase: boolean = true): string {
  const now = getCurrentJakartaTime();
  let targetDate: Date;
  
  if (typeof date === 'string') {
    targetDate = parseISO(date);
  } else {
    targetDate = date;
  }
  
  const jakartaTargetDate = fromDatabase ? toJakartaTime(targetDate) : targetDate;
  
  const diffMs = now.getTime() - jakartaTargetDate.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 60) {
    return 'Baru saja';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} menit yang lalu`;
  } else if (diffHours < 24) {
    return `${diffHours} jam yang lalu`;
  } else if (diffDays < 7) {
    return `${diffDays} hari yang lalu`;
  } else {
    return formatDateShort(jakartaTargetDate, false);
  }
}

/**
 * Creates a new Date object with current Jakarta time
 * Useful for creating timestamps in Jakarta timezone
 * @returns New Date object in Jakarta timezone
 */
export function createJakartaTimestamp(): Date {
  return getCurrentJakartaTime();
}

/**
 * Utility for creating database-ready timestamp
 * @returns ISO string in UTC of current Jakarta time
 */
export function createDatabaseTimestamp(): string {
  return formatDateForDatabase();
}

/**
 * Converts database date range to Jakarta timezone for queries
 * @param startDate - Start date in Jakarta timezone
 * @param endDate - End date in Jakarta timezone
 * @returns Object with UTC dates for database queries
 */
export function convertDateRangeForDatabase(startDate: Date, endDate: Date): { start: Date; end: Date } {
  return {
    start: jakartaTimeToUtc(startOfDay(startDate)),
    end: jakartaTimeToUtc(endOfDay(endDate))
  };
}

/**
 * Parses user input date and converts to UTC for database storage
 * @param dateInput - Date input from user (assumed to be in Jakarta timezone)
 * @returns Date object in UTC for database storage
 */
export function parseUserDateForDatabase(dateInput: string | Date): Date {
  let jakartaDate: Date;
  
  if (typeof dateInput === 'string') {
    jakartaDate = parseISO(dateInput);
  } else {
    jakartaDate = dateInput;
  }
  
  return jakartaTimeToUtc(jakartaDate);
}

/**
 * Helper function to ensure date is in Jakarta timezone for calculations
 * @param date - Date that might be in UTC or Jakarta timezone
 * @param fromDatabase - Whether the date comes from database (UTC)
 * @returns Date in Jakarta timezone
 */
export function ensureJakartaTime(date: Date, fromDatabase: boolean = true): Date {
  return fromDatabase ? toJakartaTime(date) : date;
}

/**
 * Helper function to create a date range for database queries
 * @param startDateInput - Start date in Jakarta timezone
 * @param endDateInput - End date in Jakarta timezone
 * @returns UTC date range for database queries
 */
export function createDatabaseDateRange(startDateInput: Date | string, endDateInput: Date | string): { start: Date; end: Date } {
  let startDate: Date;
  let endDate: Date;
  
  if (typeof startDateInput === 'string') {
    startDate = parseISO(startDateInput);
  } else {
    startDate = startDateInput;
  }
  
  if (typeof endDateInput === 'string') {
    endDate = parseISO(endDateInput);
  } else {
    endDate = endDateInput;
  }
  
  return convertDateRangeForDatabase(startDate, endDate);
}

// Common date format patterns for Indonesian locale
export const DATE_FORMATS = {
  SHORT: 'dd/MM/yyyy',
  LONG: 'dd MMMM yyyy',
  WITH_TIME: 'dd/MM/yyyy HH:mm',
  WITH_SECONDS: 'dd/MM/yyyy HH:mm:ss',
  TIME_ONLY: 'HH:mm',
  TIME_WITH_SECONDS: 'HH:mm:ss',
  MONTH_YEAR: 'MMMM yyyy',
  DAY_MONTH: 'dd MMMM',
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"
} as const;

export type DateFormat = typeof DATE_FORMATS[keyof typeof DATE_FORMATS];