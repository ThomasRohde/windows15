/**
 * Tests for DesktopIcon component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesktopIcon } from '@/components/DesktopIcon';

// Mock the useOS hook
const mockOpenWindow = vi.fn();
vi.mock('../../context/OSContext', () => ({
    useOS: () => ({
        openWindow: mockOpenWindow,
    }),
}));

// Mock the useStartMenu hook
const mockPinApp = vi.fn();
const mockUnpinApp = vi.fn();
const mockIsPinned = vi.fn(() => false);
vi.mock('../../context/StartMenuContext', () => ({
    useStartMenu: () => ({
        isPinned: mockIsPinned,
        pinApp: mockPinApp,
        unpinApp: mockUnpinApp,
    }),
}));

describe('DesktopIcon', () => {
    const defaultProps = {
        id: 'test-icon',
        label: 'Test App',
        icon: 'folder',
        colorClass: 'text-blue-300',
        appId: 'testapp',
        position: { x: 100, y: 100 },
        onPositionChange: vi.fn(),
    };

    beforeEach(() => {
        mockOpenWindow.mockClear();
        defaultProps.onPositionChange.mockClear();
    });

    it('should render with correct label', () => {
        render(<DesktopIcon {...defaultProps} />);

        expect(screen.getByText('Test App')).toBeInTheDocument();
    });

    it('should render with correct icon', () => {
        render(<DesktopIcon {...defaultProps} />);

        expect(screen.getByText('folder')).toBeInTheDocument();
    });

    it('should be positioned correctly', () => {
        render(<DesktopIcon {...defaultProps} />);

        const button = screen.getByRole('button');
        expect(button).toHaveStyle({ left: '100px', top: '100px' });
    });

    it('should open window on double click', async () => {
        const user = userEvent.setup();
        render(<DesktopIcon {...defaultProps} />);

        const button = screen.getByRole('button');
        await user.dblClick(button);

        expect(mockOpenWindow).toHaveBeenCalledWith('testapp');
    });

    it('should call custom onClick handler on double click', async () => {
        const customOnClick = vi.fn();
        const user = userEvent.setup();
        render(<DesktopIcon {...defaultProps} onClick={customOnClick} />);

        const button = screen.getByRole('button');
        await user.dblClick(button);

        expect(customOnClick).toHaveBeenCalled();
        expect(mockOpenWindow).toHaveBeenCalledWith('testapp');
    });

    it('should not open window if no appId provided', async () => {
        const user = userEvent.setup();
        render(<DesktopIcon {...defaultProps} appId={undefined} />);

        const button = screen.getByRole('button');
        await user.dblClick(button);

        expect(mockOpenWindow).not.toHaveBeenCalled();
    });

    it('should handle pointer down event for dragging', () => {
        render(<DesktopIcon {...defaultProps} />);

        const button = screen.getByRole('button');

        // Simulate pointer down
        fireEvent.pointerDown(button, {
            button: 0,
            clientX: 150,
            clientY: 150,
            pointerId: 1,
        });

        // Button should have grabbing cursor when dragging
        expect(button).toHaveStyle({ cursor: 'grabbing' });
    });

    it('should call onPositionChange during drag', () => {
        render(<DesktopIcon {...defaultProps} />);

        const button = screen.getByRole('button');

        // Start drag
        fireEvent.pointerDown(button, {
            button: 0,
            clientX: 150,
            clientY: 150,
            pointerId: 1,
        });

        // Move pointer
        fireEvent.pointerMove(button, {
            clientX: 200,
            clientY: 200,
            pointerId: 1,
        });

        expect(defaultProps.onPositionChange).toHaveBeenCalledWith('test-icon', {
            x: 150, // 200 - (150 - 100)
            y: 150, // 200 - (150 - 100)
        });
    });

    it('should not start drag on right click', () => {
        render(<DesktopIcon {...defaultProps} />);

        const button = screen.getByRole('button');

        // Simulate right-click pointer down
        fireEvent.pointerDown(button, {
            button: 2, // Right click
            clientX: 150,
            clientY: 150,
            pointerId: 1,
        });

        // Should not be in dragging state (cursor should be default)
        expect(button).toHaveStyle({ cursor: 'default' });
    });

    it('should apply custom color class', () => {
        render(<DesktopIcon {...defaultProps} colorClass="text-red-400" />);

        const iconContainer = screen.getByText('folder').parentElement;
        expect(iconContainer).toHaveClass('text-red-400');
    });
});
