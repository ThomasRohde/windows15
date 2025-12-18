import { useState, useCallback, useRef } from 'react';

export interface FilePickerFile {
    id: string;
    name: string;
    content?: string;
    path: string[];
}

export interface FilePickerOpenOptions {
    /** Filter by file extensions (e.g., ['.txt', '.md']) */
    extensions?: string[];
    /** Dialog title */
    title?: string;
    /** Initial path to open */
    initialPath?: string[];
}

export interface FilePickerSaveOptions {
    /** Default filename for save dialog */
    defaultFileName?: string;
    /** Content to save */
    content: string;
    /** Dialog title */
    title?: string;
    /** Initial path to save to */
    initialPath?: string[];
    /** Suggested extension (e.g., '.txt') */
    defaultExtension?: string;
}

export interface FilePickerState {
    isOpen: boolean;
    mode: 'open' | 'save' | null;
    options: FilePickerOpenOptions | FilePickerSaveOptions | null;
    currentPath: string[];
    selectedFile: FilePickerFile | null;
    fileName: string;
}

export interface UseFilePickerReturn {
    /** Current state of the file picker */
    state: FilePickerState;
    /** Open a file - returns selected file or null if cancelled */
    open: (options?: FilePickerOpenOptions) => Promise<FilePickerFile | null>;
    /** Save content to a file - returns saved file info or null if cancelled */
    save: (options: FilePickerSaveOptions) => Promise<FilePickerFile | null>;
    /** Navigate to a folder */
    navigateTo: (path: string[]) => void;
    /** Select a file */
    selectFile: (file: FilePickerFile) => void;
    /** Set filename for save dialog */
    setFileName: (name: string) => void;
    /** Confirm selection/save */
    confirm: () => void;
    /** Cancel and close dialog */
    cancel: () => void;
}

/**
 * useFilePicker - Provides file open/save dialog functionality
 *
 * This hook manages the state for a file picker modal. The actual modal
 * UI should be rendered by the component using this hook.
 *
 * @example
 * ```tsx
 * const { open, save, state } = useFilePicker();
 *
 * const handleOpen = async () => {
 *   const file = await open({ extensions: ['.txt', '.md'] });
 *   if (file) {
 *     console.log('Opened:', file.name, file.content);
 *   }
 * };
 *
 * const handleSave = async () => {
 *   const result = await save({ content: 'Hello', defaultFileName: 'document.txt' });
 *   if (result) {
 *     console.log('Saved to:', result.path);
 *   }
 * };
 *
 * // Render FilePickerModal when state.isOpen is true
 * ```
 */
export function useFilePicker(): UseFilePickerReturn {
    const [state, setState] = useState<FilePickerState>({
        isOpen: false,
        mode: null,
        options: null,
        currentPath: ['root'],
        selectedFile: null,
        fileName: '',
    });

    // Promise resolvers for async open/save
    const resolveRef = useRef<((value: FilePickerFile | null) => void) | null>(null);

    const open = useCallback((options: FilePickerOpenOptions = {}): Promise<FilePickerFile | null> => {
        return new Promise(resolve => {
            resolveRef.current = resolve;
            setState({
                isOpen: true,
                mode: 'open',
                options,
                currentPath: options.initialPath ?? ['root'],
                selectedFile: null,
                fileName: '',
            });
        });
    }, []);

    const save = useCallback((options: FilePickerSaveOptions): Promise<FilePickerFile | null> => {
        return new Promise(resolve => {
            resolveRef.current = resolve;
            setState({
                isOpen: true,
                mode: 'save',
                options,
                currentPath: options.initialPath ?? ['root'],
                selectedFile: null,
                fileName: options.defaultFileName ?? 'untitled.txt',
            });
        });
    }, []);

    const navigateTo = useCallback((path: string[]) => {
        setState(prev => ({ ...prev, currentPath: path, selectedFile: null }));
    }, []);

    const selectFile = useCallback((file: FilePickerFile) => {
        setState(prev => ({
            ...prev,
            selectedFile: file,
            fileName: prev.mode === 'save' ? file.name : prev.fileName,
        }));
    }, []);

    const setFileName = useCallback((name: string) => {
        setState(prev => ({ ...prev, fileName: name }));
    }, []);

    const confirm = useCallback(() => {
        const { mode, selectedFile, fileName, currentPath, options } = state;

        if (mode === 'open' && selectedFile) {
            resolveRef.current?.(selectedFile);
        } else if (mode === 'save' && fileName) {
            const saveOpts = options as FilePickerSaveOptions;
            resolveRef.current?.({
                id: selectedFile?.id ?? `new-${Date.now()}`,
                name: fileName,
                content: saveOpts?.content,
                path: currentPath,
            });
        } else {
            resolveRef.current?.(null);
        }

        resolveRef.current = null;
        setState({
            isOpen: false,
            mode: null,
            options: null,
            currentPath: ['root'],
            selectedFile: null,
            fileName: '',
        });
    }, [state]);

    const cancel = useCallback(() => {
        resolveRef.current?.(null);
        resolveRef.current = null;
        setState({
            isOpen: false,
            mode: null,
            options: null,
            currentPath: ['root'],
            selectedFile: null,
            fileName: '',
        });
    }, []);

    return {
        state,
        open,
        save,
        navigateTo,
        selectFile,
        setFileName,
        confirm,
        cancel,
    };
}
