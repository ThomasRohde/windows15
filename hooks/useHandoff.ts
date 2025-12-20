import { useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../utils/storage/db';
import { HandoffItem, HandoffStatus } from '../types';

/**
 * useHandoff - Hook for managing the Handoff Queue (F190)
 *
 * Provides operations to send, list, and update handoff items.
 * Automatically handles device identification.
 */
export function useHandoff() {
    // Get or generate device ID (F195 will later move this to a central place)
    const deviceId = useMemo(() => {
        let id = localStorage.getItem('windows15_device_id');
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem('windows15_device_id', id);
        }
        return id;
    }, []);

    // Get or generate device label (F195 will later move this to a central place)
    const deviceLabel = useMemo(() => {
        let label = localStorage.getItem('windows15_device_label');
        if (!label) {
            label = 'Browser'; // Default label
            localStorage.setItem('windows15_device_label', label);
        }
        return label;
    }, []);

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
