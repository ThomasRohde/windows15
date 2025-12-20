import React, { useState } from 'react';
import { useHandoff, useHandoffItems } from '../hooks';
import { AppContainer, Button, Select, EmptyState, Icon } from '../components/ui';
import { HandoffStatus, HandoffItem } from '../types';
import { formatRelativeTime } from '../utils/timeFormatters';

/**
 * Handoff - Cross-device item queue application (F191)
 *
 * Displays items sent from other devices and allows quick actions.
 */
export const Handoff: React.FC = () => {
    const [statusFilter, setStatusFilter] = useState<HandoffStatus | 'all'>('new');
    const { markOpened, markDone, archive, remove } = useHandoff();
    const items = useHandoffItems(statusFilter === 'all' ? undefined : statusFilter);

    const handleOpen = (item: HandoffItem) => {
        markOpened(item.id);
        if (item.kind === 'url') {
            window.open(item.target, '_blank');
        } else {
            // For text, copy to clipboard
            navigator.clipboard.writeText(item.text);
        }
    };

    return (
        <AppContainer>
            <div className="flex flex-col h-full bg-background-dark text-white">
                {/* Toolbar */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#2d2d2d]">
                    <div className="flex items-center gap-4">
                        <h1 className="text-lg font-semibold flex items-center gap-2">
                            <Icon name="sync_alt" className="text-indigo-400" />
                            Handoff Queue
                        </h1>
                        <div className="flex items-center gap-2 ml-4">
                            <span className="text-xs text-white/50 uppercase font-bold tracking-wider">Filter:</span>
                            <Select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value as any)}
                                options={[
                                    { label: 'All Items', value: 'all' },
                                    { label: 'New', value: 'new' },
                                    { label: 'Opened', value: 'opened' },
                                    { label: 'Done', value: 'done' },
                                    { label: 'Archived', value: 'archived' },
                                ]}
                                className="w-32"
                            />
                        </div>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4">
                    {!items || items.length === 0 ? (
                        <div className="h-full flex items-center justify-center">
                            <EmptyState
                                icon="sync_alt"
                                title={statusFilter === 'all' ? 'Queue is empty' : `No ${statusFilter} items`}
                                description="Items sent from other devices will appear here."
                            />
                        </div>
                    ) : (
                        <div className="max-w-3xl mx-auto space-y-2">
                            {items.map(item => (
                                <div
                                    key={item.id}
                                    className="p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div
                                            className={`p-2 rounded-full ${item.kind === 'url' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}
                                        >
                                            <Icon name={item.kind === 'url' ? 'link' : 'notes'} size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate text-sm">
                                                {item.title || item.text}
                                            </div>
                                            <div className="text-[10px] text-white/50 flex items-center gap-2 mt-0.5">
                                                <span className="flex items-center gap-1">
                                                    <Icon name="devices" size={12} />
                                                    {item.createdByLabel}
                                                </span>
                                                <span>•</span>
                                                <span>{formatRelativeTime(item.createdAt)}</span>
                                                {item.status !== 'new' && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="capitalize">{item.status}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleOpen(item)}
                                            title={item.kind === 'url' ? 'Open Link' : 'Copy Text'}
                                            className="h-8 w-8 p-0"
                                        >
                                            <Icon
                                                name={item.kind === 'url' ? 'open_in_new' : 'content_copy'}
                                                size={18}
                                            />
                                        </Button>
                                        {item.status !== 'done' && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => markDone(item.id)}
                                                title="Mark as Done"
                                                className="h-8 w-8 p-0 text-green-400 hover:text-green-300"
                                            >
                                                <Icon name="check_circle" size={18} />
                                            </Button>
                                        )}
                                        {item.status !== 'archived' && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => archive(item.id)}
                                                title="Archive"
                                                className="h-8 w-8 p-0 text-orange-400 hover:text-orange-300"
                                            >
                                                <Icon name="archive" size={18} />
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => remove(item.id)}
                                            title="Delete"
                                            className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                                        >
                                            <Icon name="delete" size={18} />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppContainer>
    );
};
