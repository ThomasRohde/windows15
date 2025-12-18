/**
 * Notepad - Text editor application with Notes and Files views
 *
 * Notes view: Cloud-synced notes stored in Dexie database
 * Files view: Traditional file-based editing with menu bar
 *
 * @module apps/Notepad
 */
import React, { useState, useEffect } from 'react';
import { NotesPanel, FilesPanel, NotepadProps, NotepadView } from './notepad-components';
import { useWindowInstance } from '../hooks';

/**
 * Notepad application component
 *
 * @example
 * ```tsx
 * // Open with empty editor
 * <Notepad />
 *
 * // Open with file content
 * <Notepad
 *   initialContent="Hello World"
 *   initialFileId="file-123"
 *   initialFileName="hello.txt"
 * />
 * ```
 */
export const Notepad: React.FC<NotepadProps> = props => {
    const { initialContent = '', initialFileId, initialFileName, windowId } = props;
    const { setTitle } = useWindowInstance(windowId ?? '');

    // Determine if opened from a file (vs fresh launch)
    const openedFromFile =
        Boolean(initialFileId || initialFileName) || Object.prototype.hasOwnProperty.call(props, 'initialContent');

    const [view, setView] = useState<NotepadView>(openedFromFile ? 'files' : 'notes');

    // Switch to files view when opened with file props
    useEffect(() => {
        if (openedFromFile) {
            setView('files');
        }
    }, [openedFromFile]);

    // Callback for FilesPanel to update window title
    const handleTitleChange = (fileName: string, hasUnsaved: boolean) => {
        if (windowId) {
            const title = hasUnsaved ? `Notepad - ${fileName} *` : `Notepad - ${fileName}`;
            setTitle(title);
        }
    };

    // Reset title when in notes view
    useEffect(() => {
        if (view === 'notes' && windowId) {
            setTitle('Notepad');
        }
    }, [view, windowId, setTitle]);

    return (
        <div className="h-full flex flex-col bg-background-dark text-[#d4d4d4] relative">
            {/* View Tabs */}
            <div className="h-10 px-2 flex items-center gap-2 bg-[#2d2d2d] border-b border-[#3d3d3d]">
                <button
                    onClick={() => setView('notes')}
                    className={`px-3 h-7 rounded flex items-center gap-1 text-xs ${
                        view === 'notes' ? 'bg-[#3d3d3d] text-white' : 'text-white/70 hover:bg-[#353535]'
                    }`}
                >
                    <span className="material-symbols-outlined text-[16px]">note_stack</span>
                    Notes
                </button>
                <button
                    onClick={() => setView('files')}
                    className={`px-3 h-7 rounded flex items-center gap-1 text-xs ${
                        view === 'files' ? 'bg-[#3d3d3d] text-white' : 'text-white/70 hover:bg-[#353535]'
                    }`}
                >
                    <span className="material-symbols-outlined text-[16px]">description</span>
                    Files
                </button>
            </div>

            {/* View Content */}
            {view === 'notes' ? (
                <NotesPanel />
            ) : (
                <FilesPanel
                    initialContent={initialContent}
                    initialFileId={initialFileId}
                    initialFileName={initialFileName}
                    onTitleChange={handleTitleChange}
                />
            )}
        </div>
    );
};
