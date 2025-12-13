import { Dexie, type Table } from 'dexie';
import dexieCloud from 'dexie-cloud-addon';
import { getCloudDatabaseUrl } from './cloudConfig';

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

export class Windows15DexieDB extends Dexie {
    kv!: Table<KvRecord, string>;
    notes!: Table<NoteRecord, string>;
    bookmarks!: Table<BookmarkRecord, string>;

    constructor() {
        super('windows15', { addons: [dexieCloud] });

        this.version(1).stores({
            kv: 'key, updatedAt',
            notes: '@id, updatedAt, createdAt',
            bookmarks: '@id, folder, updatedAt, createdAt',
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

