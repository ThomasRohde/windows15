import React, { useState, useCallback } from 'react';
import { useHandoff, useHandoffItems, useNotification } from '../hooks';
import { AppContainer, Button, Select, EmptyState, Icon, SplitPane, TextArea } from '../components/ui';
import { HandoffStatus, HandoffItem } from '../types';
import { formatRelativeTime } from '../utils/timeFormatters';

/**
 * Handoff - Cross-device item queue application (F191)
 *
 * Displays items sent from other devices and allows quick actions.
 */
export const Handoff: React.FC = () => {
    const [statusFilter, setStatusFilter] = useState<HandoffStatus | 'all'>('new');
    const { markOpened, markDone, archive, remove, send, deviceLabel } = useHandoff();
    const items = useHandoffItems(statusFilter === 'all' ? undefined : statusFilter);
    const { addNotification } = useNotification();

    const [inputText, setInputText] = useState('');
    const [targetCategory, setTargetCategory] = useState<'private' | 'work' | 'any'>('any');
    const [isSending, setIsSending] = useState(false);

    const handleOpen = (item: HandoffItem) => {
        markOpened(item.id);
        if (item.kind === 'url') {
            window.open(item.target, '_blank');
        } else {
            // For text, copy to clipboard
            navigator.clipboard.writeText(item.text);
            addNotification({
                title: 'Copied to Clipboard',
                message: 'Text content has been copied to your clipboard.',
                type: 'info',
            });
        }
    };

    const handleSend = useCallback(async () => {
        if (!inputText.trim() || isSending) return;

        setIsSending(true);
        try {
            const trimmedText = inputText.trim();
            const isUrl = /^https?:\/\//.test(trimmedText);

            await send({
                kind: isUrl ? 'url' : 'text',
                target: isUrl ? trimmedText : '',
                text: trimmedText,
                targetCategory,
                title: isUrl ? new URL(trimmedText).hostname : undefined,
            });

            setInputText('');
            addNotification({
                title: 'Sent to Handoff',
                message: `Item sent to ${targetCategory} devices.`,
                type: 'success',
            });
        } catch (error) {
            console.error('Handoff send error:', error);
            addNotification({
                title: 'Send Failed',
                message: 'Failed to send item to handoff queue.',
                type: 'error',
            });
        } finally {
            setIsSending(false);
        }
    }, [inputText, targetCategory, send, addNotification, isSending]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            handleSend();
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
                                onChange={e => setStatusFilter(e.target.value as HandoffStatus | 'all')}
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
                    <div className="text-[10px] text-white/30 uppercase font-bold tracking-widest">
                        Device: <span className="text-indigo-400">{deviceLabel}</span>
                    </div>
                </div>

                {/* Main Content with SplitPane */}
                <div className="flex-1 overflow-hidden">
                    <SplitPane
                        direction="horizontal"
                        initialSize={350}
                        minSize={300}
                        maxSize={500}
                        left={
                            <div className="h-full flex flex-col p-4 bg-white/5 border-r border-white/10">
                                <div className="mb-4">
                                    <h2 className="text-sm font-bold uppercase tracking-wider text-white/50 mb-1">
                                        Composer
                                    </h2>
                                    <p className="text-xs text-white/30">
                                        Send URLs or text to your other devices instantly.
                                    </p>
                                </div>

                                <div className="flex-1 flex flex-col gap-4">
                                    <div className="flex-1 flex flex-col">
                                        <label className="text-[10px] font-bold uppercase text-white/40 mb-1.5 ml-1">
                                            Content (URL or Text)
                                        </label>
                                        <TextArea
                                            value={inputText}
                                            onChange={e => setInputText(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Paste a link or type some text..."
                                            className="flex-1 resize-none bg-black/20 border-white/10 focus:border-indigo-500/50"
                                        />
                                        <div className="mt-1 text-[10px] text-white/20 text-right">
                                            Ctrl + Enter to send
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-white/40 mb-1.5 ml-1">
                                            Target Devices
                                        </label>
                                        <Select
                                            value={targetCategory}
                                            onChange={e =>
                                                setTargetCategory(e.target.value as 'private' | 'work' | 'any')
                                            }
                                            options={[
                                                { label: 'Any Device', value: 'any' },
                                                { label: 'Work Devices Only', value: 'work' },
                                                { label: 'Private Devices Only', value: 'private' },
                                            ]}
                                            className="w-full bg-black/20 border-white/10"
                                        />
                                    </div>

                                    <Button
                                        variant="primary"
                                        onClick={handleSend}
                                        disabled={!inputText.trim() || isSending}
                                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase tracking-widest text-xs"
                                    >
                                        {isSending ? 'Sending...' : 'Send to Handoff'}
                                    </Button>
                                </div>

                                <div className="mt-auto pt-4 border-t border-white/5">
                                    <div className="flex items-center gap-2 text-[10px] text-white/30">
                                        <Icon name="info" size={14} />
                                        <span>
                                            You are sending from: <span className="text-white/60">{deviceLabel}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        }
                        right={
                            <div className="h-full overflow-y-auto p-4">
                                {!items || items.length === 0 ? (
                                    <div className="h-full flex items-center justify-center">
                                        <EmptyState
                                            icon="sync_alt"
                                            title={
                                                statusFilter === 'all' ? 'Queue is empty' : `No ${statusFilter} items`
                                            }
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
                                                            {item.targetCategory && item.targetCategory !== 'any' && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span className="flex items-center gap-1 capitalize">
                                                                        <Icon name="label" size={12} />
                                                                        {item.targetCategory}
                                                                    </span>
                                                                </>
                                                            )}
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
                        }
                    />
                </div>
            </div>
        </AppContainer>
    );
};
