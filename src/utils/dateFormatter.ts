/**
 * Central Date & Time Formatter for Academic Hero
 * 
 * Standardizes user-facing date and time displays:
 * - Date only: DD-MMM-YYYY (e.g. 26-Sep-2026)
 * - Date + Time: DD-MMM-YYYY hh:mm A (e.g. 26-Sep-2026 04:35 PM)
 * - Time only: hh:mm A (e.g. 04:35 PM)
 * 
 * CRITICAL RULE:
 * This utility formats USER-FACING displays only.
 * It does NOT mutate internal Google Sheet/API storage, sorting, or calculations.
 */

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
] as const;

/**
 * Safely parse diverse date inputs into a valid JS Date object.
 * Handles:
 * - ISO strings (2026-09-26, 2026-09-26T16:35:00)
 * - Indian slash formats (DD/MM/YYYY or D/M/YYYY)
 * - Dash formats (DD-MM-YYYY or DD-MMM-YYYY)
 * - Timestamp numbers
 * - JS Date instances
 */
export function parseDateInput(input: string | Date | number | null | undefined): Date | null {
  if (input === null || input === undefined || input === '') {
    return null;
  }

  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }

  if (typeof input === 'number') {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }

  const str = String(input).trim();
  if (!str) return null;

  // 1. Check DD/MM/YYYY or DD-MM-YYYY (Common Indian school format)
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    let hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
    const minute = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const second = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
    const ampm = dmyMatch[7]?.toUpperCase();

    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;

    const parsed = new Date(year, month, day, hour, minute, second);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  // 2. Check DD-MMM-YYYY (e.g. 26-Sep-2026)
  const dMmmYMatch = str.match(/^(\d{1,2})[\-\s]([A-Za-z]{3})[\-\s](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i);
  if (dMmmYMatch) {
    const day = parseInt(dMmmYMatch[1], 10);
    const monthStr = dMmmYMatch[2].toLowerCase();
    const monthIndex = MONTH_NAMES.findIndex(m => m.toLowerCase() === monthStr);
    const year = parseInt(dMmmYMatch[3], 10);
    let hour = dMmmYMatch[4] ? parseInt(dMmmYMatch[4], 10) : 0;
    const minute = dMmmYMatch[5] ? parseInt(dMmmYMatch[5], 10) : 0;
    const second = dMmmYMatch[6] ? parseInt(dMmmYMatch[6], 10) : 0;
    const ampm = dMmmYMatch[7]?.toUpperCase();

    if (monthIndex !== -1) {
      if (ampm === 'PM' && hour < 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;
      const parsed = new Date(year, monthIndex, day, hour, minute, second);
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }

  // 3. Native JS parse for ISO (YYYY-MM-DD or standard datetime)
  const nativeParsed = new Date(str);
  if (!isNaN(nativeParsed.getTime())) {
    return nativeParsed;
  }

  return null;
}

/**
 * Format date to standard user-facing: DD-MMM-YYYY (e.g. 26-Sep-2026)
 */
export function formatDisplayDate(
  input: string | Date | number | null | undefined,
  fallback = ''
): string {
  const d = parseDateInput(input);
  if (!d) return fallback || (typeof input === 'string' ? input : '');

  const day = String(d.getDate()).padStart(2, '0');
  const month = MONTH_NAMES[d.getMonth()];
  const year = d.getFullYear();

  return `${day}-${month}-${year}`;
}

/**
 * Format date + time to standard user-facing: DD-MMM-YYYY 04:35 PM (e.g. 26-Sep-2026 04:35 PM)
 */
export function formatDisplayDateTime(
  input: string | Date | number | null | undefined,
  fallback = ''
): string {
  const d = parseDateInput(input);
  if (!d) return fallback || (typeof input === 'string' ? input : '');

  const day = String(d.getDate()).padStart(2, '0');
  const month = MONTH_NAMES[d.getMonth()];
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  const formattedHours = String(hours).padStart(2, '0');

  return `${day}-${month}-${year} ${formattedHours}:${minutes} ${ampm}`;
}

/**
 * Format time only to standard: 04:35 PM
 */
export function formatDisplayTime(
  input: string | Date | number | null | undefined,
  fallback = ''
): string {
  const d = parseDateInput(input);
  if (!d) return fallback || (typeof input === 'string' ? input : '');

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedHours = String(hours).padStart(2, '0');

  return `${formattedHours}:${minutes} ${ampm}`;
}

/**
 * 2-digit number padding helper (e.g. 5 -> '05')
 */
export function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Creates an ISO local datetime string (YYYY-MM-DDTHH:mm) offset by given days from now, set to 23:59
 */
export function createPresetDeadline(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 0, 0);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
