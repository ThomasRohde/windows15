import React, { useState } from 'react';

export const Base64Tool = () => {
    const [input, setInput] = useState('');
    const [output, setOutput] = useState('');
    const [mode, setMode] = useState<'encode' | 'decode'>('encode');
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const encode = () => {
        try {
            const encoded = btoa(unescape(encodeURIComponent(input)));
            setOutput(encoded);
            setError(null);
        } catch (e) {
            setError('Failed to encode: ' + (e as Error).message);
            setOutput('');
        }
    };

    const decode = () => {
        try {
            const decoded = decodeURIComponent(escape(atob(input)));
            setOutput(decoded);
            setError(null);
        } catch (e) {
            setError('Invalid Base64 string');
            setOutput('');
        }
    };

    const handleAction = () => {
        if (mode === 'encode') {
            encode();
        } else {
            decode();
        }
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(output);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            setError('Failed to copy to clipboard');
        }
    };

    const swap = () => {
        setInput(output);
        setOutput('');
        setError(null);
    };

    const clear = () => {
        setInput('');
        setOutput('');
        setError(null);
    };

    return (
        <div className="h-full flex flex-col bg-[#1e1e1e] text-white">
            <div className="flex items-center gap-3 p-3 bg-[#2d2d2d] border-b border-white/10">
                <div className="flex bg-black/20 rounded overflow-hidden">
                    <button
                        onClick={() => setMode('encode')}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                            mode === 'encode' ? 'bg-blue-600' : 'hover:bg-white/10'
                        }`}
                    >
                        Encode
                    </button>
                    <button
                        onClick={() => setMode('decode')}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                            mode === 'decode' ? 'bg-blue-600' : 'hover:bg-white/10'
                        }`}
                    >
                        Decode
                    </button>
                </div>
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
                        onChange={(e) => setInput(e.target.value)}
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

                {error && (
                    <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-400">
                            {mode === 'encode' ? 'Encoded Base64' : 'Decoded Text'}
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{output.length} characters</span>
                            {output && (
                                <button
                                    onClick={copyToClipboard}
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
