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

export class Windows15DexieDB extends Dexie {
    kv!: Table<KvRecord, string>;
    notes!: Table<NoteRecord, string>;
    bookmarks!: Table<BookmarkRecord, string>;
    todos!: Table<TodoRecord, string>;
    desktopIcons!: Table<DesktopIconRecord, string>;

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
