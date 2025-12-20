import React, { useState, useCallback } from 'react';
import { useHandoff, useHandoffItems, useNotification } from '../hooks';
import { useTranslation } from '../hooks/useTranslation';
import {
    AppContainer,
    Button,
    Select,
    EmptyState,
    Icon,
    SplitPane,
    TextArea,
    Checkbox,
    TextInput,
} from '../components/ui';
import { HandoffStatus, HandoffItem } from '../types';
import { formatRelativeTime } from '../utils/timeFormatters';
import { encrypt, decrypt } from '../utils/crypto';

const HandoffItemRow: React.FC<{
    item: HandoffItem;
    onOpen: (item: HandoffItem) => void;
    onDone: (id: string) => void;
    onArchive: (id: string) => void;
    onRemove: (id: string) => void;
}> = ({ item, onOpen, onDone, onArchive, onRemove }) => {
    const { t } = useTranslation('handoff');
    const [isDecrypting, setIsDecrypting] = useState(false);
    const [passphrase, setPassphrase] = useState('');
    const [decryptedItem, setDecryptedItem] = useState<HandoffItem | null>(null);
    const { addNotification } = useNotification();

    const handleDecrypt = async () => {
        if (!passphrase.trim()) return;
        try {
            if (item.cipherText && item.nonce && item.salt) {
                const decryptedText = await decrypt(item.cipherText, item.nonce, item.salt, passphrase);
                const isUrl = /^https?:\/\//.test(decryptedText);
                setDecryptedItem({
                    ...item,
                    text: decryptedText,
                    target: isUrl ? decryptedText : '',
                    kind: isUrl ? 'url' : 'text',
                    title: isUrl ? new URL(decryptedText).hostname : item.title,
                });
                setIsDecrypting(false);
                addNotification({
                    title: t('common:status.success'),
                    message: 'Item decrypted',
                    type: 'success',
                });
            }
        } catch {
            addNotification({
                title: t('common:status.error'),
                message: 'Incorrect passphrase',
                type: 'error',
            });
        }
    };

    const displayItem = decryptedItem || item;
    const isEncrypted = item.isSensitive && !decryptedItem;

    return (
        <div className="p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-between group">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                    className={`p-2 rounded-full ${displayItem.kind === 'url' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}
                >
                    <Icon name={isEncrypted ? 'lock' : displayItem.kind === 'url' ? 'link' : 'notes'} size={20} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-sm">
                        {isEncrypted ? '********' : displayItem.title || displayItem.text}
                    </div>
                    <div className="text-[10px] text-white/50 flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1">
                            <Icon name="devices" size={12} />
                            {item.createdByLabel}
                        </span>
                        <span>•</span>
                        <span>{formatRelativeTime(item.createdAt)}</span>
                        {item.isSensitive && (
                            <>
                                <span>•</span>
                                <span className="text-amber-400 flex items-center gap-1">
                                    <Icon name="encrypted" size={12} />
                                    {t('composer.sensitive')}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {isEncrypted ? (
                    isDecrypting ? (
                        <div className="flex items-center gap-1">
                            <TextInput
                                type="password"
                                value={passphrase}
                                onChange={setPassphrase}
                                placeholder={t('composer.passphrase')}
                                className="w-32 h-8 text-[10px] bg-black/40"
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && handleDecrypt()}
                            />
                            <Button size="sm" onClick={handleDecrypt} className="h-8 px-2">
                                <Icon name="key" size={14} />
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setIsDecrypting(false)}
                                className="h-8 px-2"
                            >
                                <Icon name="close" size={14} />
                            </Button>
                        </div>
                    ) : (
                        <Button
                            size="sm"
                            onClick={() => setIsDecrypting(true)}
                            className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400"
                        >
                            <Icon name="lock_open" size={14} className="mr-1" />
                            {t('actions.decrypt')}
                        </Button>
                    )
                ) : (
                    <>
                        <Button size="sm" variant="ghost" onClick={() => onOpen(displayItem)} title={t('actions.open')}>
                            <Icon name={displayItem.kind === 'url' ? 'open_in_new' : 'content_copy'} size={16} />
                        </Button>
                        {item.status === 'new' && (
                            <Button size="sm" variant="ghost" onClick={() => onDone(item.id)} title={t('actions.done')}>
                                <Icon name="check_circle" size={16} />
                            </Button>
                        )}
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onArchive(item.id)}
                            title={t('actions.archive')}
                        >
                            <Icon name="archive" size={16} />
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onRemove(item.id)}
                            className="text-red-400 hover:text-red-300"
                            title={t('actions.remove')}
                        >
                            <Icon name="delete" size={16} />
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
};

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

    // F200: Sensitive mode state
    const [isSensitive, setIsSensitive] = useState(false);
    const [passphrase, setPassphrase] = useState('');

    // F201: Work mode state
    const [isWorkMode, setIsWorkMode] = useState(false);

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

        // F201: Work mode restriction
        const trimmedText = inputText.trim();
        const isUrl = /^https?:\/\//.test(trimmedText);

        if (isWorkMode && !isUrl) {
            addNotification({
                title: t('notifications.failed'),
                message: t('composer.workModeHint'),
                type: 'warning',
            });
            return;
        }

        // F200: Sensitive mode validation
        if (isSensitive && !passphrase.trim()) {
            addNotification({
                title: t('notifications.failed'),
                message: t('composer.passphrasePlaceholder'),
                type: 'warning',
            });
            return;
        }

        setIsSending(true);
        try {
            let finalItem: Partial<HandoffItem> = {
                kind: isUrl ? 'url' : 'text',
                target: isUrl ? trimmedText : '',
                text: trimmedText,
                targetCategory,
                title: isUrl ? new URL(trimmedText).hostname : undefined,
                isSensitive,
            };

            if (isSensitive) {
                const encrypted = await encrypt(trimmedText, passphrase);
                finalItem = {
                    ...finalItem,
                    text: '[ENCRYPTED]',
                    target: isUrl ? '[ENCRYPTED]' : '',
                    cipherText: encrypted.cipherText,
                    nonce: encrypted.nonce,
                    salt: encrypted.salt,
                };
            }

            await send(finalItem as HandoffItem);

            setInputText('');
            if (isSensitive) setPassphrase('');

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
    }, [inputText, targetCategory, send, addNotification, isSending, t, isSensitive, passphrase, isWorkMode]);

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

                                    <div className="flex flex-col gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                                        <Checkbox
                                            label={t('composer.workMode')}
                                            checked={isWorkMode}
                                            onChange={setIsWorkMode}
                                            className="text-xs"
                                        />
                                        <div className="h-px bg-white/5" />
                                        <Checkbox
                                            label={t('composer.sensitive')}
                                            checked={isSensitive}
                                            onChange={setIsSensitive}
                                            className="text-xs"
                                        />
                                        {isSensitive && (
                                            <div className="animate-fade-in">
                                                <TextInput
                                                    type="password"
                                                    value={passphrase}
                                                    onChange={setPassphrase}
                                                    placeholder={t('composer.passphrasePlaceholder')}
                                                    className="bg-black/40 border-white/10 text-xs"
                                                />
                                            </div>
                                        )}
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
                                            <HandoffItemRow
                                                key={item.id}
                                                item={item}
                                                onOpen={handleOpen}
                                                onDone={markDone}
                                                onArchive={archive}
                                                onRemove={remove}
                                            />
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
