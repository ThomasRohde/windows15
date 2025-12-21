export type ViewportSize = {
    width: number;
    height: number;
};

export type WindowMaxInsets = {
    top: number;
    right: number;
    bottom: number;
    left: number;
};

export type WindowMaxRect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

const parsePx = (value: string): number => {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
};

export const getViewportSize = (): ViewportSize => {
    if (typeof window === 'undefined') {
        return { width: 0, height: 0 };
    }

    const viewport = window.visualViewport;
    return {
        width: viewport?.width ?? window.innerWidth,
        height: viewport?.height ?? window.innerHeight,
    };
};

export const getWindowMaxInsets = (): WindowMaxInsets => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return { top: 0, right: 0, bottom: 0, left: 0 };
    }

    const styles = window.getComputedStyle(document.documentElement);
    return {
        top: parsePx(styles.getPropertyValue('--window-max-top')),
        right: parsePx(styles.getPropertyValue('--window-max-right')),
        bottom: parsePx(styles.getPropertyValue('--window-max-bottom')),
        left: parsePx(styles.getPropertyValue('--window-max-left')),
    };
};

export const getWindowMaxRect = (): WindowMaxRect => {
    const { width, height } = getViewportSize();
    const { top, right, bottom, left } = getWindowMaxInsets();
    const rectWidth = Math.max(0, width - left - right);
    const rectHeight = Math.max(0, height - top - bottom);
    return { x: left, y: top, width: rectWidth, height: rectHeight };
};
