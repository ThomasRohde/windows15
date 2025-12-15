import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { getFiles, saveFileToFolder } from '../../utils/fileSystem';
import { FileSystemItem } from '../../types';
import { useConfirmDialog, ConfirmDialog } from '../../components/ui/ConfirmDialog';

interface FilesPanelProps {
    initialContent?: string;
    initialFileId?: string;
    initialFileName?: string;
}

const flattenTextFiles = (items: FileSystemItem[], result: FileSystemItem[] = []): FileSystemItem[] => {
    for (const item of items) {
        if (item.type === 'document' || item.type === 'code') {
            result.push(item);
        }
        if (item.children) {
            flattenTextFiles(item.children, result);
        }
    }
    return result;
};

/**
 * FilesPanel - Traditional file-based text editor with menu bar
 */
export const FilesPanel: React.FC<FilesPanelProps> = ({
    initialContent = '',
    initialFileId,
    initialFileName = 'Untitled',
}) => {
    const [content, setContent] = useState(initialContent);
    const [cursorIndex, setCursorIndex] = useState(0);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [currentFileId, setCurrentFileId] = useState<string | null>(initialFileId || null);
    const [currentFileName, setCurrentFileName] = useState<string>(initialFileName);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showOpenDialog, setShowOpenDialog] = useState(false);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [saveFileName, setSaveFileName] = useState('');
    const [files, setFiles] = useState<FileSystemItem[]>([]);
    const menuRef = useRef<HTMLDivElement>(null);

    const { confirm, dialogProps } = useConfirmDialog();

    // Reset state when props change
    useEffect(() => {
        setContent(initialContent);
        setCursorIndex(0);
        setHasUnsavedChanges(false);
        setCurrentFileId(initialFileId ?? null);
        setCurrentFileName(initialFileName);
    }, [initialContent, initialFileId, initialFileName]);

    // Close menu on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setActiveMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadFiles = useCallback(async () => {
        const allFiles = await getFiles();
        const textFiles = flattenTextFiles(allFiles);
        setFiles(textFiles);
    }, []);

    const cursorInfo = useMemo(() => {
        const safeCursorIndex = Math.max(0, Math.min(cursorIndex, content.length));
        const textBeforeCursor = content.slice(0, safeCursorIndex);
        const line = textBeforeCursor.split('\n').length;
        const lastNewlineIndex = textBeforeCursor.lastIndexOf('\n');
        const column = safeCursorIndex - lastNewlineIndex;
        return { line, column };
    }, [content, cursorIndex]);

    const handleNew = async () => {
        if (hasUnsavedChanges) {
            const confirmed = await confirm({
                title: 'Unsaved Changes',
                message: 'You have unsaved changes. Create a new file anyway?',
                variant: 'warning',
                confirmLabel: 'Continue',
                cancelLabel: 'Cancel',
            });
            if (!confirmed) return;
        }
        setContent('');
        setCurrentFileId(null);
        setCurrentFileName('Untitled');
        setHasUnsavedChanges(false);
        setActiveMenu(null);
    };

    const handleOpen = async () => {
        await loadFiles();
        setShowOpenDialog(true);
        setActiveMenu(null);
    };

    const handleOpenFile = async (file: FileSystemItem) => {
        if (hasUnsavedChanges) {
            const confirmed = await confirm({
                title: 'Unsaved Changes',
                message: 'You have unsaved changes. Open a different file anyway?',
                variant: 'warning',
                confirmLabel: 'Continue',
                cancelLabel: 'Cancel',
            });
            if (!confirmed) return;
        }
        setContent(file.content || '');
        setCurrentFileId(file.id);
        setCurrentFileName(file.name);
        setHasUnsavedChanges(false);
        setShowOpenDialog(false);
    };

    const handleSave = async () => {
        if (currentFileId) {
            const file: FileSystemItem = {
                id: currentFileId,
                name: currentFileName,
                type: 'document',
                content: content,
                date: new Date().toISOString().split('T')[0],
            };
            await saveFileToFolder(file);
            setHasUnsavedChanges(false);
        } else {
            handleSaveAs();
        }
        setActiveMenu(null);
    };

    const handleSaveAs = () => {
        setSaveFileName(currentFileName === 'Untitled' ? '' : currentFileName.replace('.txt', ''));
        setShowSaveDialog(true);
        setActiveMenu(null);
    };

    const handleSaveAsConfirm = async () => {
        if (!saveFileName.trim()) return;

        const fileName = saveFileName.endsWith('.txt') ? saveFileName : `${saveFileName}.txt`;
        const fileId = `notepad-${Date.now()}`;

        const file: FileSystemItem = {
            id: fileId,
            name: fileName,
            type: 'document',
            content: content,
            date: new Date().toISOString().split('T')[0],
        };

        await saveFileToFolder(file, 'documents');
        setCurrentFileId(fileId);
        setCurrentFileName(fileName);
        setHasUnsavedChanges(false);
        setShowSaveDialog(false);
        setSaveFileName('');
    };

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
        setCursorIndex(e.target.selectionStart ?? 0);
        setHasUnsavedChanges(true);
    };

    const menuItems = {
        File: [
            { label: 'New', shortcut: 'Ctrl+N', action: handleNew },
            { label: 'Open...', shortcut: 'Ctrl+O', action: handleOpen },
            { label: 'Save', shortcut: 'Ctrl+S', action: handleSave },
            { label: 'Save As...', shortcut: 'Ctrl+Shift+S', action: handleSaveAs },
        ],
        Edit: [
            { label: 'Cut', shortcut: 'Ctrl+X', action: () => document.execCommand('cut') },
            { label: 'Copy', shortcut: 'Ctrl+C', action: () => document.execCommand('copy') },
            { label: 'Paste', shortcut: 'Ctrl+V', action: () => document.execCommand('paste') },
        ],
    };

    return (
        <>
            {/* Menu Bar */}
            <div ref={menuRef} className="flex text-xs px-2 py-1 bg-[#2d2d2d] gap-4 select-none relative">
                {['File', 'Edit', 'View', 'Help'].map(menu => (
                    <div key={menu} className="relative">
                        <span
                            className={`hover:text-white cursor-pointer px-2 py-0.5 rounded ${activeMenu === menu ? 'bg-[#3d3d3d] text-white' : ''}`}
                            onClick={() => setActiveMenu(activeMenu === menu ? null : menu)}
                        >
                            {menu}
                        </span>
                        {activeMenu === menu && menuItems[menu as keyof typeof menuItems] && (
                            <div className="absolute top-full left-0 mt-1 bg-[#2d2d2d] border border-[#3d3d3d] rounded shadow-lg min-w-[200px] z-50">
                                {menuItems[menu as keyof typeof menuItems].map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="px-4 py-2 hover:bg-[#3d3d3d] cursor-pointer flex justify-between items-center"
                                        onClick={item.action}
                                    >
                                        <span>{item.label}</span>
                                        <span className="text-[#888] text-[10px]">{item.shortcut}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Text Area */}
            <textarea
                className="flex-1 bg-transparent resize-none border-none p-4 focus:outline-none font-mono text-sm leading-relaxed text-white/90 selection:bg-blue-500/40"
                value={content}
                onChange={handleContentChange}
                onSelect={e => setCursorIndex(e.currentTarget.selectionStart ?? 0)}
                onKeyUp={e => setCursorIndex(e.currentTarget.selectionStart ?? 0)}
                onClick={e => setCursorIndex(e.currentTarget.selectionStart ?? 0)}
                spellCheck={false}
                placeholder="Start typing..."
            />

            {/* Status Bar */}
            <div className="bg-primary px-3 py-1 text-xs text-white flex justify-between">
                <span className="flex gap-2 items-center">
                    {currentFileName}
                    {hasUnsavedChanges && <span className="text-yellow-400">●</span>}
                </span>
                <span className="flex gap-4">
                    <span>
                        Ln {cursorInfo.line}, Col {cursorInfo.column}
                    </span>
                    <span>UTF-8</span>
                    <span>Windows (CRLF)</span>
                </span>
            </div>

            {/* Open File Dialog */}
            {showOpenDialog && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-[#2d2d2d] rounded-lg p-4 w-[400px] max-h-[400px] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-white font-medium">Open File</h3>
                            <button onClick={() => setShowOpenDialog(false)} className="text-white/60 hover:text-white">
                                ✕
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto">
                            {files.length === 0 ? (
                                <p className="text-white/60 text-sm">No documents found</p>
                            ) : (
                                files.map(file => (
                                    <div
                                        key={file.id}
                                        className="px-3 py-2 hover:bg-[#3d3d3d] cursor-pointer rounded flex items-center gap-2"
                                        onClick={() => handleOpenFile(file)}
                                    >
                                        <span className="material-symbols-outlined text-sm text-blue-400">
                                            description
                                        </span>
                                        <span className="text-white text-sm">{file.name}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Save As Dialog */}
            {showSaveDialog && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-[#2d2d2d] rounded-lg p-4 w-[350px]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-white font-medium">Save As</h3>
                            <button onClick={() => setShowSaveDialog(false)} className="text-white/60 hover:text-white">
                                ✕
                            </button>
                        </div>
                        <input
                            type="text"
                            value={saveFileName}
                            onChange={e => setSaveFileName(e.target.value)}
                            placeholder="Enter file name"
                            className="w-full bg-[#1e1e1e] border border-[#3d3d3d] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 mb-4"
                            autoFocus
                            onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveAsConfirm();
                            }}
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowSaveDialog(false)}
                                className="px-4 py-1.5 text-sm text-white/80 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveAsConfirm}
                                className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Dialog */}
            <ConfirmDialog {...dialogProps} />
        </>
    );
};
