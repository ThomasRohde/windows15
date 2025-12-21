import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useDb, getCloudDatabaseUrl, setCloudDatabaseUrl, validateCloudDatabaseUrl } from '@/utils/storage';
import { useConfirmDialog, ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useNotification, useCopyToClipboard, usePhoneMode } from '@/hooks';

const PROD_ORIGIN = 'https://thomasrohde.github.io';

const getOrigin = (): string => {
    try {
        return globalThis.location?.origin ?? '';
    } catch {
        return '';
    }
};

const isProbablyWhitelistError = (message: string) => {
    const lower = message.toLowerCase();
    return lower.includes('whitelist') || lower.includes('origin') || lower.includes('not allowed');
};

const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    if (typeof error === 'object' && error !== null && 'message' in error) {
        return String((error as { message: unknown }).message);
    }
    return String(error);
};

const getUserFriendlyErrorMessage = (error: unknown): string => {
    const errorMsg = getErrorMessage(error);
    const lowerMsg = errorMsg.toLowerCase();

    // Auth errors
    if (lowerMsg.includes('unauthorized') || lowerMsg.includes('login required')) {
        return 'Authentication required. Please log in to continue.';
    }

    // Network errors
    if (lowerMsg.includes('network') || lowerMsg.includes('fetch failed') || lowerMsg.includes('timeout')) {
        return 'Cannot reach the database server. Check your internet connection.';
    }

    // Permission/whitelist errors
    if (lowerMsg.includes('whitelist') || lowerMsg.includes('origin') || lowerMsg.includes('not allowed')) {
        return 'This origin is not whitelisted. Run the whitelist command below.';
    }

    // Invalid URL
    if (lowerMsg.includes('invalid') && lowerMsg.includes('url')) {
        return 'The database URL format is invalid. Please check and try again.';
    }

    // Connection refused
    if (lowerMsg.includes('connection refused') || lowerMsg.includes('econnrefused')) {
        return 'Database server is not responding. Verify the URL is correct.';
    }

    // Generic fallback with sanitized error
    return `Sync error: ${errorMsg.substring(0, 100)}`;
};

const CopyableCommand = ({ command }: { command: string }) => {
    const { copy, copied } = useCopyToClipboard(1200);

    const doCopy = async () => {
        await copy(command);
    };

    return (
        <div className="flex items-stretch gap-2">
            <div className="flex-1 min-w-0 font-mono text-[11px] md:text-[12px] bg-black/30 border border-white/10 rounded-lg px-3 py-2 overflow-x-auto whitespace-nowrap select-text">
                {command}
            </div>
            <button
                type="button"
                onClick={doCopy}
                className="shrink-0 px-3 min-h-[44px] rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 text-xs text-white/90 transition-colors"
            >
                {copied ? 'Copied' : 'Copy'}
            </button>
        </div>
    );
};

export const SyncSettings = () => {
    const db = useDb();
    const { confirm, dialogProps } = useConfirmDialog();
    const notify = useNotification();
    const isPhone = usePhoneMode();
    const inputRef = useRef<HTMLInputElement>(null);
    const origin = useMemo(() => getOrigin(), []);
    const [databaseUrl, setDatabaseUrl] = useState(() => getCloudDatabaseUrl() ?? '');
    const [validationError, setValidationError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [isWorking, setIsWorking] = useState(false);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [wizardOpen, setWizardOpen] = useState(false);
    const [copiedOrigin, setCopiedOrigin] = useState(false);
    const { copy: copyOriginText } = useCopyToClipboard(1200);

    const [user, setUser] = useState(() => db.cloud.currentUser.value);
    const [syncState, setSyncState] = useState(() => db.cloud.syncState.value);
    const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));

    useEffect(() => {
        const subscription = db.cloud.currentUser.subscribe({ next: setUser });
        return () => subscription.unsubscribe();
    }, [db]);

    useEffect(() => {
        const subscription = db.cloud.syncState.subscribe({ next: setSyncState });
        return () => subscription.unsubscribe();
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

    const isCloudConfigured = Boolean(getCloudDatabaseUrl());
    const isLoggedIn = Boolean(user?.isLoggedIn);

    // Scroll input into view when focused on mobile (iOS keyboard handling)
    const handleInputFocus = useCallback(() => {
        if (isPhone && inputRef.current) {
            // Delay to allow virtual keyboard to appear
            setTimeout(() => {
                inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    }, [isPhone]);

    const copyOrigin = async () => {
        const ok = await copyOriginText(origin);
        if (ok) {
            setCopiedOrigin(true);
            setTimeout(() => setCopiedOrigin(false), 1200);
        }
    };

    const connect = async () => {
        setActionError(null);
        const validated = validateCloudDatabaseUrl(databaseUrl);
        if (!validated.ok) {
            setValidationError(validated.error);
            return;
        }
        setValidationError(null);
        setIsReconnecting(true);

        try {
            // Close current db
            await db.close();

            // Update config - this triggers DbProvider to create new instance
            setCloudDatabaseUrl(validated.url);

            // Wait a moment for DbProvider to reinitialize
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            setActionError(getUserFriendlyErrorMessage(error));
        } finally {
            setIsReconnecting(false);
        }
    };

    const disconnect = async () => {
        setActionError(null);
        const confirmed = await confirm({
            title: 'Disconnect from Cloud',
            message: 'Disconnect from Dexie Cloud? Local data will be kept.',
            variant: 'warning',
            confirmLabel: 'Disconnect',
            cancelLabel: 'Cancel',
        });
        if (!confirmed) return;
        setIsReconnecting(true);

        try {
            await db.cloud.logout({ force: true });
        } catch {
            // Best-effort; user might not be logged in.
        }

        try {
            // Close current db
            await db.close();

            // Update config - this triggers DbProvider to create new instance
            setCloudDatabaseUrl(null);

            // Wait a moment for DbProvider to reinitialize
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            setActionError(getUserFriendlyErrorMessage(error));
        } finally {
            setIsReconnecting(false);
        }
    };

    const login = async () => {
        setActionError(null);
        setIsWorking(true);
        try {
            await db.cloud.login();
            notify.success('Logged in successfully');
        } catch (err) {
            const errorMsg = getUserFriendlyErrorMessage(err);
            setActionError(errorMsg);
            notify.error('Login failed');
        } finally {
            setIsWorking(false);
        }
    };

    const logout = async () => {
        setActionError(null);
        setIsWorking(true);
        try {
            await db.cloud.logout();
            notify.success('Logged out successfully');
        } catch (err) {
            const errorMsg = getUserFriendlyErrorMessage(err);
            setActionError(errorMsg);
            notify.error('Logout failed');
        } finally {
            setIsWorking(false);
        }
    };

    const resetLocalData = async () => {
        setActionError(null);
        const confirmed = await confirm({
            title: 'Reset Local Data',
            message: 'Reset local Dexie data? This clears notes, bookmarks, and OS state on this device.',
            variant: 'danger',
            confirmLabel: 'Reset',
            cancelLabel: 'Cancel',
        });
        if (!confirmed) return;
        setIsWorking(true);
        try {
            await db.delete();
            globalThis.location?.reload();
        } catch (err) {
            setActionError(getUserFriendlyErrorMessage(err));
        } finally {
            setIsWorking(false);
        }
    };

    const connectionBadge = isReconnecting
        ? { label: 'Reconnecting...', className: 'bg-yellow-500/15 text-yellow-200 animate-pulse' }
        : !isCloudConfigured
          ? { label: 'Local-only', className: 'bg-white/10 text-white/80' }
          : syncState.status === 'error' || syncState.phase === 'error'
            ? { label: 'Error', className: 'bg-red-500/15 text-red-200' }
            : syncState.status === 'offline' || !isOnline
              ? { label: 'Offline', className: 'bg-amber-500/15 text-amber-200' }
              : { label: 'Cloud configured', className: 'bg-blue-500/15 text-blue-200' };

    const loginBadge = !isCloudConfigured
        ? null
        : isLoggedIn
          ? {
                label: user?.email ? `Logged in: ${user.email}` : 'Logged in',
                className: 'bg-emerald-500/15 text-emerald-200',
            }
          : { label: 'Login required', className: 'bg-white/10 text-white/70' };

    const primaryOrigin = origin || '(unknown)';
    const prodOriginNeeded = PROD_ORIGIN !== origin;

    const whitelistSnippet = `npx dexie-cloud whitelist ${primaryOrigin}`;

    const showWhitelistHint =
        Boolean(actionError && isProbablyWhitelistError(actionError)) ||
        Boolean(syncState.error && isProbablyWhitelistError(syncState.error.message));

    return (
        <div className="max-w-5xl w-full space-y-4 md:space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-light">Sync</h1>
                    <p className="mt-1 md:mt-2 text-sm text-white/60">
                        Optional BYO Dexie Cloud sync. If you don&apos;t configure it, Windows15 runs local-only.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 md:flex-col md:items-end">
                    <span className={`px-2.5 py-1 rounded-full text-xs ${connectionBadge.className}`}>
                        {connectionBadge.label}
                    </span>
                    {loginBadge && (
                        <span
                            className={`px-2.5 py-1 rounded-full text-xs max-w-full truncate ${loginBadge.className}`}
                        >
                            {loginBadge.label}
                        </span>
                    )}
                </div>
            </div>

            <div className="glass-panel rounded-xl p-4 md:p-5 space-y-3 md:space-y-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-white/90">App origin</div>
                        <div className="mt-1 text-xs text-white/60">
                            This exact origin must be whitelisted in your Dexie Cloud DB.
                        </div>
                    </div>
                    <button
                        onClick={copyOrigin}
                        className="shrink-0 px-3 min-h-[44px] rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 text-xs text-white/90 transition-colors"
                        type="button"
                    >
                        {copiedOrigin ? 'Copied' : 'Copy'}
                    </button>
                </div>
                <div className="font-mono text-[11px] md:text-xs bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white/80 break-all select-text">
                    {primaryOrigin}
                </div>
                <div className="flex items-start gap-2 text-[11px] text-white/50">
                    <span className="material-symbols-outlined text-[16px] shrink-0">info</span>
                    <span>GitHub Pages origin should be {PROD_ORIGIN} (no /windows15 path).</span>
                </div>
            </div>

            <div className="glass-panel rounded-xl p-4 md:p-5 space-y-3 md:space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                        <div className="text-sm font-medium text-white/90">Dexie Cloud database URL</div>
                        <div className="mt-1 text-xs text-white/60">
                            Paste the databaseUrl from your local dexie-cloud.json.
                        </div>
                    </div>
                    <button
                        onClick={() => setWizardOpen(prev => !prev)}
                        className="shrink-0 px-3 min-h-[44px] rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 text-xs text-white/90 transition-colors self-start md:self-center"
                        type="button"
                    >
                        {wizardOpen ? 'Hide setup' : 'How to set up'}
                    </button>
                </div>

                <input
                    ref={inputRef}
                    type="url"
                    inputMode="url"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    value={databaseUrl}
                    onChange={e => {
                        setDatabaseUrl(e.target.value);
                        setValidationError(null);
                    }}
                    onFocus={handleInputFocus}
                    placeholder="https://<yourdb>.dexie.cloud"
                    className="w-full min-h-[44px] px-3 rounded-lg bg-black/30 border border-white/10 text-sm text-white/80 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 allow-text-selection"
                    style={{
                        WebkitUserSelect: 'text',
                        userSelect: 'text',
                        WebkitTouchCallout: 'default',
                    }}
                />

                {validationError && (
                    <div className="text-xs bg-red-500/15 text-red-100 border border-red-500/20 rounded-lg px-3 py-2">
                        {validationError}
                    </div>
                )}

                {(actionError || syncState.error) && (
                    <div className="text-xs bg-red-500/15 text-red-100 border border-red-500/20 rounded-lg px-3 py-2">
                        {actionError ?? getUserFriendlyErrorMessage(syncState.error)}
                        {showWhitelistHint && (
                            <div className="mt-2 text-[11px] text-white/70">
                                Whitelist your origin:
                                <div className="mt-2">
                                    <CopyableCommand command={whitelistSnippet} />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={connect}
                        disabled={isWorking}
                        className="px-4 min-h-[44px] rounded-lg bg-primary hover:bg-primary/90 active:bg-primary/80 disabled:opacity-50 text-sm md:text-xs text-white font-medium transition-colors"
                        type="button"
                    >
                        Connect
                    </button>
                    <button
                        onClick={disconnect}
                        disabled={isWorking || !isCloudConfigured}
                        className="px-4 min-h-[44px] rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 disabled:opacity-50 text-sm md:text-xs text-white/90 transition-colors"
                        type="button"
                    >
                        Disconnect
                    </button>
                    {!isLoggedIn ? (
                        <button
                            onClick={login}
                            disabled={isWorking || !isCloudConfigured}
                            className="px-4 min-h-[44px] rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 disabled:opacity-50 text-sm md:text-xs text-white/90 transition-colors"
                            type="button"
                        >
                            Login
                        </button>
                    ) : (
                        <button
                            onClick={logout}
                            disabled={isWorking || !isCloudConfigured}
                            className="px-4 min-h-[44px] rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 disabled:opacity-50 text-sm md:text-xs text-white/90 transition-colors"
                            type="button"
                        >
                            Logout
                        </button>
                    )}
                    <button
                        onClick={resetLocalData}
                        disabled={isWorking}
                        className="px-4 min-h-[44px] rounded-lg bg-red-500/15 hover:bg-red-500/25 active:bg-red-500/35 disabled:opacity-50 text-sm md:text-xs text-red-100 transition-colors"
                        type="button"
                    >
                        Reset local data
                    </button>
                </div>
            </div>

            {wizardOpen && (
                <div className="glass-panel rounded-xl p-4 md:p-5 space-y-3 md:space-y-4">
                    <div className="text-sm font-medium text-white/90">Setup checklist</div>

                    <div className="space-y-4 text-sm text-white/70">
                        <div>
                            <div className="font-medium text-white/80">Step 0: Create a Dexie Cloud account</div>
                            <a
                                href="https://dexie.org/cloud/"
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline text-sm"
                            >
                                https://dexie.org/cloud/
                            </a>
                        </div>

                        <div>
                            <div className="font-medium text-white/80">Step 1: Create your database (CLI)</div>
                            <div className="mt-2">
                                <CopyableCommand command="npx dexie-cloud create" />
                            </div>
                            <div className="mt-1 text-xs text-white/50">
                                This creates <span className="font-mono">dexie-cloud.json</span> and{' '}
                                <span className="font-mono">dexie-cloud.key</span> locally.
                            </div>
                        </div>

                        <div>
                            <div className="font-medium text-white/80">Step 2: Whitelist origins</div>
                            <div className="mt-1 text-xs text-white/50">Use origin only (no path like /windows15).</div>
                            <div className="mt-2 space-y-2">
                                <CopyableCommand command={`npx dexie-cloud whitelist ${primaryOrigin}`} />
                                {prodOriginNeeded && (
                                    <CopyableCommand command={`npx dexie-cloud whitelist ${PROD_ORIGIN}`} />
                                )}
                            </div>
                        </div>

                        <div>
                            <div className="font-medium text-white/80">Step 3: Paste databaseUrl into this screen</div>
                            <div className="mt-1 text-xs text-white/50">
                                Open <span className="font-mono">dexie-cloud.json</span> and copy{' '}
                                <span className="font-mono">databaseUrl</span>.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Dialog */}
            <ConfirmDialog {...dialogProps} />
        </div>
    );
};
