import { FileSystemItem, WindowState } from '../types';
import { DEFAULT_DESKTOP_SHORTCUTS, INITIAL_FILES } from './constants';

const DB_NAME = 'windows15-fs';
const DB_VERSION = 1;

const STORE_FILES = 'files';
const STORE_SETTINGS = 'settings';
const STORE_WINDOW_STATES = 'windowStates';

const FS_SYNC_EVENT = 'windows15:fs-sync';

type FsSyncDetail = { store: string; key?: string };

let dbInstance: IDBDatabase | null = null;

export interface SettingRecord {
    key: string;
    value: unknown;
}

export interface WindowStateRecord {
    appId: string;
    state: Partial<WindowState>;
}

const canUseIndexedDB = (): boolean => {
    return typeof globalThis !== 'undefined' && typeof globalThis.indexedDB !== 'undefined';
};

const dispatchSyncEvent = (store: string, key?: string): void => {
    try {
        globalThis.dispatchEvent(new CustomEvent<FsSyncDetail>(FS_SYNC_EVENT, { detail: { store, key } }));
    } catch {
        // Ignore environments without CustomEvent
    }
};

export const subscribeToFileSystem = (
    store: string,
    listener: (key?: string) => void
): (() => void) => {
    const handleCustom = (event: Event) => {
        const detail = (event as CustomEvent<FsSyncDetail>).detail;
        if (detail?.store !== store) return;
        listener(detail.key);
    };

    try {
        globalThis.addEventListener(FS_SYNC_EVENT, handleCustom as EventListener);
    } catch {
        // Ignore; best-effort subscriptions
    }

    return () => {
        try {
            globalThis.removeEventListener(FS_SYNC_EVENT, handleCustom as EventListener);
        } catch {
            // Ignore; best-effort cleanup
        }
    };
};

export const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (dbInstance) {
            resolve(dbInstance);
            return;
        }

        if (!canUseIndexedDB()) {
            reject(new Error('IndexedDB is not available'));
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            reject(request.error);
        };

        request.onsuccess = () => {
            dbInstance = request.result;
            resolve(dbInstance);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            if (!db.objectStoreNames.contains(STORE_FILES)) {
                db.createObjectStore(STORE_FILES, { keyPath: 'id' });
            }

            if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
                db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
            }

            if (!db.objectStoreNames.contains(STORE_WINDOW_STATES)) {
                db.createObjectStore(STORE_WINDOW_STATES, { keyPath: 'appId' });
            }
        };
    });
};

const getDB = async (): Promise<IDBDatabase> => {
    if (dbInstance) return dbInstance;
    return initDB();
};

const findFileById = (files: FileSystemItem[], id: string): FileSystemItem | null => {
    for (const file of files) {
        if (file.id === id) return file;
        if (file.children) {
            const found = findFileById(file.children, id);
            if (found) return found;
        }
    }
    return null;
};

const updateFileInTree = (
    files: FileSystemItem[],
    id: string,
    updatedFile: FileSystemItem
): FileSystemItem[] => {
    return files.map((file) => {
        if (file.id === id) return updatedFile;
        if (file.children) {
            return {
                ...file,
                children: updateFileInTree(file.children, id, updatedFile),
            };
        }
        return file;
    });
};

const deleteFileFromTree = (files: FileSystemItem[], id: string): FileSystemItem[] => {
    return files
        .filter((file) => file.id !== id)
        .map((file) => {
            if (file.children) {
                return {
                    ...file,
                    children: deleteFileFromTree(file.children, id),
                };
            }
            return file;
        });
};

const ensureDesktopShortcuts = (files: FileSystemItem[]): FileSystemItem[] | null => {
    const rootIndex = files.findIndex((file) => file.id === 'root' && file.type === 'folder');
    if (rootIndex === -1) return null;

    const root = files[rootIndex];
    if (!root) return null;
    
    const rootChildren = root.children ?? [];
    const desktopExisting = rootChildren.find((child) => child.id === 'desktop' && child.type === 'folder');

    const desktopFolder: FileSystemItem = desktopExisting ?? {
        id: 'desktop',
        name: 'Desktop',
        type: 'folder',
        children: [],
    };

    const desktopChildren = desktopFolder.children ?? [];
    const desktopSampleItems = desktopChildren.filter((child) => child.id === 'f1' || child.id === 'f2');
    const cleanedChildren = desktopChildren.filter((child) => child.id !== 'f1' && child.id !== 'f2');

    const existingById = new Map(cleanedChildren.map((child) => [child.id, child]));
    const defaultShortcutIds = new Set(DEFAULT_DESKTOP_SHORTCUTS.map((item) => item.id));

    const nextShortcutChildren = DEFAULT_DESKTOP_SHORTCUTS.flatMap((shortcut) => {
        const existingInDesktop = existingById.get(shortcut.id);
        if (existingInDesktop) return [existingInDesktop];

        const existingElsewhere = findFileById(files, shortcut.id);
        if (existingElsewhere) return [];

        return [shortcut];
    });
    const remainingChildren = cleanedChildren.filter((child) => !defaultShortcutIds.has(child.id));
    const nextDesktopChildren = [...nextShortcutChildren, ...remainingChildren];

    const nextDesktopFolder: FileSystemItem = {
        ...desktopFolder,
        children: nextDesktopChildren,
    };

    const documentsExisting = rootChildren.find((child) => child.id === 'documents' && child.type === 'folder');
    const picturesExisting = rootChildren.find((child) => child.id === 'pictures' && child.type === 'folder');

    const documentsFolder: FileSystemItem = documentsExisting ?? {
        id: 'documents',
        name: 'Documents',
        type: 'folder',
        children: [],
    };

    const picturesFolder: FileSystemItem = picturesExisting ?? {
        id: 'pictures',
        name: 'Pictures',
        type: 'folder',
        children: [],
    };

    const desktopPdf = desktopSampleItems.find((item) => item.id === 'f1');
    const desktopPhoto = desktopSampleItems.find((item) => item.id === 'f2');

    const documentsChildren = documentsFolder.children ?? [];
    const picturesChildren = picturesFolder.children ?? [];

    const nextDocumentsChildren =
        desktopPdf && !documentsChildren.some((child) => child.id === 'f1')
            ? [...documentsChildren, desktopPdf]
            : documentsChildren;

    const nextPicturesChildren =
        desktopPhoto && !picturesChildren.some((child) => child.id === 'f2')
            ? [...picturesChildren, desktopPhoto]
            : picturesChildren;

    const nextDocumentsFolder: FileSystemItem =
        nextDocumentsChildren === documentsChildren
            ? documentsFolder
            : { ...documentsFolder, children: nextDocumentsChildren };

    const nextPicturesFolder: FileSystemItem =
        nextPicturesChildren === picturesChildren
            ? picturesFolder
            : { ...picturesFolder, children: nextPicturesChildren };

    const idsMatch = (left: FileSystemItem[], right: FileSystemItem[]) =>
        left.length === right.length && left.every((item, index) => item.id === right[index]?.id);

    const desktopNeedsUpdate =
        desktopExisting === undefined ||
        desktopSampleItems.length > 0 ||
        !idsMatch(desktopChildren, nextDesktopChildren);

    const documentsNeedsUpdate =
        (documentsExisting === undefined && desktopPdf !== undefined) ||
        nextDocumentsChildren !== documentsChildren;

    const picturesNeedsUpdate =
        (picturesExisting === undefined && desktopPhoto !== undefined) ||
        nextPicturesChildren !== picturesChildren;

    if (!desktopNeedsUpdate && !documentsNeedsUpdate && !picturesNeedsUpdate) return null;

    const updatedRootChildren = rootChildren.map((child) => {
        if (child.id === 'desktop') return nextDesktopFolder;
        if (child.id === 'documents') return nextDocumentsFolder;
        if (child.id === 'pictures') return nextPicturesFolder;
        return child;
    });

    const nextRootChildren = [...updatedRootChildren];
    if (!desktopExisting) nextRootChildren.push(nextDesktopFolder);
    if (!documentsExisting && desktopPdf) nextRootChildren.push(nextDocumentsFolder);
    if (!picturesExisting && desktopPhoto) nextRootChildren.push(nextPicturesFolder);

    const nextRoot: FileSystemItem = {
        id: root.id,
        name: root.name,
        type: root.type,
        children: nextRootChildren,
    };

    return files.map((file, index) => (index === rootIndex ? nextRoot : file));
};

export const getFiles = async (): Promise<FileSystemItem[]> => {
    const db = await getDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_FILES, 'readonly');
        const store = transaction.objectStore(STORE_FILES);
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = async () => {
            const files = request.result as FileSystemItem[];
            if (files.length === 0) {
                await saveFiles(INITIAL_FILES);
                resolve(INITIAL_FILES);
            } else {
                const migrated = ensureDesktopShortcuts(files);
                if (migrated) {
                    await saveFiles(migrated);
                    resolve(migrated);
                } else {
                    resolve(files);
                }
            }
        };
    });
};

export const saveFiles = async (files: FileSystemItem[]): Promise<void> => {
    const db = await getDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_FILES, 'readwrite');
        const store = transaction.objectStore(STORE_FILES);

        const clearRequest = store.clear();
        clearRequest.onerror = () => reject(clearRequest.error);
        clearRequest.onsuccess = () => {
            files.forEach((file) => {
                store.put(file);
            });

            transaction.oncomplete = () => {
                dispatchSyncEvent(STORE_FILES);
                resolve();
            };
            transaction.onerror = () => reject(transaction.error);
        };
    });
};

export const getFileById = async (id: string): Promise<FileSystemItem | null> => {
    const files = await getFiles();
    return findFileById(files, id);
};

export const saveFile = async (file: FileSystemItem): Promise<void> => {
    const files = await getFiles();
    const existingFile = findFileById(files, file.id);

    let updatedFiles: FileSystemItem[];
    if (existingFile) {
        updatedFiles = updateFileInTree(files, file.id, file);
    } else {
        updatedFiles = [...files, file];
    }

    await saveFiles(updatedFiles);
    dispatchSyncEvent(STORE_FILES, file.id);
};

export const deleteFile = async (id: string): Promise<void> => {
    const files = await getFiles();
    const updatedFiles = deleteFileFromTree(files, id);
    await saveFiles(updatedFiles);
    dispatchSyncEvent(STORE_FILES, id);
};

const addFileToFolder = (
    files: FileSystemItem[],
    folderId: string,
    newFile: FileSystemItem
): FileSystemItem[] => {
    return files.map((file) => {
        if (file.id === folderId && file.children) {
            return {
                ...file,
                children: [...file.children, newFile],
            };
        }
        if (file.children) {
            return {
                ...file,
                children: addFileToFolder(file.children, folderId, newFile),
            };
        }
        return file;
    });
};

export const saveFileToFolder = async (
    file: FileSystemItem,
    folderId: string = 'documents'
): Promise<void> => {
    const files = await getFiles();
    const existingFile = findFileById(files, file.id);

    let updatedFiles: FileSystemItem[];
    if (existingFile) {
        updatedFiles = updateFileInTree(files, file.id, file);
    } else {
        updatedFiles = addFileToFolder(files, folderId, file);
    }

    await saveFiles(updatedFiles);
    dispatchSyncEvent(STORE_FILES, file.id);
};

export const getSetting = async <T = unknown>(key: string): Promise<T | null> => {
    const db = await getDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_SETTINGS, 'readonly');
        const store = transaction.objectStore(STORE_SETTINGS);
        const request = store.get(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const record = request.result as SettingRecord | undefined;
            resolve(record ? (record.value as T) : null);
        };
    });
};

export const saveSetting = async <T = unknown>(key: string, value: T): Promise<void> => {
    const db = await getDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_SETTINGS, 'readwrite');
        const store = transaction.objectStore(STORE_SETTINGS);
        const record: SettingRecord = { key, value };
        const request = store.put(record);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            dispatchSyncEvent(STORE_SETTINGS, key);
            resolve();
        };
    });
};

export const getAllSettings = async (): Promise<Record<string, unknown>> => {
    const db = await getDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_SETTINGS, 'readonly');
        const store = transaction.objectStore(STORE_SETTINGS);
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const records = request.result as SettingRecord[];
            const settings: Record<string, unknown> = {};
            records.forEach((record) => {
                settings[record.key] = record.value;
            });
            resolve(settings);
        };
    });
};

export const getWindowStates = async (): Promise<WindowStateRecord[]> => {
    const db = await getDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_WINDOW_STATES, 'readonly');
        const store = transaction.objectStore(STORE_WINDOW_STATES);
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            resolve(request.result as WindowStateRecord[]);
        };
    });
};

export const saveWindowStates = async (states: WindowStateRecord[]): Promise<void> => {
    const db = await getDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_WINDOW_STATES, 'readwrite');
        const store = transaction.objectStore(STORE_WINDOW_STATES);

        const clearRequest = store.clear();
        clearRequest.onerror = () => reject(clearRequest.error);
        clearRequest.onsuccess = () => {
            states.forEach((state) => {
                store.put(state);
            });

            transaction.oncomplete = () => {
                dispatchSyncEvent(STORE_WINDOW_STATES);
                resolve();
            };
            transaction.onerror = () => reject(transaction.error);
        };
    });
};

export const saveWindowState = async (
    appId: string,
    state: Partial<WindowState>
): Promise<void> => {
    const db = await getDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_WINDOW_STATES, 'readwrite');
        const store = transaction.objectStore(STORE_WINDOW_STATES);
        const record: WindowStateRecord = { appId, state };
        const request = store.put(record);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            dispatchSyncEvent(STORE_WINDOW_STATES, appId);
            resolve();
        };
    });
};

export const STORE_NAMES = {
    files: STORE_FILES,
    settings: STORE_SETTINGS,
    windowStates: STORE_WINDOW_STATES,
} as const;

// Find parent folder ID of an item
const findParentFolderId = (
    files: FileSystemItem[],
    targetId: string,
    parentId: string = 'root'
): string | null => {
    for (const file of files) {
        if (file.children) {
            if (file.children.some(child => child.id === targetId)) {
                return file.id;
            }
            const found = findParentFolderId(file.children, targetId, file.id);
            if (found) return found;
        }
    }
    return null;
};

// Move an item to the recycle bin
export const moveToRecycleBin = async (itemId: string): Promise<void> => {
    const files = await getFiles();
    const item = findFileById(files, itemId);
    if (!item) return;

    const parentFolderId = findParentFolderId(files, itemId);

    // Create a copy of the item with deletion metadata
    const deletedItem: FileSystemItem = {
        ...item,
        deletedFrom: parentFolderId || 'root',
        deletedAt: new Date().toISOString(),
    };

    // Remove from original location
    let updatedFiles = deleteFileFromTree(files, itemId);

    // Add to recycle bin
    updatedFiles = addFileToFolder(updatedFiles, 'recycleBin', deletedItem);

    await saveFiles(updatedFiles);
    dispatchSyncEvent(STORE_FILES, itemId);
};

// Restore an item from the recycle bin to its original location
export const restoreFromRecycleBin = async (itemId: string): Promise<void> => {
    const files = await getFiles();
    const item = findFileById(files, itemId);
    if (!item || !item.deletedFrom) return;

    const originalFolderId = item.deletedFrom;

    // Create a clean copy without deletion metadata
    const restoredItem: FileSystemItem = { ...item };
    delete restoredItem.deletedFrom;
    delete restoredItem.deletedAt;

    // Remove from recycle bin
    let updatedFiles = deleteFileFromTree(files, itemId);

    // Check if original folder still exists
    const originalFolder = findFileById(updatedFiles, originalFolderId);
    const targetFolderId = originalFolder ? originalFolderId : 'root';

    // Add back to original location (or root if original folder is gone)
    updatedFiles = addFileToFolder(updatedFiles, targetFolderId, restoredItem);

    await saveFiles(updatedFiles);
    dispatchSyncEvent(STORE_FILES, itemId);
};

// Permanently delete an item (from recycle bin)
export const permanentlyDelete = async (itemId: string): Promise<void> => {
    const files = await getFiles();
    const updatedFiles = deleteFileFromTree(files, itemId);
    await saveFiles(updatedFiles);
    dispatchSyncEvent(STORE_FILES, itemId);
};

// Empty the entire recycle bin
export const emptyRecycleBin = async (): Promise<void> => {
    const files = await getFiles();

    const clearRecycleBin = (items: FileSystemItem[]): FileSystemItem[] => {
        return items.map(item => {
            if (item.id === 'recycleBin') {
                return { ...item, children: [] };
            }
            if (item.children) {
                return { ...item, children: clearRecycleBin(item.children) };
            }
            return item;
        });
    };

    const updatedFiles = clearRecycleBin(files);
    await saveFiles(updatedFiles);
    dispatchSyncEvent(STORE_FILES, 'recycleBin');
};

// Get recycle bin contents
export const getRecycleBinContents = async (): Promise<FileSystemItem[]> => {
    const files = await getFiles();
    const recycleBin = findFileById(files, 'recycleBin');
    return recycleBin?.children || [];
};
