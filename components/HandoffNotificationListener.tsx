import React, { useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../utils/storage/db';
import { useOS } from '../context';
import { useNotificationCenter } from '../context/NotificationContext';

/**
 * HandoffNotificationListener - Listens for new handoff items and shows notifications (F193)
 *
 * This component should be mounted at the top level (e.g., in App.tsx).
 * It watches the handoffItems table for new items from other devices.
 */
export const HandoffNotificationListener: React.FC = () => {
    const { notify } = useNotificationCenter();
    const { openWindow } = useOS();
    const lastCheckedRef = useRef<number>(Date.now());
    const notifiedIdsRef = useRef<Set<string>>(new Set());

    // Get device ID from localStorage (F195 will later move this to a central place)
    const deviceId = localStorage.getItem('windows15_device_id');

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

            const title = item.kind === 'url' ? 'Link Received' : 'Text Received';
            const message = `From ${item.createdByLabel}: ${item.title || (item.text.length > 50 ? item.text.substring(0, 47) + '...' : item.text)}`;

            // Show persistent notification in center + toast
            void notify(title, message, {
                type: 'info',
                appId: 'handoff',
                showBrowserNotification: true,
            });
        });
    }, [newItems, notify, openWindow]);

    return null;
};

export default HandoffNotificationListener;
