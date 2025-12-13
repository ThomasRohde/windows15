import { useEffect, useMemo, useState } from 'react';
import type { Observable } from 'dexie';
import { liveQuery } from 'dexie';
import { storageService } from './storageService';

export const useDexieLiveQuery = <T,>(querier: () => T | Promise<T>, deps: unknown[], initialValue?: T) => {
    const observable = useMemo(() => liveQuery(querier), deps);
    const [value, setValue] = useState<T | undefined>(initialValue);
    const [error, setError] = useState<unknown>(undefined);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const subscription = (observable as Observable<T>).subscribe({
            next: nextValue => {
                setValue(nextValue);
                setError(undefined);
                setIsLoading(false);
            },
            error: err => {
                setError(err);
                setIsLoading(false);
            },
        });
        return () => subscription.unsubscribe();
    }, [observable]);

    return { value, error, isLoading };
};

export const useStorageKey = <T,>(key: string, fallback: T) => {
    const { value } = useDexieLiveQuery(() => storageService.get<T>(key), [key]);
    return value ?? fallback;
};
