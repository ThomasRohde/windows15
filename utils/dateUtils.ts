/**
 * Date utility functions for calendar and time-based features
 * @module utils/dateUtils
 */

/**
 * Pads a number to 2 digits with a leading zero if needed
 * @param value - The number to pad
 * @returns The padded string
 * @example
 * ```ts
 * pad2(5) // '05'
 * pad2(12) // '12'
 * ```
 */
export const pad2 = (value: number): string => value.toString().padStart(2, '0');

/**
 * Converts a Date object to YYYY-MM-DD format
 * @param date - The date to convert
 * @returns The date in YYYY-MM-DD format
 * @example
 * ```ts
 * toYmd(new Date(2024, 0, 15)) // '2024-01-15'
 * ```
 */
export const toYmd = (date: Date): string =>
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

/**
 * Converts a YYYY-MM-DD string to a Date object
 * @param ymd - The date string in YYYY-MM-DD format
 * @returns The Date object, or current date if parsing fails
 * @example
 * ```ts
 * fromYmd('2024-01-15') // Date(2024, 0, 15)
 * fromYmd('invalid') // new Date()
 * ```
 */
export const fromYmd = (ymd: string): Date => {
    const [y, m, d] = ymd.split('-').map(Number);
    if (!y || !m || !d) return new Date();
    return new Date(y, m - 1, d);
};

/**
 * Adds a specified number of months to a date
 * @param date - The starting date
 * @param delta - Number of months to add (can be negative)
 * @returns A new Date object with the specified months added
 * @example
 * ```ts
 * addMonths(new Date(2024, 0, 15), 2) // Date(2024, 2, 1)
 * addMonths(new Date(2024, 0, 15), -1) // Date(2023, 11, 1)
 * ```
 */
export const addMonths = (date: Date, delta: number): Date => new Date(date.getFullYear(), date.getMonth() + delta, 1);

/**
 * Builds a calendar grid for the specified month
 * Returns 42 cells (6 weeks × 7 days) including days from previous/next months
 * to fill the grid. This is standard for calendar displays.
 *
 * @param month - The month to build the grid for (only year and month are used)
 * @returns Array of 42 cells with date, inMonth flag, and ymd string
 * @example
 * ```ts
 * const grid = buildMonthGrid(new Date(2024, 0, 1)); // January 2024
 * grid.length // 42
 * grid[0].inMonth // false (if Jan 1 is not Monday)
 * grid[0].ymd // '2023-12-31' (example)
 * ```
 */
export const buildMonthGrid = (
    month: Date
): Array<{
    date: Date;
    inMonth: boolean;
    ymd: string;
}> => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const first = new Date(year, monthIndex, 1);
    const firstWeekday = first.getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    const cells: { date: Date; inMonth: boolean; ymd: string }[] = [];

    for (let i = 0; i < 42; i++) {
        const dayOffset = i - firstWeekday;
        const inMonth = dayOffset >= 0 && dayOffset < daysInMonth;
        // Use dayOffset + 1 to get the correct date - JavaScript Date handles overflow/underflow
        const cellDate = new Date(year, monthIndex, dayOffset + 1);
        cells.push({ date: cellDate, inMonth, ymd: toYmd(cellDate) });
    }

    return cells;
};

/**
 * Checks if two dates represent the same day (ignores time)
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if both dates are on the same day
 * @example
 * ```ts
 * isSameDay(new Date(2024, 0, 15, 10, 30), new Date(2024, 0, 15, 18, 45)) // true
 * isSameDay(new Date(2024, 0, 15), new Date(2024, 0, 16)) // false
 * ```
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
    );
};

/**
 * Checks if two dates are in the same month and year
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if both dates are in the same month
 * @example
 * ```ts
 * isSameMonth(new Date(2024, 0, 15), new Date(2024, 0, 20)) // true
 * isSameMonth(new Date(2024, 0, 31), new Date(2024, 1, 1)) // false
 * ```
 */
export const isSameMonth = (date1: Date, date2: Date): boolean => {
    return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth();
};

/**
 * Formats a time string (HH:MM) for display
 * @param time - Time string in HH:MM format
 * @returns Formatted time string
 * @example
 * ```ts
 * formatTime('09:30') // '9:30 AM' (locale-dependent)
 * formatTime('14:15') // '2:15 PM' (locale-dependent)
 * ```
 */
export const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours || 0, minutes || 0, 0, 0);
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};
