import { useLiveQuery } from 'dexie-react-hooks';
import { storageService } from './storageService';

/**
 * Wrapper around dexie-react-hooks useLiveQuery for backward compatibility
 * @deprecated Use useLiveQuery from dexie-react-hooks directly
 */
export const useDexieLiveQuery = <T,>(querier: () => T | Promise<T>, deps: unknown[], initialValue?: T) => {
    const value = useLiveQuery(querier, deps, initialValue);
    return {
        value,
        error: undefined,
        isLoading: value === undefined && initialValue === undefined
    };
};

export const useStorageKey = <T,>(key: string, fallback: T) => {
    const { value } = useDexieLiveQuery(() => storageService.get<T>(key), [key]);
    return value ?? fallback;
};
