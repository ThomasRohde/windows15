import React from 'react';
import { SkeletonList } from '../../components/LoadingSkeleton';
import { SearchInput } from '../../components/ui';
import { NoteRecord } from './types';
import { usePhoneMode } from '../../hooks';

interface NotesListProps {
    notes: NoteRecord[];
    isLoading: boolean;
    selectedId: string | null;
    search: string;
    onSelectNote: (id: string) => void;
    onDeleteNote: (id: string) => void;
    onCreateNote: () => void;
    onSearchChange: (value: string) => void;
}

/**
 * NotesList - Sidebar list of notes with search and actions
 */
export const NotesList: React.FC<NotesListProps> = ({
    notes,
    isLoading,
    selectedId,
    search,
    onSelectNote,
    onDeleteNote,
    onCreateNote,
    onSearchChange,
}) => {
    const isPhone = usePhoneMode();

    const filteredNotes = React.useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return notes;
        return notes.filter(note => {
            return note.title.toLowerCase().includes(q) || note.content.toLowerCase().includes(q);
        });
    }, [notes, search]);

    return (
        <div className={`${isPhone ? 'w-48' : 'w-72'} border-r border-white/10 bg-black/20 flex flex-col`}>
            {/* Header */}
            <div
                className={`${isPhone ? 'h-14' : 'h-12'} px-3 flex items-center justify-between border-b border-white/10`}
            >
                <div
                    className={`${isPhone ? 'text-base' : 'text-sm'} font-medium text-white/90 flex items-center gap-2`}
                >
                    <span className="material-symbols-outlined text-[18px] text-blue-300">note_stack</span>
                    Notes
                </div>
                <button
                    onClick={onCreateNote}
                    className={`${isPhone ? 'h-11 w-11' : 'h-8 w-8'} rounded-lg hover:bg-white/10 active:bg-white/20 text-white/70 flex items-center justify-center`}
                    title="New note"
                >
                    <span className={`material-symbols-outlined ${isPhone ? 'text-[22px]' : 'text-[18px]'}`}>add</span>
                </button>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-white/10">
                <SearchInput
                    value={search}
                    onChange={onSearchChange}
                    placeholder="Search notes..."
                    aria-label="Search notes"
                />
            </div>

            {/* Notes List */}
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
                                onClick={() => onSelectNote(note.id)}
                                className={`w-full px-3 ${isPhone ? 'py-3 min-h-[52px]' : 'py-2'} text-left border-b border-white/5 hover:bg-white/5 active:bg-white/10 ${isActive ? 'bg-white/10' : ''}`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className={`${isPhone ? 'text-base' : 'text-sm'} text-white/90 truncate`}>
                                            {note.title || 'Untitled'}
                                        </div>
                                        <div
                                            className={`${isPhone ? 'text-xs' : 'text-[11px]'} text-white/50 truncate`}
                                        >
                                            {subtitle}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={e => {
                                            e.stopPropagation();
                                            onDeleteNote(note.id);
                                        }}
                                        className={`${isPhone ? 'h-11 w-11' : 'h-8 w-8'} rounded-lg hover:bg-white/10 active:bg-red-500/20 text-white/50 hover:text-red-300 flex items-center justify-center shrink-0`}
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
    );
};
