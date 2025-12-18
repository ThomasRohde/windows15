/**
 * Color conversion utilities
 *
 * Provides pure functions for converting between color spaces:
 * - HSL (Hue, Saturation, Lightness)
 * - RGB (Red, Green, Blue)
 * - HEX (Hexadecimal color codes)
 *
 * @module utils/color
 */

export interface RGB {
    r: number;
    g: number;
    b: number;
}

export interface HSL {
    h: number;
    s: number;
    l: number;
}

/**
 * Convert HSL to RGB
 *
 * @param h - Hue (0-360)
 * @param s - Saturation (0-100)
 * @param l - Lightness (0-100)
 * @returns RGB object with r, g, b values (0-255)
 *
 * @example
 * ```ts
 * hslToRgb(200, 70, 50) // { r: 38, g: 149, b: 217 }
 * ```
 */
export const hslToRgb = (h: number, s: number, l: number): RGB => {
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    };
    return {
        r: Math.round(f(0) * 255),
        g: Math.round(f(8) * 255),
        b: Math.round(f(4) * 255),
    };
};

/**
 * Convert RGB to hexadecimal color code
 *
 * @param r - Red (0-255)
 * @param g - Green (0-255)
 * @param b - Blue (0-255)
 * @returns Hex color string (e.g., "#2695D9")
 *
 * @example
 * ```ts
 * rgbToHex(38, 149, 217) // "#2695D9"
 * ```
 */
export const rgbToHex = (r: number, g: number, b: number): string => {
    return (
        '#' +
        [r, g, b]
            .map(x =>
                Math.max(0, Math.min(255, Math.round(x)))
                    .toString(16)
                    .padStart(2, '0')
            )
            .join('')
            .toUpperCase()
    );
};

/**
 * Convert hexadecimal color code to RGB
 *
 * Supports both 6-digit (#RRGGBB) and 3-digit (#RGB) hex codes.
 *
 * @param hex - Hex color string (with or without #)
 * @returns RGB object with r, g, b values (0-255), or null if invalid
 *
 * @example
 * ```ts
 * hexToRgb("#2695D9")    // { r: 38, g: 149, b: 217 }
 * hexToRgb("2695D9")     // { r: 38, g: 149, b: 217 }
 * hexToRgb("#FFF")       // { r: 255, g: 255, b: 255 }
 * hexToRgb("invalid")    // null
 * ```
 */
export const hexToRgb = (hex: string): RGB | null => {
    // Remove # if present
    const cleanHex = hex.replace(/^#/, '');

    // Handle shorthand hex (#FFF)
    if (cleanHex.length === 3) {
        const expanded = cleanHex
            .split('')
            .map(char => char + char)
            .join('');
        return hexToRgb(expanded);
    }

    // Validate 6-digit hex
    if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
        return null;
    }

    const r = parseInt(cleanHex.slice(0, 2), 16);
    const g = parseInt(cleanHex.slice(2, 4), 16);
    const b = parseInt(cleanHex.slice(4, 6), 16);

    return { r, g, b };
};

/**
 * Convert RGB to HSL
 *
 * @param r - Red (0-255)
 * @param g - Green (0-255)
 * @param b - Blue (0-255)
 * @returns HSL object with h (0-360), s (0-100), l (0-100)
 *
 * @example
 * ```ts
 * rgbToHsl(38, 149, 217) // { h: 203, s: 70, l: 50 }
 * ```
 */
export const rgbToHsl = (r: number, g: number, b: number): HSL => {
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;

    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        if (max === rNorm) {
            h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) * 60;
        } else if (max === gNorm) {
            h = ((bNorm - rNorm) / d + 2) * 60;
        } else {
            h = ((rNorm - gNorm) / d + 4) * 60;
        }
    }

    return {
        h: Math.round(h),
        s: Math.round(s * 100),
        l: Math.round(l * 100),
    };
};

/**
 * Convert hexadecimal color code to HSL
 *
 * @param hex - Hex color string (with or without #)
 * @returns HSL object with h (0-360), s (0-100), l (0-100), or null if invalid
 *
 * @example
 * ```ts
 * hexToHsl("#2695D9")  // { h: 203, s: 70, l: 50 }
 * hexToHsl("#FFF")     // { h: 0, s: 0, l: 100 }
 * hexToHsl("invalid")  // null
 * ```
 */
export const hexToHsl = (hex: string): HSL | null => {
    const rgb = hexToRgb(hex);
    if (!rgb) return null;
    return rgbToHsl(rgb.r, rgb.g, rgb.b);
};
