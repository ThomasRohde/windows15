import { configSync } from './configSync';

const CLOUD_DATABASE_URL_KEY = 'windows15.dexieCloud.databaseUrl';

/**
 * Get default Dexie Cloud URL from environment variable.
 * This allows pre-configuring the cloud URL at build time.
 */
const getEnvCloudUrl = (): string | null => {
    try {
        const envUrl = import.meta.env.VITE_DEXIE_CLOUD_URL;
        return envUrl && envUrl.trim() ? envUrl.trim() : null;
    } catch {
        return null;
    }
};

const canUseDomStorage = () => typeof globalThis !== 'undefined' && typeof globalThis.localStorage !== 'undefined';

export const getCloudDatabaseUrl = (): string | null => {
    // First check localStorage for user-configured URL
    if (canUseDomStorage()) {
        try {
            const raw = globalThis.localStorage.getItem(CLOUD_DATABASE_URL_KEY);
            if (raw && raw.trim()) return raw.trim();
        } catch {
            // Fall through to env default
        }
    }

    // Fall back to environment variable default
    return getEnvCloudUrl();
};

export const setCloudDatabaseUrl = (databaseUrl: string | null) => {
    if (!canUseDomStorage()) return;
    try {
        if (!databaseUrl) {
            globalThis.localStorage.removeItem(CLOUD_DATABASE_URL_KEY);
        } else {
            globalThis.localStorage.setItem(CLOUD_DATABASE_URL_KEY, databaseUrl);
        }

        // Broadcast change to other tabs
        configSync.broadcast(databaseUrl);
    } catch {
        // Ignore storage access/quota errors.
    }
};

export const validateCloudDatabaseUrl = (
    databaseUrl: string
): { ok: true; url: string } | { ok: false; error: string } => {
    const trimmed = databaseUrl.trim();
    if (!trimmed) return { ok: false, error: 'Paste your Dexie Cloud database URL.' };
    let parsed: URL;
    try {
        parsed = new URL(trimmed);
    } catch {
        return { ok: false, error: 'Invalid URL format.' };
    }
    if (parsed.protocol !== 'https:') {
        return { ok: false, error: 'Dexie Cloud database URLs must use https.' };
    }
    return { ok: true, url: parsed.toString() };
};
