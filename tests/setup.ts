/**
 * Vitest test setup file
 * This file runs before each test file
 */
import '@testing-library/jest-dom/vitest';
import { beforeEach, vi } from 'vitest';

// Mock localStorage for tests
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => {
            store[key] = value;
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
        get length() {
            return Object.keys(store).length;
        },
        key: (index: number) => Object.keys(store)[index] ?? null,
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

// Mock pointer capture methods (not available in jsdom)
window.Element.prototype.setPointerCapture = vi.fn();
window.Element.prototype.releasePointerCapture = vi.fn();

// Reset localStorage before each test
beforeEach(() => {
    localStorageMock.clear();
});
