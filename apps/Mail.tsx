import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDb } from '../context/DbContext';
import { useDexieLiveQuery } from '../utils/storage/react';
import { useWindowInstance, useNotification } from '../hooks';
import { generateUuid } from '../utils/uuid';
import { SearchInput, TextArea } from '../components/ui';
import { useConfirmDialog, ConfirmDialog } from '../components/ui/ConfirmDialog';
import { email as emailValidator, validateValue } from '../utils/validation';
import type { MailFolderId, EmailRecord } from '../utils/storage/db';
import { useTranslation } from '../hooks/useTranslation';

const USER_EMAIL = 'john.doe@windows15.local';

const parseRecipients = (raw: string) => {
    const recipients = raw
        .split(/[;,]/g)
        .map(value => value.trim())
        .filter(Boolean);

    // Validate each email address
    for (const recipient of recipients) {
        const error = validateValue(recipient, emailValidator('Invalid email address'));
        if (error) {
            throw new Error(`${recipient}: ${error}`);
        }
    }

    return recipients;
};

const formatMessageTime = (timestamp: number) => {
    const date = new Date(timestamp);
    if (!Number.isFinite(date.getTime())) return '';
    return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

// Seed data for first-time users
const seedEmails = (): Omit<EmailRecord, 'createdAt' | 'updatedAt'>[] => {
    const now = Date.now();
    const days = (count: number) => now - count * 24 * 60 * 60 * 1000;
    const hours = (count: number) => now - count * 60 * 60 * 1000;

    return [
        {
            id: generateUuid(),
            folderId: 'inbox',
            from: 'Ada Lovelace <ada@analytical.engine>',
            to: [USER_EMAIL],
            subject: 'Welcome to Windows 15 Mail',
            body: `This is a local demo inbox.\n\n- Compose messages\n- Save drafts\n- Move mail to Trash\n\nNothing is sent to a real email provider.`,
            date: hours(2),
            isRead: false,
        },
        {
            id: generateUuid(),
            folderId: 'inbox',
            from: 'Design Team <design@contoso.com>',
            to: [USER_EMAIL],
            subject: 'Design review notes',
            body: `Here are the notes from yesterday:\n\n• Update calendar layout\n• Improve empty states\n• Add keyboard shortcuts (optional)\n\nThanks!`,
            date: days(1),
            isRead: true,
        },
        {
            id: generateUuid(),
            folderId: 'sent',
            from: `John Doe <${USER_EMAIL}>`,
            to: ['alex@contoso.com'],
            subject: 'Re: Project timeline',
            body: `Hi Alex,\n\nSounds good — I can share an updated timeline by Friday.\n\nJohn`,
            date: days(3),
            isRead: true,
        },
        {
            id: generateUuid(),
            folderId: 'drafts',
            from: `John Doe <${USER_EMAIL}>`,
            to: ['team@contoso.com'],
            subject: 'Weekly update (draft)',
            body: `Draft:\n\n- Progress:\n- Blockers:\n- Next steps:\n`,
            date: days(4),
            isRead: true,
        },
    ];
};

type ComposeState = {
    draftId?: string;
    to: string;
    subject: string;
    body: string;
};

interface MailProps {
    windowId?: string;
}

export const Mail: React.FC<MailProps> = ({ windowId }) => {
    const { t } = useTranslation('mail');
    const db = useDb();
    const { confirm, dialogProps } = useConfirmDialog();
    const { setTitle, setBadge } = useWindowInstance(windowId ?? '');
    const { info } = useNotification();

    // Track previous unread count to detect new messages
    const prevUnreadCountRef = useRef<number | null>(null);

    const [activeMailbox, setActiveMailbox] = useState<MailFolderId>('inbox');
    const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [compose, setCompose] = useState<ComposeState | null>(null);
    const [composeError, setComposeError] = useState<string | null>(null);
    const [isSeeded, setIsSeeded] = useState(false);

    // Live query for emails
    const { value: emails = [], isLoading } = useDexieLiveQuery(
        () => db.emails.orderBy('date').reverse().toArray(),
        [db]
    );

    // Seed emails on first load if empty
    useEffect(() => {
        const seedData = async () => {
            if (isLoading || isSeeded) return;

            try {
                const count = await db.emails.count();
                if (count === 0) {
                    const now = Date.now();
                    const emailsToSeed = seedEmails().map(email => ({
                        ...email,
                        createdAt: now,
                        updatedAt: now,
                    }));
                    await db.emails.bulkPut(emailsToSeed);
                }
                setIsSeeded(true);
            } catch (error) {
                console.error('Failed to seed emails:', error);
                setIsSeeded(true);
            }
        };

        void seedData();
    }, [db, isLoading, isSeeded]);

    const mailboxCounts = useMemo(() => {
        const counts: Record<MailFolderId, { total: number; unread: number }> = {
            inbox: { total: 0, unread: 0 },
            sent: { total: 0, unread: 0 },
            drafts: { total: 0, unread: 0 },
            trash: { total: 0, unread: 0 },
        };

        for (const email of emails) {
            const counter = counts[email.folderId];
            counter.total += 1;
            if (!email.isRead && email.folderId === 'inbox') counter.unread += 1;
        }

        return counts;
    }, [emails]);

    // Update window title and badge with unread count
    useEffect(() => {
        if (windowId) {
            const unread = mailboxCounts.inbox.unread;
            setTitle(unread > 0 ? `${t('title')} - ${t('inbox')} (${unread})` : t('title'));
            setBadge(unread > 0 ? unread : null);
        }
    }, [windowId, mailboxCounts.inbox.unread, setTitle, setBadge, t]);

    // Show notification when new unread messages arrive
    useEffect(() => {
        const currentUnread = mailboxCounts.inbox.unread;
        const prevUnread = prevUnreadCountRef.current;

        // Only notify if count increased (not on initial load)
        if (prevUnread !== null && currentUnread > prevUnread) {
            const newMessages = currentUnread - prevUnread;
            const message =
                newMessages === 1
                    ? t('newMessageNotification', 'You have a new message')
                    : t('newMessagesNotification', `You have ${newMessages} new messages`);
            info(message);
        }

        prevUnreadCountRef.current = currentUnread;
    }, [mailboxCounts.inbox.unread, info, t]);

    const filteredMessages = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        return emails
            .filter(email => email.folderId === activeMailbox)
            .filter(email => {
                if (!query) return true;
                return (
                    email.subject.toLowerCase().includes(query) ||
                    email.from.toLowerCase().includes(query) ||
                    email.to.join(',').toLowerCase().includes(query) ||
                    email.body.toLowerCase().includes(query)
                );
            });
    }, [activeMailbox, emails, searchQuery]);

    const selectedMessage = useMemo(() => {
        if (!selectedMessageId) return null;
        return emails.find(email => email.id === selectedMessageId) ?? null;
    }, [emails, selectedMessageId]);

    useEffect(() => {
        if (selectedMessageId && filteredMessages.some(email => email.id === selectedMessageId)) return;
        setSelectedMessageId(filteredMessages[0]?.id ?? null);
    }, [filteredMessages, selectedMessageId]);

    const openMessage = async (id: string) => {
        setSelectedMessageId(id);
        const email = emails.find(e => e.id === id);
        if (email && !email.isRead) {
            await db.emails.update(id, { isRead: true, updatedAt: Date.now() });
        }
    };

    const moveToTrash = async (id: string) => {
        const email = emails.find(e => e.id === id);
        if (!email || email.folderId === 'trash') return;

        await db.emails.update(id, {
            folderId: 'trash',
            trashedFrom: email.folderId,
            updatedAt: Date.now(),
        });
        setSelectedMessageId(null);
    };

    const restoreFromTrash = async (id: string) => {
        const email = emails.find(e => e.id === id);
        if (!email || email.folderId !== 'trash') return;

        await db.emails.update(id, {
            folderId: email.trashedFrom ?? 'inbox',
            trashedFrom: undefined,
            updatedAt: Date.now(),
        });
    };

    const deleteForever = async (id: string) => {
        const message = await db.emails.get(id);
        if (!message) return;

        const confirmed = await confirm({
            title: 'Permanently Delete Email',
            message: `Are you sure you want to permanently delete "${message.subject || '(no subject)'}"? This action cannot be undone.`,
            variant: 'danger',
            confirmLabel: 'Delete Forever',
        });
        if (!confirmed) return;

        await db.emails.delete(id);
        setSelectedMessageId(null);
    };

    const startCompose = (draft?: EmailRecord) => {
        setComposeError(null);
        if (draft) {
            setCompose({
                draftId: draft.id,
                to: draft.to.join(', '),
                subject: draft.subject,
                body: draft.body,
            });
            return;
        }
        setCompose({ to: '', subject: '', body: '' });
    };

    const saveDraft = async () => {
        if (!compose) return;

        let draftRecipients: string[];
        try {
            draftRecipients = parseRecipients(compose.to);
        } catch (error) {
            setComposeError(error instanceof Error ? error.message : 'Invalid email address');
            return;
        }

        const now = Date.now();

        if (compose.draftId) {
            await db.emails.update(compose.draftId, {
                folderId: 'drafts',
                to: draftRecipients,
                subject: compose.subject,
                body: compose.body,
                date: now,
                updatedAt: now,
            });
            setActiveMailbox('drafts');
            setSelectedMessageId(compose.draftId);
        } else {
            const newDraftId = generateUuid();
            await db.emails.add({
                id: newDraftId,
                folderId: 'drafts',
                from: `John Doe <${USER_EMAIL}>`,
                to: draftRecipients,
                subject: compose.subject,
                body: compose.body,
                date: now,
                isRead: true,
                createdAt: now,
                updatedAt: now,
            });
            setActiveMailbox('drafts');
            setSelectedMessageId(newDraftId);
        }

        setCompose(null);
    };

    const sendMessage = async () => {
        if (!compose) return;

        let recipients: string[];
        try {
            recipients = parseRecipients(compose.to);
        } catch (error) {
            setComposeError(error instanceof Error ? error.message : 'Invalid email address');
            return;
        }

        if (recipients.length === 0) {
            setComposeError(t('to'));
            return;
        }

        const now = Date.now();

        if (compose.draftId) {
            await db.emails.update(compose.draftId, {
                folderId: 'sent',
                to: recipients,
                subject: compose.subject || '(no subject)',
                body: compose.body,
                date: now,
                isRead: true,
                trashedFrom: undefined,
                updatedAt: now,
            });
            setActiveMailbox('sent');
            setSelectedMessageId(compose.draftId);
        } else {
            const newEmailId = generateUuid();
            await db.emails.add({
                id: newEmailId,
                folderId: 'sent',
                from: `John Doe <${USER_EMAIL}>`,
                to: recipients,
                subject: compose.subject || '(no subject)',
                body: compose.body,
                date: now,
                isRead: true,
                createdAt: now,
                updatedAt: now,
            });
            setActiveMailbox('sent');
            setSelectedMessageId(newEmailId);
        }

        setCompose(null);
    };

    if (isLoading && !isSeeded) {
        return (
            <div className="h-full w-full bg-background-dark text-white flex items-center justify-center">
                <div className="text-white/50">{t('status.loading')}</div>
            </div>
        );
    }

    return (
        <div className="h-full w-full bg-background-dark text-white flex">
            {/* Sidebar */}
            <div className="w-56 shrink-0 border-r border-white/5 bg-black/20 p-3 flex flex-col gap-1">
                <button
                    onClick={() => startCompose()}
                    className="mb-2 px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center gap-2"
                >
                    <span
                        className="material-symbols-outlined text-[18px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                        edit
                    </span>
                    {t('compose')}
                </button>

                {(['inbox', 'sent', 'drafts', 'trash'] as MailFolderId[]).map(mailbox => {
                    const isActive = mailbox === activeMailbox;
                    const count = mailboxCounts[mailbox];
                    const badge = mailbox === 'inbox' ? count.unread : count.total;

                    return (
                        <button
                            key={mailbox}
                            onClick={() => setActiveMailbox(mailbox)}
                            className={`px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
                        >
                            <span className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-[18px]">
                                    {mailbox === 'inbox'
                                        ? 'inbox'
                                        : mailbox === 'sent'
                                          ? 'send'
                                          : mailbox === 'drafts'
                                            ? 'draft'
                                            : 'delete'}
                                </span>
                                {t(mailbox)}
                            </span>
                            {badge > 0 && (
                                <span
                                    className={`text-[10px] px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-white/10'}`}
                                >
                                    {badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* List + Reader */}
            <div className="flex-1 min-w-0 flex">
                {/* Message List */}
                <div className="w-80 shrink-0 border-r border-white/5 bg-black/10 flex flex-col">
                    <div className="p-3 border-b border-white/5 bg-black/20">
                        <SearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder={t('actions.search')}
                            aria-label={t('actions.search')}
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {filteredMessages.length === 0 ? (
                            <div className="p-6 text-sm text-white/50">{t('noMessages')}</div>
                        ) : (
                            filteredMessages.map(email => {
                                const isSelected = email.id === selectedMessageId;
                                const isUnread = !email.isRead && email.folderId === 'inbox';
                                const preview =
                                    email.body
                                        .split('\n')
                                        .map(line => line.trim())
                                        .find(Boolean) ?? '';

                                return (
                                    <button
                                        key={email.id}
                                        onClick={() => void openMessage(email.id)}
                                        className={`w-full text-left px-4 py-3 border-b border-white/5 transition-colors ${isSelected ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    {isUnread && (
                                                        <span className="w-2 h-2 rounded-full bg-primary shrink-0"></span>
                                                    )}
                                                    <span
                                                        className={`text-sm truncate ${isUnread ? 'font-semibold text-white' : 'text-white/80'}`}
                                                    >
                                                        {email.subject || '(no subject)'}
                                                    </span>
                                                </div>
                                                <div className="mt-0.5 text-[11px] text-white/50 truncate">
                                                    {email.folderId === 'sent'
                                                        ? `To: ${email.to.join(', ') || '(none)'}`
                                                        : email.from}
                                                </div>
                                            </div>
                                            <div className="text-[10px] text-white/40 shrink-0">
                                                {formatMessageTime(email.date)}
                                            </div>
                                        </div>
                                        <div className="mt-2 text-[11px] text-white/40 truncate">{preview}</div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Reader */}
                <div className="flex-1 min-w-0 flex flex-col">
                    <div className="h-12 shrink-0 border-b border-white/5 bg-black/20 flex items-center justify-between px-4">
                        <div className="text-sm font-medium text-white/80">{t(activeMailbox)}</div>
                        <div className="flex items-center gap-2">
                            {selectedMessage?.folderId === 'drafts' && (
                                <button
                                    onClick={() => startCompose(selectedMessage)}
                                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white/90 flex items-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-[16px]">edit</span>
                                    {t('common:actions.edit')}
                                </button>
                            )}

                            {selectedMessage && selectedMessage.folderId === 'trash' ? (
                                <>
                                    <button
                                        onClick={() => void restoreFromTrash(selectedMessage.id)}
                                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white/90 flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">
                                            restore_from_trash
                                        </span>
                                        {t('common:actions.restore')}
                                    </button>
                                    <button
                                        onClick={() => void deleteForever(selectedMessage.id)}
                                        className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-xs text-red-100 flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                                        {t('delete')}
                                    </button>
                                </>
                            ) : selectedMessage ? (
                                <button
                                    onClick={() => void moveToTrash(selectedMessage.id)}
                                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white/90 flex items-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                    {t('trash')}
                                </button>
                            ) : null}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {!selectedMessage ? (
                            <div className="h-full flex items-center justify-center text-sm text-white/50">
                                {t('noMessages')}
                            </div>
                        ) : (
                            <div className="max-w-3xl">
                                <div className="text-2xl font-light text-white">
                                    {selectedMessage.subject || '(no subject)'}
                                </div>
                                <div className="mt-3 text-xs text-white/60 flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[16px] text-white/40">
                                            person
                                        </span>
                                        <span className="truncate">{selectedMessage.from}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[16px] text-white/40">
                                            mail
                                        </span>
                                        <span className="truncate">
                                            {t('to')}: {selectedMessage.to.join(', ') || '(none)'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[16px] text-white/40">
                                            schedule
                                        </span>
                                        <span>{formatMessageTime(selectedMessage.date)}</span>
                                    </div>
                                </div>
                                <div className="mt-6 text-sm text-white/80 whitespace-pre-wrap leading-relaxed">
                                    {selectedMessage.body}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Compose */}
            {compose && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/60">
                    <div className="w-full max-w-2xl glass-panel rounded-xl overflow-hidden shadow-2xl">
                        <div className="h-12 px-4 flex items-center justify-between border-b border-white/10 bg-black/20">
                            <div className="text-sm font-medium text-white/90">
                                {compose.draftId ? t('drafts') : t('compose')}
                            </div>
                            <button
                                onClick={() => setCompose(null)}
                                className="w-8 h-8 rounded-lg hover:bg-white/10 text-white/70 flex items-center justify-center"
                                title={t('common:actions.close')}
                            >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>

                        {composeError && (
                            <div className="px-4 py-2 text-xs bg-red-500/15 text-red-100 border-b border-red-500/20">
                                {composeError}
                            </div>
                        )}

                        <div className="p-4 flex flex-col gap-3">
                            <label className="flex items-center gap-3">
                                <span className="text-xs text-white/60 w-10">{t('to')}</span>
                                <input
                                    value={compose.to}
                                    onChange={e => setCompose(prev => (prev ? { ...prev, to: e.target.value } : prev))}
                                    className="flex-1 h-9 px-3 rounded-lg bg-black/30 border border-white/10 text-sm text-white/80 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                                    placeholder="name@example.com"
                                />
                            </label>
                            <label className="flex items-center gap-3">
                                <span className="text-xs text-white/60 w-10">{t('subject')}</span>
                                <input
                                    value={compose.subject}
                                    onChange={e =>
                                        setCompose(prev => (prev ? { ...prev, subject: e.target.value } : prev))
                                    }
                                    className="flex-1 h-9 px-3 rounded-lg bg-black/30 border border-white/10 text-sm text-white/80 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                                    placeholder={t('subject')}
                                />
                            </label>
                            <TextArea
                                value={compose.body}
                                onChange={e => setCompose(prev => (prev ? { ...prev, body: e.target.value } : prev))}
                                className="h-56 bg-black/30 focus:border-primary/60 focus:ring-1 focus:ring-primary/30 whitespace-pre-wrap"
                                placeholder={t('body')}
                            />
                        </div>

                        <div className="px-4 py-3 flex items-center justify-between border-t border-white/10 bg-black/20">
                            <div className="text-[11px] text-white/50">Emails are synced across your devices.</div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => void saveDraft()}
                                    className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white/90"
                                >
                                    {t('saveDraft')}
                                </button>
                                <button
                                    onClick={() => void sendMessage()}
                                    className="px-3 py-2 rounded-lg bg-primary hover:bg-primary/90 text-xs text-white font-medium"
                                >
                                    {t('send')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Dialog */}
            <ConfirmDialog {...dialogProps} />
        </div>
    );
};
