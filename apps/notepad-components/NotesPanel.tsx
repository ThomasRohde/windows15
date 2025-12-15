import React, { useEffect, useMemo, useState } from 'react';
import { useDb, useDexieLiveQuery } from '../../utils/storage';
import { NotesList } from './NotesList';
import { NoteEditor } from './NoteEditor';
import { NoteDraft, NoteRecord } from './types';
import { useConfirmDialog, ConfirmDialog } from '../../components/ui/ConfirmDialog';

const createId = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 11);

/**
 * NotesPanel - Cloud-synced notes view with list and editor
 */
export const NotesPanel: React.FC = () => {
    const db = useDb();
    const { value: notesRaw, isLoading } = useDexieLiveQuery(
        () => db.notes.orderBy('updatedAt').reverse().toArray(),
        [db]
    );
    const notes = (Array.isArray(notesRaw) ? notesRaw : []) as NoteRecord[];

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [draft, setDraft] = useState<NoteDraft>({ title: '', content: '' });
    const [search, setSearch] = useState('');

    const { confirm, dialogProps } = useConfirmDialog();

    const selectedNote = useMemo(() => notes.find(note => note.id === selectedId) ?? null, [notes, selectedId]);

    // Auto-select first note if none selected
    useEffect(() => {
        if (selectedId) return;
        if (notes.length === 0) return;
        const firstNote = notes[0];
        if (firstNote) setSelectedId(firstNote.id);
    }, [notes, selectedId]);

    // Sync draft with selected note
    useEffect(() => {
        if (!selectedNote) {
            setDraft({ title: '', content: '' });
            return;
        }
        setDraft({ title: selectedNote.title, content: selectedNote.content });
    }, [selectedNote?.id, selectedNote?.updatedAt]);

    // Autosave with debounce
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
    }, [draft.title, draft.content, selectedNote?.id, selectedNote?.title, selectedNote?.content, db.notes]);

    const createNote = async () => {
        const now = Date.now();
        const id = createId();
        await db.notes.add({ id, title: 'Untitled', content: '', createdAt: now, updatedAt: now });
        setSelectedId(id);
    };

    const deleteNote = async (id: string) => {
        const note = notes.find(n => n.id === id);
        if (!note) return;
        const confirmed = await confirm({
            title: 'Delete Note',
            message: `Delete "${note.title || 'Untitled'}"?`,
            variant: 'danger',
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel',
        });
        if (!confirmed) return;
        await db.notes.delete(id);
        if (selectedId === id) {
            const remaining = notes.filter(n => n.id !== id);
            setSelectedId(remaining[0]?.id ?? null);
        }
    };

    return (
        <div className="flex-1 flex overflow-hidden">
            <NotesList
                notes={notes}
                isLoading={isLoading}
                selectedId={selectedId}
                search={search}
                onSelectNote={setSelectedId}
                onDeleteNote={deleteNote}
                onCreateNote={createNote}
                onSearchChange={setSearch}
            />
            <NoteEditor note={selectedNote} draft={draft} onDraftChange={setDraft} onCreateNote={createNote} />

            {/* Confirm Dialog */}
            <ConfirmDialog {...dialogProps} />
        </div>
    );
};
