export const STORAGE_KEYS = {
    mailMessages: 'windows15.mail.messages',
    calendarEvents: 'windows15.calendar.events',
} as const;

const STORAGE_SYNC_EVENT = 'windows15:storage-sync';

type StorageSyncDetail = { key: string };

const canUseDomStorage = () => typeof globalThis !== 'undefined' && typeof globalThis.localStorage !== 'undefined';

export const readJsonIfPresent = <T,>(key: string): T | null => {
    if (!canUseDomStorage()) return null;
    try {
        const raw = globalThis.localStorage.getItem(key);
        if (raw === null) return null;
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
};

export const readJson = <T,>(key: string, fallback: T): T => {
    const value = readJsonIfPresent<T>(key);
    return value === null ? fallback : value;
};

export const writeJson = <T,>(key: string, value: T) => {
    if (canUseDomStorage()) {
        try {
            globalThis.localStorage.setItem(key, JSON.stringify(value));
        } catch {
            // Ignore storage quota / access errors.
        }
    }

    try {
        globalThis.dispatchEvent(new CustomEvent<StorageSyncDetail>(STORAGE_SYNC_EVENT, { detail: { key } }));
    } catch {
        // Ignore environments without CustomEvent.
    }
};

export const subscribeToStorageKey = (key: string, listener: () => void) => {
    const handleCustom = (event: Event) => {
        const detail = (event as CustomEvent<StorageSyncDetail>).detail;
        if (detail?.key !== key) return;
        listener();
    };

    const handleStorage = (event: StorageEvent) => {
        if (event.key !== key) return;
        listener();
    };

    try {
        globalThis.addEventListener(STORAGE_SYNC_EVENT, handleCustom as EventListener);
        globalThis.addEventListener('storage', handleStorage);
    } catch {
        // Ignore; best-effort subscriptions.
    }

    return () => {
        try {
            globalThis.removeEventListener(STORAGE_SYNC_EVENT, handleCustom as EventListener);
            globalThis.removeEventListener('storage', handleStorage);
        } catch {
            // Ignore; best-effort cleanup.
        }
    };
};

