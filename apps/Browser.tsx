import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDb, useDexieLiveQuery } from '../utils/storage';
import { generateUuid, ensureArray } from '../utils';
import { useConfirmDialog, ConfirmDialog, SearchInput } from '../components/ui';
import { usePersistedState } from '../hooks';
import { url as urlValidator, validateValue } from '../utils/validation';

type ViewMode = 'live' | 'reader';

type HistoryEntry = {
    url: string;
    mode: ViewMode;
};

type BrowserState = {
    input: string;
    history: HistoryEntry[];
    historyIndex: number;
    reloadNonce: number;
    error: string | null;
};

type BookmarkDraft = {
    url: string;
    title: string;
    folder: string;
};

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value);

const looksLikeIpAddress = (value: string) => /^\d{1,3}(\.\d{1,3}){3}/.test(value);

const rewriteKnownEmbedFriendlyUrls = (url: string) => {
    try {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase();

        // Google blocks framing on most endpoints, but enabling `igu=1` removes X-Frame-Options on webhp/search.
        // Make `https://google.com` "just work" in the in-app iframe.
        if (host === 'google.com') parsed.hostname = 'www.google.com';
        if (parsed.hostname.toLowerCase() === 'www.google.com' && !parsed.searchParams.has('igu')) {
            parsed.searchParams.set('igu', '1');
        }

        return parsed.toString();
    } catch {
        return url;
    }
};

const isProbablyLocalUrl = (value: string) => {
    if (!isHttpUrl(value)) return false;
    try {
        const parsed = new URL(value);
        const host = parsed.hostname.toLowerCase();
        if (host === 'localhost') return true;
        if (host === '0.0.0.0') return true;
        if (host.endsWith('.local')) return true;
        if (looksLikeIpAddress(host)) return true;
        return false;
    } catch {
        return false;
    }
};

const resolveInput = (raw: string): { url: string; modeSuggestion?: ViewMode } | { error: string } => {
    const trimmed = raw.trim();
    if (!trimmed) return { error: 'Enter a URL or search query.' };

    const lower = trimmed.toLowerCase();
    if (lower.startsWith('http://') || lower.startsWith('https://')) return { url: trimmed };

    if (lower.startsWith('about:')) return { url: trimmed };

    const looksLikeHostPort = /:\d{2,5}(\/|$)/.test(trimmed);
    if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed) && !looksLikeHostPort) {
        return { error: 'Only http(s) URLs are supported.' };
    }

    const isSearchQuery = /\s/.test(trimmed);
    if (isSearchQuery) {
        return { url: `https://www.google.com/search?q=${encodeURIComponent(trimmed)}&igu=1`, modeSuggestion: 'live' };
    }

    const looksLikeHost =
        trimmed.includes('.') ||
        trimmed.startsWith('localhost') ||
        looksLikeIpAddress(trimmed) ||
        /:\d{2,5}(\/|$)/.test(trimmed);

    if (!looksLikeHost) {
        return { url: `https://duckduckgo.com/?q=${encodeURIComponent(trimmed)}`, modeSuggestion: 'reader' };
    }

    const isLocal = trimmed.startsWith('localhost') || looksLikeIpAddress(trimmed) || trimmed.endsWith('.local');

    const protocol = isLocal ? 'http://' : 'https://';
    return { url: `${protocol}${trimmed}` };
};

export const Browser = () => {
    const db = useDb();
    const initialEntry: HistoryEntry = { url: 'https://thomasrohde.github.io', mode: 'live' };

    const { value: state, setValue: setState } = usePersistedState<BrowserState>('browser.state', {
        input: 'thomasrohde.github.io',
        history: [initialEntry],
        historyIndex: 0,
        reloadNonce: 0,
        error: null,
    });

    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isEmbedBlocked, setIsEmbedBlocked] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);

    const { value: bookmarksRaw } = useDexieLiveQuery(
        () => db.bookmarks.orderBy('updatedAt').reverse().toArray(),
        [db]
    );
    const bookmarks = useMemo(() => ensureArray(bookmarksRaw), [bookmarksRaw]);
    const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
    const [bookmarkDraft, setBookmarkDraft] = useState<BookmarkDraft | null>(null);
    const [bookmarkSearch, setBookmarkSearch] = useState('');

    const { confirm, dialogProps } = useConfirmDialog();

    const currentEntry = state.history[state.historyIndex] ?? initialEntry;
    const currentUrl = currentEntry.url;
    const viewMode = currentEntry.mode;

    const canGoBack = state.historyIndex > 0;
    const canGoForward = state.historyIndex < state.history.length - 1;

    const frameSrc = useMemo(() => {
        if (viewMode === 'reader') return `https://r.jina.ai/${currentUrl}`;
        return currentUrl;
    }, [currentUrl, viewMode]);

    const iframeKey = useMemo(
        () => `${viewMode}::${currentUrl}::${state.reloadNonce}`,
        [viewMode, currentUrl, state.reloadNonce]
    );

    useEffect(() => {
        setIsLoading(true);
        setIsEmbedBlocked(false);
    }, [iframeKey]);

    useEffect(() => {
        setNotice(null);
    }, [currentUrl]);

    const setMode = (mode: ViewMode) => {
        setState(prev => {
            const history = prev.history.map((entry, idx) => (idx === prev.historyIndex ? { ...entry, mode } : entry));
            return { ...prev, history, error: null };
        });
    };

    const navigate = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setState(prev => {
            const resolved = resolveInput(prev.input);
            if ('error' in resolved) return { ...prev, error: resolved.error };

            const finalUrl = rewriteKnownEmbedFriendlyUrls(resolved.url);
            const nextEntry: HistoryEntry = {
                url: finalUrl,
                mode: resolved.modeSuggestion ?? prev.history[prev.historyIndex]?.mode ?? 'live',
            };

            const nextHistory = [...prev.history.slice(0, prev.historyIndex + 1), nextEntry];
            return {
                ...prev,
                input: finalUrl,
                history: nextHistory,
                historyIndex: nextHistory.length - 1,
                error: null,
            };
        });
    };

    const goBack = () => {
        setState(prev => {
            if (prev.historyIndex <= 0) return prev;
            const nextIndex = prev.historyIndex - 1;
            return { ...prev, historyIndex: nextIndex, input: prev.history[nextIndex]?.url ?? prev.input, error: null };
        });
    };

    const goForward = () => {
        setState(prev => {
            if (prev.historyIndex >= prev.history.length - 1) return prev;
            const nextIndex = prev.historyIndex + 1;
            return { ...prev, historyIndex: nextIndex, input: prev.history[nextIndex]?.url ?? prev.input, error: null };
        });
    };

    const refresh = () => setState(prev => ({ ...prev, reloadNonce: prev.reloadNonce + 1, error: null }));

    const openExternal = () => {
        try {
            globalThis.open(currentUrl, '_blank', 'noopener,noreferrer');
        } catch {
            // Ignore pop-up blockers.
        }
    };

    const navigateToUrl = (url: string) => {
        const finalUrl = rewriteKnownEmbedFriendlyUrls(url);
        setState(prev => {
            const nextEntry: HistoryEntry = {
                url: finalUrl,
                mode: prev.history[prev.historyIndex]?.mode ?? 'live',
            };
            const nextHistory = [...prev.history.slice(0, prev.historyIndex + 1), nextEntry];
            return {
                ...prev,
                input: finalUrl,
                history: nextHistory,
                historyIndex: nextHistory.length - 1,
                error: null,
            };
        });
    };

    const defaultBookmarkTitle = (url: string) => {
        try {
            const parsed = new URL(url);
            return parsed.hostname || url;
        } catch {
            return url;
        }
    };

    const openAddBookmark = () => {
        if (!isHttpUrl(currentUrl)) {
            setNotice('Bookmarks only support http(s) URLs.');
            return;
        }
        setBookmarkDraft({
            url: currentUrl,
            title: defaultBookmarkTitle(currentUrl),
            folder: 'Bookmarks',
        });
        setIsBookmarksOpen(true);
    };

    const saveBookmark = async () => {
        if (!bookmarkDraft) return;
        const trimmedUrl = bookmarkDraft.url.trim();
        const trimmedTitle = bookmarkDraft.title.trim() || defaultBookmarkTitle(trimmedUrl);
        const trimmedFolder = bookmarkDraft.folder.trim() || 'Bookmarks';

        // Validate URL format using validation utility
        const urlError = validateValue(trimmedUrl, urlValidator('Invalid URL format'));
        if (urlError || !isHttpUrl(trimmedUrl)) {
            setNotice('Bookmarks only support http(s) URLs.');
            return;
        }

        const now = Date.now();
        const id = generateUuid();
        await db.bookmarks.add({
            id,
            url: trimmedUrl,
            title: trimmedTitle,
            folder: trimmedFolder,
            createdAt: now,
            updatedAt: now,
        });
        setBookmarkDraft(null);
    };

    const deleteBookmark = async (id: string) => {
        const item = bookmarks.find(b => b.id === id);
        if (!item) return;
        const confirmed = await confirm({
            title: 'Delete Bookmark',
            message: `Delete bookmark "${item.title || item.url}"?`,
            variant: 'danger',
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel',
        });
        if (!confirmed) return;
        await db.bookmarks.delete(id);
    };

    const filteredBookmarks = useMemo(() => {
        const q = bookmarkSearch.trim().toLowerCase();
        if (!q) return bookmarks;
        return bookmarks.filter(b => {
            return (
                b.title.toLowerCase().includes(q) ||
                b.url.toLowerCase().includes(q) ||
                b.folder.toLowerCase().includes(q)
            );
        });
    }, [bookmarks, bookmarkSearch]);

    const bookmarksByFolder = useMemo(() => {
        const map = new Map<string, typeof filteredBookmarks>();
        for (const bookmark of filteredBookmarks) {
            const folder = bookmark.folder?.trim() || 'Bookmarks';
            const existing = map.get(folder);
            if (existing) {
                existing.push(bookmark);
            } else {
                map.set(folder, [bookmark]);
            }
        }
        return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [filteredBookmarks]);

    const handleFrameLoad = () => {
        setIsLoading(false);

        if (viewMode !== 'live') return;
        if (!iframeRef.current?.contentWindow) return;

        try {
            const href = iframeRef.current.contentWindow.location.href;
            if (href === 'about:blank' && currentUrl !== 'about:blank') {
                if (isHttpUrl(currentUrl) && !isProbablyLocalUrl(currentUrl)) {
                    setNotice('This site blocks in-app embedding. Switched to Reader view.');
                    setMode('reader');
                    return;
                }
                setIsEmbedBlocked(true);
                return;
            }
            if (href.startsWith('chrome-error://')) {
                if (isHttpUrl(currentUrl) && !isProbablyLocalUrl(currentUrl)) {
                    setNotice('This site failed to load live. Switched to Reader view.');
                    setMode('reader');
                    return;
                }
                setIsEmbedBlocked(true);
                return;
            }
        } catch {
            // Cross-origin access is expected for most successful loads.
        }
    };

    const handleFrameError = () => {
        setIsLoading(false);
        if (viewMode !== 'live') return;
        if (isHttpUrl(currentUrl) && !isProbablyLocalUrl(currentUrl)) {
            setNotice('This site failed to load live. Switched to Reader view.');
            setMode('reader');
            return;
        }
        setIsEmbedBlocked(true);
    };

    const readerUnsupported = viewMode === 'reader' && !isHttpUrl(currentUrl);

    return (
        <div className="flex flex-col h-full bg-white relative">
            {/* Browser Toolbar */}
            <div className="h-12 bg-gray-100 border-b border-gray-200 flex items-center px-2 gap-2">
                <div className="flex gap-1">
                    <button
                        disabled={!canGoBack}
                        onClick={goBack}
                        className="p-1.5 rounded-full hover:bg-gray-200 disabled:opacity-30 text-gray-700"
                        title="Back"
                    >
                        <span className="material-symbols-outlined text-lg">arrow_back</span>
                    </button>
                    <button
                        disabled={!canGoForward}
                        onClick={goForward}
                        className="p-1.5 rounded-full hover:bg-gray-200 disabled:opacity-30 text-gray-700"
                        title="Forward"
                    >
                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </button>
                    <button
                        onClick={refresh}
                        className="p-1.5 rounded-full hover:bg-gray-200 text-gray-700"
                        title="Refresh"
                    >
                        <span className="material-symbols-outlined text-lg">refresh</span>
                    </button>
                </div>

                <form onSubmit={navigate} className="flex-1">
                    <input
                        className="w-full h-8 bg-white border border-gray-300 rounded-full px-4 text-sm text-gray-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        value={state.input}
                        onChange={e => setState(prev => ({ ...prev, input: e.target.value }))}
                        placeholder="Search or type URL"
                        spellCheck={false}
                    />
                </form>

                <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-full p-0.5">
                    <button
                        onClick={() => setMode('live')}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${viewMode === 'live' ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-100'}`}
                        title="Live view (may be blocked by some sites)"
                    >
                        <span className="material-symbols-outlined text-lg">language</span>
                    </button>
                    <button
                        onClick={() => setMode('reader')}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${viewMode === 'reader' ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-100'}`}
                        title="Reader view (works for most sites)"
                    >
                        <span className="material-symbols-outlined text-lg">article</span>
                    </button>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsBookmarksOpen(prev => !prev)}
                        className={`p-1.5 rounded-full hover:bg-gray-200 text-gray-700 ${isBookmarksOpen ? 'bg-gray-200' : ''}`}
                        title="Bookmarks"
                    >
                        <span className="material-symbols-outlined text-lg">bookmarks</span>
                    </button>
                    <button
                        onClick={openAddBookmark}
                        className="p-1.5 rounded-full hover:bg-gray-200 text-gray-700"
                        title="Add bookmark"
                    >
                        <span className="material-symbols-outlined text-lg">bookmark_add</span>
                    </button>
                </div>

                <button
                    onClick={openExternal}
                    className="p-1.5 rounded-full hover:bg-gray-200 text-gray-700"
                    title="Open in new tab"
                >
                    <span className="material-symbols-outlined text-lg">open_in_new</span>
                </button>
            </div>

            {state.error && (
                <div className="px-3 py-2 text-xs bg-red-50 text-red-700 border-b border-red-200">{state.error}</div>
            )}

            {notice && (
                <div className="px-3 py-2 text-xs bg-amber-50 text-amber-800 border-b border-amber-200">{notice}</div>
            )}

            {/* Browser Content */}
            <div className="flex-1 flex bg-white overflow-hidden">
                {isBookmarksOpen && (
                    <div className="w-80 border-r border-gray-200 bg-gray-50 flex flex-col">
                        <div className="h-12 px-3 flex items-center justify-between border-b border-gray-200">
                            <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px] text-blue-600">bookmarks</span>
                                Bookmarks
                            </div>
                            <button
                                onClick={() => setIsBookmarksOpen(false)}
                                className="h-8 w-8 rounded-lg hover:bg-gray-200 text-gray-700 flex items-center justify-center"
                                title="Close"
                            >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>

                        <div className="p-3 border-b border-gray-200">
                            <SearchInput
                                value={bookmarkSearch}
                                onChange={setBookmarkSearch}
                                placeholder="Search bookmarks..."
                                aria-label="Search bookmarks"
                                inputClassName="!bg-white !border-gray-300 !text-gray-700 placeholder:!text-gray-500 focus:!border-blue-500 focus:!ring-blue-500"
                            />
                        </div>

                        <div className="flex-1 overflow-auto">
                            {bookmarksByFolder.length === 0 ? (
                                <div className="p-4 text-sm text-gray-500">No bookmarks yet.</div>
                            ) : (
                                bookmarksByFolder.map(([folder, items]) => (
                                    <div key={folder} className="pb-2">
                                        <div className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                            {folder}
                                        </div>
                                        {items.map(bookmark => (
                                            <div key={bookmark.id} className="px-2">
                                                <div className="flex items-center gap-1 rounded-lg hover:bg-gray-100">
                                                    <button
                                                        onClick={() => {
                                                            navigateToUrl(bookmark.url);
                                                            setIsBookmarksOpen(false);
                                                        }}
                                                        className="flex-1 text-left px-2 py-2 min-w-0"
                                                        title={bookmark.url}
                                                    >
                                                        <div className="text-sm text-gray-900 truncate">
                                                            {bookmark.title || bookmark.url}
                                                        </div>
                                                        <div className="text-[11px] text-gray-500 truncate">
                                                            {bookmark.url}
                                                        </div>
                                                    </button>
                                                    <button
                                                        onClick={() => deleteBookmark(bookmark.id)}
                                                        className="h-8 w-8 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-red-600 flex items-center justify-center"
                                                        title="Delete"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">
                                                            delete
                                                        </span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                <div className="flex-1 relative bg-white">
                    {readerUnsupported ? (
                        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                            <div className="max-w-sm">
                                <div className="text-lg font-semibold text-gray-900">Reader view unavailable</div>
                                <div className="mt-1 text-sm text-gray-600">
                                    Reader view only supports http(s) URLs.
                                </div>
                                <div className="mt-4 flex items-center justify-center gap-2">
                                    <button
                                        onClick={() => setMode('live')}
                                        className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-800"
                                    >
                                        Switch to Live view
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <iframe
                                ref={iframeRef}
                                key={iframeKey}
                                src={frameSrc}
                                className="w-full h-full border-none"
                                title="Browser"
                                sandbox={
                                    viewMode === 'live'
                                        ? 'allow-scripts allow-same-origin allow-forms allow-popups'
                                        : 'allow-same-origin'
                                }
                                onLoad={handleFrameLoad}
                                onError={handleFrameError}
                            />

                            {viewMode === 'live' && isEmbedBlocked && (
                                <div className="absolute inset-0 flex items-center justify-center p-6 bg-white">
                                    <div className="max-w-md text-center">
                                        <div className="text-lg font-semibold text-gray-900">
                                            This site refused to load here
                                        </div>
                                        <div className="mt-1 text-sm text-gray-600">
                                            Many sites block being embedded in iframes. Switch to Reader view or open
                                            the page in a new tab.
                                        </div>
                                        <div className="mt-4 flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => setMode('reader')}
                                                className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-800"
                                            >
                                                Reader view
                                            </button>
                                            <button
                                                onClick={openExternal}
                                                className="px-3 py-2 rounded-lg bg-gray-100 text-gray-900 text-sm hover:bg-gray-200"
                                            >
                                                Open in new tab
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {isLoading && (
                                <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/60 text-white text-[10px] flex items-center gap-1">
                                    <span className="material-symbols-outlined text-xs animate-spin">
                                        progress_activity
                                    </span>
                                    Loading
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {bookmarkDraft && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/50">
                    <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">
                        <div className="h-12 px-4 flex items-center justify-between border-b border-gray-200">
                            <div className="text-sm font-medium text-gray-900">Add bookmark</div>
                            <button
                                onClick={() => setBookmarkDraft(null)}
                                className="h-8 w-8 rounded-lg hover:bg-gray-100 text-gray-700 flex items-center justify-center"
                                title="Close"
                            >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>
                        <div className="p-4 flex flex-col gap-3">
                            <label className="flex flex-col gap-1">
                                <span className="text-xs text-gray-500">Title</span>
                                <input
                                    value={bookmarkDraft.title}
                                    onChange={e =>
                                        setBookmarkDraft(prev => (prev ? { ...prev, title: e.target.value } : prev))
                                    }
                                    className="h-9 px-3 rounded-lg border border-gray-300 text-sm text-gray-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    autoFocus
                                />
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className="text-xs text-gray-500">Folder</span>
                                <input
                                    value={bookmarkDraft.folder}
                                    onChange={e =>
                                        setBookmarkDraft(prev => (prev ? { ...prev, folder: e.target.value } : prev))
                                    }
                                    className="h-9 px-3 rounded-lg border border-gray-300 text-sm text-gray-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    placeholder="Bookmarks"
                                />
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className="text-xs text-gray-500">URL</span>
                                <input
                                    value={bookmarkDraft.url}
                                    onChange={e =>
                                        setBookmarkDraft(prev => (prev ? { ...prev, url: e.target.value } : prev))
                                    }
                                    className="h-9 px-3 rounded-lg border border-gray-300 text-sm text-gray-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                            </label>
                        </div>
                        <div className="px-4 py-3 flex items-center justify-end gap-2 border-t border-gray-200 bg-gray-50">
                            <button
                                onClick={() => setBookmarkDraft(null)}
                                className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-sm text-gray-700 hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveBookmark}
                                className="px-3 py-2 rounded-lg bg-gray-900 text-sm text-white hover:bg-gray-800"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Dialog */}
            <ConfirmDialog {...dialogProps} />
        </div>
    );
};
