import React, { useState } from 'react';
import { useAsyncAction } from '../hooks';
import { AppToolbar } from '../components/ui';

interface JsonNodeProps {
    data: unknown;
    keyName?: string | number;
    level: number;
}

const JsonNode: React.FC<JsonNodeProps> = ({ data, keyName, level }) => {
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
    const indent = level * 16;

    if (!isExpandable) {
        return (
            <div style={{ paddingLeft: indent }} className="flex gap-1">
                {keyName !== undefined && <span className="text-purple-400">"{keyName}"</span>}
                {keyName !== undefined && <span className="text-white">: </span>}
                <span className={getColor(type)}>{type === 'string' ? `"${data}"` : String(data)}</span>
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
                className="flex gap-1 cursor-pointer hover:bg-white/5"
                onClick={() => setCollapsed(!collapsed)}
            >
                <span className="text-gray-500 w-4">{collapsed ? '▶' : '▼'}</span>
                {keyName !== undefined && <span className="text-purple-400">"{keyName}"</span>}
                {keyName !== undefined && <span className="text-white">: </span>}
                <span className="text-white">{bracket[0]}</span>
                {collapsed && (
                    <span className="text-gray-500">
                        {type === 'array'
                            ? `${(data as unknown[]).length} items`
                            : `${Object.keys(data as Record<string, unknown>).length} keys`}
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
                            keyName={type === 'object' ? entryKey : undefined}
                            level={level + 1}
                        />
                    ))}
                    <div style={{ paddingLeft: indent }} className="text-white">
                        {bracket[1]}
                    </div>
                </>
            )}
        </div>
    );
};

export const JsonViewer = () => {
    const [input, setInput] = useState('');
    const [parsedJson, setParsedJson] = useState<unknown>(null);
    const [view, setView] = useState<'tree' | 'formatted'>('tree');
    const { execute, error } = useAsyncAction();

    const parseJson = async () => {
        if (!input.trim()) {
            throw new Error('Please enter JSON to parse');
        }
        await execute(async () => {
            const parsed = JSON.parse(input);
            setParsedJson(parsed);
        });
    };

    const formatJson = async () => {
        await execute(async () => {
            const parsed = JSON.parse(input);
            setInput(JSON.stringify(parsed, null, 2));
        });
    };

    const minifyJson = async () => {
        await execute(async () => {
            const parsed = JSON.parse(input);
            setInput(JSON.stringify(parsed));
        });
    };

    return (
        <div className="h-full flex flex-col bg-background-dark text-white">
            <AppToolbar>
                <button
                    onClick={parseJson}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium transition-colors"
                >
                    Parse
                </button>
                <button
                    onClick={formatJson}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-sm font-medium transition-colors"
                >
                    Format
                </button>
                <button
                    onClick={minifyJson}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-sm font-medium transition-colors"
                >
                    Minify
                </button>
                <div className="flex bg-black/20 rounded overflow-hidden">
                    <button
                        onClick={() => setView('tree')}
                        className={`px-3 py-1.5 text-sm transition-colors ${view === 'tree' ? 'bg-white/20' : 'hover:bg-white/10'}`}
                    >
                        Tree
                    </button>
                    <button
                        onClick={() => setView('formatted')}
                        className={`px-3 py-1.5 text-sm transition-colors ${view === 'formatted' ? 'bg-white/20' : 'hover:bg-white/10'}`}
                    >
                        Formatted
                    </button>
                </div>
            </AppToolbar>

            <div className="flex-1 flex min-h-0">
                <div className="w-1/2 flex flex-col border-r border-white/10">
                    <div className="px-3 py-2 text-xs text-gray-400 bg-black/20">Input JSON</div>
                    <textarea
                        className="flex-1 bg-transparent resize-none border-none p-3 focus:outline-none font-mono text-sm text-white/90"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder='{"key": "value"}'
                        spellCheck={false}
                    />
                </div>

                <div className="w-1/2 flex flex-col min-h-0">
                    <div className="px-3 py-2 text-xs text-gray-400 bg-black/20">Output</div>
                    <div className="flex-1 overflow-auto p-3 font-mono text-sm">
                        {error && (
                            <div className="bg-red-500/20 border border-red-500/50 rounded p-3 text-red-400">
                                <div className="font-medium mb-1">Parse Error</div>
                                <div className="text-xs">{error}</div>
                            </div>
                        )}
                        {parsedJson !== null &&
                            !error &&
                            (view === 'tree' ? (
                                <JsonNode data={parsedJson} level={0} />
                            ) : (
                                <pre className="text-green-400 whitespace-pre-wrap">
                                    {JSON.stringify(parsedJson, null, 2)}
                                </pre>
                            ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
