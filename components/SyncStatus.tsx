import React, { useEffect, useState } from 'react';
import { useDb, getCloudDatabaseUrl } from '../utils/storage';

export const SyncStatus = () => {
    const db = useDb();
    const isCloudConfigured = Boolean(getCloudDatabaseUrl());

    const [user, setUser] = useState(() => db.cloud.currentUser.value);
    const [syncState, setSyncState] = useState(() => db.cloud.syncState.value);
    const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        const userSub = db.cloud.currentUser.subscribe({ next: setUser });
        const syncSub = db.cloud.syncState.subscribe({ next: setSyncState });
        return () => {
            userSub.unsubscribe();
            syncSub.unsubscribe();
        };
    }, [db]);

    useEffect(() => {
        const update = () => setIsOnline(navigator.onLine);
        globalThis.addEventListener?.('online', update);
        globalThis.addEventListener?.('offline', update);
        return () => {
            globalThis.removeEventListener?.('online', update);
            globalThis.removeEventListener?.('offline', update);
        };
    }, []);

    const handleSyncNow = async () => {
        if (!isCloudConfigured || !user?.isLoggedIn || isSyncing) return;
        setIsSyncing(true);
        try {
            await db.cloud.sync();
        } catch (error) {
            console.error('Manual sync failed:', error);
        } finally {
            setIsSyncing(false);
        }
    };

    // Don't show anything if cloud is not configured
    if (!isCloudConfigured) {
        return null;
    }

    const isLoggedIn = Boolean(user?.isLoggedIn);
    const phase = syncState?.phase;
    const hasError = syncState?.status === 'error' || phase === 'error';

    // Determine status and icon
    let statusText = 'Not logged in';
    let statusIcon = 'cloud_off';
    let statusColor = 'text-white/50';
    let tooltipText = 'Cloud sync not active';

    if (isLoggedIn) {
        if (!isOnline) {
            statusText = 'Offline';
            statusIcon = 'cloud_off';
            statusColor = 'text-amber-400';
            tooltipText = 'No internet connection';
        } else if (hasError) {
            statusText = 'Sync error';
            statusIcon = 'error';
            statusColor = 'text-red-400';
            tooltipText = syncState?.error?.message || 'Sync error occurred';
        } else if (isSyncing || phase === 'pulling' || phase === 'pushing') {
            statusText = phase === 'pulling' ? 'Pulling' : phase === 'pushing' ? 'Pushing' : 'Syncing';
            statusIcon = 'sync';
            statusColor = 'text-blue-400 animate-spin';
            tooltipText = 'Syncing changes...';
        } else {
            statusText = 'In sync';
            statusIcon = 'cloud_done';
            statusColor = 'text-emerald-400';
            tooltipText = user?.email ? `Logged in as ${user.email}` : 'Synced';
        }
    }

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={handleSyncNow}
                disabled={!isLoggedIn || isSyncing || !isOnline}
                title={isLoggedIn && isOnline ? 'Sync now' : tooltipText}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${isLoggedIn && isOnline && !isSyncing
                        ? 'hover:bg-white/10 cursor-pointer'
                        : 'cursor-default'
                    }`}
            >
                <span className={`material-symbols-outlined text-[18px] ${statusColor}`}>
                    {statusIcon}
                </span>
                <span className="text-xs text-white/70 hidden sm:inline">
                    {statusText}
                </span>
            </button>
        </div>
    );
};
