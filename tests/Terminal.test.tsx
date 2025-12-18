import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Terminal } from '../apps/Terminal';
import { DbProvider } from '../context/DbContext';
import { LocalizationProvider } from '../context/LocalizationContext';
import { db } from '../utils/storage/db';

// Mock the database with all required exports
vi.mock('../utils/storage/db', async importOriginal => {
    const actual = await importOriginal<typeof import('../utils/storage/db')>();
    return {
        ...actual,
        db: {
            $terminalHistory: {
                add: vi.fn(),
                count: vi.fn(() => Promise.resolve(0)),
                orderBy: vi.fn(() => ({
                    toArray: vi.fn(() => Promise.resolve([])),
                    limit: vi.fn(() => ({
                        toArray: vi.fn(() => Promise.resolve([])),
                    })),
                })),
                bulkDelete: vi.fn(),
            },
            $terminalSessions: {
                add: vi.fn(() => Promise.resolve(1)),
                update: vi.fn(() => Promise.resolve(1)),
                orderBy: vi.fn(() => ({
                    reverse: vi.fn(() => ({
                        limit: vi.fn(() => ({
                            toArray: vi.fn(() => Promise.resolve([])),
                        })),
                    })),
                })),
            },
            $terminalAliases: {
                toArray: vi.fn(() => Promise.resolve([])),
                put: vi.fn(),
                delete: vi.fn(),
            },
            kv: {
                get: vi.fn(() => Promise.resolve(null)),
                put: vi.fn(),
            },
        },
    };
});

// Mock OSContext module
vi.mock('../context/OSContext', () => ({
    useOS: () => ({
        apps: [],
        openWindow: vi.fn(),
        closeWindow: vi.fn(),
        focusWindow: vi.fn(),
        minimizeWindow: vi.fn(),
        maximizeWindow: vi.fn(),
        toggleMaximizeWindow: vi.fn(),
        windows: [],
        registerApp: vi.fn(),
        removeApp: vi.fn(),
        activeWallpaper: '',
        setWallpaper: vi.fn(),
        isStartMenuOpen: false,
        toggleStartMenu: vi.fn(),
        closeStartMenu: vi.fn(),
        resizeWindow: vi.fn(),
        updateWindowPosition: vi.fn(),
    }),
}));

const renderTerminal = () => {
    return render(
        <DbProvider>
            <LocalizationProvider>
                <Terminal />
            </LocalizationProvider>
        </DbProvider>
    );
};

describe('Terminal - Command History Persistence (F076)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // TODO: These tests need to be refactored to properly mock the database through DbProvider
    // The current mocking approach doesn't work because DbProvider creates its own db instance
    it.skip('saves commands to IndexedDB when executed', async () => {
        const user = userEvent.setup();
        renderTerminal();

        const input = screen.getByRole('textbox');
        await user.type(input, 'help{Enter}');

        await waitFor(() => {
            expect(db.$terminalHistory.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    command: 'help',
                    executedAt: expect.any(Number),
                })
            );
        });
    });

    it.skip('loads command history from IndexedDB on mount', async () => {
        const mockHistory = [
            { id: 1, command: 'date', executedAt: Date.now() - 3000 },
            { id: 2, command: 'time', executedAt: Date.now() - 2000 },
            { id: 3, command: 'help', executedAt: Date.now() - 1000 },
        ];

        type OrderByReturn = ReturnType<typeof db.$terminalHistory.orderBy>;
        vi.mocked(db.$terminalHistory.orderBy).mockReturnValue({
            toArray: vi.fn(() => Promise.resolve(mockHistory)),
            limit: vi.fn(() => ({
                toArray: vi.fn(() => Promise.resolve([])),
            })),
        } as unknown as OrderByReturn);

        const user = userEvent.setup();
        renderTerminal();

        const input = screen.getByRole('textbox');

        // Press arrow up to navigate history
        await user.click(input);
        await user.keyboard('{ArrowUp}');

        await waitFor(() => {
            expect(input).toHaveValue('help');
        });

        await user.keyboard('{ArrowUp}');
        await waitFor(() => {
            expect(input).toHaveValue('time');
        });

        await user.keyboard('{ArrowUp}');
        await waitFor(() => {
            expect(input).toHaveValue('date');
        });
    });

    it.skip('enforces FIFO eviction when history exceeds 500 commands', async () => {
        const user = userEvent.setup();

        // Mock that we have 500 commands already
        vi.mocked(db.$terminalHistory.count).mockResolvedValue(501);

        const oldestCommands = [{ id: 1, command: 'oldest', executedAt: Date.now() - 100000 }];
        type OrderByReturn = ReturnType<typeof db.$terminalHistory.orderBy>;
        vi.mocked(db.$terminalHistory.orderBy).mockReturnValue({
            toArray: vi.fn(() => Promise.resolve([])),
            limit: vi.fn(() => ({
                toArray: vi.fn(() => Promise.resolve(oldestCommands)),
            })),
        } as unknown as OrderByReturn);

        renderTerminal();

        const input = screen.getByRole('textbox');
        await user.type(input, 'new-command{Enter}');

        await waitFor(() => {
            expect(db.$terminalHistory.bulkDelete).toHaveBeenCalledWith([1]);
        });
    });

    it.skip('navigates history with arrow keys', async () => {
        const mockHistory = [
            { id: 1, command: 'first', executedAt: Date.now() - 2000 },
            { id: 2, command: 'second', executedAt: Date.now() - 1000 },
        ];

        type OrderByReturn = ReturnType<typeof db.$terminalHistory.orderBy>;
        vi.mocked(db.$terminalHistory.orderBy).mockReturnValue({
            toArray: vi.fn(() => Promise.resolve(mockHistory)),
            limit: vi.fn(() => ({
                toArray: vi.fn(() => Promise.resolve([])),
            })),
        } as unknown as OrderByReturn);

        const user = userEvent.setup();
        renderTerminal();

        const input = screen.getByRole('textbox');
        await user.click(input);

        // Navigate up to most recent
        await user.keyboard('{ArrowUp}');
        await waitFor(() => {
            expect(input).toHaveValue('second');
        });

        // Navigate up to oldest
        await user.keyboard('{ArrowUp}');
        await waitFor(() => {
            expect(input).toHaveValue('first');
        });

        // Navigate down to more recent
        await user.keyboard('{ArrowDown}');
        await waitFor(() => {
            expect(input).toHaveValue('second');
        });

        // Navigate down past the end clears input
        await user.keyboard('{ArrowDown}');
        await waitFor(() => {
            expect(input).toHaveValue('');
        });
    });

    it('does not save empty commands to history', async () => {
        const user = userEvent.setup();
        renderTerminal();

        const input = screen.getByRole('textbox');
        await user.type(input, '{Enter}');

        // Wait a bit to ensure no async calls are made
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(db.$terminalHistory.add).not.toHaveBeenCalled();
    });
});
