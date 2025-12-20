import { useCallback, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../utils/storage/db';
import { HandoffItem, HandoffStatus } from '../types';
import { usePersistedState } from './usePersistedState';

/**
 * useHandoff - Hook for managing the Handoff Queue (F190)
 *
 * Provides operations to send, list, and update handoff items.
 * Automatically handles device identification.
 */
export function useHandoff() {
    // Get or generate device ID (F195)
    const {
        value: deviceId,
        setValue: setDeviceId,
        isLoading: isIdLoading,
    } = usePersistedState('windows15_device_id', '');

    // Get or generate device label (F195)
    const { value: deviceLabel, setValue: setDeviceLabel } = usePersistedState('windows15_device_label', 'Browser');

    // Get or generate device category (F195)
    const { value: deviceCategory, setValue: setDeviceCategory } = usePersistedState(
        'windows15_device_category',
        'any'
    );

    // Ensure device ID is generated and persisted
    useEffect(() => {
        if (!isIdLoading && !deviceId) {
            setDeviceId(crypto.randomUUID());
        }
    }, [deviceId, isIdLoading, setDeviceId]);

    /**
     * Send a new item to the handoff queue
     */
    const send = useCallback(
        async (item: Omit<HandoffItem, 'id' | 'createdAt' | 'createdByDeviceId' | 'createdByLabel' | 'status'>) => {
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
        send,
        markOpened,
        markDone,
        archive,
        remove,
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
