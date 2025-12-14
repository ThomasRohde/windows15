/**
 * Test utilities for component testing
 * Provides renderWithProviders helper and common mocks
 */
import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';

// Mock OS context values
export const mockOSContext = {
    // Window management
    windows: [],
    openWindow: vi.fn(),
    closeWindow: vi.fn(),
    minimizeWindow: vi.fn(),
    toggleMaximizeWindow: vi.fn(),
    focusWindow: vi.fn(),
    resizeWindow: vi.fn(),
    updateWindowPosition: vi.fn(),
    // App registry
    registerApp: vi.fn(),
    apps: [
        { id: 'notepad', title: 'Notepad', icon: 'edit_note', color: 'bg-yellow-500' },
        { id: 'calculator', title: 'Calculator', icon: 'calculate', color: 'bg-blue-500' },
        { id: 'settings', title: 'Settings', icon: 'settings', color: 'bg-gray-500' },
    ],
    // Wallpaper
    activeWallpaper: 'https://example.com/wallpaper.jpg',
    setWallpaper: vi.fn(),
    // Start menu
    isStartMenuOpen: false,
    toggleStartMenu: vi.fn(),
    closeStartMenu: vi.fn(),
};

// Create a mock OSContext
const MockOSContext = React.createContext(mockOSContext);

// Mock the useOS hook by providing context
export const MockOSProvider: React.FC<{
    children: ReactNode;
    value?: Partial<typeof mockOSContext>;
}> = ({ children, value = {} }) => {
    const contextValue = { ...mockOSContext, ...value };
    return <MockOSContext.Provider value={contextValue}>{children}</MockOSContext.Provider>;
};

// Override the useOS import in tests
vi.mock('../context/OSContext', () => ({
    useOS: () => React.useContext(MockOSContext),
}));

/**
 * Custom render function that wraps components with necessary providers
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
    osContext?: Partial<typeof mockOSContext>;
}

export function renderWithProviders(ui: ReactElement, options: CustomRenderOptions = {}) {
    const { osContext = {}, ...renderOptions } = options;

    const Wrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
        return <MockOSProvider value={osContext}>{children}</MockOSProvider>;
    };

    return {
        ...render(ui, { wrapper: Wrapper, ...renderOptions }),
        // Return mocks for assertions
        mocks: {
            ...mockOSContext,
            ...osContext,
        },
    };
}

/**
 * Reset all mocks between tests
 */
export function resetMocks() {
    Object.values(mockOSContext).forEach(value => {
        if (typeof value === 'function' && 'mockClear' in value) {
            (value as ReturnType<typeof vi.fn>).mockClear();
        }
    });
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
