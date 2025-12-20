import React, { ComponentType, LazyExoticComponent } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProps = any;

/**
 * Configuration for a registered application
 */
export interface AppConfig {
    /** Unique application identifier */
    id: string;
    /** Display title in window title bar and menus */
    title: string;
    /** Material icon name */
    icon: string;
    /** Tailwind background color class */
    color: string;
    /** Lazily loaded component - accepts components with optional props */
    component: LazyExoticComponent<ComponentType<AnyProps>>;
    /** Default window width in pixels */
    defaultWidth?: number;
    /** Default window height in pixels */
    defaultHeight?: number;
    /** File extensions this app can open (e.g., ['.txt', '.md']) */
    fileAssociations?: string[];
}

/**
 * Central registry of all available applications.
 * Each app is lazily loaded for optimal code splitting.
 */
export const APP_REGISTRY: AppConfig[] = [
    {
        id: 'explorer',
        title: 'File Explorer',
        icon: 'folder',
        color: 'bg-yellow-400',
        component: React.lazy(() => import('../components/FileExplorer').then(m => ({ default: m.FileExplorer }))),
        defaultWidth: 800,
        defaultHeight: 500,
    },
    {
        id: 'browser',
        title: 'Chrome',
        icon: 'public',
        color: 'bg-blue-400',
        component: React.lazy(() => import('./Browser').then(m => ({ default: m.Browser }))),
    },
    {
        id: 'mail',
        title: 'Mail',
        icon: 'mail',
        color: 'bg-sky-400',
        component: React.lazy(() => import('./Mail').then(m => ({ default: m.Mail }))),
        defaultWidth: 1000,
        defaultHeight: 680,
    },
    {
        id: 'calendar',
        title: 'Calendar',
        icon: 'calendar_month',
        color: 'bg-purple-400',
        component: React.lazy(() => import('./Calendar').then(m => ({ default: m.Calendar }))),
        defaultWidth: 980,
        defaultHeight: 720,
    },
    {
        id: 'calculator',
        title: 'Calculator',
        icon: 'calculate',
        color: 'bg-orange-400',
        component: React.lazy(() => import('./Calculator').then(m => ({ default: m.Calculator }))),
        defaultWidth: 320,
        defaultHeight: 480,
    },
    {
        id: 'notepad',
        title: 'Notepad',
        icon: 'description',
        color: 'bg-blue-300',
        component: React.lazy(() => import('./Notepad').then(m => ({ default: m.Notepad }))),
        fileAssociations: ['.txt', '.md', '.log', '.cfg', '.ini', '.xml', '.html', '.css', '.js', '.ts'],
    },
    {
        id: 'settings',
        title: 'Settings',
        icon: 'settings',
        color: 'bg-gray-400',
        component: React.lazy(() => import('./Settings').then(m => ({ default: m.Settings }))),
    },
    {
        id: 'spreadsheet',
        title: 'Spreadsheet',
        icon: 'grid_on',
        color: 'bg-green-500',
        component: React.lazy(() => import('./Spreadsheet').then(m => ({ default: m.Spreadsheet }))),
        defaultWidth: 1100,
        defaultHeight: 700,
        fileAssociations: ['.xlsx', '.xls', '.csv'],
    },
    {
        id: 'terminal',
        title: 'Terminal',
        icon: 'terminal',
        color: 'bg-green-600',
        component: React.lazy(() => import('./Terminal').then(m => ({ default: m.Terminal }))),
        defaultWidth: 700,
        defaultHeight: 450,
    },
    {
        id: 'systeminfo',
        title: 'System Info',
        icon: 'info',
        color: 'bg-blue-500',
        component: React.lazy(() => import('./SystemInfo').then(m => ({ default: m.SystemInfo }))),
        defaultWidth: 600,
        defaultHeight: 650,
    },
    {
        id: 'imageviewer',
        title: 'Image Viewer',
        icon: 'image',
        color: 'bg-green-500',
        component: React.lazy(() => import('./ImageViewer').then(m => ({ default: m.ImageViewer }))),
        defaultWidth: 800,
        defaultHeight: 600,
        fileAssociations: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico'],
    },
    {
        id: 'timer',
        title: 'Timer',
        icon: 'timer',
        color: 'bg-red-400',
        component: React.lazy(() => import('./Timer').then(m => ({ default: m.Timer }))),
        defaultWidth: 400,
        defaultHeight: 500,
    },
    {
        id: 'clock',
        title: 'World Clock',
        icon: 'schedule',
        color: 'bg-indigo-400',
        component: React.lazy(() => import('./Clock').then(m => ({ default: m.Clock }))),
        defaultWidth: 450,
        defaultHeight: 550,
    },
    {
        id: 'unitconverter',
        title: 'Unit Converter',
        icon: 'swap_horiz',
        color: 'bg-teal-400',
        component: React.lazy(() => import('./UnitConverter').then(m => ({ default: m.UnitConverter }))),
        defaultWidth: 400,
        defaultHeight: 480,
    },
    {
        id: 'weather',
        title: 'Weather',
        icon: 'wb_sunny',
        color: 'bg-sky-400',
        component: React.lazy(() => import('./Weather').then(m => ({ default: m.Weather }))),
        defaultWidth: 420,
        defaultHeight: 580,
    },
    {
        id: 'jsonviewer',
        title: 'JSON Viewer',
        icon: 'data_object',
        color: 'bg-amber-400',
        component: React.lazy(() => import('./JsonViewer').then(m => ({ default: m.JsonViewer }))),
        defaultWidth: 700,
        defaultHeight: 550,
        fileAssociations: ['.json'],
    },
    {
        id: 'wordcounter',
        title: 'Word Counter',
        icon: 'format_size',
        color: 'bg-pink-400',
        component: React.lazy(() => import('./WordCounter').then(m => ({ default: m.WordCounter }))),
        defaultWidth: 550,
        defaultHeight: 500,
    },
    {
        id: 'base64tool',
        title: 'Base64 Tool',
        icon: 'code',
        color: 'bg-cyan-400',
        component: React.lazy(() => import('./Base64Tool').then(m => ({ default: m.Base64Tool }))),
        defaultWidth: 600,
        defaultHeight: 500,
    },
    {
        id: 'hashgenerator',
        title: 'Hash Generator',
        icon: 'tag',
        color: 'bg-violet-400',
        component: React.lazy(() => import('./HashGenerator').then(m => ({ default: m.HashGenerator }))),
        defaultWidth: 550,
        defaultHeight: 550,
    },
    {
        id: 'todolist',
        title: 'Todo List',
        icon: 'checklist',
        color: 'bg-lime-400',
        component: React.lazy(() => import('./TodoList').then(m => ({ default: m.TodoList }))),
        defaultWidth: 450,
        defaultHeight: 550,
    },
    {
        id: 'passwordgenerator',
        title: 'Password Generator',
        icon: 'key',
        color: 'bg-rose-400',
        component: React.lazy(() => import('./PasswordGenerator').then(m => ({ default: m.PasswordGenerator }))),
        defaultWidth: 450,
        defaultHeight: 480,
    },
    {
        id: 'colorpicker',
        title: 'Color Picker',
        icon: 'palette',
        color: 'bg-fuchsia-400',
        component: React.lazy(() => import('./ColorPicker').then(m => ({ default: m.ColorPicker }))),
        defaultWidth: 400,
        defaultHeight: 550,
    },
    {
        id: 'qrgenerator',
        title: 'QR Generator',
        icon: 'qr_code',
        color: 'bg-emerald-400',
        component: React.lazy(() => import('./QrGenerator').then(m => ({ default: m.QrGenerator }))),
        defaultWidth: 450,
        defaultHeight: 550,
    },
    {
        id: 'recyclebin',
        title: 'Recycle Bin',
        icon: 'delete',
        color: 'bg-gray-400',
        component: React.lazy(() => import('./RecycleBin').then(m => ({ default: m.RecycleBin }))),
        defaultWidth: 700,
        defaultHeight: 500,
    },
    {
        id: 'wallpaperstudio',
        title: 'Wallpaper Studio',
        icon: 'wallpaper',
        color: 'bg-gradient-to-r from-purple-500 to-pink-500',
        component: React.lazy(() => import('./WallpaperStudio').then(m => ({ default: m.WallpaperStudio }))),
        defaultWidth: 1000,
        defaultHeight: 680,
    },
    {
        id: 'arcade',
        title: 'Arcade',
        icon: 'sports_esports',
        color: 'bg-purple-600',
        component: React.lazy(() => import('./arcade').then(m => ({ default: m.Arcade }))),
        defaultWidth: 600,
        defaultHeight: 700,
    },
    {
        id: 'idbexplorer',
        title: 'IDB Explorer',
        icon: 'storage',
        color: 'bg-indigo-500',
        component: React.lazy(() => import('./IDBExplorer').then(m => ({ default: m.IDBExplorer }))),
        defaultWidth: 900,
        defaultHeight: 600,
    },
    {
        id: 'youtubeplayer',
        title: 'YouTube Player',
        icon: 'smart_display',
        color: 'bg-red-500',
        component: React.lazy(() => import('./YoutubePlayer').then(m => ({ default: m.YoutubePlayer }))),
        defaultWidth: 900,
        defaultHeight: 600,
    },
    {
        id: 'gistexplorer',
        title: 'Gist Explorer',
        icon: 'code_blocks',
        color: 'bg-slate-600',
        component: React.lazy(() => import('./GistExplorer').then(m => ({ default: m.GistExplorer }))),
        defaultWidth: 900,
        defaultHeight: 600,
    },
    {
        id: 'thispc',
        title: 'This PC',
        icon: 'computer',
        color: 'bg-blue-600',
        component: React.lazy(() => import('./ThisPC').then(m => ({ default: m.ThisPC }))),
        defaultWidth: 900,
        defaultHeight: 650,
    },
    {
        id: 'handoff',
        title: 'Handoff',
        icon: 'sync_alt',
        color: 'bg-indigo-500',
        component: React.lazy(() => import('./Handoff').then(m => ({ default: m.Handoff }))),
        defaultWidth: 600,
        defaultHeight: 500,
    },
];

/**
 * Get an app config by ID
 */
export const getAppById = (id: string): AppConfig | undefined => {
    return APP_REGISTRY.find(app => app.id === id);
};

/**
 * Get apps that can open a specific file extension
 * @param extension - File extension including dot (e.g., '.txt')
 * @returns Array of apps that can handle this file type
 */
export const getAppsForExtension = (extension: string): AppConfig[] => {
    const ext = extension.toLowerCase();
    return APP_REGISTRY.filter(app => app.fileAssociations?.includes(ext));
};

/**
 * Get the default app for a file extension (first registered handler)
 * @param extension - File extension including dot (e.g., '.txt')
 * @returns The default app for this file type, or undefined
 */
export const getDefaultAppForExtension = (extension: string): AppConfig | undefined => {
    const apps = getAppsForExtension(extension);
    return apps[0];
};

/**
 * Get file extension from filename
 * @param filename - File name (e.g., 'document.txt')
 * @returns Extension with dot (e.g., '.txt') or empty string
 */
export const getFileExtension = (filename: string): string => {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1 || lastDot === filename.length - 1) return '';
    return filename.slice(lastDot).toLowerCase();
};
