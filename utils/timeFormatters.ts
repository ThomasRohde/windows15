/**
 * Time formatting utilities
 * @module utils/timeFormatters
 */

export interface FormatDurationOptions {
    /** Include hours in the output even if 0 */
    showHours?: boolean;
    /** Include centiseconds in the output */
    showCentiseconds?: boolean;
}

/**
 * Format milliseconds as HH:MM:SS or MM:SS with optional centiseconds
 *
 * @param ms - Duration in milliseconds
 * @param options - Formatting options
 * @returns Formatted time string (e.g., "01:23:45.67" or "23:45")
 *
 * @example
 * ```ts
 * formatDuration(125670) // "02:05.67"
 * formatDuration(125670, { showHours: true }) // "00:02:05.67"
 * formatDuration(125670, { showCentiseconds: false }) // "02:05"
 * ```
 */
export const formatDuration = (ms: number, options: FormatDurationOptions = {}): string => {
    const { showHours = false, showCentiseconds = true } = options;

    // Handle edge cases
    if (!Number.isFinite(ms) || ms < 0) {
        return showHours ? '00:00:00' : '00:00';
    }

    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);

    const parts: string[] = [];

    if (showHours || hours > 0) {
        parts.push(hours.toString().padStart(2, '0'));
    }

    parts.push(minutes.toString().padStart(2, '0'));
    parts.push(seconds.toString().padStart(2, '0'));

    const timeString = parts.join(':');

    if (showCentiseconds) {
        return `${timeString}.${centiseconds.toString().padStart(2, '0')}`;
    }

    return timeString;
};

/**
 * Format reading time from word count
 *
 * @param wordCount - Number of words
 * @param wordsPerMinute - Average reading speed (default: 200)
 * @returns Formatted reading time string (e.g., "5 min" or "45 sec")
 *
 * @example
 * ```ts
 * formatReadingTime(100) // "30 sec"
 * formatReadingTime(500) // "3 min"
 * formatReadingTime(500, 150) // "4 min"
 * ```
 */
export const formatReadingTime = (wordCount: number, wordsPerMinute = 200): string => {
    if (!Number.isFinite(wordCount) || wordCount <= 0) {
        return '0 sec';
    }

    if (!Number.isFinite(wordsPerMinute) || wordsPerMinute <= 0) {
        wordsPerMinute = 200; // fallback
    }

    const minutes = wordCount / wordsPerMinute;

    if (minutes < 1) {
        return `${Math.ceil(minutes * 60)} sec`;
    }

    return `${Math.ceil(minutes)} min`;
};
