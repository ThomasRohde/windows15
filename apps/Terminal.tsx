import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocalization } from '../context';
import { useDb } from '../context/DbContext';
import { useOS } from '../context/OSContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTerminalPreferences, useContextMenu, useCopyToClipboard } from '../hooks';
import { ContextMenu } from '../components/ContextMenu';
import { TERMINAL_THEMES } from '../types/terminal';
import { getFiles, saveFileToFolder } from '../utils/fileSystem';
import type { FileSystemItem } from '../types';
import { generateUuid } from '../utils/uuid';

interface TerminalContextData {
    hasSelection: boolean;
}

interface OutputLine {
    id: number;
    type: 'command' | 'output' | 'error';
    text: string;
}

const MAX_HISTORY = 500;

// Available terminal commands for tab completion
const AVAILABLE_COMMANDS = [
    'help',
    'date',
    'time',
    'echo',
    'clear',
    'cls',
    'whoami',
    'ls',
    'dir',
    'pwd',
    'cd',
    'mkdir',
    'touch',
    'cat',
    'export',
    'alias',
    'unalias',
    'notepad',
    'calc',
    'calculator',
    'browser',
    'calendar',
    'start',
    'ver',
    'hostname',
    'theme',
    'fontsize',
    'font',
];

// Helper to find a folder by path
const findFolderByPath = (files: FileSystemItem[], path: string[]): FileSystemItem | null => {
    if (path.length === 0) return null;

    // Start from root's children
    const root = files.find(f => f.id === 'root');
    if (!root) return null;

    let current: FileSystemItem[] = root.children || [];
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
    const { openWindow, apps } = useOS();
    const { preferences, currentTheme, setTheme, setFontSize, setFontFamily, availableThemes, availableFonts } =
        useTerminalPreferences();
    const [input, setInput] = useState('');
    const [output, setOutput] = useState<OutputLine[]>([
        { id: 0, type: 'output', text: 'Windows15 Command Prompt [Version 15.0.28500.1000]' },
        { id: 1, type: 'output', text: '(c) 2024 Windows15 Corporation. All rights reserved.' },
        { id: 2, type: 'output', text: '' },
    ]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [currentPath, setCurrentPath] = useState<string[]>([]);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [suggestionIndex, setSuggestionIndex] = useState(-1);
    const [sessionId, setSessionId] = useState<number | null>(null);
    const [isSessionLoaded, setIsSessionLoaded] = useState(false);
    const outputRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const idCounter = useRef(3);
    const saveTimerRef = useRef<number | null>(null);

    const {
        menu: contextMenu,
        open: openContextMenu,
        close: closeContextMenu,
        menuProps,
        menuRef,
    } = useContextMenu<TerminalContextData>();

    // Load most recent session on mount
    useEffect(() => {
        const loadSession = async () => {
            if (!db || isSessionLoaded) return;

            try {
                const sessions = await db.$terminalSessions.orderBy('updatedAt').reverse().limit(1).toArray();
                if (sessions.length > 0 && sessions[0]) {
                    const session = sessions[0];
                    const parsedOutput = JSON.parse(session.output) as OutputLine[];
                    setOutput(parsedOutput);
                    setSessionId(session.id ?? null);
                    // Update idCounter to continue from the highest ID
                    const maxId = Math.max(...parsedOutput.map(line => line.id), 2);
                    idCounter.current = maxId + 1;
                } else {
                    // Create a new session
                    const now = Date.now();
                    const id = await db.$terminalSessions.add({
                        output: JSON.stringify(output),
                        createdAt: now,
                        updatedAt: now,
                    });
                    setSessionId(id);
                }
            } catch (error) {
                console.error('Failed to load terminal session:', error);
            }

            setIsSessionLoaded(true);
        };

        void loadSession();
    }, [db, isSessionLoaded, output]);

    // Save session periodically and on unmount
    useEffect(() => {
        if (!db || !sessionId || !isSessionLoaded) return;

        const saveSession = async () => {
            try {
                await db.$terminalSessions.update(sessionId, {
                    output: JSON.stringify(output),
                    updatedAt: Date.now(),
                });
            } catch (error) {
                console.error('Failed to save terminal session:', error);
            }
        };

        // Clear any existing timer
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
        }

        // Schedule save after 2 seconds of inactivity
        saveTimerRef.current = window.setTimeout(() => {
            void saveSession();
        }, 2000);

        // Save on unmount
        return () => {
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
            }
            void saveSession();
        };
    }, [db, sessionId, output, isSessionLoaded]);

    // Load command history from IndexedDB
    const commandHistory = useLiveQuery(
        async () => {
            if (!db) return [];
            const history = await db.$terminalHistory.orderBy('executedAt').toArray();
            return history.map(h => h.command);
        },
        [db],
        []
    );

    // Load aliases from IndexedDB
    const aliases = useLiveQuery(
        async () => {
            if (!db) return {};
            const aliasRecords = await db.$terminalAliases.toArray();
            return Object.fromEntries(aliasRecords.map(a => [a.name, a.command]));
        },
        [db],
        {}
    );

    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [output]);

    const { copy, paste } = useCopyToClipboard();

    const getSelectedText = (): string => {
        return window.getSelection()?.toString() || '';
    };

    const copyToClipboard = async (text: string): Promise<void> => {
        const ok = await copy(text);
        if (!ok) console.error('Failed to copy to clipboard');
    };

    const pasteFromClipboard = async (): Promise<void> => {
        const text = await paste();
        if (text === null) {
            console.error('Failed to read from clipboard');
            return;
        }
        setInput(prev => prev + text);
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        const selection = getSelectedText();
        openContextMenu(e, { hasSelection: selection.length > 0 });
    };

    const handleCopySelection = async () => {
        const selection = getSelectedText();
        if (selection) {
            await copyToClipboard(selection);
        }
        closeContextMenu();
    };

    const handleCopyAll = async () => {
        const allText = output.map(line => line.text).join('\n');
        await copyToClipboard(allText);
        closeContextMenu();
    };

    const handlePaste = async () => {
        await pasteFromClipboard();
        closeContextMenu();
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
        closeContextMenu();
    };

    const handleClearTerminal = () => {
        setOutput([]);
        closeContextMenu();
    };

    const addOutput = (text: string, type: 'command' | 'output' | 'error' = 'output') => {
        setOutput(prev => [...prev, { id: idCounter.current++, type, text }]);
    };

    const getCurrentPrompt = useCallback(() => {
        return `C:\\${currentPath.join('\\')}`;
    }, [currentPath]);

    const getCommandSuggestions = useCallback((input: string): string[] => {
        const trimmed = input.trim().toLowerCase();
        if (!trimmed) return AVAILABLE_COMMANDS;
        return AVAILABLE_COMMANDS.filter(cmd => cmd.startsWith(trimmed));
    }, []);

    const exportSession = useCallback(() => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `terminal-session-${timestamp}.txt`;
        const content = output.map(line => line.text).join('\n');
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }, [output]);

    const executeCommand = async (cmd: string) => {
        const trimmed = cmd.trim();
        if (!trimmed) return;

        addOutput(`${getCurrentPrompt()}>${trimmed}`, 'command');

        // Expand aliases
        let expandedCmd = trimmed;
        const firstWord = trimmed.split(' ')[0]?.toLowerCase();
        if (firstWord && aliases && typeof aliases === 'object' && firstWord in aliases) {
            const aliasValue = aliases[firstWord as keyof typeof aliases];
            const restOfCommand = trimmed.substring(firstWord.length).trim();
            expandedCmd = restOfCommand ? `${aliasValue} ${restOfCommand}` : aliasValue;
        }

        // Save command to database with FIFO eviction
        if (db) {
            try {
                // Add new command to history
                await db.$terminalHistory.add({
                    command: trimmed,
                    executedAt: Date.now(),
                });

                // Enforce MAX_HISTORY limit (FIFO eviction)
                const count = await db.$terminalHistory.count();
                if (count > MAX_HISTORY) {
                    const oldest = await db.$terminalHistory
                        .orderBy('executedAt')
                        .limit(count - MAX_HISTORY)
                        .toArray();
                    const oldestIds = oldest.map(h => h.id).filter((id): id is number => id !== undefined);
                    await db.$terminalHistory.bulkDelete(oldestIds);
                }
            } catch (error) {
                console.error('Failed to save terminal history:', error);
            }
        }

        setHistoryIndex(-1);

        const parts = expandedCmd.split(' ');
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
                addOutput('  export   - Export terminal session to file');
                addOutput('  alias    - Define or list command aliases');
                addOutput('  unalias  - Remove a command alias');
                addOutput('  theme    - Change terminal color scheme');
                addOutput('  fontsize - Change terminal font size (10-18)');
                addOutput('  font     - Change terminal font family');
                addOutput('  notepad  - Open Notepad app (optionally with filename)');
                addOutput('  calc     - Open Calculator app');
                addOutput('  browser  - Open Browser app (optionally with URL)');
                addOutput('  calendar - Open Calendar app');
                addOutput('  start    - Launch any Windows15 app by ID');
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
            case 'theme': {
                const themeArg = args.trim().toLowerCase();
                if (!themeArg) {
                    // Show current theme and list available themes
                    addOutput(`Current theme: ${preferences.theme}`);
                    addOutput('');
                    addOutput('Available themes:');
                    availableThemes.forEach(theme => {
                        const marker = theme.name === preferences.theme ? ' (active)' : '';
                        addOutput(`  ${theme.name.padEnd(12)} - ${theme.displayName}${marker}`);
                    });
                    addOutput('');
                    addOutput('Usage: theme <name>');
                    break;
                }

                // Try to set the theme
                if (TERMINAL_THEMES[themeArg]) {
                    void setTheme(themeArg).then(success => {
                        if (success) {
                            addOutput(`Theme changed to: ${themeArg}`);
                        } else {
                            addOutput('Failed to save theme preference.', 'error');
                        }
                    });
                } else {
                    addOutput(`Unknown theme: ${themeArg}`, 'error');
                    addOutput('Use "theme" to see available themes.');
                }
                break;
            }
            case 'fontsize': {
                const sizeArg = args.trim();
                if (!sizeArg) {
                    addOutput(`Current font size: ${preferences.fontSize}px`);
                    addOutput('Usage: fontsize <10-18>');
                    break;
                }

                const size = parseInt(sizeArg, 10);
                if (isNaN(size) || size < 10 || size > 18) {
                    addOutput('Font size must be between 10 and 18.', 'error');
                    break;
                }

                void setFontSize(size).then(success => {
                    if (success) {
                        addOutput(`Font size changed to: ${size}px`);
                    } else {
                        addOutput('Failed to save font size preference.', 'error');
                    }
                });
                break;
            }
            case 'font': {
                const fontArg = args.trim();
                if (!fontArg) {
                    addOutput(`Current font: ${preferences.fontFamily}`);
                    addOutput('');
                    addOutput('Available fonts:');
                    availableFonts.forEach(font => {
                        const marker = font === preferences.fontFamily ? ' (active)' : '';
                        addOutput(`  ${font}${marker}`);
                    });
                    addOutput('');
                    addOutput('Usage: font <name>');
                    break;
                }

                // Find matching font (case-insensitive)
                const matchedFont = availableFonts.find(f => f.toLowerCase() === fontArg.toLowerCase());
                if (matchedFont) {
                    void setFontFamily(matchedFont).then(success => {
                        if (success) {
                            addOutput(`Font changed to: ${matchedFont}`);
                        } else {
                            addOutput('Failed to save font preference.', 'error');
                        }
                    });
                } else {
                    addOutput(`Unknown font: ${fontArg}`, 'error');
                    addOutput('Use "font" to see available fonts.');
                }
                break;
            }
            case 'export':
                exportSession();
                addOutput('Terminal session exported successfully.');
                break;
            case 'alias': {
                if (!db) {
                    addOutput('Database not available.', 'error');
                    break;
                }

                if (!args) {
                    // List all aliases
                    if (aliases && Object.keys(aliases).length > 0) {
                        addOutput('Defined aliases:');
                        Object.entries(aliases).forEach(([name, cmd]) => {
                            addOutput(`  ${name}='${cmd}'`);
                        });
                    } else {
                        addOutput('No aliases defined.');
                    }
                    break;
                }

                // Define a new alias: alias name='command'
                const match = args.match(/^(\w+)=(.+)$/);
                if (!match) {
                    addOutput('Usage: alias name=command', 'error');
                    break;
                }

                const [, aliasName, aliasCmd] = match;
                if (!aliasName || !aliasCmd) {
                    addOutput('Usage: alias name=command', 'error');
                    break;
                }

                // Remove quotes if present
                const cleanCmd = aliasCmd.replace(/^['"]|['"]$/g, '');

                try {
                    const now = Date.now();
                    await db.$terminalAliases.put({
                        name: aliasName.toLowerCase(),
                        command: cleanCmd,
                        createdAt: now,
                        updatedAt: now,
                    });
                    addOutput(`Alias created: ${aliasName}='${cleanCmd}'`);
                } catch {
                    addOutput('Failed to create alias.', 'error');
                }
                break;
            }
            case 'unalias': {
                if (!db) {
                    addOutput('Database not available.', 'error');
                    break;
                }

                if (!args) {
                    addOutput('Usage: unalias <name>', 'error');
                    break;
                }

                const aliasName = args.trim().toLowerCase();
                try {
                    await db.$terminalAliases.delete(aliasName);
                    addOutput(`Alias removed: ${aliasName}`);
                } catch {
                    addOutput('Failed to remove alias.', 'error');
                }
                break;
            }
            case 'notepad': {
                const filename = args.trim();
                if (filename) {
                    // TODO: Pass filename to Notepad app
                    openWindow('notepad', { filename });
                    addOutput(`Opening Notepad with file: ${filename}`);
                } else {
                    openWindow('notepad');
                    addOutput('Opening Notepad...');
                }
                break;
            }
            case 'calc':
            case 'calculator':
                openWindow('calculator');
                addOutput('Opening Calculator...');
                break;
            case 'browser': {
                const url = args.trim();
                if (url) {
                    // TODO: Pass URL to Browser app
                    openWindow('browser', { url });
                    addOutput(`Opening Browser with URL: ${url}`);
                } else {
                    openWindow('browser');
                    addOutput('Opening Browser...');
                }
                break;
            }
            case 'calendar':
                openWindow('calendar');
                addOutput('Opening Calendar...');
                break;
            case 'start': {
                if (!args) {
                    addOutput('Usage: start <app-id>', 'error');
                    addOutput('Available apps:');
                    apps.forEach(app => {
                        addOutput(`  ${app.id.padEnd(15)} - ${app.title}`);
                    });
                    break;
                }

                const appId = args.trim().toLowerCase();
                const app = apps.find(a => a.id === appId);
                if (!app) {
                    addOutput(`App not found: ${appId}`, 'error');
                    break;
                }

                openWindow(appId);
                addOutput(`Opening ${app.title}...`);
                break;
            }
            default:
                addOutput(`'${command}' is not recognized as an internal or external command,`, 'error');
                addOutput('operable program or batch file.', 'error');
        }
        addOutput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Tab: Trigger command completion
        if (e.key === 'Tab') {
            e.preventDefault();
            const matches = getCommandSuggestions(input);

            if (matches.length === 0) {
                // No matches
                return;
            } else if (matches.length === 1) {
                // Single match - auto-complete
                setInput(matches[0] + ' ');
                setSuggestions([]);
                setSuggestionIndex(-1);
            } else if (suggestions.length > 0 && suggestionIndex >= 0) {
                // Cycle through suggestions
                const nextIndex = (suggestionIndex + 1) % suggestions.length;
                setSuggestionIndex(nextIndex);
                setInput(suggestions[nextIndex] + ' ');
            } else {
                // Multiple matches - show suggestions
                setSuggestions(matches);
                setSuggestionIndex(0);
                setInput(matches[0] + ' ');
            }
            return;
        }

        // Escape: Clear suggestions
        if (e.key === 'Escape') {
            setSuggestions([]);
            setSuggestionIndex(-1);
            return;
        }

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
            setSuggestions([]);
            setSuggestionIndex(-1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            // Clear suggestions when navigating history
            setSuggestions([]);
            setSuggestionIndex(-1);
            if (commandHistory && commandHistory.length > 0) {
                const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
                setHistoryIndex(newIndex);
                setInput(commandHistory[newIndex] ?? '');
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            // Clear suggestions when navigating history
            setSuggestions([]);
            setSuggestionIndex(-1);
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

    const handleInputChange = (value: string) => {
        setInput(value);
        // Clear suggestions when user types
        setSuggestions([]);
        setSuggestionIndex(-1);
    };

    return (
        <div
            className="h-full flex flex-col text-sm relative"
            style={{
                backgroundColor: currentTheme.backgroundColor,
                fontFamily: preferences.fontFamily,
                fontSize: `${preferences.fontSize}px`,
            }}
            onClick={() => inputRef.current?.focus()}
            onContextMenu={handleContextMenu}
        >
            <div ref={outputRef} className="flex-1 overflow-y-auto p-3 select-text">
                {output.map(line => (
                    <div
                        key={line.id}
                        className="whitespace-pre-wrap"
                        style={{
                            color:
                                line.type === 'command'
                                    ? currentTheme.commandColor
                                    : line.type === 'error'
                                      ? currentTheme.errorColor
                                      : currentTheme.textColor,
                        }}
                    >
                        {line.text || '\u00A0'}
                    </div>
                ))}
            </div>
            <div className="relative flex items-center p-3 pt-0">
                <span style={{ color: currentTheme.promptColor }}>{getCurrentPrompt()}&gt;</span>
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => handleInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-transparent outline-none ml-1"
                    style={{
                        color: currentTheme.textColor,
                        caretColor: currentTheme.textColor,
                        fontFamily: preferences.fontFamily,
                        fontSize: `${preferences.fontSize}px`,
                    }}
                    autoFocus
                    spellCheck={false}
                />
                {/* Tab completion suggestions */}
                {suggestions.length > 0 && (
                    <div className="absolute bottom-full left-0 mb-1 bg-gray-800 border border-gray-600 rounded shadow-lg py-1 z-50 min-w-[200px]">
                        <div className="px-3 py-1 text-xs text-gray-400 border-b border-gray-600">
                            Press Tab to cycle ({suggestions.length} matches)
                        </div>
                        {suggestions.map((suggestion, idx) => (
                            <div
                                key={suggestion}
                                className={`px-3 py-1 ${
                                    idx === suggestionIndex
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-300 hover:bg-gray-700'
                                }`}
                            >
                                {suggestion}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <ContextMenu ref={menuRef} position={contextMenu.position} onClose={closeContextMenu} {...menuProps}>
                    {contextMenu.data?.hasSelection && (
                        <ContextMenu.Item icon="content_copy" onClick={handleCopySelection}>
                            Copy
                        </ContextMenu.Item>
                    )}
                    <ContextMenu.Item icon="content_paste" onClick={handlePaste}>
                        Paste
                    </ContextMenu.Item>
                    <ContextMenu.Item icon="select_all" onClick={handleCopyAll}>
                        Copy All Output
                    </ContextMenu.Item>
                    <ContextMenu.Item icon="select_all" onClick={handleSelectAll}>
                        Select All
                    </ContextMenu.Item>
                    <ContextMenu.Separator />
                    {/* Theme submenu */}
                    <ContextMenu.Submenu icon="palette" label="Theme">
                        {availableThemes.map(theme => (
                            <ContextMenu.Item
                                key={theme.name}
                                onClick={() => {
                                    void setTheme(theme.name);
                                    closeContextMenu();
                                }}
                            >
                                <span className="flex items-center gap-2 w-full">
                                    <span
                                        className="w-3 h-3 rounded-full border border-gray-500"
                                        style={{ backgroundColor: theme.textColor }}
                                    />
                                    {theme.displayName.split(' ')[0]}
                                    {preferences.theme === theme.name && (
                                        <span className="material-symbols-outlined text-sm ml-auto">check</span>
                                    )}
                                </span>
                            </ContextMenu.Item>
                        ))}
                    </ContextMenu.Submenu>
                    {/* Font Size submenu */}
                    <ContextMenu.Submenu icon="format_size" label={`Font Size (${preferences.fontSize}px)`}>
                        {[10, 12, 14, 16, 18].map(size => (
                            <ContextMenu.Item
                                key={size}
                                onClick={() => {
                                    void setFontSize(size);
                                    closeContextMenu();
                                }}
                            >
                                <span className="flex items-center gap-2 w-full">
                                    {size}px
                                    {preferences.fontSize === size && (
                                        <span className="material-symbols-outlined text-sm ml-auto">check</span>
                                    )}
                                </span>
                            </ContextMenu.Item>
                        ))}
                    </ContextMenu.Submenu>
                    {/* Font Family submenu */}
                    <ContextMenu.Submenu icon="text_fields" label="Font">
                        {availableFonts.map(font => (
                            <ContextMenu.Item
                                key={font}
                                onClick={() => {
                                    void setFontFamily(font);
                                    closeContextMenu();
                                }}
                            >
                                <span className="flex items-center gap-2 w-full" style={{ fontFamily: font }}>
                                    {font}
                                    {preferences.fontFamily === font && (
                                        <span className="material-symbols-outlined text-sm ml-auto">check</span>
                                    )}
                                </span>
                            </ContextMenu.Item>
                        ))}
                    </ContextMenu.Submenu>
                    <ContextMenu.Separator />
                    <ContextMenu.Item
                        icon="download"
                        onClick={() => {
                            exportSession();
                            closeContextMenu();
                        }}
                    >
                        Export Session
                    </ContextMenu.Item>
                    <ContextMenu.Item icon="clear_all" onClick={handleClearTerminal}>
                        Clear
                    </ContextMenu.Item>
                </ContextMenu>
            )}
        </div>
    );
};
