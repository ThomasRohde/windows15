import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';
import { Window } from './Window';
import { WindowState } from '../types';

/**
 * Window component displays draggable, resizable windows with title bar controls.
 * Windows can be minimized, maximized, and closed.
 */
const meta: Meta<typeof Window> = {
    title: 'Components/Window',
    component: Window,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen',
    },
    decorators: [
        Story => (
            <div className="relative w-full h-[600px] bg-gradient-to-br from-blue-900 to-purple-900">
                <Story />
            </div>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof Window>;

const createWindowState = (overrides: Partial<WindowState> = {}): WindowState => ({
    id: 'story-window-1',
    appId: 'notepad',
    title: 'Notepad',
    icon: 'edit_note',
    component: (
        <div className="p-4 text-white">
            <p>This is the window content area.</p>
            <p className="mt-2 text-white/60">Drag the title bar to move the window.</p>
            <p className="mt-2 text-white/60">Drag the edges to resize.</p>
        </div>
    ),
    isOpen: true,
    isMinimized: false,
    isMaximized: false,
    zIndex: 100,
    position: { x: 50, y: 50 },
    size: { width: 400, height: 300 },
    ...overrides,
});

/**
 * Default window in normal state
 */
export const Default: Story = {
    args: {
        window: createWindowState(),
    },
};

/**
 * Window in maximized state (fills available space)
 */
export const Maximized: Story = {
    args: {
        window: createWindowState({
            isMaximized: true,
            title: 'Maximized Window',
        }),
    },
};

/**
 * Window with different app styling
 */
export const Terminal: Story = {
    args: {
        window: createWindowState({
            id: 'story-terminal',
            appId: 'terminal',
            title: 'Terminal',
            icon: 'terminal',
            component: (
                <div className="p-4 font-mono text-sm text-green-400 bg-black h-full">
                    <p>user@windows15 ~ $</p>
                    <p className="mt-1">Welcome to Windows 15 Terminal</p>
                    <p className="mt-1">Type &apos;help&apos; for available commands.</p>
                </div>
            ),
        }),
    },
};

/**
 * Small utility window
 */
export const SmallWindow: Story = {
    args: {
        window: createWindowState({
            id: 'story-small',
            title: 'Calculator',
            icon: 'calculate',
            size: { width: 250, height: 350 },
            component: (
                <div className="p-4 text-center text-white">
                    <p className="text-3xl font-mono">0</p>
                </div>
            ),
        }),
    },
};

/**
 * Large application window
 */
export const LargeWindow: Story = {
    args: {
        window: createWindowState({
            id: 'story-large',
            title: 'File Explorer',
            icon: 'folder',
            size: { width: 800, height: 500 },
            position: { x: 20, y: 20 },
            component: (
                <div className="flex h-full">
                    <div className="w-48 bg-black/30 border-r border-white/10 p-2">
                        <p className="text-sm text-white/70">Sidebar</p>
                    </div>
                    <div className="flex-1 p-4 text-white">
                        <p>Main content area</p>
                    </div>
                </div>
            ),
        }),
    },
};
