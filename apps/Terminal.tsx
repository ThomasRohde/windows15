import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocalization } from '../context';
import { useDb } from '../context/DbContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { getFiles, saveFileToFolder } from '../utils/fileSystem';
import type { FileSystemItem } from '../types';
import { generateUuid } from '../utils/uuid';

interface ContextMenu {
    x: number;
    y: number;
    hasSelection: boolean;
}

interface OutputLine {
    id: number;
    type: 'command' | 'output' | 'error';
    text: string;
}

const MAX_HISTORY = 500;

// Helper to find a folder by path
const findFolderByPath = (files: FileSystemItem[], path: string[]): FileSystemItem | null => {
    if (path.length === 0) return null;

    let current: FileSystemItem[] = files;
    let folder: FileSystemItem | null = null;

    for (const segment of path) {
        const found = current.find(item => item.name.toLowerCase() === segment.toLowerCase() && item.type === 'folder');
        if (!found) return null;
        folder = found;
        current = found.children || [];
    }

    return folder;
};

// Helper to parse path (supports both absolute and relative)
const parsePath = (currentPath: string[], input: string): string[] => {
    if (!input || input === '.') return currentPath;

    // Absolute path (starts with C:\ or /)
    if (input.startsWith('C:\\') || input.startsWith('C:/') || input.startsWith('/')) {
        const cleaned = input.replace(/^(C:\\|C:\/|\/)/, '').replace(/\\/g, '/');
        return cleaned ? cleaned.split('/').filter(Boolean) : [];
    }

    // Relative path
    const segments = input.replace(/\\/g, '/').split('/').filter(Boolean);
    const result = [...currentPath];

    for (const segment of segments) {
        if (segment === '..') {
            result.pop();
        } else if (segment !== '.') {
            result.push(segment);
        }
    }

    return result;
};

export const Terminal = () => {
    const { formatDateLong, formatTimeLong } = useLocalization();
    const db = useDb();
    const [input, setInput] = useState('');
    const [output, setOutput] = useState<OutputLine[]>([
        { id: 0, type: 'output', text: 'Windows15 Command Prompt [Version 15.0.28500.1000]' },
        { id: 1, type: 'output', text: '(c) 2024 Windows15 Corporation. All rights reserved.' },
        { id: 2, type: 'output', text: '' },
    ]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [currentPath, setCurrentPath] = useState<string[]>(['Users', 'Guest']);
    const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
    const outputRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const idCounter = useRef(3);

    // Load command history from IndexedDB
    const commandHistory = useLiveQuery(
        async () => {
            if (!db) return [];
            const history = await db.terminalHistory.orderBy('executedAt').toArray();
            return history.map(h => h.command);
        },
        [db],
        []
    );

    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [output]);

    // Close context menu on click anywhere
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    const getSelectedText = (): string => {
        return window.getSelection()?.toString() || '';
    };

    const copyToClipboard = async (text: string): Promise<void> => {
        try {
            await navigator.clipboard.writeText(text);
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
        }
    };

    const pasteFromClipboard = async (): Promise<void> => {
        try {
            const text = await navigator.clipboard.readText();
            setInput(prev => prev + text);
        } catch (error) {
            console.error('Failed to read from clipboard:', error);
        }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        const selection = getSelectedText();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            hasSelection: selection.length > 0,
        });
    };

    const handleCopySelection = async () => {
        const selection = getSelectedText();
        if (selection) {
            await copyToClipboard(selection);
        }
        setContextMenu(null);
    };

    const handleCopyAll = async () => {
        const allText = output.map(line => line.text).join('\n');
        await copyToClipboard(allText);
        setContextMenu(null);
    };

    const handlePaste = async () => {
        await pasteFromClipboard();
        setContextMenu(null);
        inputRef.current?.focus();
    };

    const handleSelectAll = () => {
        if (outputRef.current) {
            const range = document.createRange();
            range.selectNodeContents(outputRef.current);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
        }
        setContextMenu(null);
    };

    const handleClearTerminal = () => {
        setOutput([]);
        setContextMenu(null);
    };

    const addOutput = (text: string, type: 'command' | 'output' | 'error' = 'output') => {
        setOutput(prev => [...prev, { id: idCounter.current++, type, text }]);
    };

    const getCurrentPrompt = useCallback(() => {
        return `C:\\${currentPath.join('\\')}`;
    }, [currentPath]);

    const executeCommand = async (cmd: string) => {
        const trimmed = cmd.trim();
        if (!trimmed) return;

        addOutput(`${getCurrentPrompt()}>${trimmed}`, 'command');

        // Save command to database with FIFO eviction
        if (db) {
            try {
                // Add new command to history
                await db.terminalHistory.add({
                    command: trimmed,
                    executedAt: Date.now(),
                });

                // Enforce MAX_HISTORY limit (FIFO eviction)
                const count = await db.terminalHistory.count();
                if (count > MAX_HISTORY) {
                    const oldest = await db.terminalHistory
                        .orderBy('executedAt')
                        .limit(count - MAX_HISTORY)
                        .toArray();
                    const oldestIds = oldest.map(h => h.id).filter((id): id is number => id !== undefined);
                    await db.terminalHistory.bulkDelete(oldestIds);
                }
            } catch (error) {
                console.error('Failed to save terminal history:', error);
            }
        }

        setHistoryIndex(-1);

        const parts = trimmed.split(' ');
        const command = (parts[0] ?? '').toLowerCase();
        const args = parts.slice(1).join(' ');

        switch (command) {
            case 'help':
                addOutput('Available commands:');
                addOutput('  help     - Display this help message');
                addOutput('  date     - Display current date');
                addOutput('  time     - Display current time');
                addOutput('  echo     - Display a message');
                addOutput('  clear    - Clear the screen');
                addOutput('  cls      - Clear the screen');
                addOutput('  whoami   - Display current user');
                addOutput('  ls       - List directory contents');
                addOutput('  dir      - List directory contents');
                addOutput('  pwd      - Print working directory');
                addOutput('  cd       - Change directory');
                addOutput('  mkdir    - Create a new directory');
                addOutput('  touch    - Create a new file');
                addOutput('  cat      - Display file contents');
                addOutput('  ver      - Display OS version');
                addOutput('  hostname - Display computer name');
                break;
            case 'date':
                addOutput(`The current date is: ${formatDateLong(new Date())}`);
                break;
            case 'time':
                addOutput(`The current time is: ${formatTimeLong(new Date())}`);
                break;
            case 'echo':
                addOutput(args || '');
                break;
            case 'clear':
            case 'cls':
                setOutput([]);
                break;
            case 'whoami':
                addOutput('WINDOWS15\\Guest');
                break;
            case 'ls':
            case 'dir': {
                try {
                    const files = await getFiles();
                    const targetPath = args ? parsePath(currentPath, args) : currentPath;
                    const folder =
                        targetPath.length === 0
                            ? files.find(f => f.id === 'root')
                            : findFolderByPath(files, targetPath);

                    if (!folder || folder.type !== 'folder') {
                        addOutput('The system cannot find the path specified.', 'error');
                        break;
                    }

                    addOutput(' Volume in drive C has no label.');
                    addOutput(' Volume Serial Number is WIN15-2024');
                    addOutput('');
                    addOutput(` Directory of ${getCurrentPrompt()}`);
                    addOutput('');
                    addOutput(`${formatDateLong(new Date())}  ${formatTimeLong(new Date())}    <DIR>          .`);
                    if (currentPath.length > 0) {
                        addOutput(`${formatDateLong(new Date())}  ${formatTimeLong(new Date())}    <DIR>          ..`);
                    }

                    const children = folder.children || [];
                    let fileCount = 0;
                    let dirCount = 0;

                    children.forEach(item => {
                        const date = formatDateLong(new Date());
                        const time = formatTimeLong(new Date());
                        if (item.type === 'folder') {
                            addOutput(`${date}  ${time}    <DIR>          ${item.name}`);
                            dirCount++;
                        } else {
                            const size = item.size || '0 bytes';
                            addOutput(`${date}  ${time}    ${size.padStart(14)}  ${item.name}`);
                            fileCount++;
                        }
                    });

                    addOutput(`               ${fileCount} File(s)`);
                    addOutput(`               ${dirCount + 2} Dir(s)   256,000,000 bytes free`);
                } catch {
                    addOutput('Error accessing filesystem', 'error');
                }
                break;
            }
            case 'pwd':
                addOutput(getCurrentPrompt());
                break;
            case 'cd': {
                if (!args) {
                    addOutput(getCurrentPrompt());
                    break;
                }

                try {
                    const files = await getFiles();
                    const newPath = parsePath(currentPath, args);

                    // Check if path exists and is a folder
                    if (newPath.length === 0) {
                        // Root directory
                        setCurrentPath([]);
                        break;
                    }

                    const folder = findFolderByPath(files, newPath);
                    if (!folder || folder.type !== 'folder') {
                        addOutput('The system cannot find the path specified.', 'error');
                        break;
                    }

                    setCurrentPath(newPath);
                } catch {
                    addOutput('Error accessing filesystem', 'error');
                }
                break;
            }
            case 'mkdir': {
                if (!args) {
                    addOutput('The syntax of the command is incorrect.', 'error');
                    break;
                }

                try {
                    const files = await getFiles();
                    const newPath = parsePath(currentPath, args);
                    const folderName = newPath[newPath.length - 1];
                    const parentPath = newPath.slice(0, -1);

                    if (!folderName) {
                        addOutput('The syntax of the command is incorrect.', 'error');
                        break;
                    }

                    // Find parent folder
                    const parentFolder =
                        parentPath.length === 0
                            ? files.find(f => f.id === 'root')
                            : findFolderByPath(files, parentPath);

                    if (!parentFolder || parentFolder.type !== 'folder') {
                        addOutput('The system cannot find the path specified.', 'error');
                        break;
                    }

                    // Check if folder already exists
                    const existingChild = parentFolder.children?.find(
                        c => c.name.toLowerCase() === folderName.toLowerCase()
                    );
                    if (existingChild) {
                        addOutput('A subdirectory or file already exists with that name.', 'error');
                        break;
                    }

                    // Create new folder
                    const newFolder: FileSystemItem = {
                        id: generateUuid(),
                        name: folderName,
                        type: 'folder',
                        children: [],
                    };

                    await saveFileToFolder(newFolder, parentFolder.id);
                    addOutput(`Directory created: ${folderName}`);
                } catch {
                    addOutput('Error creating directory', 'error');
                }
                break;
            }
            case 'touch': {
                if (!args) {
                    addOutput('The syntax of the command is incorrect.', 'error');
                    break;
                }

                try {
                    const files = await getFiles();
                    const newPath = parsePath(currentPath, args);
                    const fileName = newPath[newPath.length - 1];
                    const parentPath = newPath.slice(0, -1);

                    if (!fileName) {
                        addOutput('The syntax of the command is incorrect.', 'error');
                        break;
                    }

                    // Find parent folder
                    const parentFolder =
                        parentPath.length === 0
                            ? files.find(f => f.id === 'root')
                            : findFolderByPath(files, parentPath);

                    if (!parentFolder || parentFolder.type !== 'folder') {
                        addOutput('The system cannot find the path specified.', 'error');
                        break;
                    }

                    // Check if file already exists
                    const existingChild = parentFolder.children?.find(
                        c => c.name.toLowerCase() === fileName.toLowerCase()
                    );
                    if (existingChild) {
                        addOutput('A file or directory already exists with that name.', 'error');
                        break;
                    }

                    // Create new file
                    const newFile: FileSystemItem = {
                        id: generateUuid(),
                        name: fileName,
                        type: 'document',
                        content: '',
                        size: '0 bytes',
                        date: new Date().toISOString(),
                    };

                    await saveFileToFolder(newFile, parentFolder.id);
                    addOutput(`File created: ${fileName}`);
                } catch {
                    addOutput('Error creating file', 'error');
                }
                break;
            }
            case 'cat': {
                if (!args) {
                    addOutput('The syntax of the command is incorrect.', 'error');
                    break;
                }

                try {
                    const files = await getFiles();
                    const targetPath = parsePath(currentPath, args);
                    const fileName = targetPath[targetPath.length - 1];
                    const parentPath = targetPath.slice(0, -1);

                    if (!fileName) {
                        addOutput('The system cannot find the file specified.', 'error');
                        break;
                    }

                    // Find parent folder
                    const parentFolder =
                        parentPath.length === 0
                            ? files.find(f => f.id === 'root')
                            : findFolderByPath(files, parentPath);

                    if (!parentFolder || parentFolder.type !== 'folder') {
                        addOutput('The system cannot find the path specified.', 'error');
                        break;
                    }

                    // Find file
                    const file = parentFolder.children?.find(c => c.name.toLowerCase() === fileName.toLowerCase());
                    if (!file) {
                        addOutput('The system cannot find the file specified.', 'error');
                        break;
                    }

                    if (file.type === 'folder') {
                        addOutput('Access is denied.', 'error');
                        break;
                    }

                    // Display file content
                    addOutput(file.content || '');
                } catch {
                    addOutput('Error reading file', 'error');
                }
                break;
            }
            case 'ver':
                addOutput('');
                addOutput('Windows15 [Version 15.0.28500.1000]');
                break;
            case 'hostname':
                addOutput('DESKTOP-WIN15');
                break;
            default:
                addOutput(`'${command}' is not recognized as an internal or external command,`, 'error');
                addOutput('operable program or batch file.', 'error');
        }
        addOutput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Ctrl+C: Copy selection or do nothing (don't interrupt)
        if (e.ctrlKey && e.key === 'c') {
            const selection = getSelectedText();
            if (selection) {
                e.preventDefault();
                void copyToClipboard(selection);
            }
            return;
        }

        // Ctrl+V: Paste from clipboard
        if (e.ctrlKey && e.key === 'v') {
            e.preventDefault();
            void pasteFromClipboard();
            return;
        }

        // Ctrl+Shift+C: Copy all output
        if (e.ctrlKey && e.shiftKey && e.key === 'C') {
            e.preventDefault();
            void handleCopyAll();
            return;
        }

        if (e.key === 'Enter') {
            void executeCommand(input);
            setInput('');
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (commandHistory && commandHistory.length > 0) {
                const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
                setHistoryIndex(newIndex);
                setInput(commandHistory[newIndex] ?? '');
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (commandHistory && historyIndex !== -1) {
                const newIndex = historyIndex + 1;
                if (newIndex >= commandHistory.length) {
                    setHistoryIndex(-1);
                    setInput('');
                } else {
                    setHistoryIndex(newIndex);
                    setInput(commandHistory[newIndex] ?? '');
                }
            }
        }
    };

    return (
        <div
            className="h-full bg-black flex flex-col font-mono text-sm relative"
            onClick={() => inputRef.current?.focus()}
            onContextMenu={handleContextMenu}
        >
            <div ref={outputRef} className="flex-1 overflow-y-auto p-3 select-text">
                {output.map(line => (
                    <div
                        key={line.id}
                        className={`whitespace-pre-wrap ${
                            line.type === 'command'
                                ? 'text-cyan-300'
                                : line.type === 'error'
                                  ? 'text-red-400'
                                  : 'text-green-400'
                        }`}
                    >
                        {line.text || '\u00A0'}
                    </div>
                ))}
            </div>
            <div className="flex items-center p-3 pt-0">
                <span className="text-cyan-300">{getCurrentPrompt()}&gt;</span>
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-transparent text-green-400 outline-none ml-1 caret-green-400"
                    autoFocus
                    spellCheck={false}
                />
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="absolute bg-gray-800 border border-gray-600 rounded shadow-lg py-1 z-50"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={e => e.stopPropagation()}
                >
                    {contextMenu.hasSelection && (
                        <button
                            className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 flex items-center gap-2"
                            onClick={handleCopySelection}
                        >
                            <span className="material-symbols-outlined text-sm">content_copy</span>
                            Copy
                        </button>
                    )}
                    <button
                        className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 flex items-center gap-2"
                        onClick={handlePaste}
                    >
                        <span className="material-symbols-outlined text-sm">content_paste</span>
                        Paste
                    </button>
                    <button
                        className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 flex items-center gap-2"
                        onClick={handleCopyAll}
                    >
                        <span className="material-symbols-outlined text-sm">select_all</span>
                        Copy All Output
                    </button>
                    <button
                        className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 flex items-center gap-2"
                        onClick={handleSelectAll}
                    >
                        <span className="material-symbols-outlined text-sm">select_all</span>
                        Select All
                    </button>
                    <div className="border-t border-gray-600 my-1"></div>
                    <button
                        className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 flex items-center gap-2"
                        onClick={handleClearTerminal}
                    >
                        <span className="material-symbols-outlined text-sm">clear_all</span>
                        Clear
                    </button>
                </div>
            )}
        </div>
    );
};
