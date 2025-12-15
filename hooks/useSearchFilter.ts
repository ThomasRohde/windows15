/**
 * useSearchFilter - Consistent search and filter state management
 * @module hooks/useSearchFilter
 */

import { useState, useMemo } from 'react';
import { useDebounce } from './useDebounce';

export interface SearchFilterConfig<T> {
    /** Array of field names to search in */
    searchKeys: (keyof T)[];
    /** Debounce delay in milliseconds (default: 300) */
    debounceMs?: number;
    /** Case-sensitive search (default: false) */
    caseSensitive?: boolean;
}

export interface SearchFilterResult<T> {
    /** Filtered items based on search term */
    filteredItems: T[];
    /** Current search term */
    searchTerm: string;
    /** Debounced search term */
    debouncedSearchTerm: string;
    /** Set the search term */
    setSearchTerm: (term: string) => void;
    /** Clear the search term */
    clearSearch: () => void;
    /** Whether search is active */
    isSearching: boolean;
}

/**
 * Hook for managing search and filter state with debouncing
 *
 * @example
 * ```tsx
 * const { filteredItems, searchTerm, setSearchTerm, clearSearch } = useSearchFilter(
 *   todos,
 *   { searchKeys: ['title', 'notes'], debounceMs: 300 }
 * );
 *
 * return (
 *   <>
 *     <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
 *     {searchTerm && <button onClick={clearSearch}>Clear</button>}
 *     {filteredItems.map(item => <div key={item.id}>{item.title}</div>)}
 *   </>
 * );
 * ```
 */
export function useSearchFilter<T extends Record<string, unknown>>(
    items: T[],
    config: SearchFilterConfig<T>
): SearchFilterResult<T> {
    const { searchKeys, debounceMs = 300, caseSensitive = false } = config;
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, debounceMs);

    const filteredItems = useMemo(() => {
        if (!debouncedSearchTerm.trim()) {
            return items;
        }

        const normalizedSearch = caseSensitive ? debouncedSearchTerm.trim() : debouncedSearchTerm.trim().toLowerCase();

        return items.filter(item => {
            return searchKeys.some(key => {
                const value = item[key];
                if (value === null || value === undefined) return false;

                const stringValue = String(value);
                const normalizedValue = caseSensitive ? stringValue : stringValue.toLowerCase();

                return normalizedValue.includes(normalizedSearch);
            });
        });
    }, [items, debouncedSearchTerm, searchKeys, caseSensitive]);

    const clearSearch = () => {
        setSearchTerm('');
    };

    const isSearching = debouncedSearchTerm.trim().length > 0;

    return {
        filteredItems,
        searchTerm,
        debouncedSearchTerm,
        setSearchTerm,
        clearSearch,
        isSearching,
    };
}
