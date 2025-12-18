/**
 * Tests for Window component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Window } from '@/components/Window';
import { WindowState } from '@/types';

// Mock the useOS hook
const mockCloseWindow = vi.fn();
const mockMinimizeWindow = vi.fn();
const mockToggleMaximizeWindow = vi.fn();
const mockFocusWindow = vi.fn();
const mockResizeWindow = vi.fn();
const mockUpdateWindowPosition = vi.fn();

vi.mock('../../context/OSContext', () => ({
    useOS: () => ({
        closeWindow: mockCloseWindow,
        minimizeWindow: mockMinimizeWindow,
        toggleMaximizeWindow: mockToggleMaximizeWindow,
        focusWindow: mockFocusWindow,
        resizeWindow: mockResizeWindow,
        updateWindowPosition: mockUpdateWindowPosition,
    }),
    useWindowSpace: () => ({
        is3DMode: false,
        settings: {
            mode: 'flat',
            perspective: 1000,
            tiltOnDrag: true,
            depthIntensity: 0.5,
            motion: 'full',
        },
        toggle3DMode: vi.fn(),
        setMode: vi.fn(),
        updateSettings: vi.fn(),
        getWindowTransform: () => '',
        getWindowShadow: () => '0 10px 40px rgba(0, 0, 0, 0.3)',
        prefersReducedMotion: false,
    }),
}));

// Mock requestAnimationFrame
vi.stubGlobal('requestAnimationFrame', (cb: (time: number) => void) => {
    cb(0);
    return 0;
});
vi.stubGlobal('cancelAnimationFrame', vi.fn());

describe('Window', () => {
    const defaultWindow: WindowState = {
        id: 'test-window',
        appId: 'notepad',
        title: 'Test Window',
        icon: 'edit_note',
        isOpen: true,
        isMinimized: false,
        isMaximized: false,
        position: { x: 100, y: 100 },
        size: { width: 400, height: 300 },
        zIndex: 10,
        component: <div data-testid="window-content">Window Content</div>,
    };

    beforeEach(() => {
        mockCloseWindow.mockClear();
        mockMinimizeWindow.mockClear();
        mockToggleMaximizeWindow.mockClear();
        mockFocusWindow.mockClear();
        mockResizeWindow.mockClear();
        mockUpdateWindowPosition.mockClear();
    });

    it('should render window with title', () => {
        render(<Window window={defaultWindow} />);

        expect(screen.getByText('Test Window')).toBeInTheDocument();
    });

    it('should render control buttons', () => {
        render(<Window window={defaultWindow} />);

        // Check for minimize, maximize, close icons (actual icon names from component)
        expect(screen.getByText('minimize')).toBeInTheDocument();
        expect(screen.getByText('crop_square')).toBeInTheDocument();
        expect(screen.getByText('close')).toBeInTheDocument();
    });

    it('should call closeWindow when close button is clicked', async () => {
        const user = userEvent.setup();
        render(<Window window={defaultWindow} />);

        const closeButton = screen.getByText('close').closest('button');
        if (!closeButton) throw new Error('Expected close button');
        await user.click(closeButton);

        expect(mockCloseWindow).toHaveBeenCalledWith('test-window');
    });

    it('should call minimizeWindow when minimize button is clicked', async () => {
        const user = userEvent.setup();
        render(<Window window={defaultWindow} />);

        const minimizeButton = screen.getByText('minimize').closest('button');
        if (!minimizeButton) throw new Error('Expected minimize button');
        await user.click(minimizeButton);

        expect(mockMinimizeWindow).toHaveBeenCalledWith('test-window');
    });

    it('should call toggleMaximizeWindow when maximize button is clicked', async () => {
        const user = userEvent.setup();
        render(<Window window={defaultWindow} />);

        const maximizeButton = screen.getByText('crop_square').closest('button');
        if (!maximizeButton) throw new Error('Expected maximize button');
        await user.click(maximizeButton);

        expect(mockToggleMaximizeWindow).toHaveBeenCalledWith('test-window');
    });

    it('should call focusWindow on pointer down', () => {
        render(<Window window={defaultWindow} />);

        const windowElement = screen.getByText('Test Window').closest('[class*="glass-panel"]');
        if (!windowElement) throw new Error('Expected window element');
        fireEvent.pointerDown(windowElement, { button: 0 });

        expect(mockFocusWindow).toHaveBeenCalledWith('test-window');
    });

    it('should render icon in title bar', () => {
        render(<Window window={defaultWindow} />);

        expect(screen.getByText('edit_note')).toBeInTheDocument();
    });

    it('should show close_fullscreen icon when maximized', () => {
        const maximizedWindow = { ...defaultWindow, isMaximized: true };
        render(<Window window={maximizedWindow} />);

        // When maximized, the icon changes from crop_square to close_fullscreen
        expect(screen.getByText('close_fullscreen')).toBeInTheDocument();
    });

    it('should call toggleMaximizeWindow on title bar double click', async () => {
        const user = userEvent.setup();
        render(<Window window={defaultWindow} />);

        // Find the title bar by finding the element with cursor-move class
        const titleBar = document.querySelector('[class*="cursor-move"]');
        expect(titleBar).toBeInTheDocument();

        if (!titleBar) throw new Error('Expected title bar element');
        await user.dblClick(titleBar);

        expect(mockToggleMaximizeWindow).toHaveBeenCalledWith('test-window');
    });
});
