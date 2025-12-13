import { liveQuery } from 'dexie';
import { db } from './db';

export interface StorageService {
    get<T>(key: string): Promise<T | undefined>;
    set<T>(key: string, value: T): Promise<void>;
    remove(key: string): Promise<void>;
    subscribe<T>(key: string, handler: (value: T | undefined) => void): () => void;
}

const safeJsonParse = <T,>(valueJson: string): T | undefined => {
    try {
        return JSON.parse(valueJson) as T;
    } catch {
        return undefined;
    }
};

export class DexieStorageService implements StorageService {
    async get<T>(key: string): Promise<T | undefined> {
        const record = await db.kv.get(key);
        if (!record) return undefined;
        return safeJsonParse<T>(record.valueJson);
    }

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

    async remove(key: string): Promise<void> {
        await db.kv.delete(key);
    }

    subscribe<T>(key: string, handler: (value: T | undefined) => void): () => void {
        const subscription = liveQuery(() => this.get<T>(key)).subscribe({
            next: value => handler(value ?? undefined),
            error: () => handler(undefined),
        });
        return () => subscription.unsubscribe();
    }
}

export const storageService: StorageService = new DexieStorageService();

