import React from 'react';
import { useAsyncAction, useStandardHotkeys, useCopyToClipboard, useAppState, useFilePicker } from '../hooks';
import { useTranslation } from '../hooks/useTranslation';
import { TabSwitcher, ErrorBanner, SectionLabel, CopyButton, AppToolbar, TextArea } from '../components/ui';
import { FilePickerModal } from '../components';
import { saveFileToFolder } from '../utils/fileSystem';

interface Base64ToolState {
    input: string;
    output: string;
    mode: 'encode' | 'decode';
}

export const Base64Tool = () => {
    const { t } = useTranslation('base64Tool');
    const [state, setState] = useAppState<Base64ToolState>('base64Tool', {
        input: '',
        output: '',
        mode: 'encode',
    });
    const { input, output, mode } = state;
    const { execute, error, clearError } = useAsyncAction();
    const { copy } = useCopyToClipboard();
    const filePicker = useFilePicker();

    const encode = async () => {
        await execute(async () => {
            const encoded = btoa(unescape(encodeURIComponent(input)));
            await setState(prev => ({ ...prev, output: encoded }));
        });
    };

    const decode = async () => {
        await execute(async () => {
            const decoded = decodeURIComponent(escape(atob(input)));
            await setState(prev => ({ ...prev, output: decoded }));
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
        void setState({ input: output, output: '', mode });
        clearError();
    };

    const clear = () => {
        void setState({ input: '', output: '', mode });
        clearError();
    };

    const openFile = async () => {
        const file = await filePicker.open({
            title: 'Open File to Encode',
            extensions: ['.txt', '.json', '.md', '.csv', '.log', '.xml'],
        });
        if (file?.content) {
            await setState(prev => ({ ...prev, input: file.content ?? '', output: '' }));
            clearError();
        }
    };

    const saveOutput = async () => {
        if (!output) return;
        const file = await filePicker.save({
            title: mode === 'encode' ? 'Save Encoded Base64' : 'Save Decoded Text',
            content: output,
            defaultFileName: mode === 'encode' ? 'encoded.txt' : 'decoded.txt',
            defaultExtension: '.txt',
        });
        if (file) {
            await saveFileToFolder(file.path, { name: file.name, type: 'file', content: file.content ?? '' });
        }
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
                        { value: 'encode', label: t('encode') },
                        { value: 'decode', label: t('decode') },
                    ]}
                    value={mode}
                    onChange={newMode => void setState(prev => ({ ...prev, mode: newMode }))}
                    variant="secondary"
                    size="sm"
                />
                <button
                    onClick={openFile}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-sm transition-colors flex items-center gap-1"
                    title="Open file to encode/decode"
                >
                    <span className="material-symbols-outlined text-[16px]">folder_open</span>
                    Open
                </button>
                {output && (
                    <button
                        onClick={saveOutput}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-sm transition-colors flex items-center gap-1"
                        title="Save output"
                    >
                        <span className="material-symbols-outlined text-[16px]">save</span>
                        Save
                    </button>
                )}
                <button
                    onClick={clear}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-sm transition-colors"
                >
                    {t('clearAll')}
                </button>
            </AppToolbar>

            <div className="flex-1 flex flex-col min-h-0 p-4 gap-4">
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex justify-between items-center mb-2">
                        <SectionLabel className="mb-0">{mode === 'encode' ? t('textMode') : 'Base64'}</SectionLabel>
                        <span className="text-xs text-gray-500">{input.length} characters</span>
                    </div>
                    <TextArea
                        className="flex-1"
                        variant="code"
                        value={input}
                        onChange={e => void setState(prev => ({ ...prev, input: e.target.value }))}
                        placeholder={t('inputPlaceholder')}
                        spellCheck={false}
                    />
                </div>

                <div className="flex justify-center gap-3">
                    <button
                        onClick={handleAction}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        {mode === 'encode' ? `↓ ${t('encode')}` : `↓ ${t('decode')}`}
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
                        <SectionLabel className="mb-0">{t('outputLabel')}</SectionLabel>
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
                        placeholder={t('outputLabel')}
                    />
                </div>
            </div>

            {filePicker.state.isOpen && (
                <FilePickerModal
                    state={filePicker.state}
                    onNavigateTo={filePicker.navigateTo}
                    onSelectFile={filePicker.selectFile}
                    onSetFileName={filePicker.setFileName}
                    onConfirm={filePicker.confirm}
                    onCancel={filePicker.cancel}
                />
            )}
        </div>
    );
};
