import React, { useState } from 'react';
import { useCopyToClipboard, useAsyncAction } from '../hooks';
import { TabSwitcher, ErrorBanner } from '../components/ui';

export const Base64Tool = () => {
    const [input, setInput] = useState('');
    const [output, setOutput] = useState('');
    const [mode, setMode] = useState<'encode' | 'decode'>('encode');
    const { copy, copied } = useCopyToClipboard();
    const { execute, error, clearError } = useAsyncAction();

    const encode = async () => {
        await execute(async () => {
            const encoded = btoa(unescape(encodeURIComponent(input)));
            setOutput(encoded);
        });
    };

    const decode = async () => {
        await execute(async () => {
            const decoded = decodeURIComponent(escape(atob(input)));
            setOutput(decoded);
        });
    };

    const handleAction = async () => {
        if (mode === 'encode') {
            await encode();
        } else {
            await decode();
        }
    };

    const handleCopy = async () => {
        await execute(async () => {
            const ok = await copy(output);
            if (!ok) {
                throw new Error('Failed to copy to clipboard');
            }
        });
    };

    const swap = () => {
        setInput(output);
        setOutput('');
        clearError();
    };

    const clear = () => {
        setInput('');
        setOutput('');
        clearError();
    };

    return (
        <div className="h-full flex flex-col bg-background-dark text-white">
            <div className="flex items-center gap-3 p-3 bg-[#2d2d2d] border-b border-white/10">
                <TabSwitcher
                    options={[
                        { value: 'encode', label: 'Encode' },
                        { value: 'decode', label: 'Decode' },
                    ]}
                    value={mode}
                    onChange={setMode}
                    variant="secondary"
                    size="sm"
                />
                <div className="flex-1" />
                <button
                    onClick={clear}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-sm transition-colors"
                >
                    Clear All
                </button>
            </div>

            <div className="flex-1 flex flex-col min-h-0 p-4 gap-4">
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-400">
                            {mode === 'encode' ? 'Text to Encode' : 'Base64 to Decode'}
                        </span>
                        <span className="text-xs text-gray-500">{input.length} characters</span>
                    </div>
                    <textarea
                        className="flex-1 bg-black/20 rounded-lg resize-none border border-white/10 p-3 focus:outline-none focus:border-blue-500/50 font-mono text-sm text-white/90"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder={mode === 'encode' ? 'Enter text to encode...' : 'Enter Base64 string to decode...'}
                        spellCheck={false}
                    />
                </div>

                <div className="flex justify-center gap-3">
                    <button
                        onClick={handleAction}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        {mode === 'encode' ? '↓ Encode' : '↓ Decode'}
                    </button>
                    <button
                        onClick={swap}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                        title="Move output to input"
                    >
                        ⇅ Swap
                    </button>
                </div>

                {error && <ErrorBanner message={error} onDismiss={clearError} />}

                <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-400">
                            {mode === 'encode' ? 'Encoded Base64' : 'Decoded Text'}
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{output.length} characters</span>
                            {output && (
                                <button
                                    onClick={handleCopy}
                                    className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs transition-colors"
                                >
                                    {copied ? '✓ Copied!' : '📋 Copy'}
                                </button>
                            )}
                        </div>
                    </div>
                    <textarea
                        className="flex-1 bg-black/20 rounded-lg resize-none border border-white/10 p-3 focus:outline-none font-mono text-sm text-green-400"
                        value={output}
                        readOnly
                        placeholder="Output will appear here..."
                    />
                </div>
            </div>
        </div>
    );
};
