import React, { useState, useCallback } from 'react';
import { useHandoff, useHandoffItems, useNotification } from '../hooks';
import { useTranslation } from '../hooks/useTranslation';
import { AppContainer, Button, Select, EmptyState, Icon, SplitPane, TextArea } from '../components/ui';
import { HandoffStatus, HandoffItem } from '../types';
import { formatRelativeTime } from '../utils/timeFormatters';

/**
 * Handoff - Cross-device item queue application (F191)
 *
 * Displays items sent from other devices and allows quick actions.
 */
export const Handoff: React.FC = () => {
    const { t } = useTranslation('handoff');
    const [statusFilter, setStatusFilter] = useState<HandoffStatus | 'all'>('new');
    const { markOpened, markDone, archive, remove, send, deviceLabel, clearArchived } = useHandoff();
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
                title: t('actions.copy'),
                message: t('common:messages.copied'),
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
                title: t('notifications.sent'),
                message: t('notifications.sentTo', { category: targetCategory }),
                type: 'success',
            });
        } catch (error) {
            console.error('Handoff send error:', error);
            addNotification({
                title: t('notifications.failed'),
                message: t('notifications.failedMessage'),
                type: 'error',
            });
        } finally {
            setIsSending(false);
        }
    }, [inputText, targetCategory, send, addNotification, isSending, t]);

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
                            {t('title')}
                        </h1>
                        <div className="flex items-center gap-2 ml-4">
                            <span className="text-xs text-white/50 uppercase font-bold tracking-wider">
                                {t('inbox.filter')}:
                            </span>
                            <Select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value as HandoffStatus | 'all')}
                                options={[
                                    { label: t('inbox.filter') + ': All', value: 'all' },
                                    { label: t('status.new'), value: 'new' },
                                    { label: t('status.opened'), value: 'opened' },
                                    { label: t('status.done'), value: 'done' },
                                    { label: t('status.archived'), value: 'archived' },
                                ]}
                                className="w-32"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-[10px] text-white/30 uppercase font-bold tracking-widest">
                            {t('inbox.device')}: <span className="text-indigo-400">{deviceLabel}</span>
                        </div>
                        {statusFilter === 'archived' && (
                            <button
                                onClick={clearArchived}
                                className="flex items-center gap-1.5 px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-[10px] uppercase font-bold tracking-wider transition-colors"
                                title={t('actions.clearArchive')}
                            >
                                <Icon name="delete_sweep" size={14} />
                                {t('actions.clearArchive')}
                            </button>
                        )}
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
                                        {t('composer.title')}
                                    </h2>
                                    <p className="text-xs text-white/30">{t('composer.description')}</p>
                                </div>

                                <div className="flex-1 flex flex-col gap-4">
                                    <div className="flex-1 flex flex-col">
                                        <label className="text-[10px] font-bold uppercase text-white/40 mb-1.5 ml-1">
                                            {t('composer.content')}
                                        </label>
                                        <TextArea
                                            value={inputText}
                                            onChange={e => setInputText(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder={t('composer.placeholder')}
                                            className="flex-1 resize-none bg-black/20 border-white/10 focus:border-indigo-500/50"
                                        />
                                        <div className="mt-1 text-[10px] text-white/20 text-right">
                                            {t('composer.hint')}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-white/40 mb-1.5 ml-1">
                                            {t('composer.target')}
                                        </label>
                                        <Select
                                            value={targetCategory}
                                            onChange={e =>
                                                setTargetCategory(e.target.value as 'private' | 'work' | 'any')
                                            }
                                            options={[
                                                { label: t('composer.any'), value: 'any' },
                                                { label: t('composer.work'), value: 'work' },
                                                { label: t('composer.private'), value: 'private' },
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
                                        {isSending ? t('composer.sending') : t('composer.send')}
                                    </Button>
                                </div>

                                <div className="mt-auto pt-4 border-t border-white/5">
                                    <div className="flex items-center gap-2 text-[10px] text-white/30">
                                        <Icon name="info" size={14} />
                                        <span>{t('inbox.sendingFrom', { device: deviceLabel })}</span>
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
                                            title={t('inbox.empty')}
                                            description={t('inbox.emptyHint')}
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
                                                        title={
                                                            item.kind === 'url' ? t('actions.open') : t('actions.copy')
                                                        }
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
                                                            title={t('actions.done')}
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
                                                            title={t('actions.archive')}
                                                            className="h-8 w-8 p-0 text-orange-400 hover:text-orange-300"
                                                        >
                                                            <Icon name="archive" size={18} />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => remove(item.id)}
                                                        title={t('actions.remove')}
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
