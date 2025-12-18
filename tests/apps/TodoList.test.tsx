import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Dexie } from 'dexie';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Windows15DexieDB } from '../../utils/storage/db';

const dbRef: { current: Windows15DexieDB | null } = { current: null };

vi.mock('../../utils/storage', async importOriginal => {
    const actual = await importOriginal<typeof import('../../utils/storage')>();
    return {
        ...actual,
        useDb: () => {
            if (!dbRef.current) throw new Error('Test database not initialized');
            return dbRef.current;
        },
    };
});

// Mock NotificationContext for TodoList tests
vi.mock('../../context/NotificationContext', () => ({
    useNotificationCenter: () => ({
        notifications: [],
        unreadCount: 0,
        schedule: vi.fn().mockResolvedValue('mock-id'),
        notify: vi.fn(),
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
        dismiss: vi.fn(),
        clearAll: vi.fn().mockResolvedValue(undefined),
        permission: 'default' as const,
        requestPermission: vi.fn().mockResolvedValue('default'),
    }),
}));

import { TodoList } from '../../apps/TodoList';

// Mock WindowContext module
vi.mock('../../context/WindowContext', () => ({
    useWindowManager: () => ({
        windows: [],
        openWindow: vi.fn(),
        closeWindow: vi.fn(),
        minimizeWindow: vi.fn(),
        toggleMaximizeWindow: vi.fn(),
        focusWindow: vi.fn(),
        resizeWindow: vi.fn(),
        updateWindowPosition: vi.fn(),
        bringToFront: vi.fn(),
        setWindowState: vi.fn(),
    }),
}));

describe('TodoList persistence and filtering', () => {
    beforeEach(async () => {
        await Dexie.delete('windows15');
        dbRef.current = new Windows15DexieDB();
    });

    afterEach(async () => {
        await dbRef.current?.delete();
        dbRef.current = null;
    });

    it('filters todos by status correctly', async () => {
        const user = userEvent.setup();

        render(<TodoList />);
        await screen.findByText('No tasks yet');

        const addInput = screen.getByPlaceholderText('Add a new task...');
        const addButton = screen.getByRole('button', { name: 'Add' });

        await user.type(addInput, 'Task 1');
        await user.click(addButton);
        await screen.findByText('Task 1');

        await user.clear(addInput);
        await user.type(addInput, 'Task 2');
        await user.click(addButton);
        await screen.findByText('Task 2');

        const task1Text = screen.getByText('Task 1');
        const task1Row = task1Text.parentElement?.parentElement;
        expect(task1Row).toBeTruthy();
        const task1Checkbox = within(task1Row as HTMLElement).getByRole('checkbox');

        await user.click(task1Checkbox);
        await waitFor(() => expect(task1Checkbox).toBeChecked());

        await user.click(screen.getByRole('button', { name: 'active' }));
        expect(screen.queryByText('Task 1')).not.toBeInTheDocument();
        expect(screen.getByText('Task 2')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'completed' }));
        expect(screen.getByText('Task 1')).toBeInTheDocument();
        expect(screen.queryByText('Task 2')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'all' }));
        expect(screen.getByText('Task 1')).toBeInTheDocument();
        expect(screen.getByText('Task 2')).toBeInTheDocument();
    });

    it('filters todos by search query correctly', async () => {
        const user = userEvent.setup();

        render(<TodoList />);
        await screen.findByText('No tasks yet');

        const addInput = screen.getByPlaceholderText('Add a new task...');
        const addButton = screen.getByRole('button', { name: 'Add' });

        await user.type(addInput, 'Buy milk');
        await user.click(addButton);
        await screen.findByText('Buy milk');

        await user.clear(addInput);
        await user.type(addInput, 'Walk dog');
        await user.click(addButton);
        await screen.findByText('Walk dog');

        const searchInput = screen.getByPlaceholderText('Search tasks...');
        await user.type(searchInput, 'milk');

        expect(screen.getByText('Buy milk')).toBeInTheDocument();
        expect(screen.queryByText('Walk dog')).not.toBeInTheDocument();
    });

    it('persists todos across database instance recreation', async () => {
        const user = userEvent.setup();

        const { unmount } = render(<TodoList />);
        await screen.findByText('No tasks yet');

        const addInput = screen.getByPlaceholderText('Add a new task...');
        const addButton = screen.getByRole('button', { name: 'Add' });

        await user.type(addInput, 'Persist me');
        await user.click(addButton);
        await screen.findByText('Persist me');

        const oldDb = dbRef.current;
        oldDb?.close();
        dbRef.current = new Windows15DexieDB();

        unmount();
        render(<TodoList />);
        await screen.findByText('Persist me');

        oldDb?.close();
    });
});
