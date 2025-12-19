/**
 * File drop handler utility
 * Handles files dropped from the user's file system onto the desktop or file explorer.
 * @module utils/fileDropHandler
 */

import { FileSystemItem } from '../types';
import { IMAGE_EXTENSIONS, VIDEO_EXTENSIONS, AUDIO_EXTENSIONS, SPREADSHEET_EXTENSIONS } from './clipboardAnalyzer';
import { getDefaultAppForExtension, getFileExtension } from '../apps/registry';

/**
 * Result of processing a dropped file
 */
export interface DroppedFileResult {
    /** The created file system item */
    file: FileSystemItem;
    /** The suggested app to open this file */
    suggestedAppId?: string;
    /** The original filename */
    originalName: string;
    /** The file content (text or data URL) */
    content: string;
    /** Whether the file is binary (stored as data URL) */
    isBinary: boolean;
}

/**
 * Check if a file extension is a text-based format
 */
function isTextBasedExtension(ext: string): boolean {
    const textExtensions = [
        '.txt',
        '.md',
        '.markdown',
        '.json',
        '.xml',
        '.html',
        '.htm',
        '.css',
        '.js',
        '.ts',
        '.jsx',
        '.tsx',
        '.csv',
        '.log',
        '.cfg',
        '.ini',
        '.yaml',
        '.yml',
        '.toml',
        '.env',
        '.sh',
        '.bat',
        '.ps1',
        '.py',
        '.java',
        '.c',
        '.cpp',
        '.h',
        '.hpp',
        '.cs',
        '.go',
        '.rs',
        '.rb',
        '.php',
        '.sql',
        '.graphql',
        '.vue',
        '.svelte',
    ];
    return textExtensions.includes(ext.toLowerCase());
}

/**
 * Check if a file extension is an image
 */
function isImageExtension(ext: string): boolean {
    return IMAGE_EXTENSIONS.includes(ext.toLowerCase());
}

/**
 * Check if a file extension is a video
 */
function isVideoExtension(ext: string): boolean {
    return VIDEO_EXTENSIONS.includes(ext.toLowerCase());
}

/**
 * Check if a file extension is audio
 */
function isAudioExtension(ext: string): boolean {
    return AUDIO_EXTENSIONS.includes(ext.toLowerCase());
}

/**
 * Check if a file extension is a spreadsheet
 */
export function isSpreadsheetExtension(ext: string): boolean {
    return SPREADSHEET_EXTENSIONS.includes(ext.toLowerCase());
}

/**
 * Determine the FileSystemItem type based on file extension
 */
function getFileType(ext: string): FileSystemItem['type'] {
    const lowerExt = ext.toLowerCase();

    if (isImageExtension(lowerExt)) return 'image';
    if (isVideoExtension(lowerExt)) return 'video';
    if (isAudioExtension(lowerExt)) return 'audio';
    if (
        ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.cs', '.go', '.rs', '.rb', '.php'].includes(
            lowerExt
        )
    )
        return 'code';
    if (['.ppt', '.pptx', '.key', '.odp'].includes(lowerExt)) return 'presentation';

    return 'document';
}

/**
 * Read a file as text
 */
function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

/**
 * Read a file as data URL (for binary files)
 */
function readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

/**
 * Process a single dropped file and return a FileSystemItem
 */
export async function processDroppedFile(file: File): Promise<DroppedFileResult> {
    const ext = getFileExtension(file.name);
    const fileType = getFileType(ext);
    const isTextBased = isTextBasedExtension(ext);
    const isBinary = !isTextBased;

    let content: string;

    if (isTextBased) {
        // Read text-based files as text
        content = await readFileAsText(file);
    } else {
        // Read binary files as data URL
        content = await readFileAsDataURL(file);
    }

    // Create the file system item
    const fileItem: FileSystemItem = {
        id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: file.name,
        type: fileType,
        size: formatFileSize(file.size),
        date: new Date().toLocaleDateString(),
    };

    // Set appropriate content field based on file type
    if (fileType === 'image' || fileType === 'video' || fileType === 'audio') {
        fileItem.src = content; // Binary content as data URL
    } else {
        fileItem.content = content; // Text content
    }

    // Get suggested app
    const defaultApp = getDefaultAppForExtension(ext);

    return {
        file: fileItem,
        suggestedAppId: defaultApp?.id,
        originalName: file.name,
        content,
        isBinary,
    };
}

/**
 * Process multiple dropped files
 */
export async function processDroppedFiles(files: globalThis.FileList | File[]): Promise<DroppedFileResult[]> {
    const fileArray = Array.from(files);
    const results = await Promise.all(fileArray.map(processDroppedFile));
    return results;
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check if a drag event contains files
 */
export function hasFiles(event: globalThis.DragEvent): boolean {
    return event.dataTransfer?.types.includes('Files') ?? false;
}

/**
 * Get the accepted file types string for filtering (used in file inputs)
 */
export function getAcceptedSpreadsheetTypes(): string {
    return SPREADSHEET_EXTENSIONS.join(',');
}
