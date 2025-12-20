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
import { AUDIO_EXTENSIONS, IMAGE_EXTENSIONS, VIDEO_EXTENSIONS } from '../utils/clipboardAnalyzer';
import { TextInput, Button } from './ui';
import { usePhoneMode } from '../hooks';

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
    const isPhone = usePhoneMode();

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

    const getSaveType = (fileName: string) => {
        const ext = getFileExtension(fileName);
        if (IMAGE_EXTENSIONS.includes(ext)) return { type: 'image' as const, usesSrc: true };
        if (AUDIO_EXTENSIONS.includes(ext)) return { type: 'audio' as const, usesSrc: true };
        if (VIDEO_EXTENSIONS.includes(ext)) return { type: 'video' as const, usesSrc: true };
        return { type: 'document' as const, usesSrc: false };
    };

    const buildSavedFile = (base: FileSystemItem | null, fileName: string, content: string): FileSystemItem => {
        const { type, usesSrc } = getSaveType(fileName);
        const next: FileSystemItem = {
            ...(base ?? { id: generateUuid() }),
            name: fileName,
            type,
            date: new Date().toISOString(),
        };

        if (usesSrc) {
            next.src = content;
            delete next.content;
            delete next.size;
        } else {
            next.content = content;
            next.size = `${content.length} chars`;
            delete next.src;
        }

        return next;
    };

    // Handle save with creating/updating file
    const handleSave = async () => {
        if (!state.fileName.trim()) return;

        const opts = state.options as FilePickerSaveOptions;
        const content = opts?.content ?? '';
        const fileName = state.fileName.trim();

        // Check if file already exists
        const existingFile = currentFolder?.children?.find(c => c.name.toLowerCase() === fileName.toLowerCase());
        if (existingFile && existingFile.type === 'folder') return;

        const savedFile = buildSavedFile(existingFile ?? null, fileName, content);
        const parentId = state.currentPath[state.currentPath.length - 1] ?? 'root';

        try {
            await saveFileToFolder(savedFile, parentId);
        } catch (error) {
            console.error('Failed to save file:', error);
            return;
        }

        onSelectFile({
            id: savedFile.id,
            name: savedFile.name,
            content,
            path: state.currentPath,
        });

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
        <div className={`fixed inset-0 z-[9999] ${isPhone ? '' : 'flex items-center justify-center p-4'}`}>
            {/* Backdrop */}
            <div className={`absolute inset-0 bg-black/60 ${isPhone ? '' : 'backdrop-blur-sm'}`} onClick={onCancel} />

            {/* Modal - F245: Full screen on phone */}
            <div
                className={`relative ${isPhone ? 'h-full w-full flex flex-col' : 'w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl'} glass-panel`}
            >
                {/* Header */}
                <div
                    className={`${isPhone ? 'h-14 px-4' : 'h-12 px-4'} flex items-center justify-between border-b border-white/10 bg-black/30 shrink-0`}
                >
                    <div className={`${isPhone ? 'text-base' : 'text-sm'} font-medium text-white/90`}>{title}</div>
                    <button
                        onClick={onCancel}
                        className={`${isPhone ? 'w-11 h-11' : 'w-8 h-8'} rounded-lg hover:bg-white/10 text-white/70 flex items-center justify-center`}
                        title="Close"
                    >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>

                {/* Breadcrumbs */}
                <div
                    className={`${isPhone ? 'h-12 px-3' : 'h-10 px-4'} flex items-center gap-1 border-b border-white/5 bg-black/20 overflow-x-auto shrink-0`}
                >
                    {breadcrumbs.map((crumb, idx) => (
                        <React.Fragment key={crumb.id}>
                            {idx > 0 && <span className="text-white/30 text-sm">/</span>}
                            <button
                                onClick={() => onNavigateTo(crumb.path)}
                                className={`${isPhone ? 'px-3 py-2 min-h-[44px] text-sm' : 'px-2 py-1 text-xs'} rounded text-white/70 hover:text-white hover:bg-white/10 flex items-center`}
                            >
                                {crumb.name}
                            </button>
                        </React.Fragment>
                    ))}
                </div>

                {/* File list - F245: Fills remaining space on phone */}
                <div className={`${isPhone ? 'flex-1' : 'h-72'} overflow-y-auto p-3 bg-black/10`}>
                    {loading ? (
                        <div className="h-full flex items-center justify-center text-white/50 text-sm">Loading...</div>
                    ) : filteredItems.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-white/50 text-sm">
                            {state.mode === 'open' ? 'No matching files' : 'Empty folder'}
                        </div>
                    ) : (
                        <div
                            className={`grid ${isPhone ? 'grid-cols-3 gap-3' : 'grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-2'}`}
                        >
                            {/* Up button if not at root */}
                            {state.currentPath.length > 1 && (
                                <button
                                    onClick={navigateUp}
                                    className={`flex flex-col items-center gap-1 ${isPhone ? 'p-3 min-h-[80px]' : 'p-2'} rounded hover:bg-white/10`}
                                >
                                    <span
                                        className={`material-symbols-outlined ${isPhone ? 'text-4xl' : 'text-3xl'} text-white/40`}
                                    >
                                        arrow_upward
                                    </span>
                                    <span className={`${isPhone ? 'text-xs' : 'text-[10px]'} text-white/60`}>..</span>
                                </button>
                            )}

                            {filteredItems.map(item => {
                                const isSelected = state.selectedFile?.id === item.id;

                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => handleClick(item)}
                                        onDoubleClick={() => handleDoubleClick(item)}
                                        className={`flex flex-col items-center gap-1 ${isPhone ? 'p-3 min-h-[80px]' : 'p-2'} rounded transition-colors ${
                                            isSelected ? 'bg-primary/30 ring-1 ring-primary' : 'hover:bg-white/10'
                                        }`}
                                    >
                                        <span
                                            className={`material-symbols-outlined ${isPhone ? 'text-4xl' : 'text-3xl'} ${
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
                                        <span
                                            className={`${isPhone ? 'text-xs' : 'text-[10px]'} text-white/80 text-center line-clamp-2 w-full break-words`}
                                        >
                                            {item.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer - F245: Fixed at bottom with safe area padding on phone */}
                <div
                    className={`${isPhone ? 'px-4 py-4 pb-safe' : 'px-4 py-3'} flex ${isPhone ? 'flex-col gap-3' : 'items-center gap-3'} border-t border-white/10 bg-black/30 shrink-0`}
                >
                    {state.mode === 'save' && (
                        <TextInput
                            value={state.fileName}
                            onChange={e => onSetFileName(e.target.value)}
                            placeholder="Enter filename..."
                            className="flex-1"
                            size={isPhone ? 'md' : 'sm'}
                        />
                    )}
                    {state.mode === 'open' && (
                        <div className={`flex-1 ${isPhone ? 'text-sm' : 'text-xs'} text-white/50 truncate`}>
                            {state.selectedFile ? state.selectedFile.name : 'Select a file'}
                        </div>
                    )}
                    <div className={`flex items-center gap-2 ${isPhone ? 'w-full' : ''}`}>
                        <Button
                            variant="secondary"
                            size={isPhone ? 'md' : 'sm'}
                            onClick={onCancel}
                            className={isPhone ? 'flex-1' : ''}
                        >
                            Cancel
                        </Button>
                        {state.mode === 'open' ? (
                            <Button
                                variant="primary"
                                size={isPhone ? 'md' : 'sm'}
                                onClick={onConfirm}
                                disabled={!state.selectedFile}
                                className={isPhone ? 'flex-1' : ''}
                            >
                                Open
                            </Button>
                        ) : (
                            <Button
                                variant="primary"
                                size={isPhone ? 'md' : 'sm'}
                                onClick={handleSave}
                                disabled={!state.fileName.trim()}
                                className={isPhone ? 'flex-1' : ''}
                            >
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
