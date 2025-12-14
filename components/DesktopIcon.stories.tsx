import type { Meta, StoryObj } from '@storybook/react-vite';
import { DesktopIcon } from './DesktopIcon';

/**
 * DesktopIcon displays a clickable icon with a label on the desktop.
 * Icons can launch applications when double-clicked.
 */
const meta: Meta<typeof DesktopIcon> = {
    title: 'Components/DesktopIcon',
    component: DesktopIcon,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        icon: {
            description: 'Material Symbols icon name',
            control: 'text',
        },
        label: {
            description: 'Text displayed below the icon',
            control: 'text',
        },
        colorClass: {
            description: 'Tailwind color class for the icon',
            control: 'select',
            options: [
                'text-blue-300',
                'text-yellow-300',
                'text-green-300',
                'text-red-300',
                'text-purple-300',
                'text-gray-300',
            ],
        },
        appId: {
            description: 'ID of the app to launch on double-click',
            control: 'text',
        },
    },
};

export default meta;
type Story = StoryObj<typeof DesktopIcon>;

/**
 * Default desktop icon showing a folder
 */
export const Default: Story = {
    args: {
        id: 'story-icon-1',
        icon: 'folder',
        label: 'Documents',
        colorClass: 'text-yellow-300',
        position: { x: 0, y: 0 },
    },
};

/**
 * Computer/PC icon typically shown on desktops
 */
export const Computer: Story = {
    args: {
        id: 'story-icon-2',
        icon: 'computer',
        label: 'This PC',
        colorClass: 'text-blue-300',
        appId: 'explorer',
        position: { x: 0, y: 0 },
    },
};

/**
 * Terminal icon for command line access
 */
export const Terminal: Story = {
    args: {
        id: 'story-icon-3',
        icon: 'terminal',
        label: 'Terminal',
        colorClass: 'text-green-400',
        appId: 'terminal',
        position: { x: 0, y: 0 },
    },
};

/**
 * Recycle Bin icon
 */
export const RecycleBin: Story = {
    args: {
        id: 'story-icon-4',
        icon: 'delete',
        label: 'Recycle Bin',
        colorClass: 'text-gray-300',
        appId: 'recyclebin',
        position: { x: 0, y: 0 },
    },
};

/**
 * Multiple icons arranged in a grid (example composition)
 */
export const IconGrid: Story = {
    render: () => (
        <div className="flex gap-8 p-4">
            <DesktopIcon
                id="grid-1"
                icon="computer"
                label="This PC"
                colorClass="text-blue-300"
                position={{ x: 0, y: 0 }}
            />
            <DesktopIcon
                id="grid-2"
                icon="folder_open"
                label="Documents"
                colorClass="text-yellow-300"
                position={{ x: 0, y: 0 }}
            />
            <DesktopIcon
                id="grid-3"
                icon="terminal"
                label="Terminal"
                colorClass="text-green-400"
                position={{ x: 0, y: 0 }}
            />
            <DesktopIcon
                id="grid-4"
                icon="delete"
                label="Recycle Bin"
                colorClass="text-gray-300"
                position={{ x: 0, y: 0 }}
            />
        </div>
    ),
};
