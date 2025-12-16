import React, { useState, useEffect, useCallback } from 'react';
import { AppContainer } from '../components/ui/AppContainer';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Tooltip } from '../components/ui/Tooltip';
import { GistService } from './GistService';
import { ContextMenu } from '../components/ContextMenu';
import { useContextMenu } from '../hooks/useContextMenu';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { InputDialog } from '../components/ui/InputDialog';
import { getFiles, saveFiles, subscribeToFileSystem, STORE_NAMES } from '../utils/fileSystem';
import { FileSystemItem } from '../types';
import { useOS } from '../context/OSContext';

const GIST_ROOT_ID = 'gist-root';

export const GistExplorer = () => {
    const [pat, setPat] = useLocalStorage<string>('github_pat', '');
    const [items, setItems] = useState<FileSystemItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentPath, setCurrentPath] = useState<string[]>([GIST_ROOT_ID]);

    // Dialog State
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    const [inputDialog, setInputDialog] = useState<{
        isOpen: boolean;
        title: string;
        description?: string;
        label?: string;
        defaultValue?: string;
        placeholder?: string;
        isTextArea?: boolean;
        onConfirm: (value: string) => void;
    }>({ isOpen: false, title: '', onConfirm: () => {} });

    const { openWindow } = useOS();
    const { menu, open, close, menuProps, menuRef } = useContextMenu<{ item?: FileSystemItem }>();

    const loadGistsFromCache = useCallback(async () => {
        const allFiles = await getFiles();
        // We look for our special root
        const gistRoot = allFiles.find(f => f.id === GIST_ROOT_ID);
        // Also need to find orphans if we failed to save root correctly,
        // but let's assume valid tree.
        // We only care about displaying what's currently "in" the current path.

        // Actually, we need to traverse from GIST_ROOT_ID based on currentPath
        // currentPath[0] is GIST_ROOT_ID.

        let currentFolder = gistRoot;
        for (let i = 1; i < currentPath.length; i++) {
            if (!currentFolder?.children) break;
            currentFolder = currentFolder.children.find(c => c.id === currentPath[i]);
        }

        setItems(currentFolder?.children || []);
    }, [currentPath]);

    const refreshGists = useCallback(async () => {
        setLoading(true);
        try {
            const service = GistService.getInstance();
            if (!service.isInitialized()) return;

            const gists = await service.fetchGists();

            // Create the disconnected tree
            const gistRoot: FileSystemItem = {
                id: GIST_ROOT_ID,
                name: 'Gist Root',
                type: 'folder',
                children: gists,
                // Ensure it's not deleted
                deletedAt: undefined,
            };

            // We need to save this to IDB without overwriting existing non-gist files.
            // getFiles() -> filter out old gist stuff -> add new gist root -> save.
            const allFiles = await getFiles();
            const nonGistFiles = allFiles.filter(f => !f.id.startsWith('gist'));

            // Note: If we use "disconnected tree" approach where children are nested in the object,
            // we just need to save the root object.
            // BUT, `saveFiles` (plural) expects a flat list of ALL files if we use `store.clear()` approach
            // inside `saveFiles`.
            // WAIT! `fileSystem.ts`: `saveFiles` DOES generic `store.clear()` then `store.put`.
            // So we MUST strictly preserve all other files.

            const newAllFiles = [...nonGistFiles, gistRoot];
            await saveFiles(newAllFiles);
        } catch (error) {
            console.error('Failed to fetch gists', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initialize/Update Service when PAT changes
    useEffect(() => {
        if (pat) {
            GistService.getInstance().initialize({ pat });
            // Refresh gists from GitHub immediately when PAT is available
            refreshGists();
        }
    }, [pat, refreshGists]);

    // Subscribe to file system changes for Syncing
    useEffect(() => {
        const handleFileSystemChange = async (changedId?: string) => {
            // Reload UI if it affects us
            if (!changedId || changedId.startsWith('gist') || changedId === GIST_ROOT_ID) {
                loadGistsFromCache();
            }

            // Sync Logic
            if (changedId && changedId.startsWith('gistfile::')) {
                try {
                    // changedId format: gistfile::GIST_ID::FILENAME
                    const parts = changedId.split('::');
                    if (parts.length >= 3) {
                        const gistId = parts[1];
                        const filename = parts.slice(2).join('::'); // Join back in case filename has :: (unlikely but safe)

                        // we need to get the NEW content from IDB
                        // We can't use existing 'items' state because it might be stale or not contain the updated file
                        const allFiles = await getFiles();

                        // helper to find file in tree
                        const findFile = (items: FileSystemItem[], id: string): FileSystemItem | null => {
                            for (const item of items) {
                                if (item.id === id) return item;
                                if (item.children) {
                                    const found = findFile(item.children, id);
                                    if (found) return found;
                                }
                            }
                            return null;
                        };

                        // changedId is guaranteed string due to check above
                        const updatedFile = findFile(allFiles, changedId!);

                        if (updatedFile && updatedFile.content) {
                            // Debounce or just fire?
                            // For a prototype, just fire.
                            const service = GistService.getInstance();
                            if (service.isInitialized()) {
                                // Maybe show a toast/notification?
                                // console.log('Syncing to GitHub...', filename);
                                await service.updateGistFile(gistId, filename, updatedFile.content);
                                // console.log('Synced to GitHub');
                            }
                        }
                    }
                } catch (e) {
                    console.error('Sync failed', e);
                }
            }
        };

        loadGistsFromCache();
        const unsubscribe = subscribeToFileSystem(STORE_NAMES.files, handleFileSystemChange);
        return unsubscribe;
    }, [loadGistsFromCache]);

    // refreshGists hoisted above

    const handleNavigate = (folderId: string) => {
        setCurrentPath(prev => [...prev, folderId]);
    };

    const handleNavigateUp = () => {
        if (currentPath.length > 1) {
            setCurrentPath(prev => prev.slice(0, -1));
        }
    };

    const handleOpen = async (item: FileSystemItem) => {
        if (item.type === 'folder') {
            handleNavigate(item.id);
        } else {
            // It's a file.
            // Check if we have content. Detailed content might be missing if it was just a list fetch.
            // Fetch detail if content is empty?
            let content = item.content;
            if (!content && item.id.startsWith('gistfile::')) {
                try {
                    // Parse ID to get Gist ID
                    // format: gistfile::GIST_ID::FILENAME
                    const parts = item.id.split('::');
                    if (parts.length >= 2) {
                        const gistId = parts[1];
                        if (gistId) {
                            const service = GistService.getInstance();
                            const details = await service.getGistDetail(gistId);
                            const targetFile = details.find(f => f.name === (item.name || ''));
                            if (targetFile && targetFile.content) {
                                content = targetFile.content;
                            }
                        }

                        // For now, just open it. If user saves, it will sync.
                    }
                } catch (e) {
                    console.error('Failed to fetch details', e);
                }
            }

            openWindow('notepad', {
                initialContent: content || '',
                initialFileId: item.id,
                initialFileName: item.name,
            });
        }
    };

    if (!pat) {
        return (
            <AppContainer className="flex items-center justify-center bg-[#202020]">
                <div className="bg-black/40 p-8 rounded-lg border border-white/10 w-96 backdrop-blur-md">
                    <h2 className="text-xl font-semibold mb-4 text-white">GitHub Gist Access</h2>
                    <p className="text-white/60 text-sm mb-6">
                        Enter your Personal Access Token (PAT) to view and manage your Gists. The token is stored
                        locally in your browser.
                    </p>
                    <input
                        type="password"
                        placeholder="ghp_..."
                        className="w-full bg-black/50 border border-white/20 rounded px-3 py-2 text-white mb-4 focus:border-blue-500 outline-none"
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                setPat(e.currentTarget.value);
                            }
                        }}
                    />
                    <button
                        onClick={e => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                            setPat(input.value);
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded transition-colors"
                    >
                        Connect
                    </button>
                    <p className="text-xs text-white/40 mt-4 text-center">Requires "gist" scope.</p>
                </div>
            </AppContainer>
        );
    }

    return (
        <AppContainer className="bg-[#202020] text-white">
            <div className="flex h-full flex-col">
                {/* Toolbar */}
                <div className="h-12 border-b border-white/10 flex items-center px-4 justify-between bg-white/5">
                    <div className="flex items-center gap-2">
                        <Tooltip content="Up">
                            <button
                                onClick={handleNavigateUp}
                                disabled={currentPath.length <= 1}
                                className="p-1 hover:bg-white/10 rounded text-white/70 disabled:opacity-30"
                            >
                                <span className="material-symbols-outlined">arrow_upward</span>
                            </button>
                        </Tooltip>
                        <div className="h-4 w-[1px] bg-white/10 mx-2" />
                        <span className="font-medium text-sm text-white/80">
                            {currentPath.length === 1 ? 'All Gists' : 'Gist Content'}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <Tooltip content="Refresh">
                            <button
                                onClick={refreshGists}
                                className={`p-1 hover:bg-white/10 rounded text-white/70 ${loading ? 'animate-spin' : ''}`}
                            >
                                <span className="material-symbols-outlined">refresh</span>
                            </button>
                        </Tooltip>
                        <Tooltip content="Sign Out">
                            <button onClick={() => setPat('')} className="p-1 hover:bg-white/10 rounded text-white/70">
                                <span className="material-symbols-outlined">logout</span>
                            </button>
                        </Tooltip>
                    </div>
                </div>

                {/* Content */}
                <div
                    className="flex-1 overflow-y-auto p-4"
                    onContextMenu={e => {
                        // Background context menu
                        // Only prevent default if we sort out logic, but useContextMenu does preventDefault in 'open'
                        // Here we open menu with no item data (undefined)
                        // But wait, if we click on an item, that bubbles up?
                        // useContextMenu `open` stops propagation. So if item handles it, this won't fire.
                        open(e, {});
                    }}
                >
                    {items.length === 0 && !loading ? (
                        <div className="flex flex-col items-center justify-center h-full text-white/30 gap-4">
                            <span className="material-symbols-outlined text-4xl">code_off</span>
                            <p>No gists found. Click refresh to sync.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-4">
                            {items.map(item => (
                                <div
                                    key={item.id}
                                    onDoubleClick={() => handleOpen(item)}
                                    onContextMenu={e => open(e, { item })}
                                    className="group flex flex-col items-center gap-2 p-2 rounded hover:bg-white/10 cursor-pointer transition-colors"
                                >
                                    <span
                                        className={`material-symbols-outlined text-4xl drop-shadow-lg ${item.type === 'folder' ? 'text-yellow-400' : 'text-blue-400'}`}
                                    >
                                        {item.type === 'folder' ? 'folder' : 'description'}
                                    </span>
                                    <span className="text-xs text-white/80 text-center font-medium line-clamp-2 w-full px-1 break-words">
                                        {item.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Status Bar */}
                <div className="h-6 border-t border-white/10 bg-black/20 px-2 flex items-center text-xs text-white/40">
                    <span>{items.length} items</span>
                </div>
            </div>
            {menu && (
                <ContextMenu ref={menuRef} position={menu.position} onClose={close} {...menuProps}>
                    {/* New Gist - Only at Root */}
                    {currentPath.length === 1 && (
                        <>
                            <ContextMenu.Item
                                icon="create_new_folder"
                                onClick={() => {
                                    close();
                                    setInputDialog({
                                        isOpen: true,
                                        title: 'New Gist',
                                        description: 'Create a new Gist (Folder)',
                                        label: 'Description / Name',
                                        placeholder: 'My Helpful Gist',
                                        onConfirm: description => {
                                            if (!description) return;

                                            // Chained input for filename
                                            setTimeout(() => {
                                                setInputDialog({
                                                    isOpen: true,
                                                    title: 'New Gist File',
                                                    description: 'Initial file for ' + description,
                                                    label: 'Filename',
                                                    defaultValue: 'README.md',
                                                    onConfirm: filename => {
                                                        if (!filename) return;

                                                        // Chained input for content
                                                        setTimeout(() => {
                                                            setInputDialog({
                                                                isOpen: true,
                                                                title: 'File Content',
                                                                label: 'Content',
                                                                isTextArea: true,
                                                                defaultValue: '# ' + description,
                                                                onConfirm: async content => {
                                                                    setInputDialog(prev => ({
                                                                        ...prev,
                                                                        isOpen: false,
                                                                    }));
                                                                    try {
                                                                        setLoading(true);
                                                                        await GistService.getInstance().createGist(
                                                                            description,
                                                                            filename,
                                                                            content
                                                                        );
                                                                        await refreshGists();
                                                                    } catch (e) {
                                                                        console.error('Failed to create gist', e);
                                                                        setConfirmDialog({
                                                                            isOpen: true,
                                                                            title: 'Error',
                                                                            message: 'Failed to create gist',
                                                                            onConfirm: () =>
                                                                                setConfirmDialog(prev => ({
                                                                                    ...prev,
                                                                                    isOpen: false,
                                                                                })),
                                                                        });
                                                                    } finally {
                                                                        setLoading(false);
                                                                    }
                                                                },
                                                            });
                                                        }, 50);
                                                    },
                                                });
                                            }, 50);
                                        },
                                    });
                                }}
                            >
                                New Gist
                            </ContextMenu.Item>
                        </>
                    )}

                    {/* Rename File - Only for files, inside a gist */}
                    {menu.data?.item && menu.data.item.type !== 'folder' && currentPath.length > 1 && (
                        <ContextMenu.Item
                            icon="edit"
                            onClick={() => {
                                close();
                                const item = menu!.data!.item!;
                                setInputDialog({
                                    isOpen: true,
                                    title: 'Rename File',
                                    label: 'New Filename',
                                    defaultValue: item.name,
                                    onConfirm: async newName => {
                                        setInputDialog(prev => ({ ...prev, isOpen: false }));
                                        if (newName && newName !== item.name) {
                                            try {
                                                setLoading(true);
                                                const parts = item.id.split('::');
                                                if (parts.length >= 3) {
                                                    const gistId = parts[1];
                                                    const oldFilename = parts.slice(2).join('::');
                                                    if (gistId && oldFilename) {
                                                        await GistService.getInstance().renameGistFile(
                                                            gistId,
                                                            oldFilename,
                                                            newName
                                                        );
                                                        await refreshGists();
                                                    }
                                                }
                                            } catch (e) {
                                                console.error('Failed to rename', e);
                                            } finally {
                                                setLoading(false);
                                            }
                                        }
                                    },
                                });
                            }}
                        >
                            Rename
                        </ContextMenu.Item>
                    )}

                    {/* Delete Gist (Folder) - Only at Root */}
                    {menu.data?.item && menu.data.item.type === 'folder' && currentPath.length === 1 && (
                        <ContextMenu.Item
                            icon="delete"
                            danger
                            onClick={() => {
                                close();
                                const item = menu!.data!.item!;
                                const gistId = item.id.split('::')[1]; // gistfolder::ID
                                setConfirmDialog({
                                    isOpen: true,
                                    title: 'Delete Gist',
                                    message: `Are you sure you want to delete "${item.name}"? This will delete all files within it.`,
                                    onConfirm: async () => {
                                        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                                        try {
                                            setLoading(true);
                                            // Check for undefined
                                            if (gistId) {
                                                await GistService.getInstance().deleteGist(gistId);
                                                await refreshGists();
                                            }
                                        } catch (e) {
                                            console.error('Failed to delete gist', e);
                                        } finally {
                                            setLoading(false);
                                        }
                                    },
                                });
                            }}
                        >
                            Delete Gist
                        </ContextMenu.Item>
                    )}

                    {/* Delete File - Only for files, inside a gist */}
                    {menu.data?.item && menu.data.item.type !== 'folder' && currentPath.length > 1 && (
                        <ContextMenu.Item
                            icon="delete"
                            danger
                            onClick={() => {
                                close();
                                const item = menu!.data!.item!;
                                setConfirmDialog({
                                    isOpen: true,
                                    title: 'Delete File',
                                    message: `Are you sure you want to delete ${item.name}? P.S. If this is the last file, the Gist will be deleted.`,
                                    onConfirm: async () => {
                                        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                                        try {
                                            setLoading(true);
                                            const parts = item.id.split('::');
                                            if (parts.length >= 3) {
                                                const gistId = parts[1];
                                                const filename = parts.slice(2).join('::');

                                                const isLastFile = items.filter(i => i.type !== 'folder').length <= 1;

                                                if (isLastFile) {
                                                    // Delete the whole gist
                                                    if (gistId) {
                                                        await GistService.getInstance().deleteGist(gistId);
                                                        handleNavigateUp();
                                                    }
                                                } else {
                                                    if (gistId && filename) {
                                                        await GistService.getInstance().deleteGistFile(
                                                            gistId,
                                                            filename
                                                        );
                                                    }
                                                }
                                                await refreshGists();
                                            }
                                        } catch (e) {
                                            console.error('Failed to delete file', e);
                                        } finally {
                                            setLoading(false);
                                        }
                                    },
                                });
                            }}
                        >
                            Delete File
                        </ContextMenu.Item>
                    )}
                    {/* New File - Only inside a gist */}
                    {currentPath.length > 1 && (
                        <ContextMenu.Item
                            icon="note_add"
                            onClick={() => {
                                close();
                                setInputDialog({
                                    isOpen: true,
                                    title: 'New File',
                                    label: 'Filename',
                                    onConfirm: async filename => {
                                        setInputDialog(prev => ({ ...prev, isOpen: false }));
                                        if (filename) {
                                            try {
                                                setLoading(true);
                                                const gistId = currentPath[currentPath.length - 1];
                                                if (gistId) {
                                                    await GistService.getInstance().createGistFile(
                                                        gistId,
                                                        filename,
                                                        'New file'
                                                    );
                                                    await refreshGists();
                                                }
                                            } catch (e) {
                                                console.error('Failed to create file', e);
                                            } finally {
                                                setLoading(false);
                                            }
                                        }
                                    },
                                });
                            }}
                        >
                            New File
                        </ContextMenu.Item>
                    )}
                </ContextMenu>
            )}

            <ConfirmDialog
                open={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                onConfirm={confirmDialog.onConfirm}
                onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
            />

            <InputDialog
                isOpen={inputDialog.isOpen}
                title={inputDialog.title}
                description={inputDialog.description}
                label={inputDialog.label}
                defaultValue={inputDialog.defaultValue}
                placeholder={inputDialog.placeholder}
                isTextArea={inputDialog.isTextArea}
                onConfirm={inputDialog.onConfirm}
                onCancel={() => setInputDialog(prev => ({ ...prev, isOpen: false }))}
            />
        </AppContainer>
    );
};
