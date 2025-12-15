import React, { useState, useEffect, useCallback } from 'react';
import {
    getRecycleBinContents,
    restoreFromRecycleBin,
    permanentlyDelete,
    emptyRecycleBin,
    subscribeToFileSystem,
    STORE_NAMES,
} from '../utils/fileSystem';
import { FileSystemItem } from '../types';
import { ContextMenu } from '../components/ContextMenu';
import { useContextMenu, useNotification } from '../hooks';
import { useConfirmDialog, ConfirmDialog } from '../components/ui/ConfirmDialog';

export const RecycleBin = () => {
    const [items, setItems] = useState<FileSystemItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<FileSystemItem | null>(null);
    const notify = useNotification();

    const {
        menu: contextMenu,
        open: openContextMenu,
        close: closeContextMenu,
        menuProps,
        menuRef,
    } = useContextMenu<FileSystemItem>();

    const { confirm, dialogProps } = useConfirmDialog();

    const loadItems = useCallback(async () => {
        try {
            const contents = await getRecycleBinContents();
            setItems(contents);
        } catch (error) {
            console.error('Failed to load recycle bin:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadItems();
        const unsubscribe = subscribeToFileSystem(STORE_NAMES.files, () => {
            loadItems();
        });
        return unsubscribe;
    }, [loadItems]);

    const handleRestore = async (item: FileSystemItem) => {
        await restoreFromRecycleBin(item.id);
        setSelectedItem(null);
        closeContextMenu();
        notify.success(`Restored "${item.name}"`);
    };

    const handlePermanentDelete = async (item: FileSystemItem) => {
        const confirmed = await confirm({
            title: 'Permanently Delete',
            message: `Are you sure you want to permanently delete "${item.name}"? This cannot be undone.`,
            variant: 'danger',
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel',
        });
        if (!confirmed) return;

        await permanentlyDelete(item.id);
        setSelectedItem(null);
        closeContextMenu();
        notify.success(`Permanently deleted "${item.name}"`);
    };

    const handleEmptyRecycleBin = async () => {
        if (items.length === 0) return;

        const confirmed = await confirm({
            title: 'Empty Recycle Bin',
            message: 'Are you sure you want to permanently delete all items in the Recycle Bin? This cannot be undone.',
            variant: 'danger',
            confirmLabel: 'Empty Recycle Bin',
            cancelLabel: 'Cancel',
        });
        if (!confirmed) return;

        await emptyRecycleBin();
        notify.success('Recycle Bin emptied');
    };

    const handleContextMenu = (e: React.MouseEvent, item?: FileSystemItem) => {
        if (item) {
            openContextMenu(e, item);
            setSelectedItem(item);
        }
    };

    const formatDeletedDate = (dateString?: string) => {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getItemIcon = (item: FileSystemItem) => {
        if (item.type === 'folder') return 'folder';
        if (item.type === 'image') return 'image';
        if (item.type === 'audio') return 'music_note';
        if (item.type === 'video') return 'movie';
        return 'description';
    };

    const getItemIconColor = (item: FileSystemItem) => {
        if (item.type === 'folder') return 'text-yellow-400';
        if (item.type === 'image') return 'text-pink-400';
        if (item.type === 'audio') return 'text-purple-400';
        if (item.type === 'video') return 'text-red-400';
        return 'text-blue-400';
    };

    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-transparent">
                <div className="text-white/60 flex items-center gap-2">
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    Loading...
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full w-full flex-col bg-transparent" onContextMenu={e => handleContextMenu(e)}>
            {/* Toolbar */}
            <div className="h-12 border-b border-white/5 flex items-center px-4 gap-4">
                <div className="flex items-center gap-2 text-white/70">
                    <span className="material-symbols-outlined text-gray-400">delete</span>
                    <span className="text-sm font-medium">Recycle Bin</span>
                    <span className="text-xs text-white/40">({items.length} items)</span>
                </div>
                <div className="flex-1" />
                <button
                    onClick={handleEmptyRecycleBin}
                    disabled={items.length === 0}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/20 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <span className="material-symbols-outlined text-lg">delete_forever</span>
                    Empty Recycle Bin
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-white/30">
                        <span className="material-symbols-outlined text-6xl mb-4">delete_outline</span>
                        <p>Recycle Bin is empty</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-4">
                        {items.map(item => (
                            <div
                                key={item.id}
                                onClick={() => setSelectedItem(item)}
                                onDoubleClick={() => handleRestore(item)}
                                onContextMenu={e => handleContextMenu(e, item)}
                                className={`group flex flex-col items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                                    selectedItem?.id === item.id
                                        ? 'bg-blue-500/30 ring-1 ring-blue-400'
                                        : 'hover:bg-white/10'
                                }`}
                            >
                                <span
                                    className={`material-symbols-outlined text-5xl drop-shadow-lg ${getItemIconColor(item)}`}
                                >
                                    {getItemIcon(item)}
                                </span>
                                <span className="text-xs text-white/80 text-center font-medium truncate w-full px-1">
                                    {item.name}
                                </span>
                                <span className="text-[10px] text-white/40 text-center">
                                    {formatDeletedDate(item.deletedAt)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Selected Item Info Bar */}
            {selectedItem && (
                <div className="h-12 border-t border-white/5 flex items-center px-4 gap-4 bg-black/20">
                    <span className={`material-symbols-outlined ${getItemIconColor(selectedItem)}`}>
                        {getItemIcon(selectedItem)}
                    </span>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/80 truncate">{selectedItem.name}</p>
                        <p className="text-xs text-white/40">Deleted: {formatDeletedDate(selectedItem.deletedAt)}</p>
                    </div>
                    <button
                        onClick={() => handleRestore(selectedItem)}
                        className="flex items-center gap-1 px-3 py-1 text-sm text-green-400 hover:bg-green-500/20 rounded transition-colors"
                    >
                        <span className="material-symbols-outlined text-lg">restore</span>
                        Restore
                    </button>
                    <button
                        onClick={() => handlePermanentDelete(selectedItem)}
                        className="flex items-center gap-1 px-3 py-1 text-sm text-red-400 hover:bg-red-500/20 rounded transition-colors"
                    >
                        <span className="material-symbols-outlined text-lg">delete_forever</span>
                        Delete
                    </button>
                </div>
            )}

            {/* Context Menu */}
            {contextMenu && contextMenu.data && (
                <ContextMenu ref={menuRef} position={contextMenu.position} onClose={closeContextMenu} {...menuProps}>
                    <ContextMenu.Item
                        icon="restore"
                        onClick={() => contextMenu.data && handleRestore(contextMenu.data)}
                    >
                        Restore
                    </ContextMenu.Item>
                    <ContextMenu.Separator />
                    <ContextMenu.Item
                        icon="delete_forever"
                        danger
                        onClick={() => contextMenu.data && handlePermanentDelete(contextMenu.data)}
                    >
                        Delete Permanently
                    </ContextMenu.Item>
                </ContextMenu>
            )}

            {/* Confirm Dialog */}
            <ConfirmDialog {...dialogProps} />
        </div>
    );
};
