import { ReactNode } from 'react';

export interface FileSystemItem {
    id: string;
    name: string;
    type: 'folder' | 'image' | 'code' | 'presentation' | 'video' | 'document' | 'cloud' | 'audio' | 'shortcut';
    content?: string; // For text files
    src?: string; // For media
    size?: string;
    date?: string;
    children?: FileSystemItem[];
    deletedFrom?: string; // Original folder ID for recycle bin items
    deletedAt?: string; // Timestamp when item was deleted
    icon?: string; // Material Symbols name (shortcuts)
    appId?: string; // App to launch (shortcuts)
    targetPath?: string[]; // File Explorer path to navigate (shortcuts)
    colorClass?: string; // Optional Tailwind color for shortcut icon
}

export interface WindowState {
    id: string;
    appId: string;
    title: string;
    icon: string;
    component: ReactNode;
    isOpen: boolean;
    isMinimized: boolean;
    isMaximized: boolean;
    zIndex: number;
    position: { x: number; y: number };
    size: { width: number; height: number };
}

export interface AppConfig {
    id: string;
    title: string;
    icon: string;
    color: string;
    component: (props: any) => ReactNode;
    defaultWidth?: number;
    defaultHeight?: number;
}

export interface DesktopIconProps {
    label: string;
    icon: string;
    appId?: string; // ID of app to launch
    colorClass?: string;
    onClick?: () => void;
}
