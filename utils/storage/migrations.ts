import { STORAGE_KEYS, readJsonIfPresent } from './localStorage';
import { storageService } from './storageService';

const MIGRATION_FLAG_KEY = 'windows15.migrations.localStorageToDexieKv.v1';

const canUseDomStorage = () => typeof globalThis !== 'undefined' && typeof globalThis.localStorage !== 'undefined';

const getFlag = (): boolean => {
    if (!canUseDomStorage()) return false;
    try {
        return globalThis.localStorage.getItem(MIGRATION_FLAG_KEY) === '1';
    } catch {
        return false;
    }
};

const setFlag = () => {
    if (!canUseDomStorage()) return;
    try {
        globalThis.localStorage.setItem(MIGRATION_FLAG_KEY, '1');
    } catch {
        // Ignore.
    }
};

export const migrateLegacyLocalStorageToDexieKv = async (): Promise<void> => {
    if (getFlag()) return;

    const candidates: string[] = [STORAGE_KEYS.mailMessages, STORAGE_KEYS.calendarEvents];
    for (const key of candidates) {
        const value = readJsonIfPresent<unknown>(key);
        if (value === null) continue;
        await storageService.set(key, value);
    }

    setFlag();
};
