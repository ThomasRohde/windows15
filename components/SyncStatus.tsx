import React, { useEffect, useState } from 'react';
import { useDb, getCloudDatabaseUrl } from '../utils/storage';
import { debugSync } from '../utils/debugLogger';

// Helper to create user-friendly error messages
const getUserFriendlyError = (error: any, isOnline: boolean): string => {
    if (!isOnline) {
        return 'No internet connection. Connect to sync your data.';
    }

    const errorMsg = error?.message || String(error);
    const lowerMsg = errorMsg.toLowerCase();

    // Auth errors
    if (lowerMsg.includes('unauthorized') || lowerMsg.includes('login') || lowerMsg.includes('auth')) {
        return 'Please log in to sync your data.';
    }

    // Network errors
    if (lowerMsg.includes('network') || lowerMsg.includes('fetch') || lowerMsg.includes('timeout')) {
        return 'Connection issue. Check your internet and try again.';
    }

    // Permission/whitelist errors
    if (lowerMsg.includes('whitelist') || lowerMsg.includes('origin') || lowerMsg.includes('not allowed')) {
        return 'Database access denied. Check configuration in Settings.';
    }

    // Invalid URL
    if (lowerMsg.includes('invalid') && lowerMsg.includes('url')) {
        return 'Invalid database URL. Update in Settings.';
    }

    // Generic fallback
    return 'Sync error. Open Settings for details.';
};

export const SyncStatus = () => {
    const db = useDb();
    const isCloudConfigured = Boolean(getCloudDatabaseUrl());

    const [user, setUser] = useState(() => db.cloud.currentUser.value);
    const [syncState, setSyncState] = useState(() => db.cloud.syncState.value);
    const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
    const [isSyncing, setIsSyncing] = useState(false);
    const [showErrorTooltip, setShowErrorTooltip] = useState(false);

    useEffect(() => {
        const userSub = db.cloud.currentUser.subscribe({
            next: newUser => {
                debugSync.sync('Current user changed', {
                    isLoggedIn: newUser?.isLoggedIn,
                    email: newUser?.email,
                });
                setUser(newUser);
            },
        });
        const syncSub = db.cloud.syncState.subscribe({
            next: newState => {
                debugSync.sync('Sync state changed', {
                    status: newState?.status,
                    phase: newState?.phase,
                    error: newState?.error?.message,
                });
                setSyncState(newState);
            },
        });
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
            tooltipText = 'No internet connection. Connect to sync your data.';
        } else if (hasError) {
            statusText = 'Sync error';
            statusIcon = 'error';
            statusColor = 'text-red-400';
            tooltipText = getUserFriendlyError(syncState?.error, isOnline);
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
        <div className="relative flex items-center gap-2">
            <button
                onClick={handleSyncNow}
                onMouseEnter={() => hasError && setShowErrorTooltip(true)}
                onMouseLeave={() => setShowErrorTooltip(false)}
                disabled={!isLoggedIn || isSyncing || !isOnline}
                title={!hasError ? tooltipText : undefined}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${
                    isLoggedIn && isOnline && !isSyncing ? 'hover:bg-white/10 cursor-pointer' : 'cursor-default'
                }`}
            >
                <span className={`material-symbols-outlined text-[18px] ${statusColor}`}>{statusIcon}</span>
                <span className="text-xs text-white/70 hidden sm:inline">{statusText}</span>
            </button>

            {/* Error tooltip */}
            {hasError && showErrorTooltip && (
                <div className="absolute bottom-full right-0 mb-2 w-64 p-3 glass-panel rounded-lg shadow-xl ring-1 ring-white/10 z-50 animate-pop-in">
                    <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-red-400 text-lg flex-shrink-0">warning</span>
                        <div className="flex-1">
                            <p className="text-white text-sm font-medium mb-1">Sync Error</p>
                            <p className="text-white/70 text-xs leading-relaxed">{tooltipText}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
