import React, { useRef, useCallback, useState, useMemo, useEffect } from 'react';
import { useOS } from '../context/OSContext';
import { useStartMenu } from '../context/StartMenuContext';
import { useUserProfile } from '../context/UserProfileContext';
import { ContextMenu } from './ContextMenu';
import { useContextMenu, useHandoff, useNotification, usePhoneMode } from '../hooks';
import { Icon } from './ui';

export const StartMenu = () => {
    const { apps, openWindow } = useOS();
    const { isStartMenuOpen, toggleStartMenu, pinnedApps, isPinned, pinApp, unpinApp, showAllApps, toggleAllApps } =
        useStartMenu();
    const { profile, getInitials } = useUserProfile();
    const { send, clearArchived } = useHandoff();
    const notify = useNotification();
    const isPhone = usePhoneMode();
    const menuRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Handoff actions for search (F197)
    const handoffActions = useMemo(
        () => [
            {
                id: 'handoff-open',
                title: 'Open Handoff Queue',
                icon: 'sync_alt',
                color: 'bg-indigo-500',
                action: () => openWindow('handoff'),
                keywords: ['handoff', 'sync', 'queue', 'devices'],
            },
            {
                id: 'handoff-send-clipboard',
                title: 'Send Clipboard to Handoff',
                icon: 'content_paste_go',
                color: 'bg-indigo-500',
                action: async () => {
                    try {
                        const text = await navigator.clipboard.readText();
                        if (text) {
                            await send({ target: text, kind: 'text', text });
                            notify.success('Clipboard sent to Handoff');
                        } else {
                            notify.warning('Clipboard is empty');
                        }
                    } catch {
                        notify.error('Failed to read clipboard');
                    }
                },
                keywords: ['handoff', 'send', 'clipboard', 'sync'],
            },
            {
                id: 'handoff-clear',
                title: 'Clear Handoff Archive',
                icon: 'delete_sweep',
                color: 'bg-red-500',
                action: async () => {
                    await clearArchived();
                    notify.success('Handoff archive cleared');
                },
                keywords: ['handoff', 'clear', 'delete', 'archive'],
            },
        ],
        [openWindow, send, clearArchived, notify]
    );

    const {
        menu: contextMenu,
        open: openContextMenu,
        close: closeContextMenu,
        menuProps,
        menuRef: contextMenuRef,
    } = useContextMenu<string>();

    // Search filter
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return null;
        const query = searchQuery.toLowerCase();

        const appResults = apps
            .filter(app => app.title.toLowerCase().includes(query))
            .map(app => ({
                ...app,
                isAction: false as const,
                action: () => openWindow(app.id),
            }));

        const actionResults = handoffActions
            .filter(
                action => action.title.toLowerCase().includes(query) || action.keywords.some(k => k.includes(query))
            )
            .map(action => ({
                ...action,
                isAction: true as const,
            }));

        return [...appResults, ...actionResults];
    }, [apps, searchQuery, handoffActions]);

    // Focus search input when start menu opens
    useEffect(() => {
        if (isStartMenuOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isStartMenuOpen]);

    // Reset selected index when search query changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [searchQuery]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Escape') {
                toggleStartMenu();
                setSearchQuery('');
            }
        },
        [toggleStartMenu]
    );

    const handleSearchKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            // Only handle navigation when search results are visible
            if (!searchResults || searchResults.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % searchResults.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const selected = searchResults[selectedIndex];
                if (selected) {
                    selected.action();
                    setSearchQuery('');
                }
            }
        },
        [searchResults, selectedIndex, openWindow]
    );

    const handleContextMenu = useCallback(
        (e: React.MouseEvent, appId: string) => {
            openContextMenu(e, appId);
        },
        [openContextMenu]
    );

    const handlePinToggle = useCallback(
        async (appId: string) => {
            if (isPinned(appId)) {
                await unpinApp(appId);
            } else {
                await pinApp(appId);
            }
            closeContextMenu();
        },
        [isPinned, pinApp, unpinApp, closeContextMenu]
    );

    // Filter apps based on current view (only used when not searching)
    const displayApps = useMemo(() => {
        if (showAllApps) {
            return [...apps].sort((a, b) => a.title.localeCompare(b.title));
        }
        return apps.filter(app => pinnedApps.includes(app.id));
    }, [apps, showAllApps, pinnedApps]);

    // User display info
    const userName = profile?.name || 'Guest';
    const userInitials = profile?.initials || getInitials(userName);

    if (!isStartMenuOpen) return null;

    return (
        <div
            ref={menuRef}
            data-start-menu
            role="menu"
            aria-label="Start menu"
            onKeyDown={handleKeyDown}
            className={
                isPhone
                    ? // Phone: fullscreen with safe-area insets (F228)
                      'fixed inset-0 z-40 flex flex-col glass-panel animate-fade-in'
                    : // Desktop: centered dropdown
                      'fixed left-1/2 transform -translate-x-1/2 w-[600px] [@media(pointer:coarse)]:w-[90vw] [@media(pointer:coarse)]:max-w-[650px] h-[70vh] max-h-[700px] glass-panel rounded-xl shadow-2xl z-40 flex flex-col animate-fade-in-up origin-bottom'
            }
            style={
                isPhone
                    ? {
                          paddingTop: 'var(--safe-area-inset-top)',
                          paddingBottom: 'var(--safe-area-inset-bottom)',
                      }
                    : {
                          bottom: 'calc(6rem + var(--safe-area-inset-bottom))',
                      }
            }
        >
            {/* Search */}
            <div className="p-6 pb-2">
                <div className="bg-black/20 h-10 [@media(pointer:coarse)]:h-12 rounded-lg flex items-center px-4 gap-3 border border-white/5">
                    <Icon name="search" className="text-white/50" />
                    <input
                        ref={searchInputRef}
                        aria-label="Search apps"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        className="bg-transparent border-none text-white text-sm [@media(pointer:coarse)]:text-base focus:outline-none w-full placeholder:text-white/30"
                        placeholder="Type here to search..."
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="text-white/50 hover:text-white/80"
                            aria-label="Clear search"
                        >
                            <Icon name="close" size="lg" />
                        </button>
                    )}
                </div>
            </div>

            {/* Search Results */}
            {searchResults !== null ? (
                <div className="flex-1 px-6 py-4 overflow-y-auto touch-scroll" onClick={closeContextMenu}>
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-sm font-semibold text-white/90">Results for "{searchQuery}"</span>
                        <span className="text-xs text-white/50">{searchResults.length} found</span>
                    </div>
                    {searchResults.length > 0 ? (
                        <div className="flex flex-col gap-1" role="group" aria-label="Search results">
                            {searchResults.map((app, index) => (
                                <button
                                    key={app.id}
                                    data-testid={`app-${app.id}`}
                                    role="menuitem"
                                    onClick={() => {
                                        app.action();
                                        setSearchQuery('');
                                    }}
                                    onContextMenu={e => !app.isAction && handleContextMenu(e, app.id)}
                                    className={`flex items-center gap-3 p-2 [@media(pointer:coarse)]:p-3 rounded hover:bg-white/10 group transition-colors text-left ${
                                        index === selectedIndex ? 'bg-white/10 ring-2 ring-blue-400/50' : ''
                                    }`}
                                >
                                    <div
                                        className={`w-8 h-8 [@media(pointer:coarse)]:w-10 [@media(pointer:coarse)]:h-10 rounded-lg flex items-center justify-center ${app.color} bg-opacity-20 text-xl`}
                                        aria-hidden="true"
                                    >
                                        <span
                                            className={`material-symbols-outlined ${app.color.replace('bg-', 'text-')}`}
                                        >
                                            {app.icon}
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm text-white/90 font-medium">{app.title}</span>
                                        {'isAction' in app && (
                                            <span className="text-[10px] text-white/40 uppercase tracking-wider">
                                                Action
                                            </span>
                                        )}
                                    </div>
                                    {!('isAction' in app) && isPinned(app.id) && (
                                        <Icon name="push_pin" size="sm" className="text-white/40 ml-auto" />
                                    )}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-white/50 py-8">
                            <Icon name="search_off" size="xl" className="text-4xl mb-2 block" />
                            <span>No apps found matching</span>
                            <span className="block text-white/30 mt-1">"{searchQuery}"</span>
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {/* Pinned / All Apps */}
                    <div className="flex-1 px-6 py-4 overflow-y-auto touch-scroll" onClick={closeContextMenu}>
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-sm font-semibold text-white/90">
                                {showAllApps ? 'All apps' : 'Pinned'}
                            </span>
                            <button
                                onClick={toggleAllApps}
                                className="bg-white/10 text-white/80 text-xs px-3 py-1 rounded hover:bg-white/20 flex items-center gap-1"
                            >
                                {showAllApps ? (
                                    <>
                                        <Icon name="arrow_back" size="sm" />
                                        Back
                                    </>
                                ) : (
                                    <>
                                        All apps
                                        <Icon name="arrow_forward" size="sm" />
                                    </>
                                )}
                            </button>
                        </div>

                        {showAllApps ? (
                            /* All Apps List View */
                            <div className="flex flex-col gap-1" role="group" aria-label="All apps">
                                {displayApps.map(app => (
                                    <button
                                        key={app.id}
                                        data-testid={`app-${app.id}`}
                                        role="menuitem"
                                        onClick={() => openWindow(app.id)}
                                        onContextMenu={e => handleContextMenu(e, app.id)}
                                        className="flex items-center gap-3 p-2 [@media(pointer:coarse)]:p-3 rounded hover:bg-white/10 group transition-colors text-left"
                                    >
                                        <div
                                            className={`w-8 h-8 [@media(pointer:coarse)]:w-10 [@media(pointer:coarse)]:h-10 rounded-lg flex items-center justify-center ${app.color} bg-opacity-20 text-xl`}
                                            aria-hidden="true"
                                        >
                                            <span
                                                className={`material-symbols-outlined ${app.color.replace('bg-', 'text-')}`}
                                            >
                                                {app.icon}
                                            </span>
                                        </div>
                                        <span className="text-sm text-white/90 font-medium">{app.title}</span>
                                        {isPinned(app.id) && (
                                            <span className="material-symbols-outlined text-white/40 text-sm ml-auto">
                                                push_pin
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            /* Pinned Apps Grid View */
                            <div
                                className={`grid gap-4 [@media(pointer:coarse)]:gap-5 ${isPhone ? 'grid-cols-2' : 'grid-cols-6 [@media(pointer:coarse)]:grid-cols-4'}`}
                                role="group"
                                aria-label="Pinned apps"
                            >
                                {displayApps.map(app => (
                                    <button
                                        key={app.id}
                                        data-testid={`app-${app.id}`}
                                        role="menuitem"
                                        onClick={() => openWindow(app.id)}
                                        onContextMenu={e => handleContextMenu(e, app.id)}
                                        className="flex flex-col items-center gap-2 p-2 [@media(pointer:coarse)]:p-3 rounded hover:bg-white/10 group transition-colors"
                                    >
                                        <div
                                            className={`w-10 h-10 [@media(pointer:coarse)]:w-12 [@media(pointer:coarse)]:h-12 rounded-lg flex items-center justify-center ${app.color} bg-opacity-20 text-2xl [@media(pointer:coarse)]:text-3xl`}
                                            aria-hidden="true"
                                        >
                                            <span
                                                className={`material-symbols-outlined ${app.color.replace('bg-', 'text-')}`}
                                            >
                                                {app.icon}
                                            </span>
                                        </div>
                                        <span className="text-xs text-white/80 text-center font-medium">
                                            {app.title}
                                        </span>
                                    </button>
                                ))}
                                {displayApps.length === 0 && (
                                    <div className="col-span-6 text-center text-white/50 py-8">
                                        No pinned apps. Right-click apps in "All apps" to pin them.
                                    </div>
                                )}
                            </div>
                        )}

                        {!showAllApps && (
                            <div className="mt-8">
                                <span className="text-sm font-semibold text-white/90 mb-4 block">Recommended</span>
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-3 p-2 rounded hover:bg-white/10 cursor-pointer">
                                        <span className="material-symbols-outlined text-blue-400">description</span>
                                        <div className="flex flex-col">
                                            <span className="text-sm text-white/90">Project Proposal.docx</span>
                                            <span className="text-xs text-white/50">Recently opened</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-2 rounded hover:bg-white/10 cursor-pointer">
                                        <span className="material-symbols-outlined text-pink-400">image</span>
                                        <div className="flex flex-col">
                                            <span className="text-sm text-white/90">Design_V2.png</span>
                                            <span className="text-xs text-white/50">10 min ago</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Context Menu */}
            {contextMenu && (
                <ContextMenu
                    ref={contextMenuRef}
                    position={contextMenu.position}
                    onClose={closeContextMenu}
                    {...menuProps}
                >
                    <ContextMenu.Item
                        icon="push_pin"
                        onClick={() => contextMenu.data && handlePinToggle(contextMenu.data)}
                    >
                        {contextMenu.data && isPinned(contextMenu.data) ? 'Unpin from Start' : 'Pin to Start'}
                    </ContextMenu.Item>
                </ContextMenu>
            )}

            {/* Footer */}
            <div className="h-16 [@media(pointer:coarse)]:h-20 border-t border-white/10 flex items-center justify-between px-8 bg-black/20">
                <button
                    aria-label={`User profile: ${userName}`}
                    className="flex items-center gap-3 hover:bg-white/10 p-2 [@media(pointer:coarse)]:p-3 rounded-lg cursor-pointer transition-colors"
                >
                    <div
                        className="w-8 h-8 [@media(pointer:coarse)]:w-10 [@media(pointer:coarse)]:h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold"
                        aria-hidden="true"
                    >
                        {userInitials}
                    </div>
                    <span className="text-sm [@media(pointer:coarse)]:text-base font-medium text-white/90">
                        {userName}
                    </span>
                </button>
                <button
                    aria-label="Power options"
                    className="p-2 [@media(pointer:coarse)]:p-3 hover:bg-white/10 rounded-full text-white/80"
                >
                    <span className="material-symbols-outlined" aria-hidden="true">
                        power_settings_new
                    </span>
                </button>
            </div>
        </div>
    );
};
