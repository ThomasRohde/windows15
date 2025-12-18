/**
 * ClipboardContext - Centralized clipboard management with history (F164)
 *
 * Provides:
 * - Clipboard copy/paste operations via navigator.clipboard
 * - Clipboard history stored in DbContext (max 25 items)
 * - Ctrl+Shift+V keyboard shortcut to open history viewer
 * - Click to paste from history
 *
 * @module context/ClipboardContext
 */
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from './DbContext';
import { ClipboardHistoryRecord } from '../utils/storage/db';

// ==========================================
// Types
// ==========================================

export type ClipboardContentType = 'text' | 'image';

export interface ClipboardContextValue {
    /** Clipboard history items (most recent first) */
    history: ClipboardHistoryRecord[];
    /** Whether the clipboard history viewer is open */
    isHistoryOpen: boolean;
    /** Open the clipboard history viewer */
    openHistory: () => void;
    /** Close the clipboard history viewer */
    closeHistory: () => void;
    /** Toggle the clipboard history viewer */
    toggleHistory: () => void;
    /** Copy text to clipboard and add to history */
    copy: (text: string) => Promise<boolean>;
    /** Copy image blob to clipboard and add to history */
    copyImage: (blob: Blob) => Promise<boolean>;
    /** Paste from clipboard (returns text content) */
    paste: () => Promise<string | null>;
    /** Paste a specific history item to clipboard */
    pasteFromHistory: (item: ClipboardHistoryRecord) => Promise<boolean>;
    /** Clear all clipboard history */
    clearHistory: () => Promise<void>;
    /** Remove a specific item from history */
    removeFromHistory: (id: number) => Promise<void>;
}

// ==========================================
// Constants
// ==========================================

const MAX_HISTORY_ITEMS = 25;
const PREVIEW_MAX_LENGTH = 50;

// ==========================================
// Context
// ==========================================

const ClipboardContext = createContext<ClipboardContextValue | undefined>(undefined);

// ==========================================
// Helper Functions
// ==========================================

/**
 * Create a preview string from content
 */
function createPreview(content: string, contentType: ClipboardContentType): string {
    if (contentType === 'image') {
        return '[Image]';
    }
    if (content.length <= PREVIEW_MAX_LENGTH) {
        return content;
    }
    return content.substring(0, PREVIEW_MAX_LENGTH) + '...';
}

/**
 * Convert blob to data URL
 */
async function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// ==========================================
// Provider
// ==========================================

export interface ClipboardProviderProps {
    children: ReactNode;
}

export const ClipboardProvider: React.FC<ClipboardProviderProps> = ({ children }) => {
    const db = useDb();
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    // Live query for clipboard history (sorted by copiedAt descending, limit 25)
    const history = useLiveQuery(
        async () => {
            return db.$clipboardHistory.orderBy('copiedAt').reverse().limit(MAX_HISTORY_ITEMS).toArray();
        },
        [db],
        []
    );

    const openHistory = useCallback(() => setIsHistoryOpen(true), []);
    const closeHistory = useCallback(() => setIsHistoryOpen(false), []);
    const toggleHistory = useCallback(() => setIsHistoryOpen(prev => !prev), []);

    /**
     * Add item to clipboard history
     */
    const addToHistory = useCallback(
        async (content: string, contentType: ClipboardContentType): Promise<void> => {
            const record: ClipboardHistoryRecord = {
                content,
                contentType,
                preview: createPreview(content, contentType),
                copiedAt: Date.now(),
            };

            await db.$clipboardHistory.add(record);

            // Enforce max history limit
            const count = await db.$clipboardHistory.count();
            if (count > MAX_HISTORY_ITEMS) {
                const excess = count - MAX_HISTORY_ITEMS;
                const oldestItems = await db.$clipboardHistory.orderBy('copiedAt').limit(excess).toArray();
                const idsToDelete = oldestItems.map(item => item.id).filter((id): id is number => id !== undefined);
                await db.$clipboardHistory.bulkDelete(idsToDelete);
            }
        },
        [db]
    );

    /**
     * Copy text to clipboard and add to history
     */
    const copy = useCallback(
        async (text: string): Promise<boolean> => {
            try {
                await navigator.clipboard.writeText(text);
                await addToHistory(text, 'text');
                return true;
            } catch (err) {
                console.error('Failed to copy to clipboard:', err);
                return false;
            }
        },
        [addToHistory]
    );

    /**
     * Copy image blob to clipboard and add to history
     */
    const copyImage = useCallback(
        async (blob: Blob): Promise<boolean> => {
            try {
                // eslint-disable-next-line no-undef
                const item = new ClipboardItem({ [blob.type]: blob });
                await navigator.clipboard.write([item]);
                const dataUrl = await blobToDataUrl(blob);
                await addToHistory(dataUrl, 'image');
                return true;
            } catch (err) {
                console.error('Failed to copy image to clipboard:', err);
                return false;
            }
        },
        [addToHistory]
    );

    /**
     * Paste from clipboard
     */
    const paste = useCallback(async (): Promise<string | null> => {
        try {
            const text = await navigator.clipboard.readText();
            return text;
        } catch (err) {
            console.error('Failed to paste from clipboard:', err);
            return null;
        }
    }, []);

    /**
     * Paste a specific history item to clipboard
     */
    const pasteFromHistory = useCallback(async (item: ClipboardHistoryRecord): Promise<boolean> => {
        try {
            if (item.contentType === 'text') {
                await navigator.clipboard.writeText(item.content);
            } else {
                // For images, convert data URL back to blob
                const response = await fetch(item.content);
                const blob = await response.blob();
                // eslint-disable-next-line no-undef
                const clipItem = new ClipboardItem({ [blob.type]: blob });
                await navigator.clipboard.write([clipItem]);
            }
            setIsHistoryOpen(false);
            return true;
        } catch (err) {
            console.error('Failed to paste from history:', err);
            return false;
        }
    }, []);

    /**
     * Clear all clipboard history
     */
    const clearHistory = useCallback(async (): Promise<void> => {
        await db.$clipboardHistory.clear();
    }, [db]);

    /**
     * Remove a specific item from history
     */
    const removeFromHistory = useCallback(
        async (id: number): Promise<void> => {
            await db.$clipboardHistory.delete(id);
        },
        [db]
    );

    // Build context value
    const value: ClipboardContextValue = {
        history: history ?? [],
        isHistoryOpen,
        openHistory,
        closeHistory,
        toggleHistory,
        copy,
        copyImage,
        paste,
        pasteFromHistory,
        clearHistory,
        removeFromHistory,
    };

    return <ClipboardContext.Provider value={value}>{children}</ClipboardContext.Provider>;
};

// ==========================================
// Hook
// ==========================================

/**
 * Hook to access clipboard operations and history
 *
 * @returns ClipboardContextValue with clipboard operations
 * @throws Error if used outside ClipboardProvider
 *
 * @example
 * ```tsx
 * const { copy, history, toggleHistory } = useClipboard();
 *
 * return (
 *   <button onClick={() => copy('Hello World!')}>
 *     Copy
 *   </button>
 * );
 * ```
 */
export function useClipboard(): ClipboardContextValue {
    const context = useContext(ClipboardContext);
    if (!context) {
        throw new Error('useClipboard must be used within a ClipboardProvider');
    }
    return context;
}
