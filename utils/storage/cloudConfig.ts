const CLOUD_DATABASE_URL_KEY = 'windows15.dexieCloud.databaseUrl';

const canUseDomStorage = () => typeof globalThis !== 'undefined' && typeof globalThis.localStorage !== 'undefined';

export const getCloudDatabaseUrl = (): string | null => {
    if (!canUseDomStorage()) return null;
    try {
        const raw = globalThis.localStorage.getItem(CLOUD_DATABASE_URL_KEY);
        return raw && raw.trim() ? raw.trim() : null;
    } catch {
        return null;
    }
};

export const setCloudDatabaseUrl = (databaseUrl: string | null) => {
    if (!canUseDomStorage()) return;
    try {
        if (!databaseUrl) {
            globalThis.localStorage.removeItem(CLOUD_DATABASE_URL_KEY);
            return;
        }
        globalThis.localStorage.setItem(CLOUD_DATABASE_URL_KEY, databaseUrl);
    } catch {
        // Ignore storage access/quota errors.
    }
};

export const validateCloudDatabaseUrl = (databaseUrl: string): { ok: true; url: string } | { ok: false; error: string } => {
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

