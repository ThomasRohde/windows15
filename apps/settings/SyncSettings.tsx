import React, { useEffect, useMemo, useState } from 'react';
import { db, getCloudDatabaseUrl, setCloudDatabaseUrl, validateCloudDatabaseUrl } from '../../utils/storage';

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

const copyToClipboard = async (value: string): Promise<boolean> => {
    const text = value ?? '';
    if (!text) return false;

    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        // Fall through.
    }

    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand('copy');
        textarea.remove();
        return ok;
    } catch {
        return false;
    }
};

const CopyableCommand = ({ command }: { command: string }) => {
    const [copied, setCopied] = useState(false);

    const doCopy = async () => {
        const ok = await copyToClipboard(command);
        if (!ok) return;
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
    };

    return (
        <div className="flex items-stretch gap-2">
            <div className="flex-1 min-w-0 font-mono text-[12px] bg-black/30 border border-white/10 rounded-lg px-3 py-2 break-all">
                {command}
            </div>
            <button
                type="button"
                onClick={doCopy}
                className="shrink-0 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white/90"
            >
                {copied ? 'Copied' : 'Copy'}
            </button>
        </div>
    );
};

export const SyncSettings = () => {
    const origin = useMemo(() => getOrigin(), []);
    const [databaseUrl, setDatabaseUrl] = useState(() => getCloudDatabaseUrl() ?? '');
    const [validationError, setValidationError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [isWorking, setIsWorking] = useState(false);
    const [wizardOpen, setWizardOpen] = useState(false);
    const [copiedOrigin, setCopiedOrigin] = useState(false);

    const [user, setUser] = useState(() => db.cloud.currentUser.value);
    const [syncState, setSyncState] = useState(() => db.cloud.syncState.value);
    const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));

    useEffect(() => {
        const subscription = db.cloud.currentUser.subscribe({ next: setUser });
        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        const subscription = db.cloud.syncState.subscribe({ next: setSyncState });
        return () => subscription.unsubscribe();
    }, []);

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

    const copyOrigin = async () => {
        const ok = await copyToClipboard(origin);
        if (!ok) return;
        setCopiedOrigin(true);
        setTimeout(() => setCopiedOrigin(false), 1200);
    };

    const connect = () => {
        setActionError(null);
        const validated = validateCloudDatabaseUrl(databaseUrl);
        if (!validated.ok) {
            setValidationError(validated.error);
            return;
        }
        setValidationError(null);
        setCloudDatabaseUrl(validated.url);
        globalThis.location?.reload();
    };

    const disconnect = async () => {
        setActionError(null);
        if (!confirm('Disconnect from Dexie Cloud? Local data will be kept.')) return;
        try {
            await db.cloud.logout({ force: true });
        } catch {
            // Best-effort; user might not be logged in.
        }
        setCloudDatabaseUrl(null);
        globalThis.location?.reload();
    };

    const login = async () => {
        setActionError(null);
        setIsWorking(true);
        try {
            await db.cloud.login();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Login failed.';
            setActionError(message);
        } finally {
            setIsWorking(false);
        }
    };

    const logout = async () => {
        setActionError(null);
        setIsWorking(true);
        try {
            await db.cloud.logout();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Logout failed.';
            setActionError(message);
        } finally {
            setIsWorking(false);
        }
    };

    const resetLocalData = async () => {
        setActionError(null);
        if (!confirm('Reset local Dexie data? This clears notes, bookmarks, and OS state on this device.')) return;
        setIsWorking(true);
        try {
            await db.delete();
            globalThis.location?.reload();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Reset failed.';
            setActionError(message);
        } finally {
            setIsWorking(false);
        }
    };

    const connectionBadge = !isCloudConfigured
        ? { label: 'Local-only', className: 'bg-white/10 text-white/80' }
        : syncState.status === 'error' || syncState.phase === 'error'
          ? { label: 'Error', className: 'bg-red-500/15 text-red-200' }
          : syncState.status === 'offline' || !isOnline
            ? { label: 'Offline', className: 'bg-amber-500/15 text-amber-200' }
            : { label: 'Cloud configured', className: 'bg-blue-500/15 text-blue-200' };

    const loginBadge = !isCloudConfigured
        ? null
        : isLoggedIn
          ? { label: user?.email ? `Logged in: ${user.email}` : 'Logged in', className: 'bg-emerald-500/15 text-emerald-200' }
          : { label: 'Login required', className: 'bg-white/10 text-white/70' };

    const primaryOrigin = origin || '(unknown)';
    const prodOriginNeeded = PROD_ORIGIN !== origin;

    const whitelistSnippet = `npx dexie-cloud whitelist ${primaryOrigin}`;

    const showWhitelistHint =
        Boolean(actionError && isProbablyWhitelistError(actionError)) ||
        Boolean(syncState.error && isProbablyWhitelistError(syncState.error.message));

    return (
        <div className="max-w-3xl space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-light">Sync</h1>
                    <p className="mt-2 text-sm text-white/60">
                        Optional BYO Dexie Cloud sync. If you don&apos;t configure it, Windows15 runs local-only.
                    </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs ${connectionBadge.className}`}>{connectionBadge.label}</span>
                    {loginBadge && <span className={`px-2.5 py-1 rounded-full text-xs ${loginBadge.className}`}>{loginBadge.label}</span>}
                </div>
            </div>

            <div className="glass-panel rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <div className="text-sm font-medium text-white/90">App origin</div>
                        <div className="mt-1 text-xs text-white/60">This exact origin must be whitelisted in your Dexie Cloud DB.</div>
                    </div>
                    <button
                        onClick={copyOrigin}
                        className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white/90"
                        type="button"
                    >
                        {copiedOrigin ? 'Copied' : 'Copy'}
                    </button>
                </div>
                <div className="font-mono text-xs bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white/80 break-all">
                    {primaryOrigin}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-white/50">
                    <span className="material-symbols-outlined text-[16px]">info</span>
                    <span>GitHub Pages origin should be {PROD_ORIGIN} (no /windows15 path).</span>
                </div>
            </div>

            <div className="glass-panel rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm font-medium text-white/90">Dexie Cloud database URL</div>
                        <div className="mt-1 text-xs text-white/60">Paste the databaseUrl from your local dexie-cloud.json.</div>
                    </div>
                    <button
                        onClick={() => setWizardOpen(prev => !prev)}
                        className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white/90"
                        type="button"
                    >
                        {wizardOpen ? 'Hide setup' : 'How to set up'}
                    </button>
                </div>

                <input
                    value={databaseUrl}
                    onChange={e => {
                        setDatabaseUrl(e.target.value);
                        setValidationError(null);
                    }}
                    placeholder="https://<yourdb>.dexie.cloud"
                    className="w-full h-10 px-3 rounded-lg bg-black/30 border border-white/10 text-sm text-white/80 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                />

                {validationError && (
                    <div className="text-xs bg-red-500/15 text-red-100 border border-red-500/20 rounded-lg px-3 py-2">
                        {validationError}
                    </div>
                )}

                {(actionError || syncState.error) && (
                    <div className="text-xs bg-red-500/15 text-red-100 border border-red-500/20 rounded-lg px-3 py-2">
                        {actionError ?? syncState.error?.message ?? 'Unknown error'}
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
                        className="px-3 py-2 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 text-xs text-white font-medium"
                        type="button"
                    >
                        Connect
                    </button>
                    <button
                        onClick={disconnect}
                        disabled={isWorking || !isCloudConfigured}
                        className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 text-xs text-white/90"
                        type="button"
                    >
                        Disconnect
                    </button>
                    {!isLoggedIn ? (
                        <button
                            onClick={login}
                            disabled={isWorking || !isCloudConfigured}
                            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 text-xs text-white/90"
                            type="button"
                        >
                            Login
                        </button>
                    ) : (
                        <button
                            onClick={logout}
                            disabled={isWorking || !isCloudConfigured}
                            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 text-xs text-white/90"
                            type="button"
                        >
                            Logout
                        </button>
                    )}
                    <button
                        onClick={resetLocalData}
                        disabled={isWorking}
                        className="px-3 py-2 rounded-lg bg-red-500/15 hover:bg-red-500/25 disabled:opacity-50 text-xs text-red-100"
                        type="button"
                    >
                        Reset local data
                    </button>
                </div>
            </div>

            {wizardOpen && (
                <div className="glass-panel rounded-xl p-5 space-y-4">
                    <div className="text-sm font-medium text-white/90">Setup checklist</div>

                    <div className="space-y-3 text-sm text-white/70">
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
                                This creates <span className="font-mono">dexie-cloud.json</span> and <span className="font-mono">dexie-cloud.key</span> locally.
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
                                Open <span className="font-mono">dexie-cloud.json</span> and copy <span className="font-mono">databaseUrl</span>.
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
