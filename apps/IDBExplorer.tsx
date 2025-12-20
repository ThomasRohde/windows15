import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AppContainer, SplitPane, AppToolbar, LoadingState, EmptyState, Icon } from '../components/ui';
import { usePhoneMode } from '../hooks';

// --- Components ---

interface JsonNodeProps {
    data: unknown;
    keyName?: string | number;
    level: number;
}

const JsonNode: React.FC<JsonNodeProps> = ({ data, keyName, level }) => {
    const [collapsed, setCollapsed] = React.useState(true);

    let displayData = data;
    if (typeof data === 'string') {
        try {
            const parsed = JSON.parse(data);
            if (parsed && typeof parsed === 'object') {
                displayData = parsed;
            }
        } catch {}
    }

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

    const type = getType(displayData);
    const isExpandable = type === 'object' || type === 'array';
    const indent = level * 16;

    if (!isExpandable) {
        return (
            <div style={{ paddingLeft: indent }} className="flex gap-1 font-mono text-sm">
                {keyName !== undefined && <span className="text-purple-400">"{keyName}"</span>}
                {keyName !== undefined && <span className="text-white">: </span>}
                <span className={getColor(type)}>{type === 'string' ? `"${displayData}"` : String(displayData)}</span>
            </div>
        );
    }

    const entries =
        type === 'array'
            ? (displayData as unknown[]).map((v, i) => [i, v])
            : Object.entries(displayData as Record<string, unknown>);
    const bracket = type === 'array' ? ['[', ']'] : ['{', '}'];

    return (
        <div className="font-mono text-sm">
            <div
                style={{ paddingLeft: indent }}
                className="flex gap-1 cursor-pointer hover:bg-white/5 select-none"
                onClick={e => {
                    e.stopPropagation();
                    setCollapsed(!collapsed);
                }}
            >
                <span className="text-gray-500 w-4">{collapsed ? '▶' : '▼'}</span>
                {keyName !== undefined && <span className="text-purple-400">"{keyName}"</span>}
                {keyName !== undefined && <span className="text-white">: </span>}
                <span className="text-white">{bracket[0]}</span>
                {collapsed && (
                    <span className="text-gray-500">
                        {type === 'array'
                            ? ` ${(displayData as unknown[]).length} items `
                            : ` ${Object.keys(displayData as Record<string, unknown>).length} keys `}
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

// --- Types ---

interface DBInfo {
    name: string;
    version: number;
}

interface DBStructure {
    name: string;
    version: number;
    stores: { name: string; count: number }[];
}

interface GlobalSearchResult {
    db: string;
    store: string;
    record: unknown;
    matchPreview: string;
}

// --- IDB Helpers ---

const listDatabases = async (): Promise<DBInfo[]> => {
    if (!window.indexedDB.databases) {
        return [];
    }
    const dbs = await window.indexedDB.databases();
    return dbs.map(db => ({ name: db.name || 'Unknown', version: db.version || 1 }));
};

const getDBStructure = async (dbName: string): Promise<DBStructure> => {
    return new Promise((resolve, reject) => {
        const request = window.indexedDB.open(dbName);
        request.onerror = () => reject(request.error);
        request.onsuccess = async () => {
            const db = request.result;
            const storeNames = Array.from(db.objectStoreNames);

            if (storeNames.length === 0) {
                db.close();
                resolve({ name: dbName, version: db.version, stores: [] });
                return;
            }

            try {
                const tx = db.transaction(storeNames, 'readonly');
                const storeCounts = await Promise.all(
                    storeNames.map(storeName => {
                        return new Promise<{ name: string; count: number }>((resolveStore, rejectStore) => {
                            const store = tx.objectStore(storeName);
                            const countReq = store.count();
                            countReq.onsuccess = () => resolveStore({ name: storeName, count: countReq.result });
                            countReq.onerror = () => rejectStore(countReq.error);
                        });
                    })
                );

                db.close();
                resolve({ name: dbName, version: db.version, stores: storeCounts });
            } catch (e) {
                db.close();
                reject(e);
            }
        };
    });
};

const getStoreData = async (dbName: string, storeName: string): Promise<unknown[]> => {
    return new Promise((resolve, reject) => {
        const request = window.indexedDB.open(dbName);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            try {
                const tx = db.transaction(storeName, 'readonly');
                const store = tx.objectStore(storeName);
                // Limit to 100 for now
                const getAllReq = store.getAll(undefined, 100);
                getAllReq.onsuccess = () => resolve(getAllReq.result);
                getAllReq.onerror = () => reject(getAllReq.error);
            } catch (e) {
                reject(e);
            } finally {
                db.close();
            }
        };
    });
};

// --- Helpers ---

const isInternalKey = (key: string) => {
    return key.startsWith('_') || ['realmId', 'owner', 'accessControl'].includes(key);
};

const filterData = (data: unknown): unknown => {
    if (Array.isArray(data)) {
        return data.map(filterData);
    }
    if (typeof data === 'object' && data !== null) {
        return Object.fromEntries(
            Object.entries(data as Record<string, unknown>)
                .filter(([key]) => !isInternalKey(key))
                .map(([key, value]) => [key, filterData(value)])
        );
    }
    return data;
};

// --- Components ---

const DataDescriptionList = ({ data, level = 0 }: { data: unknown; level?: number }) => {
    if (data === null || data === undefined) return <span className="text-gray-500 italic">empty</span>;

    if (Array.isArray(data)) {
        if (data.length === 0) return <span className="text-gray-500 italic">empty list</span>;
        return (
            <div className="flex flex-col gap-2">
                {data.map((item, idx) => (
                    <div key={idx} className="pl-3 border-l-2 border-white/10">
                        <DataDescriptionList data={item} level={level + 1} />
                    </div>
                ))}
            </div>
        );
    }

    if (typeof data === 'object') {
        const entries = Object.entries(data as Record<string, unknown>);
        if (entries.length === 0) return <span className="text-gray-500 italic">empty object</span>;

        return (
            <div
                className={`grid gap-x-4 gap-y-2 ${level > 0 ? 'mt-1' : ''}`}
                style={{ gridTemplateColumns: 'auto 1fr' }}
            >
                {entries.map(([key, value]) => (
                    <React.Fragment key={key}>
                        <div className="text-sm font-medium text-white/60 text-right py-0.5 select-none">{key}</div>
                        <div className="text-sm text-white/90 py-0.5 break-words">
                            {typeof value === 'object' && value !== null ? (
                                <DataDescriptionList data={value} level={level + 1} />
                            ) : (
                                <DataDescriptionList data={value} level={level + 1} />
                            )}
                        </div>
                    </React.Fragment>
                ))}
            </div>
        );
    }

    if (typeof data === 'string') {
        try {
            const parsed = JSON.parse(data);
            if (parsed && typeof parsed === 'object') {
                return <DataDescriptionList data={parsed} level={level} />;
            }
        } catch {
            // Not a JSON string
        }
        return <span className="text-blue-100/90 whitespace-pre-wrap">{data}</span>;
    }

    return <span>{String(data)}</span>;
};

// Compact inline JSON preview for table cells
const InlineJsonPreview = ({ data }: { data: unknown }) => {
    if (data === null || data === undefined) {
        return <span className="text-gray-500 italic">null</span>;
    }

    // Try to parse JSON strings
    let displayData = data;
    if (typeof data === 'string') {
        try {
            const parsed = JSON.parse(data);
            if (parsed && typeof parsed === 'object') {
                displayData = parsed;
            }
        } catch {}
    }

    if (typeof displayData === 'string') {
        return <span className="text-green-400 truncate block max-w-full">"{displayData}"</span>;
    }

    if (typeof displayData === 'number') {
        return <span className="text-orange-400">{displayData}</span>;
    }

    if (typeof displayData === 'boolean') {
        return <span className="text-blue-400">{String(displayData)}</span>;
    }

    if (Array.isArray(displayData)) {
        return <span className="text-gray-400 font-mono text-xs">[{displayData.length} items]</span>;
    }

    if (typeof displayData === 'object') {
        const keys = Object.keys(displayData as Record<string, unknown>);
        const preview = keys
            .slice(0, 2)
            .map(k => `${k}: ...`)
            .join(', ');
        return (
            <span className="text-gray-400 font-mono text-xs truncate block">
                {'{' + preview + (keys.length > 2 ? ', ...' : '') + '}'}
            </span>
        );
    }

    return <span>{String(displayData)}</span>;
};

const TableView = ({ data, onSelect }: { data: unknown[]; onSelect: (item: unknown) => void }) => {
    if (data.length === 0) return <div className="text-gray-500 italic p-4">No records found.</div>;

    // Infer columns from first item (excluding internal keys)
    const firstItem = data[0] as Record<string, unknown>;
    const allColumns = Object.keys(firstItem).filter(k => !isInternalKey(k));

    return (
        <div className="w-full overflow-auto">
            <table className="w-full text-left text-sm" style={{ tableLayout: 'fixed' }}>
                <thead className="sticky top-0 bg-black/60 text-gray-400 uppercase text-xs backdrop-blur-sm">
                    <tr>
                        {allColumns.map((col, idx) => (
                            <th
                                key={col}
                                className="p-3 font-semibold border-b border-white/10 truncate"
                                style={{ width: idx === 0 ? '25%' : undefined }}
                            >
                                {col}
                            </th>
                        ))}
                        <th className="p-3 border-b border-white/10" style={{ width: '40px' }}></th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((item, idx) => {
                        const row = item as Record<string, unknown>;
                        return (
                            <tr
                                key={idx}
                                className={`transition-colors group cursor-pointer border-b border-white/5 ${
                                    idx % 2 === 0 ? 'bg-white/[0.02]' : 'bg-transparent'
                                } hover:bg-white/[0.08]`}
                                onClick={() => onSelect(item)}
                            >
                                {allColumns.map(col => {
                                    const value = row[col];
                                    const isObject = typeof value === 'object' && value !== null;
                                    const isJsonString =
                                        typeof value === 'string' && (value.startsWith('{') || value.startsWith('['));

                                    return (
                                        <td key={col} className="p-3 text-white/80 overflow-hidden align-top">
                                            {isObject || isJsonString ? (
                                                <InlineJsonPreview data={value} />
                                            ) : (
                                                <span className="truncate block">{String(value ?? '')}</span>
                                            )}
                                        </td>
                                    );
                                })}
                                <td className="p-3 text-right align-top">
                                    <Icon
                                        name="visibility"
                                        size="sm"
                                        className="text-blue-400 opacity-40 group-hover:opacity-100 transition-opacity"
                                    />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

// Card view for phone mode - shows each record as a card with key fields
const CardView = ({ data, onSelect }: { data: unknown[]; onSelect: (item: unknown) => void }) => {
    if (data.length === 0) return <div className="text-gray-500 italic p-4 text-center">No records found.</div>;

    // Get key fields to display (up to 4, excluding internal keys)
    const getDisplayFields = (item: Record<string, unknown>) => {
        const keys = Object.keys(item).filter(k => !isInternalKey(k));
        return keys.slice(0, 4);
    };

    return (
        <div className="flex flex-col gap-2 p-3 overflow-auto touch-scroll pb-[calc(0.75rem+var(--safe-area-inset-bottom))]">
            {data.map((item, idx) => {
                const row = item as Record<string, unknown>;
                const fields = getDisplayFields(row);

                return (
                    <div
                        key={idx}
                        className="bg-white/5 rounded-lg p-3 border border-white/10 active:bg-white/10 transition-colors cursor-pointer"
                        onClick={() => onSelect(item)}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0 space-y-1.5">
                                {fields.map(key => {
                                    const value = row[key];
                                    const isObject = typeof value === 'object' && value !== null;
                                    const isJsonString =
                                        typeof value === 'string' && (value.startsWith('{') || value.startsWith('['));

                                    return (
                                        <div key={key} className="flex items-start gap-2">
                                            <span className="text-xs text-gray-500 font-medium min-w-16 shrink-0">
                                                {key}
                                            </span>
                                            <span className="text-sm text-white/80 truncate flex-1">
                                                {isObject || isJsonString ? (
                                                    <InlineJsonPreview data={value} />
                                                ) : (
                                                    String(value ?? '')
                                                )}
                                            </span>
                                        </div>
                                    );
                                })}
                                {Object.keys(row).filter(k => !isInternalKey(k)).length > 4 && (
                                    <span className="text-xs text-gray-500 italic">
                                        +{Object.keys(row).filter(k => !isInternalKey(k)).length - 4} more fields
                                    </span>
                                )}
                            </div>
                            <div className="min-h-[44px] min-w-[44px] flex items-center justify-center">
                                <Icon name="chevron_right" className="text-gray-500" />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// Removed specialized JsonPreview in favor of JsonNode above

export const IDBExplorer = () => {
    const isPhone = usePhoneMode();
    const [dbs, setDbs] = useState<DBInfo[]>([]);
    const [structures, setStructures] = useState<Record<string, DBStructure>>({});
    const [expandedDbs, setExpandedDbs] = useState<Set<string>>(new Set());
    const [selectedStore, setSelectedStore] = useState<{ db: string; store: string } | null>(null);
    const [storeData, setStoreData] = useState<unknown[]>([]);
    const [selectedRecord, setSelectedRecord] = useState<unknown | null>(null);
    const [loading, setLoading] = useState(false);
    const [filterEmpty, setFilterEmpty] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [globalSearchResults, setGlobalSearchResults] = useState<GlobalSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [_error, setError] = useState<string | null>(null);

    // Initial load
    useEffect(() => {
        refreshDbs();
    }, []);

    // Keyboard shortcut: Ctrl+F to focus search (works globally)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                searchInputRef.current?.focus();
                searchInputRef.current?.select();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const refreshDbs = async () => {
        setLoading(true);
        try {
            const list = await listDatabases();
            setDbs(list);
        } catch (err) {
            console.error(err);
            setError('Failed to list databases');
        } finally {
            setLoading(false);
        }
    };

    const toggleDb = async (name: string) => {
        const isExpanded = expandedDbs.has(name);
        const newExpanded = new Set(expandedDbs);

        if (isExpanded) {
            newExpanded.delete(name);
            setExpandedDbs(newExpanded);
        } else {
            newExpanded.add(name);
            setExpandedDbs(newExpanded);

            if (!structures[name]) {
                setLoading(true);
                try {
                    const structure = await getDBStructure(name);
                    setStructures(prev => ({ ...prev, [name]: structure }));
                } catch (err) {
                    console.error(err);
                    setError(`Failed to inspect DB ${name}`);
                } finally {
                    setLoading(false);
                }
            }
        }
    };

    const handleSelectStore = async (dbName: string, storeName: string) => {
        setSelectedStore({ db: dbName, store: storeName });
        setSelectedRecord(null);
        setSearchQuery(''); // Clear search when changing stores
        setGlobalSearchResults([]); // Clear global search results
        setLoading(true);
        try {
            const data = await getStoreData(dbName, storeName);
            setStoreData(data);
        } catch (err) {
            console.error(err);
            setError(`Failed to read store ${storeName}`);
        } finally {
            setLoading(false);
        }
    };

    // Search helper: recursively stringify a value for searching
    const stringifyForSearch = useCallback((value: unknown): string => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'string') {
            // Try to parse JSON strings
            try {
                const parsed = JSON.parse(value);
                if (parsed && typeof parsed === 'object') {
                    return stringifyForSearch(parsed);
                }
            } catch {}
            return value.toLowerCase();
        }
        if (typeof value === 'number' || typeof value === 'boolean') {
            return String(value).toLowerCase();
        }
        if (Array.isArray(value)) {
            return value.map(stringifyForSearch).join(' ');
        }
        if (typeof value === 'object') {
            return Object.entries(value as Record<string, unknown>)
                .filter(([key]) => !isInternalKey(key))
                .map(([key, v]) => `${key} ${stringifyForSearch(v)}`)
                .join(' ');
        }
        return String(value).toLowerCase();
    }, []);

    // Get match preview for a record
    const getMatchPreview = useCallback(
        (record: unknown, query: string): string => {
            const text = stringifyForSearch(record);
            const lowerQuery = query.toLowerCase();
            const idx = text.indexOf(lowerQuery);
            if (idx === -1) return '';

            const start = Math.max(0, idx - 20);
            const end = Math.min(text.length, idx + query.length + 40);
            let preview = text.slice(start, end);
            if (start > 0) preview = '...' + preview;
            if (end < text.length) preview = preview + '...';
            return preview;
        },
        [stringifyForSearch]
    );

    // Global search across all databases
    const performGlobalSearch = useCallback(
        async (query: string) => {
            if (!query.trim()) {
                setGlobalSearchResults([]);
                setIsSearching(false);
                return;
            }

            setIsSearching(true);
            const results: GlobalSearchResult[] = [];
            const lowerQuery = query.toLowerCase().trim();

            try {
                // First ensure we have all DB structures loaded
                const allDbs = await listDatabases();

                for (const db of allDbs) {
                    try {
                        const structure = await getDBStructure(db.name);

                        for (const store of structure.stores) {
                            try {
                                const data = await getStoreData(db.name, store.name);

                                for (const record of data) {
                                    const searchableText = stringifyForSearch(record);
                                    if (searchableText.includes(lowerQuery)) {
                                        results.push({
                                            db: db.name,
                                            store: store.name,
                                            record,
                                            matchPreview: getMatchPreview(record, query),
                                        });

                                        // Limit results for performance
                                        if (results.length >= 50) {
                                            break;
                                        }
                                    }
                                }

                                if (results.length >= 50) break;
                            } catch (e) {
                                console.error(`Error reading store ${store.name}:`, e);
                            }
                        }

                        if (results.length >= 50) break;
                    } catch (e) {
                        console.error(`Error reading database ${db.name}:`, e);
                    }
                }
            } catch (e) {
                console.error('Global search error:', e);
            }

            setGlobalSearchResults(results);
            setIsSearching(false);
        },
        [stringifyForSearch, getMatchPreview]
    );

    // Debounced search effect
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (searchQuery.trim()) {
            setIsSearching(true);
            searchTimeoutRef.current = setTimeout(() => {
                performGlobalSearch(searchQuery);
            }, 300); // 300ms debounce
        } else {
            setGlobalSearchResults([]);
            setIsSearching(false);
        }

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery, performGlobalSearch]);

    // Handle clicking a global search result
    const handleSearchResultClick = async (result: GlobalSearchResult) => {
        // Navigate to the store
        setSelectedStore({ db: result.db, store: result.store });
        setSearchQuery('');
        setGlobalSearchResults([]);
        setLoading(true);

        try {
            const data = await getStoreData(result.db, result.store);
            setStoreData(data);
            // Select the record after loading
            setSelectedRecord(result.record);
        } catch (err) {
            console.error(err);
            setError(`Failed to read store ${result.store}`);
        } finally {
            setLoading(false);
        }
    };

    // Filtered data based on search query (for local filtering when viewing a store)
    const _filteredStoreData = useMemo(() => {
        // When there's a global search active, don't filter local data
        if (globalSearchResults.length > 0 || isSearching) return storeData;
        if (!searchQuery.trim()) return storeData;

        const query = searchQuery.toLowerCase().trim();

        return storeData.filter(record => {
            const searchableText = stringifyForSearch(record);
            return searchableText.includes(query);
        });
    }, [storeData, searchQuery, stringifyForSearch, globalSearchResults.length, isSearching]);

    // --- Render ---

    const renderSidebar = () => (
        <div className="h-full flex flex-col bg-black/20 overflow-auto">
            <div className="p-2 flex items-center justify-between border-b border-white/10">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Databases</span>
                <label className="flex items-center gap-2 cursor-pointer group" title="Hide empty object stores">
                    <input
                        type="checkbox"
                        className="accent-blue-500 w-3 h-3 cursor-pointer"
                        checked={filterEmpty}
                        onChange={e => setFilterEmpty(e.target.checked)}
                    />
                    <span className="text-[10px] text-gray-500 group-hover:text-gray-300 uppercase select-none">
                        Filter Empty
                    </span>
                </label>
            </div>
            <div className="flex-1 overflow-auto">
                {dbs.map(db => {
                    const isExpanded = expandedDbs.has(db.name);
                    const structure = structures[db.name];
                    const visibleStores = structure?.stores.filter(s => !filterEmpty || s.count > 0) || [];

                    return (
                        <div key={db.name} className="flex flex-col">
                            <div
                                className={`px-2 py-2 cursor-pointer flex items-center gap-2 hover:bg-white/5 select-none transition-colors ${isExpanded ? 'bg-white/5' : ''}`}
                                onClick={() => toggleDb(db.name)}
                            >
                                <Icon
                                    name="chevron_right"
                                    size="sm"
                                    className={`text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                                />
                                <Icon name="storage" size="sm" className="text-gray-400" />
                                <span className="truncate text-sm text-gray-300 flex-1">{db.name}</span>
                                {loading && !structure && isExpanded && (
                                    <span className="w-3 h-3 border-2 border-white/20 border-t-white/60 rounded-full animate-spin"></span>
                                )}
                            </div>

                            {isExpanded && structure && (
                                <div className="animate-in slide-in-from-left-2 duration-200">
                                    {visibleStores.map(store => {
                                        const isSelected =
                                            selectedStore?.db === db.name && selectedStore?.store === store.name;
                                        return (
                                            <div
                                                key={store.name}
                                                className={`pl-8 pr-3 py-1.5 cursor-pointer flex items-center gap-2 hover:bg-white/5 text-sm group ${isSelected ? 'text-blue-300 bg-blue-500/10' : 'text-gray-400'}`}
                                                onClick={() => handleSelectStore(db.name, store.name)}
                                            >
                                                <Icon
                                                    name="table_chart"
                                                    size="xs"
                                                    className={`${isSelected ? 'text-blue-400' : 'text-gray-600 group-hover:text-gray-500'}`}
                                                />
                                                <span className="truncate flex-1">{store.name}</span>
                                                <span className="text-[10px] bg-white/10 px-1.5 rounded-full text-gray-500 group-hover:text-gray-400">
                                                    {store.count}
                                                </span>
                                            </div>
                                        );
                                    })}
                                    {structure.stores.length === 0 && (
                                        <div className="pl-8 py-2 text-xs text-gray-500 italic">No object stores</div>
                                    )}
                                    {structure.stores.length > 0 && visibleStores.length === 0 && (
                                        <div className="pl-8 py-2 text-xs text-gray-500 italic">All tables hidden</div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const renderContent = () => (
        <div className="h-full flex flex-col bg-background-dark/50">
            <AppToolbar className="!bg-black/40">
                <div className="flex items-center gap-2">
                    <button onClick={refreshDbs} className="p-1 hover:bg-white/10 rounded" title="Refresh">
                        <Icon name="refresh" className="text-white/80" />
                    </button>
                    <span className="text-sm font-medium text-white/80">
                        {selectedStore ? (
                            <>
                                <span className="text-gray-500">{selectedStore.db}</span>
                                <span className="text-gray-600 mx-2">/</span>
                                <span>{selectedStore.store}</span>
                            </>
                        ) : (
                            'Select an Object Store'
                        )}
                    </span>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                    <div className="relative flex items-center">
                        {isSearching ? (
                            <span className="absolute left-2 w-3 h-3 border-2 border-gray-500 border-t-blue-400 rounded-full animate-spin pointer-events-none" />
                        ) : (
                            <Icon
                                name="search"
                                size="sm"
                                className="absolute left-2 text-gray-500 pointer-events-none"
                            />
                        )}
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search all databases... (Ctrl+F)"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="bg-black/40 border border-white/10 rounded-md pl-8 pr-8 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 w-72 transition-all"
                            onKeyDown={e => {
                                if (e.key === 'Escape') {
                                    setSearchQuery('');
                                    setGlobalSearchResults([]);
                                    searchInputRef.current?.blur();
                                }
                            }}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setGlobalSearchResults([]);
                                }}
                                className="absolute right-2 p-0.5 hover:bg-white/10 rounded transition-colors"
                                title="Clear search"
                            >
                                <Icon name="close" size="xs" className="text-gray-400" />
                            </button>
                        )}
                    </div>
                </div>
            </AppToolbar>

            <div className="flex-1 overflow-auto relative">
                {loading && <LoadingState />}

                {/* Global search results view */}
                {!loading && (globalSearchResults.length > 0 || (searchQuery && isSearching)) && (
                    <div className="flex flex-col h-full">
                        <div className="px-4 py-2 bg-black/40 flex justify-between items-center border-b border-white/10">
                            <span className="text-xs text-gray-400">
                                {isSearching ? (
                                    <span className="text-blue-400">Searching all databases...</span>
                                ) : (
                                    <>
                                        <span className="text-blue-400">{globalSearchResults.length}</span>
                                        <span> results found across all databases</span>
                                        {globalSearchResults.length >= 50 && (
                                            <span className="text-gray-500"> (limited to 50)</span>
                                        )}
                                    </>
                                )}
                            </span>
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setGlobalSearchResults([]);
                                }}
                                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                Clear search
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto">
                            {globalSearchResults.length === 0 && !isSearching ? (
                                <div className="text-gray-500 italic p-4 flex flex-col items-center justify-center h-full gap-2">
                                    <Icon name="search_off" className="text-gray-600 text-3xl" />
                                    <span>No results found for "{searchQuery}"</span>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {globalSearchResults.map((result, idx) => (
                                        <div
                                            key={idx}
                                            className="px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors group"
                                            onClick={() => handleSearchResultClick(result)}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <Icon name="storage" size="xs" className="text-gray-500" />
                                                <span className="text-xs text-gray-500">{result.db}</span>
                                                <span className="text-gray-600">/</span>
                                                <Icon name="table_chart" size="xs" className="text-gray-500" />
                                                <span className="text-xs text-gray-400">{result.store}</span>
                                                <Icon
                                                    name="arrow_forward"
                                                    size="xs"
                                                    className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                                                />
                                            </div>
                                            <div className="text-sm text-white/80 font-mono truncate pl-5">
                                                {result.matchPreview || <InlineJsonPreview data={result.record} />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {!loading && !selectedStore && globalSearchResults.length === 0 && !searchQuery && (
                    <EmptyState
                        icon="storage"
                        title="No Object Store Selected"
                        description="Select a database and object store from the sidebar to view data, or use the search to find records across all databases."
                    />
                )}

                {!loading && selectedStore && !selectedRecord && globalSearchResults.length === 0 && !searchQuery && (
                    <div className="flex flex-col h-full">
                        <div className="px-4 py-2 bg-black/40 flex justify-between items-center border-b border-white/10">
                            <span className="text-xs text-gray-400">
                                {storeData.length} records found (limited to 100)
                            </span>
                        </div>
                        <div className="flex-1 overflow-auto">
                            {storeData.length === 0 ? (
                                <div className="text-gray-500 italic p-4 flex flex-col items-center justify-center h-full gap-2">
                                    No records found.
                                </div>
                            ) : isPhone ? (
                                <CardView data={storeData} onSelect={setSelectedRecord} />
                            ) : (
                                <TableView data={storeData} onSelect={setSelectedRecord} />
                            )}
                        </div>
                    </div>
                )}

                {selectedRecord !== null && (
                    <div className="absolute inset-0 bg-background-dark/95 backdrop-blur z-10 flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-3 border-b border-white/10 bg-white/5">
                            <span className="font-semibold text-white">Record Details</span>
                            <button
                                onClick={() => setSelectedRecord(null)}
                                className="p-1 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <Icon name="close" className="text-gray-400" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            <div className="bg-black/40 rounded-lg p-6 border border-white/10 shadow-2xl">
                                <h3 className="text-xs font-bold text-blue-400 uppercase mb-4 tracking-wider border-b border-blue-500/20 pb-2">
                                    Record Details
                                </h3>

                                <div className="bg-white/5 rounded-md p-4">
                                    <DataDescriptionList data={filterData(selectedRecord)} />
                                </div>

                                <div className="my-8 flex items-center gap-4">
                                    <div className="h-px bg-white/10 flex-1"></div>
                                    <span className="text-xs text-gray-500 uppercase font-medium">Debug Info</span>
                                    <div className="h-px bg-white/10 flex-1"></div>
                                </div>

                                <div className="opacity-60 hover:opacity-100 transition-opacity">
                                    <div className="bg-black/50 rounded p-2 overflow-auto max-h-60 text-xs">
                                        <JsonNode data={selectedRecord} level={0} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    // Phone layout with dropdown selectors instead of sidebar
    const renderPhoneLayout = () => {
        // Get available stores for selected database
        const availableStores = selectedStore?.db
            ? (structures[selectedStore.db]?.stores || []).filter(s => !filterEmpty || s.count > 0)
            : [];

        return (
            <div className="h-full flex flex-col bg-background-dark/50">
                {/* Database & Store dropdowns */}
                <div className="p-3 bg-black/40 border-b border-white/10 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <select
                            className="flex-1 min-h-[44px] bg-black/50 border border-white/20 rounded-lg px-3 text-sm text-white appearance-none"
                            value={selectedStore?.db || ''}
                            onChange={async e => {
                                const dbName = e.target.value;
                                if (!dbName) {
                                    setSelectedStore(null);
                                    return;
                                }
                                // Load structure if not loaded
                                if (!structures[dbName]) {
                                    setLoading(true);
                                    try {
                                        const structure = await getDBStructure(dbName);
                                        setStructures(prev => ({ ...prev, [dbName]: structure }));
                                    } catch (err) {
                                        console.error(err);
                                    } finally {
                                        setLoading(false);
                                    }
                                }
                                setSelectedStore({ db: dbName, store: '' });
                                setStoreData([]);
                                setSelectedRecord(null);
                            }}
                        >
                            <option value="">Select Database...</option>
                            {dbs.map(db => (
                                <option key={db.name} value={db.name}>
                                    {db.name}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={refreshDbs}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center bg-black/50 border border-white/20 rounded-lg active:bg-white/10"
                            title="Refresh"
                        >
                            <Icon name="refresh" className="text-white/80" />
                        </button>
                    </div>

                    {selectedStore?.db && (
                        <select
                            className="w-full min-h-[44px] bg-black/50 border border-white/20 rounded-lg px-3 text-sm text-white appearance-none"
                            value={selectedStore?.store || ''}
                            onChange={e => {
                                const storeName = e.target.value;
                                if (storeName && selectedStore?.db) {
                                    handleSelectStore(selectedStore.db, storeName);
                                }
                            }}
                        >
                            <option value="">Select Object Store...</option>
                            {availableStores.map(store => (
                                <option key={store.name} value={store.name}>
                                    {store.name} ({store.count})
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Search input */}
                    <div className="relative flex items-center">
                        {isSearching ? (
                            <span className="absolute left-3 w-4 h-4 border-2 border-gray-500 border-t-blue-400 rounded-full animate-spin pointer-events-none" />
                        ) : (
                            <Icon name="search" className="absolute left-3 text-gray-500 pointer-events-none" />
                        )}
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search all databases..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full min-h-[44px] bg-black/50 border border-white/20 rounded-lg pl-10 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setGlobalSearchResults([]);
                                }}
                                className="absolute right-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                            >
                                <Icon name="close" className="text-gray-400" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Content area */}
                <div className="flex-1 overflow-auto relative">
                    {loading && <LoadingState />}

                    {/* Global search results */}
                    {!loading && (globalSearchResults.length > 0 || (searchQuery && isSearching)) && (
                        <div className="flex flex-col h-full">
                            <div className="px-4 py-2 bg-black/40 flex justify-between items-center border-b border-white/10">
                                <span className="text-xs text-gray-400">
                                    {isSearching ? 'Searching...' : `${globalSearchResults.length} results`}
                                </span>
                            </div>
                            <div className="flex-1 overflow-auto touch-scroll pb-[var(--safe-area-inset-bottom)]">
                                {globalSearchResults.length === 0 && !isSearching ? (
                                    <div className="text-gray-500 italic p-4 text-center">No results found</div>
                                ) : (
                                    <div className="divide-y divide-white/5">
                                        {globalSearchResults.map((result, idx) => (
                                            <div
                                                key={idx}
                                                className="px-4 py-3 min-h-[44px] active:bg-white/10 cursor-pointer transition-colors"
                                                onClick={() => handleSearchResultClick(result)}
                                            >
                                                <div className="flex items-center gap-2 mb-1 text-xs text-gray-500">
                                                    <span>{result.db}</span>
                                                    <span>/</span>
                                                    <span>{result.store}</span>
                                                </div>
                                                <div className="text-sm text-white/80 font-mono truncate">
                                                    {result.matchPreview || <InlineJsonPreview data={result.record} />}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {!loading && !selectedStore?.store && globalSearchResults.length === 0 && !searchQuery && (
                        <EmptyState
                            icon="storage"
                            title="Select a Store"
                            description="Choose a database and object store from the dropdowns above."
                        />
                    )}

                    {!loading &&
                        selectedStore?.store &&
                        !selectedRecord &&
                        globalSearchResults.length === 0 &&
                        !searchQuery && (
                            <div className="flex flex-col h-full">
                                <div className="px-4 py-2 bg-black/40 flex justify-between items-center border-b border-white/10">
                                    <span className="text-xs text-gray-400">{storeData.length} records</span>
                                </div>
                                <div className="flex-1 overflow-auto">
                                    {storeData.length === 0 ? (
                                        <div className="text-gray-500 italic p-4 text-center">No records found.</div>
                                    ) : (
                                        <CardView data={storeData} onSelect={setSelectedRecord} />
                                    )}
                                </div>
                            </div>
                        )}

                    {/* Record detail overlay - phone optimized */}
                    {selectedRecord !== null && (
                        <div className="absolute inset-0 bg-background-dark/98 backdrop-blur z-10 flex flex-col">
                            <div className="flex items-center justify-between p-3 border-b border-white/10 bg-white/5">
                                <span className="font-semibold text-white">Record Details</span>
                                <button
                                    onClick={() => setSelectedRecord(null)}
                                    className="min-h-[44px] min-w-[44px] flex items-center justify-center active:bg-white/10 rounded-full"
                                >
                                    <Icon name="close" className="text-gray-400" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-auto touch-scroll p-4 pb-[calc(1rem+var(--safe-area-inset-bottom))]">
                                <div className="bg-black/40 rounded-lg p-4 border border-white/10">
                                    <DataDescriptionList data={filterData(selectedRecord)} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Phone mode: single column with dropdown selectors
    if (isPhone) {
        return <AppContainer>{renderPhoneLayout()}</AppContainer>;
    }

    return (
        <AppContainer>
            <SplitPane direction="horizontal" primarySize="25%" primary={renderSidebar()} secondary={renderContent()} />
        </AppContainer>
    );
};
