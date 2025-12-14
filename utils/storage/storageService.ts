/**
 * Storage service abstraction layer
 *
 * Provides a unified API for key-value storage with reactive subscriptions.
 * Currently backed by Dexie (IndexedDB) with cloud sync support.
 *
 * @module utils/storage/storageService
 */
import { liveQuery } from 'dexie';
import { db } from './db';

/**
 * Interface for key-value storage operations.
 * Implementations can use different backends (IndexedDB, localStorage, cloud, etc.)
 */
export interface StorageService {
    /**
     * Retrieve a value by key
     * @param key - The storage key
     * @returns The stored value or undefined if not found
     */
    get<T>(key: string): Promise<T | undefined>;

    /**
     * Store a value with a key
     * @param key - The storage key
     * @param value - The value to store (must be JSON-serializable)
     */
    set<T>(key: string, value: T): Promise<void>;

    /**
     * Remove a value by key
     * @param key - The storage key to remove
     */
    remove(key: string): Promise<void>;

    /**
     * Subscribe to changes for a key
     * @param key - The storage key to watch
     * @param handler - Callback invoked when value changes
     * @returns Unsubscribe function
     */
    subscribe<T>(key: string, handler: (value: T | undefined) => void): () => void;
}

/**
 * Safely parse JSON, returning undefined on error
 */
const safeJsonParse = <T>(valueJson: string): T | undefined => {
    try {
        return JSON.parse(valueJson) as T;
    } catch {
        return undefined;
    }
};

/**
 * Dexie-backed implementation of StorageService.
 * Uses IndexedDB for persistent storage with cloud sync capability.
 */
export class DexieStorageService implements StorageService {
    /** @inheritdoc */
    async get<T>(key: string): Promise<T | undefined> {
        const record = await db.kv.get(key);
        if (!record) return undefined;
        return safeJsonParse<T>(record.valueJson);
    }

    /** @inheritdoc */
    async set<T>(key: string, value: T): Promise<void> {
        const updatedAt = Date.now();
        let valueJson: string;
        try {
            valueJson = JSON.stringify(value);
        } catch {
            return;
        }
        await db.kv.put({ key, valueJson, updatedAt });
    }

    /** @inheritdoc */
    async remove(key: string): Promise<void> {
        await db.kv.delete(key);
    }

    /** @inheritdoc */
    subscribe<T>(key: string, handler: (value: T | undefined) => void): () => void {
        const subscription = liveQuery(() => this.get<T>(key)).subscribe({
            next: value => handler(value ?? undefined),
            error: () => handler(undefined),
        });
        return () => subscription.unsubscribe();
    }
}

/**
 * Default storage service instance.
 * Use this for all application storage needs.
 *
 * @example
 * ```tsx
 * import { storageService } from '@/utils/storage';
 *
 * // Store a value
 * await storageService.set('user.preferences', { theme: 'dark' });
 *
 * // Retrieve a value
 * const prefs = await storageService.get<UserPreferences>('user.preferences');
 *
 * // Subscribe to changes
 * const unsubscribe = storageService.subscribe('user.preferences', (prefs) => {
 *   console.log('Preferences changed:', prefs);
 * });
 * ```
 */
export const storageService: StorageService = new DexieStorageService();
