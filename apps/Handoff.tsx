import React, { useState, useCallback } from 'react';
import { useHandoff, useHandoffItems, useNotification, useTouchDevice } from '../hooks';
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
    TabSwitcher,
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
    const [showPassphrase, setShowPassphrase] = useState(false);
    const [decryptedItem, setDecryptedItem] = useState<HandoffItem | null>(null);
    const notify = useNotification();

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
                notify.success('Item decrypted');
            }
        } catch {
            notify.error('Incorrect passphrase');
        }
    };

    const displayItem = decryptedItem || item;
    const isEncrypted = item.isSensitive && !decryptedItem;

    return (
        <div className="p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 active:bg-white/[0.15] transition-colors flex items-center justify-between group">
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
                    </div>
                </div>
            </div>

            {/* F231: Always visible action buttons with 44px touch targets on touch devices */}
            <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                {isEncrypted ? (
                    isDecrypting ? (
                        <div className="flex items-center gap-1">
                            <TextInput
                                type={showPassphrase ? 'text' : 'password'}
                                value={passphrase}
                                onChange={e => setPassphrase(e.target.value)}
                                placeholder={t('composer.passphrase')}
                                className="w-32 h-8 text-[10px] bg-black/40 min-h-[44px] md:min-h-[32px]"
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && handleDecrypt()}
                            />
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setShowPassphrase(!showPassphrase)}
                                className="h-8 px-2 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-[32px]"
                                title={showPassphrase ? 'Hide' : 'Show'}
                            >
                                <Icon name={showPassphrase ? 'visibility_off' : 'visibility'} size={14} />
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleDecrypt}
                                className="h-8 px-2 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-[32px]"
                            >
                                <Icon name="key" size={14} />
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setIsDecrypting(false)}
                                className="h-8 px-2 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-[32px]"
                            >
                                <Icon name="close" size={14} />
                            </Button>
                        </div>
                    ) : (
                        <Button
                            size="sm"
                            onClick={() => setIsDecrypting(true)}
                            className="bg-amber-500/20 hover:bg-amber-500/30 active:bg-amber-500/40 text-amber-400 min-h-[44px] md:min-h-0 px-3 md:px-2 transition-colors"
                        >
                            <Icon name="lock_open" size={14} className="mr-1" />
                            {t('actions.decrypt')}
                        </Button>
                    )
                ) : (
                    <>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onOpen(displayItem)}
                            title={t('actions.open')}
                            className="min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 hover:bg-white/10 active:bg-white/20"
                        >
                            <Icon name={displayItem.kind === 'url' ? 'open_in_new' : 'content_copy'} size={16} />
                        </Button>
                        {item.status === 'new' && (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onDone(item.id)}
                                title={t('actions.done')}
                                className="min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 hover:bg-white/10 active:bg-white/20"
                            >
                                <Icon name="check_circle" size={16} />
                            </Button>
                        )}
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onArchive(item.id)}
                            title={t('actions.archive')}
                            className="min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 hover:bg-white/10 active:bg-white/20"
                        >
                            <Icon name="archive" size={16} />
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onRemove(item.id)}
                            className="text-red-400 hover:text-red-300 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 hover:bg-white/10 active:bg-white/20"
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
 * F231: Mobile-optimized with tabbed layout for touch devices
 */
export const Handoff: React.FC = () => {
    const { t } = useTranslation('handoff');
    const [statusFilter, setStatusFilter] = useState<HandoffStatus | 'all'>('new');
    const { markOpened, markDone, archive, remove, send, deviceLabel, clearArchived } = useHandoff();
    const items = useHandoffItems(statusFilter === 'all' ? undefined : statusFilter);
    const notify = useNotification();
    const isTouchDevice = useTouchDevice();

    const [inputText, setInputText] = useState('');
    const [targetCategory, setTargetCategory] = useState<'private' | 'work' | 'any'>('any');
    const [isSending, setIsSending] = useState(false);

    // F231: Mobile tab state (Compose/Inbox)
    const [activeTab, setActiveTab] = useState<'compose' | 'inbox'>('inbox');

    // F200: Sensitive mode state
    const [isSensitive, setIsSensitive] = useState(false);
    const [passphrase, setPassphrase] = useState('');
    const [showPassphrase, setShowPassphrase] = useState(false);

    // F201: Work mode state
    const [isWorkMode, setIsWorkMode] = useState(false);

    const handleOpen = (item: HandoffItem) => {
        markOpened(item.id);
        if (item.kind === 'url') {
            window.open(item.target, '_blank');
        } else {
            // For text, copy to clipboard
            navigator.clipboard.writeText(item.text);
            notify.info(t('common:messages.copied'));
        }
    };

    const handleSend = useCallback(async () => {
        if (!inputText.trim() || isSending) return;

        // F201: Work mode restriction
        const trimmedText = inputText.trim();
        const isUrl = /^https?:\/\//.test(trimmedText);

        if (isWorkMode && !isUrl) {
            notify.warning(t('composer.workModeHint'));
            return;
        }

        // F200: Sensitive mode validation
        if (isSensitive && !passphrase.trim()) {
            notify.warning(t('composer.passphrasePlaceholder'));
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

            notify.success(t('notifications.sentTo', { category: targetCategory }));
        } catch (error) {
            console.error('Handoff send error:', error);
            notify.error(t('notifications.failedMessage'));
        } finally {
            setIsSending(false);
        }
    }, [inputText, targetCategory, send, notify, isSending, t, isSensitive, passphrase, isWorkMode]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            handleSend();
        }
    };

    // Compose Panel Component (used in both split and tabbed layouts)
    const ComposePanel = () => (
        <div className="h-full flex flex-col p-4 md:p-4 bg-white/5 md:border-r border-white/10">
            <div className="mb-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-white/50 mb-1">{t('composer.title')}</h2>
                <p className="text-xs text-white/30">{t('composer.description')}</p>
            </div>

            <div className="flex-1 flex flex-col gap-4 overflow-y-auto touch-scroll">
                <div className="flex-1 flex flex-col min-h-[200px]">
                    <label className="text-[10px] font-bold uppercase text-white/40 mb-1.5 ml-1">
                        {t('composer.content')}
                    </label>
                    <TextArea
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t('composer.placeholder')}
                        className="flex-1 resize-none bg-black/20 border-white/10 focus:border-indigo-500/50 touch-scroll"
                    />
                    <div className="mt-1 text-[10px] text-white/20 text-right">{t('composer.hint')}</div>
                </div>

                <div>
                    <label className="text-[10px] font-bold uppercase text-white/40 mb-1.5 ml-1">
                        {t('composer.target')}
                    </label>
                    <Select
                        value={targetCategory}
                        onChange={val => setTargetCategory(val as 'private' | 'work' | 'any')}
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
                        <div className="animate-fade-in flex items-center gap-2">
                            <TextInput
                                type={showPassphrase ? 'text' : 'password'}
                                value={passphrase}
                                onChange={e => setPassphrase(e.target.value)}
                                placeholder={t('composer.passphrasePlaceholder')}
                                className="flex-1 bg-black/40 border-white/10 text-xs"
                            />
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setShowPassphrase(!showPassphrase)}
                                className="h-9 px-2 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0"
                                title={showPassphrase ? 'Hide' : 'Show'}
                            >
                                <Icon name={showPassphrase ? 'visibility_off' : 'visibility'} size={16} />
                            </Button>
                        </div>
                    )}
                </div>

                <Button
                    variant="primary"
                    onClick={handleSend}
                    disabled={!inputText.trim() || isSending}
                    className="w-full py-3 min-h-[44px] bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold uppercase tracking-widest text-xs transition-colors"
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
    );

    // Inbox Panel Component (used in both split and tabbed layouts)
    const InboxPanel = () => (
        <div className="h-full overflow-y-auto touch-scroll p-4">
            {!items || items.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                    <EmptyState icon="sync_alt" title={t('inbox.empty')} description={t('inbox.emptyHint')} />
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
    );

    return (
        <AppContainer>
            <div className="flex flex-col h-full bg-background-dark text-white">
                {/* Toolbar */}
                <div className="p-4 border-b border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between bg-[#2d2d2d] gap-4 md:gap-0">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 w-full md:w-auto">
                        <h1 className="text-lg font-semibold flex items-center gap-2">
                            <Icon name="sync_alt" className="text-indigo-400" />
                            {t('title')}
                        </h1>
                        <div className="flex items-center gap-2 w-full md:w-auto md:ml-4">
                            <span className="text-xs text-white/50 uppercase font-bold tracking-wider">
                                {t('inbox.filter')}:
                            </span>
                            <Select
                                value={statusFilter}
                                onChange={val => setStatusFilter(val as HandoffStatus | 'all')}
                                options={[
                                    { label: t('inbox.filter') + ': All', value: 'all' },
                                    { label: t('status.new'), value: 'new' },
                                    { label: t('status.opened'), value: 'opened' },
                                    { label: t('status.done'), value: 'done' },
                                    { label: t('status.archived'), value: 'archived' },
                                ]}
                                className="flex-1 md:flex-none md:w-32 min-h-[44px] md:min-h-0"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 w-full md:w-auto">
                        <div className="text-[10px] text-white/30 uppercase font-bold tracking-widest">
                            {t('inbox.device')}: <span className="text-indigo-400">{deviceLabel}</span>
                        </div>
                        {statusFilter === 'archived' && (
                            <button
                                onClick={clearArchived}
                                className="flex items-center gap-1.5 px-3 py-2 md:px-2 md:py-1 min-h-[44px] md:min-h-0 bg-red-500/20 hover:bg-red-500/30 active:bg-red-500/40 text-red-400 rounded text-[10px] uppercase font-bold tracking-wider transition-colors"
                                title={t('actions.clearArchive')}
                            >
                                <Icon name="delete_sweep" size={14} />
                                {t('actions.clearArchive')}
                            </button>
                        )}
                    </div>
                </div>

                {/* F231: Tabbed layout for mobile, SplitPane for desktop */}
                {isTouchDevice ? (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Tab Switcher */}
                        <div className="p-4 border-b border-white/10 bg-white/5">
                            <TabSwitcher
                                options={[
                                    { value: 'inbox', label: t('inbox.filter'), icon: 'inbox' },
                                    { value: 'compose', label: t('composer.title'), icon: 'edit' },
                                ]}
                                value={activeTab}
                                onChange={setActiveTab}
                                variant="primary"
                                size="md"
                            />
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-hidden">
                            {activeTab === 'compose' ? <ComposePanel /> : <InboxPanel />}
                        </div>
                    </div>
                ) : (
                    /* Desktop: Split Pane layout */
                    <div className="flex-1 overflow-hidden">
                        <SplitPane
                            direction="horizontal"
                            primarySize="350px"
                            primary={<ComposePanel />}
                            secondary={<InboxPanel />}
                        />
                    </div>
                )}
            </div>
        </AppContainer>
    );
};
