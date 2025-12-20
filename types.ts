/**
 * Core type definitions for Windows 15
 * @module types
 */
import { ReactNode } from 'react';

/**
 * Represents a file or folder in the file system.
 * Used by File Explorer, Recycle Bin, and other file-related components.
 */
export interface FileSystemItem {
    /** Unique identifier for the item */
    id: string;
    /** Display name of the file or folder */
    name: string;
    /** Type of the item - determines icon and behavior */
    type: 'folder' | 'image' | 'code' | 'presentation' | 'video' | 'document' | 'cloud' | 'audio' | 'shortcut' | 'link';
    /** Text content for document files */
    content?: string;
    /** Source URL for media files (images, videos, audio) */
    src?: string;
    /** Human-readable file size (e.g., "2.5 MB") */
    size?: string;
    /** Last modified date string */
    date?: string;
    /** Child items for folders */
    children?: FileSystemItem[];
    /** Original folder ID when item is in recycle bin */
    deletedFrom?: string;
    /** ISO timestamp when item was deleted */
    deletedAt?: string;
    /** Material Symbols icon name for shortcuts */
    icon?: string;
    /** App ID to launch when shortcut is activated */
    appId?: string;
    /** Path segments to navigate in File Explorer */
    targetPath?: string[];
    /** Tailwind color class for shortcut icon */
    colorClass?: string;
    /** URL for link placeholder files */
    url?: string;
    /** Type of link content (image, video, audio, web, youtube) */
    linkType?: 'image' | 'video' | 'audio' | 'web' | 'youtube';
    /** Whether the item (specifically for Gists) is private */
    isPrivate?: boolean;
}

/**
 * Represents the state of an open window.
 * Managed by WindowContext for window lifecycle and positioning.
 */
export interface WindowState {
    /** Unique window instance ID */
    id: string;
    /** ID of the application displayed in this window */
    appId: string;
    /** Window title displayed in title bar and taskbar */
    title: string;
    /** Material Symbols icon name */
    icon: string;
    /** React component to render in the window content area */
    component: ReactNode;
    /** Whether the window is currently open */
    isOpen: boolean;
    /** Whether the window is minimized to taskbar */
    isMinimized: boolean;
    /** Whether the window is maximized to fill screen */
    isMaximized: boolean;
    /** Stacking order - higher values appear on top */
    zIndex: number;
    /** Window position in screen coordinates */
    position: { x: number; y: number };
    /** Window dimensions in pixels */
    size: { width: number; height: number };
    /**
     * Dynamic title set by the app (overrides default title)
     * Set to null to revert to default app title
     */
    dynamicTitle?: string | null;
    /**
     * Dynamic icon set by the app (overrides default icon)
     * Set to null to revert to default app icon
     */
    dynamicIcon?: string | null;
    /**
     * Badge count to display on taskbar icon
     * Set to null or 0 to hide badge
     */
    badge?: number | null;
}

/**
 * Configuration for registering an application.
 * Used by the app registry to create window instances.
 */
export interface AppConfig {
    /** Unique application identifier */
    id: string;
    /** Display title for the application */
    title: string;
    /** Material Symbols icon name */
    icon: string;
    /** Tailwind color class for icon styling */
    color: string;
    /** React component factory for the application */
    component: (props: unknown) => ReactNode;
    /** Default window width when opening the app */
    defaultWidth?: number;
    /** Default window height when opening the app */
    defaultHeight?: number;
}

/**
 * Props for desktop icon component.
 * Used to render clickable icons on the desktop.
 */
export interface DesktopIconProps {
    /** Text label displayed below the icon */
    label: string;
    /** Material Symbols icon name */
    icon: string;
    /** ID of app to launch when double-clicked */
    appId?: string;
    /** Tailwind color class for icon styling */
    colorClass?: string;
    /** Custom click handler (alternative to appId) */
    onClick?: () => void;
}

/**
 * Represents an item in the Handoff Queue for cross-device synchronization.
 * Used by the Handoff app and useHandoff hook.
 */
export type HandoffKind = 'url' | 'text';
export type HandoffStatus = 'new' | 'opened' | 'done' | 'archived';

export interface HandoffItem {
    /** Unique identifier for the handoff item (Dexie Cloud @id) */
    id: string;
    /** ISO timestamp when the item was created */
    createdAt: number;
    /** Unique ID of the device that created the item */
    createdByDeviceId: string;
    /** Human-readable label of the device that created the item */
    createdByLabel: string;
    /** Target URL or identifier (e.g., app ID) */
    target: string;
    /** Type of content being handed off */
    kind: HandoffKind;
    /** Text content or description */
    text: string;
    /** Current status of the item in the queue */
    status: HandoffStatus;
    /** Optional display title */
    title?: string;
    /** ISO timestamp when the item was first opened on this device */
    openedAt?: number;
    /** ISO timestamp when the item was marked as done */
    doneAt?: number;
    /** Target category for the item (F192) */
    targetCategory?: 'private' | 'work' | 'any';
    /** Whether the content is sensitive and should be encrypted */
    isSensitive?: boolean;
    /** Encrypted content (if isSensitive is true) */
    cipherText?: string;
    /** Encryption nonce (if isSensitive is true) */
    nonce?: string;
}
