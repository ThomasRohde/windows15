import React, { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../utils/storage/db';
import { useNotification } from '../hooks';

/**
 * Device identity key for localStorage (local-only, never synced)
 * Must match the key used in useHandoff hook
 */
const DEVICE_ID_KEY = 'windows15_device_id';

/**
 * HandoffNotificationListener - Listens for new handoff items and shows notifications (F193)
 *
 * This component should be mounted at the top level (e.g., in App.tsx).
 * It watches the handoffItems table for new items from other devices.
 */
export const HandoffNotificationListener: React.FC = () => {
    const notify = useNotification();
    const lastCheckedRef = useRef<number>(Date.now());
    const notifiedIdsRef = useRef<Set<string>>(new Set());

    // Get device ID from localStorage (must match useHandoff's storage)
    const [deviceId, setDeviceId] = useState<string | null>(null);

    useEffect(() => {
        // Read from localStorage on mount
        const id = localStorage.getItem(DEVICE_ID_KEY);
        setDeviceId(id);
    }, []);

    // Watch for new items reactively
    const newItems = useLiveQuery(async () => {
        if (!deviceId) return [];

        // Find items created after we started listening, that are 'new' and NOT from this device
        // We use a small buffer (10s) to catch items that might have synced slightly late
        return await db.handoffItems
            .where('createdAt')
            .above(lastCheckedRef.current - 10000)
            .filter(item => item.status === 'new' && item.createdByDeviceId !== deviceId)
            .toArray();
    }, [deviceId]);

    useEffect(() => {
        if (!newItems || newItems.length === 0) return;

        newItems.forEach(item => {
            // Skip if we've already notified about this item in this session
            if (notifiedIdsRef.current.has(item.id)) return;

            notifiedIdsRef.current.add(item.id);

            const content = item.isSensitive
                ? '********'
                : item.title || (item.text.length > 50 ? item.text.substring(0, 47) + '...' : item.text);
            const message = `From ${item.createdByLabel}: ${content}`;

            // Show toast notification (simple, no persistence to avoid ID conflicts)
            notify.info(message);
        });
    }, [newItems, notify]);

    return null;
};

export default HandoffNotificationListener;
