import React, { useState, useRef, useEffect } from 'react';
import { useLocalization } from '../context';
import { useDb } from '../context/DbContext';
import { useLiveQuery } from 'dexie-react-hooks';

interface OutputLine {
    id: number;
    type: 'command' | 'output' | 'error';
    text: string;
}

const MAX_HISTORY = 500;

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

    const addOutput = (text: string, type: 'command' | 'output' | 'error' = 'output') => {
        setOutput(prev => [...prev, { id: idCounter.current++, type, text }]);
    };

    const executeCommand = async (cmd: string) => {
        const trimmed = cmd.trim();
        if (!trimmed) return;

        addOutput(`C:\\Users\\Guest>${trimmed}`, 'command');

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
                    await db.terminalHistory.bulkDelete(oldest.map(h => h.id!));
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
            case 'dir':
                addOutput(' Volume in drive C has no label.');
                addOutput(' Volume Serial Number is WIN15-2024');
                addOutput('');
                addOutput(' Directory of C:\\Users\\Guest');
                addOutput('');
                addOutput('12/13/2024  10:30 AM    <DIR>          .');
                addOutput('12/13/2024  10:30 AM    <DIR>          ..');
                addOutput('12/13/2024  09:15 AM    <DIR>          Desktop');
                addOutput('12/13/2024  08:00 AM    <DIR>          Documents');
                addOutput('12/13/2024  07:45 AM    <DIR>          Downloads');
                addOutput('12/13/2024  06:30 AM    <DIR>          Pictures');
                addOutput('12/13/2024  05:00 AM    <DIR>          Music');
                addOutput('               0 File(s)              0 bytes');
                addOutput('               7 Dir(s)   256,000,000 bytes free');
                break;
            case 'pwd':
            case 'cd':
                addOutput('C:\\Users\\Guest');
                break;
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
        <div className="h-full bg-black flex flex-col font-mono text-sm" onClick={() => inputRef.current?.focus()}>
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
                <span className="text-cyan-300">C:\Users\Guest&gt;</span>
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
        </div>
    );
};
