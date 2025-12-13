import React, { createContext, useContext, useMemo, ReactNode, useEffect, useState } from 'react';
import { Windows15DexieDB } from '../utils/storage/db';
import { configSync } from '../utils/storage/configSync';
import { getCloudDatabaseUrl } from '../utils/storage/cloudConfig';

interface DbContextValue {
    db: Windows15DexieDB;
}

const DbContext = createContext<DbContextValue | undefined>(undefined);

export interface DbProviderProps {
    children: ReactNode;
}

/**
 * DbProvider - Centralized Dexie database instance management
 *
 * This provider ensures:
 * 1. Single database instance across the application
 * 2. Cloud configuration is applied before any queries
 * 3. Components access db via useDb() hook instead of direct imports
 * 4. Cross-tab configuration synchronization
 */
export const DbProvider: React.FC<DbProviderProps> = ({ children }) => {
    // Create database instance once and memoize it
    const [db, setDb] = useState(() => new Windows15DexieDB());

    // Listen for config changes from other tabs
    useEffect(() => {
        const unsubscribe = configSync.subscribe((message) => {
            const currentUrl = getCloudDatabaseUrl();

            // Only reinitialize if the URL actually changed
            if (message.databaseUrl !== currentUrl) {
                console.log('[DbProvider] Config changed in another tab, reinitializing database...');

                // Close existing database
                db.close().catch(console.error);

                // Create new database instance with updated config
                const newDb = new Windows15DexieDB();
                setDb(newDb);
            }
        });

        return () => {
            unsubscribe();
        };
    }, [db]);

    const value = useMemo(() => ({ db }), [db]);

    return <DbContext.Provider value={value}>{children}</DbContext.Provider>;
};

/**
 * useDb - Hook to access the Dexie database instance
 *
 * @throws Error if used outside of DbProvider
 * @returns The Windows15DexieDB instance
 */
export const useDb = (): Windows15DexieDB => {
    const context = useContext(DbContext);
    if (!context) {
        throw new Error('useDb must be used within a DbProvider');
    }
    return context.db;
};
