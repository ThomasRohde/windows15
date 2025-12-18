import React, { useState, useEffect, useCallback } from 'react';
import { getFiles, saveFiles, subscribeToFileSystem, STORE_NAMES, moveToRecycleBin } from '../utils/fileSystem';
import { FileSystemItem } from '../types';
import { useOS } from '../context/OSContext';
import { SkeletonFileSidebar, SkeletonFileGrid } from './LoadingSkeleton';
import { ContextMenu } from './ContextMenu';
import { useContextMenu, useNotification } from '../hooks';
import { readTextFromClipboard } from '../utils/clipboard';
import { analyzeClipboardContent, fetchYoutubeVideoTitle } from '../utils/clipboardAnalyzer';
import { Tooltip } from './ui';
import { getDefaultAppForExtension, getFileExtension } from '../apps/registry';

/**
 * Recursively adds a child item to a folder at the specified path
 */
const addChildToFolder = (items: FileSystemItem[], parentPath: string[], newItem: FileSystemItem): FileSystemItem[] => {
    if (parentPath.length === 1) {
        return items.map(item => {
            if (item.id === parentPath[0]) {
                return {
                    ...item,
                    children: [...(item.children || []), newItem],
                };
            }
            return item;
        });
    }

    return items.map(item => {
        if (item.id === parentPath[0]) {
            return {
                ...item,
                children: addChildToFolder(item.children || [], parentPath.slice(1), newItem),
            };
        }
        return item;
    });
};

export const FileExplorer = () => {
    const [currentPath, setCurrentPath] = useState<string[]>(['root']);
    const [currentFolder, setCurrentFolder] = useState<FileSystemItem | null>(null);
    const [files, setFiles] = useState<FileSystemItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [newFolderName, setNewFolderName] = useState('');
    const [showNewFolderInput, setShowNewFolderInput] = useState(false);
    const { openWindow } = useOS();
    const notify = useNotification();

    const {
        menu: contextMenu,
        open: openContextMenu,
        close: closeContextMenu,
        menuProps,
        menuRef,
    } = useContextMenu<FileSystemItem | undefined>();

    const loadFiles = useCallback(async () => {
        try {
            const loadedFiles = await getFiles();
            setFiles(loadedFiles);
        } catch (error) {
            console.error('Failed to load files:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadFiles();
        const unsubscribe = subscribeToFileSystem(STORE_NAMES.files, () => {
            loadFiles();
        });
        return unsubscribe;
    }, [loadFiles]);

    useEffect(() => {
        if (files.length === 0) return;

        // Find the root folder - it might not be at index 0
        let folder: FileSystemItem | undefined = files.find(f => f.id === 'root') ?? files[0];
        if (!folder) return;

        for (let i = 1; i < currentPath.length; i++) {
            if (!folder) break;
            const next: FileSystemItem | undefined = folder.children?.find(c => c.id === currentPath[i]);
            if (next) {
                folder = next;
            } else {
                break;
            }
        }
        setCurrentFolder(folder ?? null);
    }, [currentPath, files]);

    const navigateUp = () => {
        if (currentPath.length > 1) {
            setCurrentPath(prev => prev.slice(0, -1));
        }
    };

    const navigateTo = (folderId: string) => {
        const target = currentFolder?.children?.find(c => c.id === folderId);
        if (!target) return;

        if (target.type === 'folder') {
            setCurrentPath(prev => [...prev, folderId]);
            return;
        }

        if (target.type === 'shortcut') {
            if (target.appId === 'explorer' && target.targetPath) {
                setCurrentPath(target.targetPath);
                return;
            }

            if (target.appId) {
                openWindow(
                    target.appId,
                    target.appId === 'explorer' && target.targetPath ? { initialPath: target.targetPath } : undefined
                );
                return;
            }

            if (target.targetPath) {
                setCurrentPath(target.targetPath);
            }
            return;
        }

        // Handle link type files - use stored linkType instead of re-analyzing
        if (target.type === 'link' && target.url) {
            if (target.linkType === 'image') {
                openWindow('imageviewer', { initialSrc: target.url });
            } else if (target.linkType === 'youtube') {
                openWindow('youtubeplayer', { initialUrl: target.url });
            } else {
                openWindow('browser', { initialUrl: target.url });
            }
            return;
        }

        // For document types, check file associations by extension
        if (target.type === 'document') {
            const ext = getFileExtension(target.name);
            const defaultApp = getDefaultAppForExtension(ext);

            if (defaultApp) {
                // Pass file info to the app
                openWindow(defaultApp.id, {
                    initialContent: target.content,
                    initialFileId: target.id,
                    initialFileName: target.name,
                });
                return;
            }
        }

        // For image types
        if (target.type === 'image' && target.src) {
            openWindow('imageviewer', { initialSrc: target.src });
        }
    };

    const handleContextMenu = (e: React.MouseEvent, item?: FileSystemItem) => {
        openContextMenu(e, item);
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const removeItemFromTree = (items: FileSystemItem[], itemId: string): FileSystemItem[] => {
        return items
            .filter(item => item.id !== itemId)
            .map(item => ({
                ...item,
                children: item.children ? removeItemFromTree(item.children, itemId) : undefined,
            }));
    };

    const createNewFolder = async () => {
        if (!newFolderName.trim()) return;

        const newFolder: FileSystemItem = {
            id: `folder-${Date.now()}`,
            name: newFolderName.trim(),
            type: 'folder',
            children: [],
        };

        const updatedFiles = addChildToFolder(files, currentPath, newFolder);
        await saveFiles(updatedFiles);
        setNewFolderName('');
        setShowNewFolderInput(false);
    };

    const deleteItem = async (item: FileSystemItem) => {
        await moveToRecycleBin(item.id);
        closeContextMenu();
    };

    const handlePaste = useCallback(async () => {
        try {
            const text = await readTextFromClipboard();
            if (!text) {
                notify.warning('Clipboard is empty');
                return;
            }

            const analysis = analyzeClipboardContent(text);
            let newFile: FileSystemItem;

            switch (analysis.type) {
                case 'image-url':
                    newFile = {
                        id: `link-${Date.now()}`,
                        name: analysis.suggestedFileName,
                        type: 'link',
                        url: analysis.content,
                        linkType: 'image',
                        date: new Date().toLocaleDateString(),
                    };
                    break;
                case 'video-url':
                    newFile = {
                        id: `link-${Date.now()}`,
                        name: analysis.suggestedFileName,
                        type: 'link',
                        url: analysis.content,
                        linkType: 'video',
                        date: new Date().toLocaleDateString(),
                    };
                    break;
                case 'audio-url':
                    newFile = {
                        id: `link-${Date.now()}`,
                        name: analysis.suggestedFileName,
                        type: 'link',
                        url: analysis.content,
                        linkType: 'audio',
                        date: new Date().toLocaleDateString(),
                    };
                    break;
                case 'youtube-url': {
                    // Try to fetch the actual video title from YouTube
                    const videoTitle = await fetchYoutubeVideoTitle(analysis.content);
                    const fileName = videoTitle
                        ? `${videoTitle.substring(0, 50).replace(/[<>:"/\\|?*]/g, '')}.link`
                        : analysis.suggestedFileName;
                    newFile = {
                        id: `link-${Date.now()}`,
                        name: fileName,
                        type: 'link',
                        url: analysis.content,
                        linkType: 'youtube',
                        date: new Date().toLocaleDateString(),
                    };
                    break;
                }
                case 'web-url':
                    newFile = {
                        id: `link-${Date.now()}`,
                        name: analysis.suggestedFileName,
                        type: 'link',
                        url: analysis.content,
                        linkType: 'web',
                        date: new Date().toLocaleDateString(),
                    };
                    break;
                case 'json':
                    newFile = {
                        id: `doc-${Date.now()}`,
                        name: analysis.suggestedFileName,
                        type: 'document',
                        content: analysis.content,
                        date: new Date().toLocaleDateString(),
                    };
                    break;
                case 'plain-text':
                default:
                    newFile = {
                        id: `doc-${Date.now()}`,
                        name: analysis.suggestedFileName,
                        type: 'document',
                        content: analysis.content,
                        date: new Date().toLocaleDateString(),
                    };
                    break;
            }

            const updatedFiles = addChildToFolder(files, currentPath, newFile);
            await saveFiles(updatedFiles);

            // Optionally open the file immediately for URLs
            if (analysis.type === 'image-url') {
                openWindow('imageviewer', { initialSrc: analysis.content });
            } else if (analysis.type === 'youtube-url') {
                openWindow('youtubeplayer', { initialUrl: analysis.content });
            } else if (['video-url', 'audio-url', 'web-url'].includes(analysis.type)) {
                openWindow('browser', { initialUrl: analysis.content });
            }

            notify.success(`Pasted: ${newFile.name}`);
        } catch (error) {
            console.error('Paste error:', error);
            notify.error('Failed to paste from clipboard');
        }
        closeContextMenu();
    }, [files, currentPath, notify, openWindow, closeContextMenu]);

    if (loading) {
        return (
            <div className="flex h-full w-full bg-transparent">
                {/* Skeleton Sidebar */}
                <div className="w-48 hidden sm:flex flex-col border-r border-white/5 bg-black/10">
                    <SkeletonFileSidebar count={5} />
                </div>
                {/* Skeleton Content */}
                <div className="flex-1">
                    <SkeletonFileGrid count={12} />
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full w-full bg-transparent" onContextMenu={e => handleContextMenu(e)}>
            {/* Sidebar */}
            <div className="w-48 hidden sm:flex flex-col gap-1 p-3 border-r border-white/5 bg-black/10">
                <div className="text-xs font-bold text-white/40 uppercase px-3 py-2">Favorites</div>
                <Tooltip content="Go to Home folder" position="right">
                    <button
                        type="button"
                        onClick={() => setCurrentPath(['root'])}
                        className="flex items-center gap-3 px-3 py-2 rounded text-sm text-white/60 hover:text-white hover:bg-white/5 w-full text-left cursor-pointer transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px] text-blue-400">home</span>
                        Home
                    </button>
                </Tooltip>
                <Tooltip content="Go to Desktop folder" position="right">
                    <button
                        type="button"
                        onClick={() => setCurrentPath(['root', 'desktop'])}
                        className="flex items-center gap-3 px-3 py-2 rounded text-sm text-white/60 hover:text-white hover:bg-white/5 w-full text-left cursor-pointer transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px] text-yellow-400">star</span>
                        Desktop
                    </button>
                </Tooltip>
                <Tooltip content="Go to Pictures folder" position="right">
                    <button
                        type="button"
                        onClick={() => setCurrentPath(['root', 'pictures'])}
                        className="flex items-center gap-3 px-3 py-2 rounded text-sm text-white/60 hover:text-white hover:bg-white/5 w-full text-left cursor-pointer transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px] text-pink-400">image</span>
                        Pictures
                    </button>
                </Tooltip>
                <Tooltip content="Go to Documents folder" position="right">
                    <button
                        type="button"
                        onClick={() => setCurrentPath(['root', 'documents'])}
                        className="flex items-center gap-3 px-3 py-2 rounded text-sm text-white/60 hover:text-white hover:bg-white/5 w-full text-left cursor-pointer transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px] text-orange-400">description</span>
                        Documents
                    </button>
                </Tooltip>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Toolbar */}
                <div className="h-12 border-b border-white/5 flex items-center px-4 gap-4">
                    <div className="flex gap-2 text-white/50">
                        <Tooltip content="Navigate up one folder" position="bottom">
                            <button
                                onClick={navigateUp}
                                disabled={currentPath.length <= 1}
                                className="hover:text-white disabled:opacity-30"
                            >
                                <span className="material-symbols-outlined">arrow_upward</span>
                            </button>
                        </Tooltip>
                    </div>
                    {/* Breadcrumbs */}
                    <div className="flex-1 flex items-center bg-black/20 rounded px-3 h-8 text-sm text-white/70">
                        {currentPath.map((p, i) => (
                            <React.Fragment key={i}>
                                <Tooltip content={`Navigate to ${p === 'root' ? 'This PC' : p}`} position="bottom">
                                    <span className="hover:bg-white/10 px-1 rounded cursor-pointer">
                                        {p === 'root'
                                            ? 'This PC'
                                            : p === 'desktop'
                                              ? 'Desktop'
                                              : p.charAt(0).toUpperCase() + p.slice(1)}
                                    </span>
                                </Tooltip>
                                {i < currentPath.length - 1 && (
                                    <span className="material-symbols-outlined text-xs mx-1">chevron_right</span>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                    <Tooltip content="Create a new folder" position="bottom">
                        <button
                            onClick={() => setShowNewFolderInput(true)}
                            className="flex items-center gap-1 px-2 py-1 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors"
                        >
                            <span className="material-symbols-outlined text-lg">create_new_folder</span>
                        </button>
                    </Tooltip>
                </div>

                {/* New Folder Input */}
                {showNewFolderInput && (
                    <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2 bg-black/20">
                        <span className="material-symbols-outlined text-yellow-400">folder</span>
                        <input
                            type="text"
                            value={newFolderName}
                            onChange={e => setNewFolderName(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') createNewFolder();
                                if (e.key === 'Escape') {
                                    setShowNewFolderInput(false);
                                    setNewFolderName('');
                                }
                            }}
                            placeholder="New folder name..."
                            className="flex-1 bg-transparent border border-white/20 rounded px-2 py-1 text-sm text-white outline-none focus:border-blue-400"
                            autoFocus
                        />
                        <button
                            onClick={createNewFolder}
                            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors"
                        >
                            Create
                        </button>
                        <button
                            onClick={() => {
                                setShowNewFolderInput(false);
                                setNewFolderName('');
                            }}
                            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-sm rounded transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                )}

                {/* File Grid */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-4">
                        {currentFolder?.children
                            ?.filter(item => item.id !== 'recycleBin')
                            .map(item => (
                                <Tooltip key={item.id} content={item.name} position="bottom" delay={400}>
                                    <div
                                        onDoubleClick={() => navigateTo(item.id)}
                                        onContextMenu={e => handleContextMenu(e, item)}
                                        className="group flex flex-col items-center gap-2 p-2 rounded hover:bg-white/10 cursor-pointer transition-colors"
                                    >
                                        {item.type === 'shortcut' ? (
                                            <span
                                                className={`material-symbols-outlined text-5xl drop-shadow-lg ${item.colorClass || 'text-blue-400'}`}
                                            >
                                                {item.icon || 'link'}
                                            </span>
                                        ) : item.type === 'folder' ? (
                                            <span className="material-symbols-outlined text-5xl text-yellow-400 drop-shadow-lg">
                                                folder
                                            </span>
                                        ) : item.type === 'image' && item.src ? (
                                            <div
                                                className="w-16 h-12 bg-cover bg-center rounded border border-white/20"
                                                style={{ backgroundImage: `url(${item.src})` }}
                                            ></div>
                                        ) : item.type === 'link' ? (
                                            <span
                                                className={`material-symbols-outlined text-5xl drop-shadow-lg ${
                                                    item.linkType === 'image'
                                                        ? 'text-green-400'
                                                        : item.linkType === 'video'
                                                          ? 'text-red-400'
                                                          : item.linkType === 'audio'
                                                            ? 'text-purple-400'
                                                            : item.linkType === 'youtube'
                                                              ? 'text-red-500'
                                                              : 'text-cyan-400'
                                                }`}
                                            >
                                                {item.linkType === 'image'
                                                    ? 'image'
                                                    : item.linkType === 'video'
                                                      ? 'movie'
                                                      : item.linkType === 'audio'
                                                        ? 'music_note'
                                                        : item.linkType === 'youtube'
                                                          ? 'smart_display'
                                                          : 'link'}
                                            </span>
                                        ) : (
                                            <span
                                                className={`material-symbols-outlined text-5xl drop-shadow-lg
                                            ${
                                                item.type === 'document'
                                                    ? 'text-blue-400'
                                                    : item.type === 'audio'
                                                      ? 'text-purple-400'
                                                      : 'text-gray-400'
                                            }
                                        `}
                                            >
                                                {item.type === 'document'
                                                    ? 'description'
                                                    : item.type === 'audio'
                                                      ? 'music_note'
                                                      : 'draft'}
                                            </span>
                                        )}
                                        <span className="text-xs text-white/80 text-center font-medium line-clamp-2 w-full px-1 break-words">
                                            {item.name}
                                        </span>
                                    </div>
                                </Tooltip>
                            ))}
                        {(!currentFolder?.children || currentFolder.children.length === 0) && (
                            <div className="col-span-full text-center text-white/30 text-sm mt-10">Folder is empty</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <ContextMenu ref={menuRef} position={contextMenu.position} onClose={closeContextMenu} {...menuProps}>
                    {contextMenu.data ? (
                        <>
                            <ContextMenu.Item
                                icon="open_in_new"
                                onClick={() => {
                                    if (contextMenu.data) navigateTo(contextMenu.data.id);
                                    closeContextMenu();
                                }}
                            >
                                Open
                            </ContextMenu.Item>
                            <ContextMenu.Separator />
                            <ContextMenu.Item
                                icon="delete"
                                danger
                                onClick={() => contextMenu.data && deleteItem(contextMenu.data)}
                            >
                                Delete
                            </ContextMenu.Item>
                        </>
                    ) : (
                        <>
                            <ContextMenu.Item icon="content_paste" onClick={handlePaste}>
                                Paste
                            </ContextMenu.Item>
                            <ContextMenu.Separator />
                            <ContextMenu.Item
                                icon="create_new_folder"
                                onClick={() => {
                                    setShowNewFolderInput(true);
                                    closeContextMenu();
                                }}
                            >
                                New Folder
                            </ContextMenu.Item>
                            <ContextMenu.Item
                                icon="refresh"
                                onClick={() => {
                                    loadFiles();
                                    closeContextMenu();
                                }}
                            >
                                Refresh
                            </ContextMenu.Item>
                        </>
                    )}
                </ContextMenu>
            )}
        </div>
    );
};
