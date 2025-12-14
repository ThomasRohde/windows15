import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getFiles, saveFiles, subscribeToFileSystem, STORE_NAMES, moveToRecycleBin } from '../utils/fileSystem';
import { FileSystemItem } from '../types';
import { useOS } from '../context/OSContext';
import { SkeletonFileSidebar, SkeletonFileGrid } from './LoadingSkeleton';

export const FileExplorer = () => {
    const [currentPath, setCurrentPath] = useState<string[]>(['root']);
    const [currentFolder, setCurrentFolder] = useState<FileSystemItem | null>(null);
    const [files, setFiles] = useState<FileSystemItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item?: FileSystemItem } | null>(null);
    const [newFolderName, setNewFolderName] = useState('');
    const [showNewFolderInput, setShowNewFolderInput] = useState(false);
    const { openWindow } = useOS();

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

    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

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

        if (target.type === 'document' && target.name.endsWith('.txt')) {
            openWindow('notepad', { initialContent: target.content });
        } else if (target.type === 'image') {
            window.open(target.src, '_blank');
        }
    };

    const handleContextMenu = (e: React.MouseEvent, item?: FileSystemItem) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, item });
    };

    const addChildToFolder = (
        items: FileSystemItem[],
        parentPath: string[],
        newItem: FileSystemItem
    ): FileSystemItem[] => {
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
        setContextMenu(null);
    };

    const QuickAccessItem = ({
        icon,
        color,
        label,
        path,
    }: {
        icon: string;
        color: string;
        label: string;
        path?: string;
    }) => (
        <button
            type="button"
            onClick={() => {
                if (path) {
                    setCurrentPath(['root', path]);
                } else {
                    setCurrentPath(['root']);
                }
            }}
            onPointerDown={e => e.stopPropagation()}
            className="flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors text-white/60 hover:text-white hover:bg-white/5 w-full text-left cursor-pointer"
        >
            <span className={`material-symbols-outlined text-[20px] ${color}`}>{icon}</span>
            {label}
        </button>
    );

    if (loading) {
        return (
            <div className="flex h-full w-full bg-transparent">
                {/* Skeleton Sidebar */}
                <div className="w-48 hidden md:flex flex-col border-r border-white/5 bg-black/10">
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
            <div className="w-48 hidden md:flex flex-col gap-1 p-3 border-r border-white/5 bg-black/10 relative z-10">
                <div className="text-xs font-bold text-white/40 uppercase px-3 py-2">Favorites</div>
                <QuickAccessItem icon="home" color="text-blue-400" label="Home" />
                <QuickAccessItem icon="star" color="text-yellow-400" label="Desktop" path="desktop" />
                <QuickAccessItem icon="image" color="text-pink-400" label="Pictures" path="pictures" />
                <QuickAccessItem icon="description" color="text-orange-400" label="Documents" path="documents" />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Toolbar */}
                <div className="h-12 border-b border-white/5 flex items-center px-4 gap-4">
                    <div className="flex gap-2 text-white/50">
                        <button
                            onClick={navigateUp}
                            disabled={currentPath.length <= 1}
                            className="hover:text-white disabled:opacity-30"
                        >
                            <span className="material-symbols-outlined">arrow_upward</span>
                        </button>
                    </div>
                    {/* Breadcrumbs */}
                    <div className="flex-1 flex items-center bg-black/20 rounded px-3 h-8 text-sm text-white/70">
                        {currentPath.map((p, i) => (
                            <React.Fragment key={i}>
                                <span className="hover:bg-white/10 px-1 rounded cursor-pointer">
                                    {p === 'root'
                                        ? 'This PC'
                                        : p === 'desktop'
                                          ? 'Desktop'
                                          : p.charAt(0).toUpperCase() + p.slice(1)}
                                </span>
                                {i < currentPath.length - 1 && (
                                    <span className="material-symbols-outlined text-xs mx-1">chevron_right</span>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                    <button
                        onClick={() => setShowNewFolderInput(true)}
                        className="flex items-center gap-1 px-2 py-1 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors"
                        title="New Folder"
                    >
                        <span className="material-symbols-outlined text-lg">create_new_folder</span>
                    </button>
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
                                <div
                                    key={item.id}
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
                                    <span className="text-xs text-white/80 text-center font-medium truncate w-full px-1">
                                        {item.name}
                                    </span>
                                </div>
                            ))}
                        {(!currentFolder?.children || currentFolder.children.length === 0) && (
                            <div className="col-span-full text-center text-white/30 text-sm mt-10">Folder is empty</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Context Menu - rendered via portal to escape overflow:hidden */}
            {contextMenu &&
                createPortal(
                    <div
                        className="fixed bg-gray-900/95 backdrop-blur border border-white/10 rounded-lg shadow-xl py-1 min-w-[160px] z-[9999]"
                        style={{ left: contextMenu.x, top: contextMenu.y }}
                        onClick={e => e.stopPropagation()}
                    >
                        {contextMenu.item ? (
                            <>
                                <button
                                    onClick={() => {
                                        if (contextMenu.item) navigateTo(contextMenu.item.id);
                                        setContextMenu(null);
                                    }}
                                    className="w-full px-4 py-2 text-sm text-white/80 hover:bg-white/10 flex items-center gap-2 text-left"
                                >
                                    <span className="material-symbols-outlined text-lg">open_in_new</span>
                                    Open
                                </button>
                                <div className="border-t border-white/10 my-1"></div>
                                <button
                                    onClick={() => contextMenu.item && deleteItem(contextMenu.item)}
                                    className="w-full px-4 py-2 text-sm text-red-400 hover:bg-white/10 flex items-center gap-2 text-left"
                                >
                                    <span className="material-symbols-outlined text-lg">delete</span>
                                    Delete
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => {
                                        setShowNewFolderInput(true);
                                        setContextMenu(null);
                                    }}
                                    className="w-full px-4 py-2 text-sm text-white/80 hover:bg-white/10 flex items-center gap-2 text-left"
                                >
                                    <span className="material-symbols-outlined text-lg">create_new_folder</span>
                                    New Folder
                                </button>
                                <button
                                    onClick={() => {
                                        loadFiles();
                                        setContextMenu(null);
                                    }}
                                    className="w-full px-4 py-2 text-sm text-white/80 hover:bg-white/10 flex items-center gap-2 text-left"
                                >
                                    <span className="material-symbols-outlined text-lg">refresh</span>
                                    Refresh
                                </button>
                            </>
                        )}
                    </div>,
                    document.body
                )}
        </div>
    );
};
