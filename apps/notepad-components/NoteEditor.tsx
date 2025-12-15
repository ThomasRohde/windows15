import React from 'react';
import { NoteRecord, NoteDraft } from './types';
import { TextArea } from '../../components/ui';

interface NoteEditorProps {
    note: NoteRecord | null;
    draft: NoteDraft;
    onDraftChange: (draft: NoteDraft) => void;
    onCreateNote: () => void;
}

/**
 * NoteEditor - Editor area for the selected note
 */
export const NoteEditor: React.FC<NoteEditorProps> = ({ note, draft, onDraftChange, onCreateNote }) => {
    if (!note) {
        return (
            <div className="flex-1 flex items-center justify-center text-center p-8">
                <div className="max-w-sm">
                    <div className="text-lg font-semibold text-white">No note selected</div>
                    <div className="mt-1 text-sm text-white/60">Create a note to start syncing across devices.</div>
                    <button
                        onClick={onCreateNote}
                        className="mt-4 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-sm text-white font-medium"
                    >
                        New note
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col">
            {/* Title Input */}
            <div className="p-4 border-b border-white/10">
                <input
                    value={draft.title}
                    onChange={e => onDraftChange({ ...draft, title: e.target.value })}
                    className="w-full bg-transparent text-xl text-white/90 placeholder:text-white/30 focus:outline-none"
                    placeholder="Title"
                />
            </div>

            {/* Content Textarea */}
            <TextArea
                className="flex-1 bg-transparent border-none font-mono leading-relaxed selection:bg-blue-500/40"
                variant="code"
                value={draft.content}
                onChange={e => onDraftChange({ ...draft, content: e.target.value })}
                spellCheck={false}
                placeholder="Start typing..."
            />

            {/* Footer */}
            <div className="px-4 py-2 text-[11px] text-white/50 border-t border-white/10 bg-black/20 flex justify-between">
                <span>Updated {new Date(note.updatedAt).toLocaleString()}</span>
                <span>Created {new Date(note.createdAt).toLocaleDateString()}</span>
            </div>
        </div>
    );
};
