import React, { useEffect, useMemo, useState } from 'react';
import { useDb, useDexieLiveQuery } from '../../utils/storage';
import { ensureArray } from '../../utils';
import { NotesList } from './NotesList';
import { NoteEditor } from './NoteEditor';
import { NoteDraft, NoteRecord } from './types';
import { useConfirmDialog, ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useNotification, useSound } from '../../hooks';

/**
 * NotesPanel - Cloud-synced notes view with list and editor
 */
export const NotesPanel: React.FC = () => {
    const db = useDb();
    const { value: notesRaw, isLoading } = useDexieLiveQuery(
        () => db.notes.orderBy('updatedAt').reverse().toArray(),
        [db]
    );
    const notes = useMemo(() => ensureArray(notesRaw as NoteRecord[] | null), [notesRaw]);

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [draft, setDraft] = useState<NoteDraft>({ title: '', content: '' });
    const [search, setSearch] = useState('');

    const { confirm, dialogProps } = useConfirmDialog();
    const notify = useNotification();
    const { playSound } = useSound();

    const selectedNote = useMemo(() => notes.find(note => note.id === selectedId) ?? null, [notes, selectedId]);
    const selectedNoteId = selectedNote?.id ?? null;
    const selectedNoteTitle = selectedNote?.title ?? '';
    const selectedNoteContent = selectedNote?.content ?? '';
    const selectedNoteUpdatedAt = selectedNote?.updatedAt ?? 0;

    // Auto-select first note if none selected
    useEffect(() => {
        if (selectedId) return;
        if (notes.length === 0) return;
        const firstNote = notes[0];
        if (firstNote) setSelectedId(firstNote.id);
    }, [notes, selectedId]);

    // Sync draft with selected note
    useEffect(() => {
        if (!selectedNoteId) {
            setDraft({ title: '', content: '' });
            return;
        }
        setDraft({ title: selectedNoteTitle, content: selectedNoteContent });
    }, [selectedNoteId, selectedNoteTitle, selectedNoteContent, selectedNoteUpdatedAt]);

    // Autosave with debounce
    useEffect(() => {
        if (!selectedNoteId) return;
        if (draft.title === selectedNoteTitle && draft.content === selectedNoteContent) return;

        const timeout = globalThis.setTimeout(() => {
            const title = draft.title.trim() || 'Untitled';
            db.notes
                .update(selectedNoteId, {
                    title,
                    content: draft.content,
                    updatedAt: Date.now(),
                })
                .catch(() => undefined);
        }, 350);

        return () => globalThis.clearTimeout(timeout);
    }, [draft.title, draft.content, selectedNoteId, selectedNoteTitle, selectedNoteContent, db.notes]);

    const createNote = async () => {
        try {
            const now = Date.now();
            // Let Dexie Cloud auto-generate the ID when using @id schema
            const id = await db.notes.add({
                title: 'Untitled',
                content: '',
                createdAt: now,
                updatedAt: now,
            } as NoteRecord);
            setSelectedId(id);
            notify.success('Note created');
        } catch (error) {
            console.error('Failed to create note:', error);
            notify.error('Failed to create note');
        }
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
        playSound('delete');
        if (selectedId === id) {
            const remaining = notes.filter(n => n.id !== id);
            setSelectedId(remaining[0]?.id ?? null);
        }
        notify.success('Note deleted');
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
