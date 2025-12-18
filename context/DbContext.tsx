import React, { createContext, useContext, useMemo, ReactNode, useEffect, useState } from 'react';
import { Windows15DexieDB } from '../utils/storage/db';
import { configSync } from '../utils/storage/configSync';
import { getCloudDatabaseUrl } from '../utils/storage/cloudConfig';
import { debugSync } from '../utils/debugLogger';

interface DbContextValue {
    db: Windows15DexieDB;
    isReconnecting: boolean;
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
 * 5. Hot reconnection when config changes (no page reload)
 */
export const DbProvider: React.FC<DbProviderProps> = ({ children }) => {
    // Create database instance once and memoize it
    const [db, setDb] = useState(() => {
        debugSync.db('Creating initial database instance');
        return new Windows15DexieDB();
    });
    const [isReconnecting, setIsReconnecting] = useState(false);

    // Listen for config changes from other tabs
    useEffect(() => {
        const unsubscribe = configSync.subscribe(async message => {
            const currentUrl = getCloudDatabaseUrl();
            debugSync.config('Config sync message received', { newUrl: message.databaseUrl, currentUrl });

            // Only reinitialize if the URL actually changed
            if (message.databaseUrl !== currentUrl) {
                debugSync.db('Config changed, performing hot reconnection');
                setIsReconnecting(true);

                try {
                    // Close existing database
                    debugSync.db('Closing existing database');
                    await db.close();

                    // Create new database instance with updated config
                    debugSync.db('Creating new database instance with updated config');
                    const newDb = new Windows15DexieDB();
                    setDb(newDb);
                    debugSync.db('Hot reconnection complete');
                } catch (error) {
                    debugSync.error('Error during hot reconnection', error);
                } finally {
                    setIsReconnecting(false);
                }
            }
        });

        return () => {
            unsubscribe();
        };
    }, [db]);

    const value = useMemo(() => ({ db, isReconnecting }), [db, isReconnecting]);

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

/**
 * useDbContext - Hook to access the full database context including reconnection state
 *
 * @throws Error if used outside of DbProvider
 * @returns The DbContextValue with db instance and reconnection state
 */
export const useDbContext = (): DbContextValue => {
    const context = useContext(DbContext);
    if (!context) {
        throw new Error('useDbContext must be used within a DbProvider');
    }
    return context;
};
