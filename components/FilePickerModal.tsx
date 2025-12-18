import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { getFiles, saveFileToFolder } from '../utils/fileSystem';
import { generateUuid } from '../utils/uuid';
import type { FileSystemItem } from '../types';
import type {
    FilePickerState,
    FilePickerFile,
    FilePickerOpenOptions,
    FilePickerSaveOptions,
} from '../hooks/useFilePicker';
import { getFileExtension } from '../apps/registry';
import { TextInput, Button } from './ui';

interface FilePickerModalProps {
    state: FilePickerState;
    onNavigateTo: (path: string[]) => void;
    onSelectFile: (file: FilePickerFile) => void;
    onSetFileName: (name: string) => void;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * FilePickerModal - Modal dialog for open/save file operations
 *
 * Uses createPortal to render at document body level to avoid z-index issues.
 */
export const FilePickerModal: React.FC<FilePickerModalProps> = ({
    state,
    onNavigateTo,
    onSelectFile,
    onSetFileName,
    onConfirm,
    onCancel,
}) => {
    const [files, setFiles] = useState<FileSystemItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Load files on mount
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const data = await getFiles();
                setFiles(data);
            } finally {
                setLoading(false);
            }
        };
        void loadData();
    }, []);

    // Get current folder based on path
    const currentFolder = useMemo((): FileSystemItem | null => {
        if (files.length === 0) return null;

        let folder: FileSystemItem | undefined = files.find(f => f.id === 'root') ?? files[0];
        if (!folder) return null;

        for (let i = 1; i < state.currentPath.length; i++) {
            if (!folder) break;
            const next: FileSystemItem | undefined = folder.children?.find(c => c.id === state.currentPath[i]);
            if (next) {
                folder = next;
            } else {
                break;
            }
        }

        return folder ?? null;
    }, [files, state.currentPath]);

    // Get filtered children based on mode and extensions
    const filteredItems = useMemo(() => {
        if (!currentFolder?.children) return [];

        const items = currentFolder.children.filter(item => item.id !== 'recycleBin');

        // For open mode with extension filter
        if (state.mode === 'open' && state.options) {
            const opts = state.options as FilePickerOpenOptions;
            if (opts.extensions && opts.extensions.length > 0) {
                return items.filter(item => {
                    if (item.type === 'folder') return true;
                    const ext = getFileExtension(item.name);
                    return opts.extensions!.includes(ext);
                });
            }
        }

        return items;
    }, [currentFolder, state.mode, state.options]);

    // Navigate up
    const navigateUp = () => {
        if (state.currentPath.length > 1) {
            onNavigateTo(state.currentPath.slice(0, -1));
        }
    };

    // Handle double click on item
    const handleDoubleClick = (item: FileSystemItem) => {
        if (item.type === 'folder') {
            onNavigateTo([...state.currentPath, item.id]);
        } else if (state.mode === 'open') {
            onSelectFile({
                id: item.id,
                name: item.name,
                content: item.content,
                path: state.currentPath,
            });
            onConfirm();
        }
    };

    // Handle single click on item
    const handleClick = (item: FileSystemItem) => {
        if (item.type !== 'folder') {
            onSelectFile({
                id: item.id,
                name: item.name,
                content: item.content,
                path: state.currentPath,
            });
            if (state.mode === 'save') {
                onSetFileName(item.name);
            }
        }
    };

    // Handle save with creating/updating file
    const handleSave = async () => {
        if (!state.fileName.trim()) return;

        const opts = state.options as FilePickerSaveOptions;
        const content = opts?.content ?? '';
        const fileName = state.fileName.trim();

        // Check if file already exists
        const existingFile = currentFolder?.children?.find(c => c.name.toLowerCase() === fileName.toLowerCase());

        if (existingFile) {
            // Update existing file - would need saveFiles implementation
            // For now, just confirm with existing file
            onSelectFile({
                id: existingFile.id,
                name: existingFile.name,
                content,
                path: state.currentPath,
            });
        } else {
            // Create new file
            const newFile: FileSystemItem = {
                id: generateUuid(),
                name: fileName,
                type: 'document',
                content,
                size: `${content.length} chars`,
                date: new Date().toISOString(),
            };

            // Get parent folder ID
            const parentId = state.currentPath[state.currentPath.length - 1];
            await saveFileToFolder(newFile, parentId ?? 'root');

            onSelectFile({
                id: newFile.id,
                name: newFile.name,
                content,
                path: state.currentPath,
            });
        }

        onConfirm();
    };

    // Get breadcrumb path
    const breadcrumbs = useMemo(() => {
        const crumbs: { id: string; name: string; path: string[] }[] = [];
        let folder: FileSystemItem | undefined = files.find(f => f.id === 'root');

        for (let i = 0; i < state.currentPath.length; i++) {
            const pathId = state.currentPath[i];
            if (i === 0) {
                crumbs.push({ id: 'root', name: 'C:', path: ['root'] });
            } else if (folder?.children) {
                const next = folder.children.find(c => c.id === pathId);
                if (next) {
                    crumbs.push({ id: next.id, name: next.name, path: state.currentPath.slice(0, i + 1) });
                    folder = next;
                }
            }
        }

        return crumbs;
    }, [files, state.currentPath]);

    const title =
        state.mode === 'open'
            ? ((state.options as FilePickerOpenOptions)?.title ?? 'Open')
            : ((state.options as FilePickerSaveOptions)?.title ?? 'Save As');

    if (!state.isOpen) return null;

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />

            {/* Modal */}
            <div className="relative w-full max-w-2xl glass-panel rounded-xl overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="h-12 px-4 flex items-center justify-between border-b border-white/10 bg-black/30">
                    <div className="text-sm font-medium text-white/90">{title}</div>
                    <button
                        onClick={onCancel}
                        className="w-8 h-8 rounded-lg hover:bg-white/10 text-white/70 flex items-center justify-center"
                        title="Close"
                    >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>

                {/* Breadcrumbs */}
                <div className="h-10 px-4 flex items-center gap-1 border-b border-white/5 bg-black/20 overflow-x-auto">
                    {breadcrumbs.map((crumb, idx) => (
                        <React.Fragment key={crumb.id}>
                            {idx > 0 && <span className="text-white/30 text-sm">/</span>}
                            <button
                                onClick={() => onNavigateTo(crumb.path)}
                                className="px-2 py-1 rounded text-xs text-white/70 hover:text-white hover:bg-white/10"
                            >
                                {crumb.name}
                            </button>
                        </React.Fragment>
                    ))}
                </div>

                {/* File list */}
                <div className="h-72 overflow-y-auto p-3 bg-black/10">
                    {loading ? (
                        <div className="h-full flex items-center justify-center text-white/50 text-sm">Loading...</div>
                    ) : filteredItems.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-white/50 text-sm">
                            {state.mode === 'open' ? 'No matching files' : 'Empty folder'}
                        </div>
                    ) : (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-2">
                            {/* Up button if not at root */}
                            {state.currentPath.length > 1 && (
                                <button
                                    onClick={navigateUp}
                                    className="flex flex-col items-center gap-1 p-2 rounded hover:bg-white/10"
                                >
                                    <span className="material-symbols-outlined text-3xl text-white/40">
                                        arrow_upward
                                    </span>
                                    <span className="text-[10px] text-white/60">..</span>
                                </button>
                            )}

                            {filteredItems.map(item => {
                                const isSelected = state.selectedFile?.id === item.id;

                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => handleClick(item)}
                                        onDoubleClick={() => handleDoubleClick(item)}
                                        className={`flex flex-col items-center gap-1 p-2 rounded transition-colors ${
                                            isSelected ? 'bg-primary/30 ring-1 ring-primary' : 'hover:bg-white/10'
                                        }`}
                                    >
                                        <span
                                            className={`material-symbols-outlined text-3xl ${
                                                item.type === 'folder'
                                                    ? 'text-yellow-400'
                                                    : item.type === 'document'
                                                      ? 'text-blue-400'
                                                      : item.type === 'image'
                                                        ? 'text-green-400'
                                                        : 'text-gray-400'
                                            }`}
                                        >
                                            {item.type === 'folder' ? 'folder' : 'description'}
                                        </span>
                                        <span className="text-[10px] text-white/80 text-center line-clamp-2 w-full break-words">
                                            {item.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 flex items-center gap-3 border-t border-white/10 bg-black/30">
                    {state.mode === 'save' && (
                        <TextInput
                            value={state.fileName}
                            onChange={e => onSetFileName(e.target.value)}
                            placeholder="Enter filename..."
                            className="flex-1"
                            size="sm"
                        />
                    )}
                    {state.mode === 'open' && (
                        <div className="flex-1 text-xs text-white/50 truncate">
                            {state.selectedFile ? state.selectedFile.name : 'Select a file'}
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={onCancel}>
                            Cancel
                        </Button>
                        {state.mode === 'open' ? (
                            <Button variant="primary" size="sm" onClick={onConfirm} disabled={!state.selectedFile}>
                                Open
                            </Button>
                        ) : (
                            <Button variant="primary" size="sm" onClick={handleSave} disabled={!state.fileName.trim()}>
                                Save
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};
