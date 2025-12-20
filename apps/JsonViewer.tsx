import React, { useState } from 'react';
import { useAsyncAction, useAppState, useFilePicker, usePhoneMode } from '../hooks';
import { useTranslation } from '../hooks/useTranslation';
import { AppToolbar, TextArea } from '../components/ui';
import { FilePickerModal } from '../components';

interface JsonNodeProps {
    data: unknown;
    keyName?: string | number;
    level: number;
    isPhone?: boolean;
}

const JsonNode: React.FC<JsonNodeProps> = ({ data, keyName, level, isPhone }) => {
    const [collapsed, setCollapsed] = useState(false);

    const getType = (value: unknown): string => {
        if (value === null) return 'null';
        if (Array.isArray(value)) return 'array';
        return typeof value;
    };

    const getColor = (type: string): string => {
        switch (type) {
            case 'string':
                return 'text-green-400';
            case 'number':
                return 'text-orange-400';
            case 'boolean':
                return 'text-blue-400';
            case 'null':
                return 'text-gray-500';
            default:
                return 'text-white';
        }
    };

    const type = getType(data);
    const isExpandable = type === 'object' || type === 'array';
    const indent = level * (isPhone ? 12 : 16);

    // F249: Phone-friendly sizing
    const nodeClasses = isPhone ? 'min-h-[44px] py-2 text-base' : '';

    if (!isExpandable) {
        return (
            <div style={{ paddingLeft: indent }} className={`flex gap-1 items-center ${nodeClasses}`}>
                {keyName !== undefined && <span className="text-purple-400">"{keyName}"</span>}
                {keyName !== undefined && <span className="text-white">: </span>}
                <span className={`${getColor(type)} ${isPhone ? 'break-all' : ''}`}>
                    {type === 'string' ? `"${data}"` : String(data)}
                </span>
            </div>
        );
    }

    const entries =
        type === 'array' ? (data as unknown[]).map((v, i) => [i, v]) : Object.entries(data as Record<string, unknown>);
    const bracket = type === 'array' ? ['[', ']'] : ['{', '}'];

    return (
        <div>
            <div
                style={{ paddingLeft: indent }}
                className={`flex gap-1 cursor-pointer hover:bg-white/5 items-center ${nodeClasses}`}
                onClick={() => setCollapsed(!collapsed)}
            >
                <span className={`text-gray-500 ${isPhone ? 'w-6 text-lg' : 'w-4'}`}>{collapsed ? '▶' : '▼'}</span>
                {keyName !== undefined && <span className="text-purple-400">"{keyName}"</span>}
                {keyName !== undefined && <span className="text-white">: </span>}
                <span className="text-white">{bracket[0]}</span>
                {collapsed && (
                    <span className="text-gray-500">
                        {type === 'array'
                            ? `${(data as unknown[]).length} ${(data as unknown[]).length === 1 ? 'item' : 'items'}`
                            : `${Object.keys(data as Record<string, unknown>).length} ${Object.keys(data as Record<string, unknown>).length === 1 ? 'key' : 'keys'}`}
                    </span>
                )}
                {collapsed && <span className="text-white">{bracket[1]}</span>}
            </div>
            {!collapsed && (
                <>
                    {entries.map(([entryKey, value], idx) => (
                        <JsonNode
                            key={idx}
                            data={value}
                            keyName={type === 'object' ? (entryKey as string) : undefined}
                            level={level + 1}
                            isPhone={isPhone}
                        />
                    ))}
                    <div style={{ paddingLeft: indent }} className={`text-white ${nodeClasses}`}>
                        {bracket[1]}
                    </div>
                </>
            )}
        </div>
    );
};

interface JsonViewerState {
    input: string;
    view: 'tree' | 'formatted';
}

export const JsonViewer = () => {
    const { t } = useTranslation('jsonViewer');
    const isPhone = usePhoneMode();
    const [state, setState] = useAppState<JsonViewerState>('jsonViewer', {
        input: '',
        view: 'tree',
    });
    const { input, view } = state;
    const [parsedJson, setParsedJson] = useState<unknown>(null);
    const { execute, error } = useAsyncAction();
    const filePicker = useFilePicker();

    const parseJson = async () => {
        if (!input.trim()) {
            throw new Error(t('invalidJson'));
        }
        await execute(async () => {
            const parsed = JSON.parse(input);
            setParsedJson(parsed);
        });
    };

    const formatJson = async () => {
        await execute(async () => {
            const parsed = JSON.parse(input);
            await setState(prev => ({ ...prev, input: JSON.stringify(parsed, null, 2) }));
        });
    };

    const minifyJson = async () => {
        await execute(async () => {
            const parsed = JSON.parse(input);
            await setState(prev => ({ ...prev, input: JSON.stringify(parsed) }));
        });
    };

    const openFile = async () => {
        const file = await filePicker.open({
            title: 'Open JSON File',
            extensions: ['.json'],
        });
        if (file?.content) {
            await setState(prev => ({ ...prev, input: file.content ?? '' }));
            setParsedJson(null);
        }
    };

    const saveFile = async () => {
        if (!input) return;
        await filePicker.save({
            title: 'Save JSON File',
            content: input,
            defaultFileName: 'data.json',
            defaultExtension: '.json',
        });
    };

    return (
        <div className="h-full flex flex-col bg-background-dark text-white">
            <AppToolbar>
                <button
                    onClick={openFile}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-sm transition-colors flex items-center gap-1"
                    title="Open JSON file"
                >
                    <span className="material-symbols-outlined text-[16px]">folder_open</span>
                    Open
                </button>
                {input && (
                    <button
                        onClick={saveFile}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-sm transition-colors flex items-center gap-1"
                        title="Save JSON file"
                    >
                        <span className="material-symbols-outlined text-[16px]">save</span>
                        Save
                    </button>
                )}
                <button
                    onClick={parseJson}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium transition-colors"
                >
                    {t('loadJson')}
                </button>
                <button
                    onClick={formatJson}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-sm font-medium transition-colors"
                >
                    {t('formatJson')}
                </button>
                <button
                    onClick={minifyJson}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-sm font-medium transition-colors"
                >
                    {t('minifyJson')}
                </button>
                <div className="flex bg-black/20 rounded overflow-hidden">
                    <button
                        onClick={() => void setState(prev => ({ ...prev, view: 'tree' }))}
                        className={`px-3 py-1.5 text-sm transition-colors ${view === 'tree' ? 'bg-white/20' : 'hover:bg-white/10'}`}
                    >
                        {t('expandAll')}
                    </button>
                    <button
                        onClick={() => void setState(prev => ({ ...prev, view: 'formatted' }))}
                        className={`px-3 py-1.5 text-sm transition-colors ${view === 'formatted' ? 'bg-white/20' : 'hover:bg-white/10'}`}
                    >
                        {t('formatJson')}
                    </button>
                </div>
            </AppToolbar>

            {/* F249: Responsive layout - stack on phone */}
            <div className={`flex-1 flex ${isPhone ? 'flex-col' : ''} min-h-0`}>
                <div
                    className={`${isPhone ? 'h-1/3 min-h-[120px]' : 'w-1/2'} flex flex-col ${isPhone ? 'border-b' : 'border-r'} border-white/10`}
                >
                    <div className="px-3 py-2 text-xs text-gray-400 bg-black/20">{t('pasteJson')}</div>
                    <TextArea
                        className="flex-1 bg-transparent border-none"
                        variant="code"
                        value={input}
                        onChange={e => void setState(prev => ({ ...prev, input: e.target.value }))}
                        placeholder='{"key": "value"}'
                        spellCheck={false}
                    />
                </div>

                <div className={`${isPhone ? 'flex-1' : 'w-1/2'} flex flex-col min-h-0`}>
                    <div className="px-3 py-2 text-xs text-gray-400 bg-black/20">{t('validJson')}</div>
                    <div
                        className={`flex-1 overflow-auto p-3 font-mono ${isPhone ? 'text-base' : 'text-sm'} overflow-x-auto`}
                    >
                        {error && (
                            <div className="bg-red-500/20 border border-red-500/50 rounded p-3 text-red-400">
                                <div className="font-medium mb-1">{t('invalidJson')}</div>
                                <div className="text-xs">{error}</div>
                            </div>
                        )}
                        {parsedJson !== null &&
                            !error &&
                            (view === 'tree' ? (
                                <JsonNode data={parsedJson} level={0} isPhone={isPhone} />
                            ) : (
                                <pre className="text-green-400 whitespace-pre-wrap">
                                    {JSON.stringify(parsedJson, null, 2)}
                                </pre>
                            ))}
                    </div>
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
