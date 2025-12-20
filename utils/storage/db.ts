import { Dexie, type Table } from 'dexie';
import dexieCloud from 'dexie-cloud-addon';
import { getCloudDatabaseUrl } from './cloudConfig';
import { HandoffItem } from '../../types';

export type KvRecord = {
    key: string;
    valueJson: string;
    updatedAt: number;
};

export type NoteRecord = {
    id: string;
    title: string;
    content: string;
    createdAt: number;
    updatedAt: number;
};

export type BookmarkRecord = {
    id: string;
    url: string;
    title: string;
    folder: string;
    createdAt: number;
    updatedAt: number;
};

export type TodoRecord = {
    id: string;
    text: string;
    completed: boolean;
    priority?: 'low' | 'medium' | 'high';
    dueDate?: number; // Unix timestamp
    sortOrder?: number;
    createdAt: number;
    updatedAt: number;
};

export type DesktopIconRecord = {
    id: string;
    label: string;
    icon: string;
    colorClass: string;
    appId: string;
    position: { x: number; y: number };
    order: number;
    createdAt: number;
    updatedAt: number;
};

export type TerminalHistoryRecord = {
    id?: number;
    command: string;
    executedAt: number;
};

export type ScreensaverSettingsRecord = {
    id: string;
    enabled: boolean;
    timeout: number; // Idle timeout in milliseconds (default 5 minutes = 300000)
    animation: 'starfield' | 'matrix' | 'bouncing-logo' | 'geometric';
    animationSpeed: number; // Speed multiplier (0.5 = slow, 1 = normal, 2 = fast)
    animationIntensity: number; // Intensity level (0.5 = subtle, 1 = normal, 2 = intense)
    showClock: boolean; // Show clock overlay
    showDate: boolean; // Show date overlay
    createdAt: number;
    updatedAt: number;
};

export type TerminalSessionRecord = {
    id?: number;
    output: string; // JSON stringified array of OutputLine objects
    createdAt: number;
    updatedAt: number;
};

export type TerminalAliasRecord = {
    name: string; // Alias name (e.g., 'll')
    command: string; // Expanded command (e.g., 'ls -la')
    createdAt: number;
    updatedAt: number;
};

// ==========================================
// Wow Pack: Wallpapers and Arcade (F084)
// ==========================================

// ==========================================
// Mail App (F151)
// ==========================================

export type MailFolderId = 'inbox' | 'sent' | 'drafts' | 'trash';

export type EmailRecord = {
    id: string;
    folderId: MailFolderId;
    from: string;
    to: string[]; // Array of recipient emails
    subject: string;
    body: string;
    date: number; // Unix timestamp
    isRead: boolean;
    trashedFrom?: MailFolderId; // Original folder before moving to trash
    createdAt: number;
    updatedAt: number;
};

export type EmailFolderRecord = {
    id: MailFolderId;
    name: string;
    type: 'system' | 'custom';
    createdAt: number;
    updatedAt: number;
};

// ==========================================
// App State Persistence (F152)
// ==========================================

/**
 * Generic app state record for persisting small UI state across sessions
 */
export type AppStateRecord = {
    appId: string; // Unique app identifier (e.g., 'calculator', 'weather')
    state: string; // JSON stringified state object
    updatedAt: number;
};

// ==========================================
// Notification Center (F157)
// ==========================================

/**
 * Notification record for the notification center
 */
export type NotificationRecord = {
    id: string; // Unique notification ID
    title: string; // Notification title
    message: string; // Notification body
    type: 'success' | 'error' | 'warning' | 'info'; // Notification type
    appId?: string; // Source app that created the notification
    showBrowserNotification?: boolean; // Whether to show browser notification
    isRead: boolean; // Whether the notification has been read
    scheduledFor?: number; // Unix timestamp for scheduled notifications
    triggeredAt?: number; // When the notification was actually shown
    createdAt: number;
};

// ==========================================
// Handoff Queue (F189)
// ==========================================

export type HandoffRecord = HandoffItem;

/**
 * Wallpaper manifest stored in IndexedDB
 */
export type WallpaperRecord = {
    id: string; // Unique wallpaper ID (e.g., 'aurora-shader')
    name: string; // Display name
    type: 'shader' | 'scene' | 'image'; // Wallpaper runtime type
    manifest: string; // JSON stringified manifest from wallpaper.json
    installedAt: number;
    updatedAt: number;
};

/**
 * Wallpaper assets (textures, shaders, etc.)
 */
export type WallpaperAssetRecord = {
    id?: number; // Auto-incremented
    wallpaperId: string; // Foreign key to WallpaperRecord.id
    path: string; // Relative path within the wallpaper pack
    blob: Blob; // Binary asset data
    mimeType: string; // MIME type of the asset
    createdAt: number;
};

/**
 * Arcade game entry in the library
 */
export type ArcadeGameRecord = {
    id: string; // Unique game ID
    title: string; // Display title
    type: 'wasm4' | 'custom'; // Runtime type (MVP: wasm4 only)
    cartridgeBlob: Blob; // The .wasm cartridge file
    iconBlob?: Blob; // Optional custom icon
    tags: string[]; // Tags for filtering
    lastPlayedAt?: number; // Last played timestamp
    createdAt: number;
    updatedAt: number;
};

/**
 * Arcade save state
 */
export type ArcadeSaveRecord = {
    id?: number; // Auto-incremented
    gameId: string; // Foreign key to ArcadeGameRecord.id
    slot: number; // Save slot number (1-3)
    dataBlob: Blob; // Save state binary data
    meta: string; // JSON stringified metadata (screenshot thumbnail, timestamp, etc.)
    createdAt: number;
    updatedAt: number;
};

/**
 * Clipboard history item (F164)
 */
export type ClipboardHistoryRecord = {
    id?: number; // Auto-incremented
    content: string; // Text content or data URL for images
    contentType: 'text' | 'image'; // Type of content
    preview: string; // Truncated preview for display
    copiedAt: number; // Timestamp when copied
};

export class Windows15DexieDB extends Dexie {
    kv!: Table<KvRecord, string>;
    notes!: Table<NoteRecord, string>;
    bookmarks!: Table<BookmarkRecord, string>;
    todos!: Table<TodoRecord, string>;
    desktopIcons!: Table<DesktopIconRecord, string>;
    $terminalHistory!: Table<TerminalHistoryRecord, number>;
    $screensaverSettings!: Table<ScreensaverSettingsRecord, string>;
    $terminalSessions!: Table<TerminalSessionRecord, number>;
    $terminalAliases!: Table<TerminalAliasRecord, string>;
    // Mail tables (cloud-synced)
    emails!: Table<EmailRecord, string>;
    emailFolders!: Table<EmailFolderRecord, MailFolderId>;
    // App state (cloud-synced)
    appState!: Table<AppStateRecord, string>;
    // Notification center (cloud-synced) (F157)
    notifications!: Table<NotificationRecord, string>;
    // Handoff Queue (cloud-synced) (F189)
    handoffItems!: Table<HandoffRecord, string>;
    // Wow Pack tables (local-only, prefixed with $)
    $wallpapers!: Table<WallpaperRecord, string>;
    $wallpaperAssets!: Table<WallpaperAssetRecord, number>;
    $arcadeGames!: Table<ArcadeGameRecord, string>;
    $arcadeSaves!: Table<ArcadeSaveRecord, number>;
    // Clipboard history (F164)
    $clipboardHistory!: Table<ClipboardHistoryRecord, number>;

    constructor() {
        super('windows15', { addons: [dexieCloud] });

        this.version(1).stores({
            kv: 'key, updatedAt',
            notes: '@id, updatedAt, createdAt',
            bookmarks: '@id, folder, updatedAt, createdAt',
        });

        this.version(2).stores({
            kv: 'key, updatedAt',
            notes: '@id, updatedAt, createdAt',
            bookmarks: '@id, folder, updatedAt, createdAt',
            todos: '@id, completed, updatedAt, createdAt',
        });

        this.version(3).stores({
            kv: 'key, updatedAt',
            notes: '@id, updatedAt, createdAt',
            bookmarks: '@id, folder, updatedAt, createdAt',
            todos: '@id, completed, updatedAt, createdAt',
            desktopIcons: '@id, order, updatedAt, createdAt',
        });

        this.version(4).stores({
            kv: 'key, updatedAt',
            notes: '@id, updatedAt, createdAt',
            bookmarks: '@id, folder, updatedAt, createdAt',
            todos: '@id, completed, priority, dueDate, updatedAt, createdAt',
            desktopIcons: '@id, order, updatedAt, createdAt',
        });

        this.version(5)
            .stores({
                kv: 'key, updatedAt',
                notes: '@id, updatedAt, createdAt',
                bookmarks: '@id, folder, updatedAt, createdAt',
                todos: '@id, completed, priority, dueDate, sortOrder, updatedAt, createdAt',
                desktopIcons: '@id, order, updatedAt, createdAt',
                $terminalHistory: '++id, executedAt',
            })
            .upgrade(async tx => {
                const todosTable = tx.table<TodoRecord, string>('todos');
                const allTodos = await todosTable.toArray();
                if (allTodos.length === 0) return;

                // Initialize sortOrder to match the current "smart sort" ordering.
                const priorityOrder: Record<NonNullable<TodoRecord['priority']>, number> = {
                    high: 3,
                    medium: 2,
                    low: 1,
                };

                const sorted = [...allTodos].sort((a, b) => {
                    // Completed items go last
                    if (a.completed !== b.completed) {
                        return a.completed ? 1 : -1;
                    }

                    // Priority order: high > medium > low > none
                    const aPriority = a.priority ? priorityOrder[a.priority] : 0;
                    const bPriority = b.priority ? priorityOrder[b.priority] : 0;
                    if (aPriority !== bPriority) {
                        return bPriority - aPriority;
                    }

                    // Due date: earlier dates first
                    if (a.dueDate !== b.dueDate) {
                        if (!a.dueDate) return 1;
                        if (!b.dueDate) return -1;
                        return a.dueDate - b.dueDate;
                    }

                    // Created date: newer first
                    return b.createdAt - a.createdAt;
                });

                await Promise.all(sorted.map((todo, index) => todosTable.update(todo.id, { sortOrder: index })));
            });

        this.version(6).stores({
            kv: 'key, updatedAt',
            notes: '@id, updatedAt, createdAt',
            bookmarks: '@id, folder, updatedAt, createdAt',
            todos: '@id, completed, priority, dueDate, sortOrder, updatedAt, createdAt',
            desktopIcons: '@id, order, updatedAt, createdAt',
            $terminalHistory: '++id, executedAt',
            $screensaverSettings: 'id, updatedAt, createdAt',
        });

        this.version(7).stores({
            kv: 'key, updatedAt',
            notes: '@id, updatedAt, createdAt',
            bookmarks: '@id, folder, updatedAt, createdAt',
            todos: '@id, completed, priority, dueDate, sortOrder, updatedAt, createdAt',
            desktopIcons: '@id, order, updatedAt, createdAt',
            $terminalHistory: '++id, executedAt',
            $screensaverSettings: 'id, updatedAt, createdAt',
            $terminalSessions: '++id, updatedAt, createdAt',
        });

        this.version(8).stores({
            kv: 'key, updatedAt',
            notes: '@id, updatedAt, createdAt',
            bookmarks: '@id, folder, updatedAt, createdAt',
            todos: '@id, completed, priority, dueDate, sortOrder, updatedAt, createdAt',
            desktopIcons: '@id, order, updatedAt, createdAt',
            $terminalHistory: '++id, executedAt',
            $screensaverSettings: 'id, updatedAt, createdAt',
            $terminalSessions: '++id, updatedAt, createdAt',
            $terminalAliases: 'name, updatedAt, createdAt',
        });

        // Version 9: Wow Pack - Wallpapers and Arcade storage (F084)
        this.version(9).stores({
            kv: 'key, updatedAt',
            notes: '@id, updatedAt, createdAt',
            bookmarks: '@id, folder, updatedAt, createdAt',
            todos: '@id, completed, priority, dueDate, sortOrder, updatedAt, createdAt',
            desktopIcons: '@id, order, updatedAt, createdAt',
            $terminalHistory: '++id, executedAt',
            $screensaverSettings: 'id, updatedAt, createdAt',
            $terminalSessions: '++id, updatedAt, createdAt',
            $terminalAliases: 'name, updatedAt, createdAt',
            // Wallpaper storage
            $wallpapers: 'id, type, installedAt, updatedAt',
            $wallpaperAssets: '++id, wallpaperId, path, createdAt',
            // Arcade storage
            $arcadeGames: 'id, type, lastPlayedAt, createdAt, updatedAt',
            $arcadeSaves: '++id, gameId, slot, createdAt, updatedAt',
        });

        // Version 10: Fix This PC desktop icon to use 'thispc' app (F142)
        this.version(10)
            .stores({})
            .upgrade(async tx => {
                const icons = await tx.table('desktopIcons').toArray();
                for (const icon of icons) {
                    if (icon.label === 'This PC' && icon.appId === 'explorer') {
                        await tx.table('desktopIcons').update(icon.id, { appId: 'thispc', targetPath: undefined });
                    }
                }
            });

        // Version 11: Mail app migration to Dexie (F151)
        this.version(11).stores({
            kv: 'key, updatedAt',
            notes: '@id, updatedAt, createdAt',
            bookmarks: '@id, folder, updatedAt, createdAt',
            todos: '@id, completed, priority, dueDate, sortOrder, updatedAt, createdAt',
            desktopIcons: '@id, order, updatedAt, createdAt',
            $terminalHistory: '++id, executedAt',
            $screensaverSettings: 'id, updatedAt, createdAt',
            $terminalSessions: '++id, updatedAt, createdAt',
            $terminalAliases: 'name, updatedAt, createdAt',
            $wallpapers: 'id, type, installedAt, updatedAt',
            $wallpaperAssets: '++id, wallpaperId, path, createdAt',
            $arcadeGames: 'id, type, lastPlayedAt, createdAt, updatedAt',
            $arcadeSaves: '++id, gameId, slot, createdAt, updatedAt',
            // Mail tables
            emails: '@id, folderId, date, isRead, updatedAt, createdAt',
            emailFolders: 'id, type, updatedAt, createdAt',
        });

        // Version 12: App state persistence (F152)
        this.version(12).stores({
            kv: 'key, updatedAt',
            notes: '@id, updatedAt, createdAt',
            bookmarks: '@id, folder, updatedAt, createdAt',
            todos: '@id, completed, priority, dueDate, sortOrder, updatedAt, createdAt',
            desktopIcons: '@id, order, updatedAt, createdAt',
            $terminalHistory: '++id, executedAt',
            $screensaverSettings: 'id, updatedAt, createdAt',
            $terminalSessions: '++id, updatedAt, createdAt',
            $terminalAliases: 'name, updatedAt, createdAt',
            $wallpapers: 'id, type, installedAt, updatedAt',
            $wallpaperAssets: '++id, wallpaperId, path, createdAt',
            $arcadeGames: 'id, type, lastPlayedAt, createdAt, updatedAt',
            $arcadeSaves: '++id, gameId, slot, createdAt, updatedAt',
            emails: '@id, folderId, date, isRead, updatedAt, createdAt',
            emailFolders: 'id, type, updatedAt, createdAt',
            // App state table
            appState: '&appId, updatedAt',
        });

        // Version 13: Notification center (F157)
        this.version(13).stores({
            kv: 'key, updatedAt',
            notes: '@id, updatedAt, createdAt',
            bookmarks: '@id, folder, updatedAt, createdAt',
            todos: '@id, completed, priority, dueDate, sortOrder, updatedAt, createdAt',
            desktopIcons: '@id, order, updatedAt, createdAt',
            $terminalHistory: '++id, executedAt',
            $screensaverSettings: 'id, updatedAt, createdAt',
            $terminalSessions: '++id, updatedAt, createdAt',
            $terminalAliases: 'name, updatedAt, createdAt',
            $wallpapers: 'id, type, installedAt, updatedAt',
            $wallpaperAssets: '++id, wallpaperId, path, createdAt',
            $arcadeGames: 'id, type, lastPlayedAt, createdAt, updatedAt',
            $arcadeSaves: '++id, gameId, slot, createdAt, updatedAt',
            emails: '@id, folderId, date, isRead, updatedAt, createdAt',
            emailFolders: 'id, type, updatedAt, createdAt',
            appState: '&appId, updatedAt',
            notifications: '@id, type, isRead, scheduledFor, createdAt',
        });

        // Version 14: Clipboard history (F164)
        this.version(14).stores({
            kv: 'key, updatedAt',
            notes: '@id, updatedAt, createdAt',
            bookmarks: '@id, folder, updatedAt, createdAt',
            todos: '@id, completed, priority, dueDate, sortOrder, updatedAt, createdAt',
            desktopIcons: '@id, order, updatedAt, createdAt',
            $terminalHistory: '++id, executedAt',
            $screensaverSettings: 'id, updatedAt, createdAt',
            $terminalSessions: '++id, updatedAt, createdAt',
            $terminalAliases: 'name, updatedAt, createdAt',
            $wallpapers: 'id, type, installedAt, updatedAt',
            $wallpaperAssets: '++id, wallpaperId, path, createdAt',
            $arcadeGames: 'id, type, lastPlayedAt, createdAt, updatedAt',
            $arcadeSaves: '++id, gameId, slot, createdAt, updatedAt',
            emails: '@id, folderId, date, isRead, updatedAt, createdAt',
            emailFolders: 'id, type, updatedAt, createdAt',
            appState: '&appId, updatedAt',
            notifications: '@id, type, isRead, scheduledFor, createdAt',
            // Clipboard history table
            $clipboardHistory: '++id, copiedAt',
        });

        // Version 15: Handoff Queue (F189)
        this.version(15).stores({
            kv: 'key, updatedAt',
            notes: '@id, updatedAt, createdAt',
            bookmarks: '@id, folder, updatedAt, createdAt',
            todos: '@id, completed, priority, dueDate, sortOrder, updatedAt, createdAt',
            desktopIcons: '@id, order, updatedAt, createdAt',
            $terminalHistory: '++id, executedAt',
            $screensaverSettings: 'id, updatedAt, createdAt',
            $terminalSessions: '++id, updatedAt, createdAt',
            $terminalAliases: 'name, updatedAt, createdAt',
            $wallpapers: 'id, type, installedAt, updatedAt',
            $wallpaperAssets: '++id, wallpaperId, path, createdAt',
            $arcadeGames: 'id, type, lastPlayedAt, createdAt, updatedAt',
            $arcadeSaves: '++id, gameId, slot, createdAt, updatedAt',
            emails: '@id, folderId, date, isRead, updatedAt, createdAt',
            emailFolders: 'id, type, updatedAt, createdAt',
            appState: '&appId, updatedAt',
            notifications: '@id, type, isRead, scheduledFor, createdAt',
            $clipboardHistory: '++id, copiedAt',
            // Handoff items table
            handoffItems: '@id, createdAt, status, target',
        });

        const databaseUrl = getCloudDatabaseUrl();
        if (databaseUrl) {
            this.cloud.configure({
                databaseUrl,
                requireAuth: true,
                tryUseServiceWorker: false,
                customLoginGui: false,
            });
        }
    }
}

export const db = new Windows15DexieDB();
