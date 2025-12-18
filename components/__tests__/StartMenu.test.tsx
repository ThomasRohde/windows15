/**
 * Tests for StartMenu component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StartMenu } from '@/components/StartMenu';

// Mock useOS hook
const mockOpenWindow = vi.fn();
const mockApps = [
    { id: 'notepad', title: 'Notepad', icon: 'edit_note', color: 'bg-yellow-500' },
    { id: 'calculator', title: 'Calculator', icon: 'calculate', color: 'bg-blue-500' },
    { id: 'settings', title: 'Settings', icon: 'settings', color: 'bg-gray-500' },
];

let mockIsStartMenuOpen = false;

vi.mock('../../context/OSContext', () => ({
    useOS: () => ({
        apps: mockApps,
        openWindow: mockOpenWindow,
    }),
}));

// Mock useStartMenu hook
const mockToggleStartMenu = vi.fn();
vi.mock('../../context/StartMenuContext', () => ({
    useStartMenu: () => ({
        isStartMenuOpen: mockIsStartMenuOpen,
        toggleStartMenu: mockToggleStartMenu,
        closeStartMenu: vi.fn(),
        openStartMenu: vi.fn(),
        pinnedApps: ['notepad', 'calculator', 'settings'],
        pinApp: vi.fn(),
        unpinApp: vi.fn(),
        isPinned: (appId: string) => ['notepad', 'calculator', 'settings'].includes(appId),
        showAllApps: false,
        toggleAllApps: vi.fn(),
        setShowAllApps: vi.fn(),
    }),
}));

// Mock useUserProfile hook
vi.mock('../../context/UserProfileContext', () => ({
    useUserProfile: () => ({
        profile: { name: 'John Doe', initials: 'JD', avatar: null },
        getInitials: (name: string) =>
            name
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase(),
        updateProfile: vi.fn(),
    }),
}));

describe('StartMenu', () => {
    beforeEach(() => {
        mockOpenWindow.mockClear();
        mockToggleStartMenu.mockClear();
        mockIsStartMenuOpen = false;
    });

    it('should not render when closed', () => {
        mockIsStartMenuOpen = false;
        render(<StartMenu />);

        expect(screen.queryByText('Pinned')).not.toBeInTheDocument();
    });

    it('should render when open', () => {
        mockIsStartMenuOpen = true;
        render(<StartMenu />);

        expect(screen.getByText('Pinned')).toBeInTheDocument();
    });

    it('should display all pinned apps', () => {
        mockIsStartMenuOpen = true;
        render(<StartMenu />);

        expect(screen.getByText('Notepad')).toBeInTheDocument();
        expect(screen.getByText('Calculator')).toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should display app icons', () => {
        mockIsStartMenuOpen = true;
        render(<StartMenu />);

        expect(screen.getByText('edit_note')).toBeInTheDocument();
        expect(screen.getByText('calculate')).toBeInTheDocument();
        expect(screen.getByText('settings')).toBeInTheDocument();
    });

    it('should open window when app is clicked', async () => {
        mockIsStartMenuOpen = true;
        const user = userEvent.setup();
        render(<StartMenu />);

        const notepadButton = screen.getByText('Notepad').closest('button');
        expect(notepadButton).toBeInTheDocument();

        if (!notepadButton) throw new Error('Expected Notepad button');
        await user.click(notepadButton);

        expect(mockOpenWindow).toHaveBeenCalledWith('notepad');
    });

    it('should have search input', () => {
        mockIsStartMenuOpen = true;
        render(<StartMenu />);

        const searchInput = screen.getByPlaceholderText('Type here to search...');
        expect(searchInput).toBeInTheDocument();
    });

    it('should display recommended section', () => {
        mockIsStartMenuOpen = true;
        render(<StartMenu />);

        expect(screen.getByText('Recommended')).toBeInTheDocument();
    });

    it('should display user profile', () => {
        mockIsStartMenuOpen = true;
        render(<StartMenu />);

        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('should have All apps button', () => {
        mockIsStartMenuOpen = true;
        render(<StartMenu />);

        expect(screen.getByText('All apps')).toBeInTheDocument();
    });
});
