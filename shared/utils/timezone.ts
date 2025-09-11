import { format, parseISO, addHours, subHours } from 'date-fns';
import { id } from 'date-fns/locale';

/**
 * Jakarta Timezone Utility Functions
 * GMT+7 (Asia/Jakarta) timezone management
 */

const JAKARTA_OFFSET_HOURS = 7; // GMT+7

/**
 * Gets current time in Jakarta timezone
 * @returns Date object adjusted to Jakarta timezone
 */
export function getCurrentJakartaTime(): Date {
  const now = new Date();
  const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
  return addHours(utc, JAKARTA_OFFSET_HOURS);
}

/**
 * Converts any date to Jakarta timezone
 * @param date - Date to convert
 * @returns Date object adjusted to Jakarta timezone
 */
export function toJakartaTime(date: Date): Date {
  const utc = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
  return addHours(utc, JAKARTA_OFFSET_HOURS);
}

/**
 * Formats date for database insert with Jakarta timezone
 * @param date - Date to format (optional, defaults to current Jakarta time)
 * @returns ISO string formatted for database
 */
export function formatDateForDatabase(date?: Date): string {
  const jakartaDate = date ? toJakartaTime(date) : getCurrentJakartaTime();
  return jakartaDate.toISOString();
}

/**
 * Formats date for user display with Jakarta timezone
 * @param date - Date to format
 * @param formatString - Format pattern (default: 'dd/MM/yyyy HH:mm')
 * @returns Formatted date string in Indonesian locale
 */
export function formatDateForDisplay(
  date: Date | string, 
  formatString: string = 'dd/MM/yyyy HH:mm'
): string {
  let dateObj: Date;
  
  if (typeof date === 'string') {
    dateObj = parseISO(date);
  } else {
    dateObj = date;
  }
  
  const jakartaDate = toJakartaTime(dateObj);
  return format(jakartaDate, formatString, { locale: id });
}

/**
 * Formats date for display in short format
 * @param date - Date to format
 * @returns Short formatted date string (dd/MM/yyyy)
 */
export function formatDateShort(date: Date | string): string {
  return formatDateForDisplay(date, 'dd/MM/yyyy');
}

/**
 * Formats date for display with time
 * @param date - Date to format
 * @returns Formatted date string with time (dd/MM/yyyy HH:mm:ss)
 */
export function formatDateWithTime(date: Date | string): string {
  return formatDateForDisplay(date, 'dd/MM/yyyy HH:mm:ss');
}

/**
 * Formats date for display in long format
 * @param date - Date to format
 * @returns Long formatted date string (dd MMMM yyyy)
 */
export function formatDateLong(date: Date | string): string {
  return formatDateForDisplay(date, 'dd MMMM yyyy');
}

/**
 * Formats time only
 * @param date - Date to format
 * @returns Time string (HH:mm)
 */
export function formatTimeOnly(date: Date | string): string {
  return formatDateForDisplay(date, 'HH:mm');
}

/**
 * Parses string date with Jakarta timezone consideration
 * @param dateString - Date string to parse
 * @param isUTC - Whether the input string is in UTC (default: true)
 * @returns Date object in Jakarta timezone
 */
export function parseWithTimezone(dateString: string, isUTC: boolean = true): Date {
  const parsed = parseISO(dateString);
  
  if (isUTC) {
    // If the input is UTC, convert to Jakarta time
    return addHours(parsed, JAKARTA_OFFSET_HOURS);
  } else {
    // If the input is already in local time, assume it's Jakarta time
    return parsed;
  }
}

/**
 * Gets start of day in Jakarta timezone
 * @param date - Date to get start of day (optional, defaults to current Jakarta time)
 * @returns Date object at start of day in Jakarta timezone
 */
export function getStartOfDayJakarta(date?: Date): Date {
  const jakartaDate = date ? toJakartaTime(date) : getCurrentJakartaTime();
  jakartaDate.setHours(0, 0, 0, 0);
  return jakartaDate;
}

/**
 * Gets end of day in Jakarta timezone
 * @param date - Date to get end of day (optional, defaults to current Jakarta time)
 * @returns Date object at end of day in Jakarta timezone
 */
export function getEndOfDayJakarta(date?: Date): Date {
  const jakartaDate = date ? toJakartaTime(date) : getCurrentJakartaTime();
  jakartaDate.setHours(23, 59, 59, 999);
  return jakartaDate;
}

/**
 * Checks if a date is today in Jakarta timezone
 * @param date - Date to check
 * @returns Boolean indicating if date is today
 */
export function isToday(date: Date | string): boolean {
  const today = getCurrentJakartaTime();
  const checkDate = typeof date === 'string' ? parseISO(date) : date;
  const jakartaCheckDate = toJakartaTime(checkDate);
  
  return (
    today.getFullYear() === jakartaCheckDate.getFullYear() &&
    today.getMonth() === jakartaCheckDate.getMonth() &&
    today.getDate() === jakartaCheckDate.getDate()
  );
}

/**
 * Gets date range for today in Jakarta timezone
 * @returns Object with start and end of today
 */
export function getTodayRange(): { start: Date; end: Date } {
  return {
    start: getStartOfDayJakarta(),
    end: getEndOfDayJakarta()
  };
}

/**
 * Formats relative time (e.g., "2 jam yang lalu")
 * @param date - Date to format
 * @returns Relative time string in Indonesian
 */
export function formatRelativeTime(date: Date | string): string {
  const now = getCurrentJakartaTime();
  const targetDate = typeof date === 'string' ? parseISO(date) : date;
  const jakartaTargetDate = toJakartaTime(targetDate);
  
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
    return formatDateShort(jakartaTargetDate);
  }
}

/**
 * Creates a new Date object with current Jakarta time
 * Useful for creating timestamps
 * @returns New Date object in Jakarta timezone
 */
export function createJakartaTimestamp(): Date {
  return getCurrentJakartaTime();
}

/**
 * Utility for creating database-ready timestamp
 * @returns ISO string of current Jakarta time
 */
export function createDatabaseTimestamp(): string {
  return formatDateForDatabase();
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