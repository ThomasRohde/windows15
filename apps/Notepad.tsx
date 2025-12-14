import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useDb, useDexieLiveQuery } from '../utils/storage';
import { getFiles, saveFileToFolder } from '../utils/fileSystem';
import { FileSystemItem } from '../types';
import { SkeletonList } from '../components/LoadingSkeleton';

interface NotepadProps {
    initialContent?: string;
    initialFileId?: string;
    initialFileName?: string;
}

type NotepadView = 'notes' | 'files';

type NoteDraft = {
    title: string;
    content: string;
};

const createId = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 11);

const NotesPanel = () => {
    const db = useDb();
    const { value: notesRaw, isLoading } = useDexieLiveQuery(() => db.notes.orderBy('updatedAt').reverse().toArray(), [db]);
    const notes = Array.isArray(notesRaw) ? notesRaw : [];

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [draft, setDraft] = useState<NoteDraft>({ title: '', content: '' });
    const [search, setSearch] = useState('');

    const selectedNote = useMemo(() => notes.find(note => note.id === selectedId) ?? null, [notes, selectedId]);

    useEffect(() => {
        if (selectedId) return;
        if (notes.length === 0) return;
        const firstNote = notes[0];
        if (firstNote) setSelectedId(firstNote.id);
    }, [notes, selectedId]);

    useEffect(() => {
        if (!selectedNote) {
            setDraft({ title: '', content: '' });
            return;
        }
        setDraft({ title: selectedNote.title, content: selectedNote.content });
    }, [selectedNote?.id, selectedNote?.updatedAt]);

    useEffect(() => {
        if (!selectedNote) return;
        if (draft.title === selectedNote.title && draft.content === selectedNote.content) return;

        const timeout = globalThis.setTimeout(() => {
            const title = draft.title.trim() || 'Untitled';
            db.notes
                .update(selectedNote.id, {
                    title,
                    content: draft.content,
                    updatedAt: Date.now(),
                })
                .catch(() => undefined);
        }, 350);

        return () => globalThis.clearTimeout(timeout);
    }, [draft.title, draft.content, selectedNote?.id, selectedNote?.title, selectedNote?.content]);

    const createNote = async () => {
        const now = Date.now();
        const id = createId();
        await db.notes.add({ id, title: 'Untitled', content: '', createdAt: now, updatedAt: now });
        setSelectedId(id);
    };

    const deleteNote = async (id: string) => {
        const note = notes.find(n => n.id === id);
        if (!note) return;
        if (!confirm(`Delete "${note.title || 'Untitled'}"?`)) return;
        await db.notes.delete(id);
        if (selectedId === id) {
            const remaining = notes.filter(n => n.id !== id);
            setSelectedId(remaining[0]?.id ?? null);
        }
    };

    const filteredNotes = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return notes;
        return notes.filter(note => {
            return note.title.toLowerCase().includes(q) || note.content.toLowerCase().includes(q);
        });
    }, [notes, search]);

    return (
        <div className="flex-1 flex overflow-hidden">
            <div className="w-72 border-r border-white/10 bg-black/20 flex flex-col">
                <div className="h-12 px-3 flex items-center justify-between border-b border-white/10">
                    <div className="text-sm font-medium text-white/90 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-blue-300">note_stack</span>
                        Notes
                    </div>
                    <button
                        onClick={createNote}
                        className="h-8 w-8 rounded-lg hover:bg-white/10 text-white/70 flex items-center justify-center"
                        title="New note"
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                    </button>
                </div>

                <div className="p-3 border-b border-white/10">
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search notes..."
                        className="w-full h-9 px-3 rounded-lg bg-black/30 border border-white/10 text-sm text-white/80 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                    />
                </div>

                <div className="flex-1 overflow-auto">
                    {isLoading ? (
                        <SkeletonList count={6} withSubtext />
                    ) : filteredNotes.length === 0 ? (
                        <div className="p-4 text-sm text-white/50">No notes yet.</div>
                    ) : (
                        filteredNotes.map(note => {
                            const isActive = note.id === selectedId;
                            const subtitle = note.content.trim().split('\n').find(Boolean) ?? '';
                            return (
                                <button
                                    key={note.id}
                                    onClick={() => setSelectedId(note.id)}
                                    className={`w-full px-3 py-2 text-left border-b border-white/5 hover:bg-white/5 ${isActive ? 'bg-white/10' : ''}`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="min-w-0">
                                            <div className="text-sm text-white/90 truncate">
                                                {note.title || 'Untitled'}
                                            </div>
                                            <div className="text-[11px] text-white/50 truncate">{subtitle}</div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={e => {
                                                e.stopPropagation();
                                                deleteNote(note.id);
                                            }}
                                            className="h-8 w-8 rounded-lg hover:bg-white/10 text-white/50 hover:text-red-300 flex items-center justify-center"
                                            title="Delete"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                        </button>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            <div className="flex-1 flex flex-col">
                {!selectedNote ? (
                    <div className="flex-1 flex items-center justify-center text-center p-8">
                        <div className="max-w-sm">
                            <div className="text-lg font-semibold text-white">No note selected</div>
                            <div className="mt-1 text-sm text-white/60">
                                Create a note to start syncing across devices.
                            </div>
                            <button
                                onClick={createNote}
                                className="mt-4 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-sm text-white font-medium"
                            >
                                New note
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="p-4 border-b border-white/10">
                            <input
                                value={draft.title}
                                onChange={e => setDraft(prev => ({ ...prev, title: e.target.value }))}
                                className="w-full bg-transparent text-xl text-white/90 placeholder:text-white/30 focus:outline-none"
                                placeholder="Title"
                            />
                        </div>
                        <textarea
                            className="flex-1 bg-transparent resize-none border-none p-4 focus:outline-none font-mono text-sm leading-relaxed text-white/90 selection:bg-blue-500/40"
                            value={draft.content}
                            onChange={e => setDraft(prev => ({ ...prev, content: e.target.value }))}
                            spellCheck={false}
                            placeholder="Start typing..."
                        />
                        <div className="px-4 py-2 text-[11px] text-white/50 border-t border-white/10 bg-black/20 flex justify-between">
                            <span>Updated {new Date(selectedNote.updatedAt).toLocaleString()}</span>
                            <span>Created {new Date(selectedNote.createdAt).toLocaleDateString()}</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export const Notepad = (props: NotepadProps) => {
    const initialContent = props.initialContent ?? '';
    const openedFromFile =
        Boolean(props.initialFileId || props.initialFileName) ||
        Object.prototype.hasOwnProperty.call(props, 'initialContent');

    const [view, setView] = useState<NotepadView>(openedFromFile ? 'files' : 'notes');

    const [content, setContent] = useState(initialContent);
    const [cursorIndex, setCursorIndex] = useState(0);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [currentFileId, setCurrentFileId] = useState<string | null>(props.initialFileId || null);
    const [currentFileName, setCurrentFileName] = useState<string>(props.initialFileName || 'Untitled');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showOpenDialog, setShowOpenDialog] = useState(false);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [saveFileName, setSaveFileName] = useState('');
    const [files, setFiles] = useState<FileSystemItem[]>([]);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setContent(initialContent);
        setCursorIndex(0);
        setHasUnsavedChanges(false);

        if (!openedFromFile) return;
        setCurrentFileId(props.initialFileId ?? null);
        setCurrentFileName(props.initialFileName || 'Untitled');
    }, [initialContent, openedFromFile, props.initialFileId, props.initialFileName]);

    useEffect(() => {
        if (!openedFromFile) return;
        setView('files');
    }, [openedFromFile]);

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

    const cursorInfo = useMemo(() => {
        const safeCursorIndex = Math.max(0, Math.min(cursorIndex, content.length));
        const textBeforeCursor = content.slice(0, safeCursorIndex);
        const line = textBeforeCursor.split('\n').length;
        const lastNewlineIndex = textBeforeCursor.lastIndexOf('\n');
        const column = safeCursorIndex - lastNewlineIndex;
        return { line, column };
    }, [content, cursorIndex]);

    const handleNew = () => {
        if (hasUnsavedChanges && !confirm('You have unsaved changes. Create a new file anyway?')) {
            return;
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

    const handleOpenFile = (file: FileSystemItem) => {
        if (hasUnsavedChanges && !confirm('You have unsaved changes. Open a different file anyway?')) {
            return;
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
        <div className="h-full flex flex-col bg-[#1e1e1e] text-[#d4d4d4] relative">
            <div className="h-10 px-2 flex items-center gap-2 bg-[#2d2d2d] border-b border-[#3d3d3d]">
                <button
                    onClick={() => setView('notes')}
                    className={`px-3 h-7 rounded flex items-center gap-1 text-xs ${view === 'notes' ? 'bg-[#3d3d3d] text-white' : 'text-white/70 hover:bg-[#353535]'}`}
                >
                    <span className="material-symbols-outlined text-[16px]">note_stack</span>
                    Notes
                </button>
                <button
                    onClick={() => setView('files')}
                    className={`px-3 h-7 rounded flex items-center gap-1 text-xs ${view === 'files' ? 'bg-[#3d3d3d] text-white' : 'text-white/70 hover:bg-[#353535]'}`}
                >
                    <span className="material-symbols-outlined text-[16px]">description</span>
                    Files
                </button>
            </div>

            {view === 'notes' ? (
                <NotesPanel />
            ) : (
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
                                    <button
                                        onClick={() => setShowOpenDialog(false)}
                                        className="text-white/60 hover:text-white"
                                    >
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
                                    <button
                                        onClick={() => setShowSaveDialog(false)}
                                        className="text-white/60 hover:text-white"
                                    >
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
                </>
            )}
        </div>
    );
};
