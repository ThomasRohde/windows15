import React, { useState } from 'react';
import { useAsyncAction, useStandardHotkeys, useCopyToClipboard } from '../hooks';
import { TabSwitcher, ErrorBanner, SectionLabel, CopyButton, AppToolbar, TextArea } from '../components/ui';

export const Base64Tool = () => {
    const [input, setInput] = useState('');
    const [output, setOutput] = useState('');
    const [mode, setMode] = useState<'encode' | 'decode'>('encode');
    const { execute, error, clearError } = useAsyncAction();
    const { copy } = useCopyToClipboard();

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

    // Keyboard shortcuts (F140)
    useStandardHotkeys({
        onCopy: output ? () => void copy(output) : undefined,
        onClear: clear,
    });

    return (
        <div className="h-full flex flex-col bg-background-dark text-white">
            <AppToolbar>
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
                <button
                    onClick={clear}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-sm transition-colors"
                >
                    Clear All
                </button>
            </AppToolbar>

            <div className="flex-1 flex flex-col min-h-0 p-4 gap-4">
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex justify-between items-center mb-2">
                        <SectionLabel className="mb-0">
                            {mode === 'encode' ? 'Text to Encode' : 'Base64 to Decode'}
                        </SectionLabel>
                        <span className="text-xs text-gray-500">{input.length} characters</span>
                    </div>
                    <TextArea
                        className="flex-1"
                        variant="code"
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
                        <SectionLabel className="mb-0">
                            {mode === 'encode' ? 'Encoded Base64' : 'Decoded Text'}
                        </SectionLabel>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{output.length} characters</span>
                            {output && <CopyButton value={output} size="sm" className="!text-xs !px-2 !py-1" />}
                        </div>
                    </div>
                    <TextArea
                        className="flex-1 text-green-400"
                        variant="code"
                        value={output}
                        readOnly
                        placeholder="Output will appear here..."
                    />
                </div>
            </div>
        </div>
    );
};
