/**
 * NoteRecord - Database record for a note
 */
export interface NoteRecord {
    id: string;
    title: string;
    content: string;
    createdAt: number;
    updatedAt: number;
}

/**
 * NoteDraft - In-progress note edits before saving
 */
export interface NoteDraft {
    title: string;
    content: string;
}

/**
 * NotepadView - Available views in Notepad
 */
export type NotepadView = 'notes' | 'files';

/**
 * NotepadProps - Props for the Notepad component
 */
export interface NotepadProps {
    /** Initial content when opening a file */
    initialContent?: string;
    /** ID of file being opened */
    initialFileId?: string;
    /** Name of file being opened */
    initialFileName?: string;
    /** Window ID for dynamic title updates */
    windowId?: string;
}
