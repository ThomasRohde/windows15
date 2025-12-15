/**
 * useSeededCollection - Hook for persisted data with automatic seeding
 *
 * This hook wraps useDexieLiveQuery to provide automatic initialization with seed data.
 * It handles the initialization ref pattern internally so apps don't have to manage it.
 *
 * @template T - The type of items in the collection
 * @param storageKey - The storage key to persist data
 * @param seedFn - Function that generates initial seed data when collection is empty
 * @returns Object with items array, setItems function, and isLoading boolean
 *
 * @example
 * ```tsx
 * const { items: events, setItems: setEvents, isLoading } = useSeededCollection(
 *   STORAGE_KEYS.calendarEvents,
 *   seedEvents
 * );
 * ```
 *
 * When to use:
 * - Collections that need default/sample data on first load
 * - Eliminates boilerplate initialization logic
 * - Prevents double-seeding with internal ref tracking
 *
 * When NOT to use:
 * - Simple state that doesn't need seeding (use usePersistedState)
 * - Non-array data structures
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { storageService } from '../utils/storage';
import { useDexieLiveQuery } from '../utils/storage/react';

export interface UseSeededCollectionReturn<T> {
    items: T[];
    setItems: (items: T[] | ((prev: T[]) => T[])) => void;
    isLoading: boolean;
}

export function useSeededCollection<T>(storageKey: string, seedFn: () => T[]): UseSeededCollectionReturn<T> {
    const { value: persistedItems, isLoading: isLoadingFromDb } = useDexieLiveQuery(
        () => storageService.get<T[]>(storageKey),
        [storageKey],
        null // Use null to distinguish loading from "no data"
    );
    const hasInitializedRef = useRef(false);
    const [items, setItemsInternal] = useState<T[]>([]);

    // Initialize on first load
    useEffect(() => {
        if (isLoadingFromDb) {
            // During loading, keep current items if already initialized
            return;
        }

        if (!hasInitializedRef.current) {
            hasInitializedRef.current = true;

            // Seed if no persisted data or data is not an array
            if (!Array.isArray(persistedItems)) {
                const seeded = seedFn();
                setItemsInternal(seeded);
                storageService.set(storageKey, seeded).catch(err => {
                    console.error(`[useSeededCollection] Error seeding ${storageKey}:`, err);
                });
                return;
            }
        }

        // Update items when persisted data changes
        if (Array.isArray(persistedItems)) {
            setItemsInternal(persistedItems);
        }
    }, [isLoadingFromDb, persistedItems, storageKey, seedFn]);

    // Persist items when they change
    const setItems = useCallback(
        (itemsOrUpdater: T[] | ((prev: T[]) => T[])) => {
            setItemsInternal(prev => {
                const newItems = itemsOrUpdater instanceof Function ? itemsOrUpdater(prev) : itemsOrUpdater;

                // Persist asynchronously
                storageService.set(storageKey, newItems).catch(err => {
                    console.error(`[useSeededCollection] Error saving ${storageKey}:`, err);
                });

                return newItems;
            });
        },
        [storageKey]
    );

    return {
        items,
        setItems,
        isLoading: isLoadingFromDb && !hasInitializedRef.current,
    };
}
