import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';
import { StartMenu } from './StartMenu';

/**
 * StartMenu component displays the Windows-style start menu with app list,
 * search, pinned apps, and power options.
 */
const meta: Meta<typeof StartMenu> = {
    title: 'Components/StartMenu',
    component: StartMenu,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen',
    },
    decorators: [
        Story => (
            <div className="relative w-full h-[700px] bg-gradient-to-br from-blue-900 to-purple-900 flex items-end justify-center">
                <Story />
            </div>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof StartMenu>;

/**
 * Default open state showing the start menu
 */
export const Open: Story = {
    args: {
        isOpen: true,
    },
};

/**
 * Closed state (not visible)
 */
export const Closed: Story = {
    args: {
        isOpen: false,
    },
};
