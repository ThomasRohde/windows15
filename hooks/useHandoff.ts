import { useCallback, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../utils/storage/db';
import { HandoffItem, HandoffStatus } from '../types';
import { usePersistedState } from './usePersistedState';

/**
 * Device identity keys for localStorage (local-only, never synced)
 * CRITICAL: Device ID must NOT sync across devices or handoff filtering breaks!
 */
const DEVICE_ID_KEY = 'windows15_device_id';

/**
 * useDeviceId - Hook for managing device identity in localStorage (local-only)
 *
 * Device ID must be stored in localStorage (not Dexie) to prevent cross-device sync.
 * If stored in Dexie Cloud's kv table, all devices would share the same ID,
 * breaking the ability to distinguish which device sent a handoff item.
 */
function useDeviceId(): { deviceId: string; isLoading: boolean } {
    const [deviceId, setDeviceId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Read from localStorage (synchronous, but we use effect to ensure SSR safety)
        let id = localStorage.getItem(DEVICE_ID_KEY);
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem(DEVICE_ID_KEY, id);
        }
        setDeviceId(id);
        setIsLoading(false);
    }, []);

    return { deviceId, isLoading };
}

/**
 * useHandoff - Hook for managing the Handoff Queue (F190)
 *
 * Provides operations to send, list, and update handoff items.
 * Automatically handles device identification.
 */
export function useHandoff() {
    // Get device ID from localStorage (local-only, never synced!)
    const { deviceId, isLoading: isIdLoading } = useDeviceId();

    // Get or generate device label (F195)
    const { value: deviceLabel, setValue: setDeviceLabel } = usePersistedState('windows15_device_label', 'Browser');

    // Get or generate device category (F195)
    const { value: deviceCategory, setValue: setDeviceCategory } = usePersistedState(
        'windows15_device_category',
        'any'
    );

    // Retention period in days (F196)
    const { value: retentionDays, setValue: setRetentionDays } = usePersistedState('windows15_handoff_retention', 7);

    /**
     * Cleanup expired items (F196)
     * Moves items older than retentionDays to 'archived' status.
     */
    const cleanup = useCallback(async () => {
        const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

        // Find items older than cutoff that are not already archived
        const expiredItems = await db.handoffItems
            .where('createdAt')
            .below(cutoff)
            .filter(item => item.status !== 'archived')
            .toArray();

        if (expiredItems.length === 0) return;

        // Update them to archived
        await db.transaction('rw', db.handoffItems, async () => {
            for (const item of expiredItems) {
                if (item.id) {
                    await db.handoffItems.update(item.id, { status: 'archived' });
                }
            }
        });

        console.log(`[useHandoff] Archived ${expiredItems.length} expired items.`);
    }, [retentionDays]);

    // Run cleanup on mount
    useEffect(() => {
        cleanup();
    }, [cleanup]);

    /**
     * Clear all archived items (F196)
     */
    const clearArchived = useCallback(async () => {
        await db.handoffItems.where('status').equals('archived').delete();
    }, []);

    /**
     * Send a new item to the handoff queue
     * @throws Error if deviceId is not yet loaded
     */
    const send = useCallback(
        async (item: Omit<HandoffItem, 'id' | 'createdAt' | 'createdByDeviceId' | 'createdByLabel' | 'status'>) => {
            // Prevent sending before device identity is ready
            if (!deviceId) {
                throw new Error('Device ID not yet loaded. Please wait and try again.');
            }
            const newItem: Omit<HandoffItem, 'id'> = {
                ...item,
                createdAt: Date.now(),
                createdByDeviceId: deviceId,
                createdByLabel: deviceLabel,
                status: 'new',
            };
            // Let Dexie Cloud auto-generate the ID when using @id schema
            return await db.handoffItems.add(newItem as HandoffItem);
        },
        [deviceId, deviceLabel]
    );

    /**
     * Mark an item as opened on this device
     */
    const markOpened = useCallback(async (id: string) => {
        return await db.handoffItems.update(id, {
            status: 'opened',
            openedAt: Date.now(),
        });
    }, []);

    /**
     * Mark an item as done
     */
    const markDone = useCallback(async (id: string) => {
        return await db.handoffItems.update(id, {
            status: 'done',
            doneAt: Date.now(),
        });
    }, []);

    /**
     * Archive an item
     */
    const archive = useCallback(async (id: string) => {
        return await db.handoffItems.update(id, {
            status: 'archived',
        });
    }, []);

    /**
     * Delete an item permanently
     */
    const remove = useCallback(async (id: string) => {
        return await db.handoffItems.delete(id);
    }, []);

    return {
        deviceId,
        deviceLabel,
        deviceCategory,
        setDeviceLabel,
        setDeviceCategory,
        retentionDays,
        setRetentionDays,
        cleanup,
        clearArchived,
        send,
        markOpened,
        markDone,
        archive,
        remove,
        /** True while device ID is loading from storage */
        isLoading: isIdLoading,
    };
}

/**
 * useHandoffItems - Reactive hook to list handoff items
 */
export function useHandoffItems(status?: HandoffStatus) {
    return useLiveQuery(() => {
        if (status) {
            return db.handoffItems
                .where('status')
                .equals(status)
                .sortBy('createdAt')
                .then(items => items.reverse());
        }
        return db.handoffItems.orderBy('createdAt').reverse().toArray();
    }, [status]);
}
