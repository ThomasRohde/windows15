import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { Windows15DexieDB } from '../utils/storage/db';

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
 */
export const DbProvider: React.FC<DbProviderProps> = ({ children }) => {
    // Create database instance once and memoize it
    const db = useMemo(() => new Windows15DexieDB(), []);

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
