import React, { useEffect, useMemo, useState } from 'react';
import { readJsonIfPresent, STORAGE_KEYS, writeJson } from '../utils/storage';

type MailboxId = 'inbox' | 'sent' | 'drafts' | 'trash';

type MailMessage = {
    id: string;
    mailbox: MailboxId;
    from: string;
    to: string[];
    subject: string;
    body: string;
    date: string; // ISO string
    isRead: boolean;
    trashedFrom?: MailboxId;
};

type ComposeState = {
    draftId?: string;
    to: string;
    subject: string;
    body: string;
};

const USER_EMAIL = 'john.doe@windows15.local';

const createId = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 11);

const parseRecipients = (raw: string) =>
    raw
        .split(/[;,]/g)
        .map(value => value.trim())
        .filter(Boolean);

const formatMessageTime = (iso: string) => {
    const date = new Date(iso);
    if (!Number.isFinite(date.getTime())) return '';
    return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const seedMessages = (): MailMessage[] => {
    const now = Date.now();
    const days = (count: number) => new Date(now - count * 24 * 60 * 60 * 1000).toISOString();
    const hours = (count: number) => new Date(now - count * 60 * 60 * 1000).toISOString();

    return [
        {
            id: createId(),
            mailbox: 'inbox',
            from: 'Ada Lovelace <ada@analytical.engine>',
            to: [USER_EMAIL],
            subject: 'Welcome to Windows 15 Mail',
            body: `This is a local demo inbox.\n\n- Compose messages\n- Save drafts\n- Move mail to Trash\n\nNothing is sent to a real email provider.`,
            date: hours(2),
            isRead: false,
        },
        {
            id: createId(),
            mailbox: 'inbox',
            from: 'Design Team <design@contoso.com>',
            to: [USER_EMAIL],
            subject: 'Design review notes',
            body: `Here are the notes from yesterday:\n\n• Update calendar layout\n• Improve empty states\n• Add keyboard shortcuts (optional)\n\nThanks!`,
            date: days(1),
            isRead: true,
        },
        {
            id: createId(),
            mailbox: 'sent',
            from: `John Doe <${USER_EMAIL}>`,
            to: ['alex@contoso.com'],
            subject: 'Re: Project timeline',
            body: `Hi Alex,\n\nSounds good — I can share an updated timeline by Friday.\n\nJohn`,
            date: days(3),
            isRead: true,
        },
        {
            id: createId(),
            mailbox: 'drafts',
            from: `John Doe <${USER_EMAIL}>`,
            to: ['team@contoso.com'],
            subject: 'Weekly update (draft)',
            body: `Draft:\n\n- Progress:\n- Blockers:\n- Next steps:\n`,
            date: days(4),
            isRead: true,
        },
    ];
};

const MAILBOX_LABELS: Record<MailboxId, string> = {
    inbox: 'Inbox',
    sent: 'Sent',
    drafts: 'Drafts',
    trash: 'Trash',
};

export const Mail = () => {
    const [messages, setMessages] = useState<MailMessage[]>(() => {
        const existing = readJsonIfPresent<MailMessage[]>(STORAGE_KEYS.mailMessages);
        if (existing !== null && Array.isArray(existing)) return existing;
        return seedMessages();
    });

    const [activeMailbox, setActiveMailbox] = useState<MailboxId>('inbox');
    const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [compose, setCompose] = useState<ComposeState | null>(null);
    const [composeError, setComposeError] = useState<string | null>(null);

    useEffect(() => {
        writeJson(STORAGE_KEYS.mailMessages, messages);
    }, [messages]);

    const mailboxCounts = useMemo(() => {
        const counts: Record<MailboxId, { total: number; unread: number }> = {
            inbox: { total: 0, unread: 0 },
            sent: { total: 0, unread: 0 },
            drafts: { total: 0, unread: 0 },
            trash: { total: 0, unread: 0 },
        };

        for (const message of messages) {
            const counter = counts[message.mailbox];
            counter.total += 1;
            if (!message.isRead && message.mailbox === 'inbox') counter.unread += 1;
        }

        return counts;
    }, [messages]);

    const filteredMessages = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        return messages
            .filter(message => message.mailbox === activeMailbox)
            .filter(message => {
                if (!query) return true;
                return (
                    message.subject.toLowerCase().includes(query) ||
                    message.from.toLowerCase().includes(query) ||
                    message.to.join(',').toLowerCase().includes(query) ||
                    message.body.toLowerCase().includes(query)
                );
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [activeMailbox, messages, searchQuery]);

    const selectedMessage = useMemo(() => {
        if (!selectedMessageId) return null;
        return messages.find(message => message.id === selectedMessageId) ?? null;
    }, [messages, selectedMessageId]);

    useEffect(() => {
        if (selectedMessageId && filteredMessages.some(message => message.id === selectedMessageId)) return;
        setSelectedMessageId(filteredMessages[0]?.id ?? null);
    }, [filteredMessages, selectedMessageId]);

    const openMessage = (id: string) => {
        setSelectedMessageId(id);
        setMessages(prev => prev.map(message => (message.id === id ? { ...message, isRead: true } : message)));
    };

    const moveToTrash = (id: string) => {
        setMessages(prev =>
            prev.map(message => {
                if (message.id !== id) return message;
                if (message.mailbox === 'trash') return message;
                return { ...message, mailbox: 'trash', trashedFrom: message.mailbox };
            })
        );
        setSelectedMessageId(null);
    };

    const restoreFromTrash = (id: string) => {
        setMessages(prev =>
            prev.map(message => {
                if (message.id !== id) return message;
                if (message.mailbox !== 'trash') return message;
                return { ...message, mailbox: message.trashedFrom ?? 'inbox', trashedFrom: undefined };
            })
        );
    };

    const deleteForever = (id: string) => {
        setMessages(prev => prev.filter(message => message.id !== id));
        setSelectedMessageId(null);
    };

    const startCompose = (draft?: MailMessage) => {
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

    const saveDraft = () => {
        if (!compose) return;
        const nowIso = new Date().toISOString();
        const draftRecipients = parseRecipients(compose.to);

        let savedDraftId: string | undefined;

        setMessages(prev => {
            if (compose.draftId) {
                savedDraftId = compose.draftId;
                return prev.map(message => {
                    if (message.id !== compose.draftId) return message;
                    return {
                        ...message,
                        mailbox: 'drafts',
                        to: draftRecipients,
                        subject: compose.subject,
                        body: compose.body,
                        date: nowIso,
                    };
                });
            }

            const newDraft: MailMessage = {
                id: createId(),
                mailbox: 'drafts',
                from: `John Doe <${USER_EMAIL}>`,
                to: draftRecipients,
                subject: compose.subject,
                body: compose.body,
                date: nowIso,
                isRead: true,
            };
            savedDraftId = newDraft.id;
            return [newDraft, ...prev];
        });

        setActiveMailbox('drafts');
        setSelectedMessageId(savedDraftId ?? null);
        setCompose(null);
    };

    const sendMessage = () => {
        if (!compose) return;
        const recipients = parseRecipients(compose.to);
        if (recipients.length === 0) {
            setComposeError('Add at least one recipient.');
            return;
        }

        const nowIso = new Date().toISOString();
        let sentId: string | undefined;

        setMessages(prev => {
            if (compose.draftId) {
                sentId = compose.draftId;
                return prev.map(message => {
                    if (message.id !== compose.draftId) return message;
                    return {
                        ...message,
                        mailbox: 'sent',
                        to: recipients,
                        subject: compose.subject || '(no subject)',
                        body: compose.body,
                        date: nowIso,
                        isRead: true,
                        trashedFrom: undefined,
                    };
                });
            }

            const outgoing: MailMessage = {
                id: createId(),
                mailbox: 'sent',
                from: `John Doe <${USER_EMAIL}>`,
                to: recipients,
                subject: compose.subject || '(no subject)',
                body: compose.body,
                date: nowIso,
                isRead: true,
            };
            sentId = outgoing.id;
            return [outgoing, ...prev];
        });

        setActiveMailbox('sent');
        setSelectedMessageId(sentId ?? null);
        setCompose(null);
    };

    return (
        <div className="h-full w-full bg-background-dark text-white flex">
            {/* Sidebar */}
            <div className="w-56 shrink-0 border-r border-white/5 bg-black/20 p-3 flex flex-col gap-1">
                <button
                    onClick={() => startCompose()}
                    className="mb-2 px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>edit</span>
                    New mail
                </button>

                {(['inbox', 'sent', 'drafts', 'trash'] as MailboxId[]).map(mailbox => {
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
                                    {mailbox === 'inbox' ? 'inbox' : mailbox === 'sent' ? 'send' : mailbox === 'drafts' ? 'draft' : 'delete'}
                                </span>
                                {MAILBOX_LABELS[mailbox]}
                            </span>
                            {badge > 0 && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-white/10'}`}>
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
                        <div className="relative">
                            <span className="material-symbols-outlined text-white/40 text-[18px] absolute left-3 top-1/2 -translate-y-1/2">search</span>
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search mail"
                                spellCheck={false}
                                className="w-full h-9 pl-10 pr-3 rounded-lg bg-black/30 border border-white/10 text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {filteredMessages.length === 0 ? (
                            <div className="p-6 text-sm text-white/50">No messages found.</div>
                        ) : (
                            filteredMessages.map(message => {
                                const isSelected = message.id === selectedMessageId;
                                const isUnread = !message.isRead && message.mailbox === 'inbox';
                                const preview = message.body
                                    .split('\n')
                                    .map(line => line.trim())
                                    .find(Boolean) ?? '';

                                return (
                                    <button
                                        key={message.id}
                                        onClick={() => openMessage(message.id)}
                                        className={`w-full text-left px-4 py-3 border-b border-white/5 transition-colors ${isSelected ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    {isUnread && <span className="w-2 h-2 rounded-full bg-primary shrink-0"></span>}
                                                    <span className={`text-sm truncate ${isUnread ? 'font-semibold text-white' : 'text-white/80'}`}>
                                                        {message.subject || '(no subject)'}
                                                    </span>
                                                </div>
                                                <div className="mt-0.5 text-[11px] text-white/50 truncate">
                                                    {message.mailbox === 'sent' ? `To: ${message.to.join(', ') || '(none)'}` : message.from}
                                                </div>
                                            </div>
                                            <div className="text-[10px] text-white/40 shrink-0">{formatMessageTime(message.date)}</div>
                                        </div>
                                        <div className="mt-2 text-[11px] text-white/40 truncate">
                                            {preview}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Reader */}
                <div className="flex-1 min-w-0 flex flex-col">
                    <div className="h-12 shrink-0 border-b border-white/5 bg-black/20 flex items-center justify-between px-4">
                        <div className="text-sm font-medium text-white/80">{MAILBOX_LABELS[activeMailbox]}</div>
                        <div className="flex items-center gap-2">
                            {selectedMessage?.mailbox === 'drafts' && (
                                <button
                                    onClick={() => startCompose(selectedMessage)}
                                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white/90 flex items-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-[16px]">edit</span>
                                    Edit
                                </button>
                            )}

                            {selectedMessage && selectedMessage.mailbox === 'trash' ? (
                                <>
                                    <button
                                        onClick={() => restoreFromTrash(selectedMessage.id)}
                                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white/90 flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">restore_from_trash</span>
                                        Restore
                                    </button>
                                    <button
                                        onClick={() => deleteForever(selectedMessage.id)}
                                        className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-xs text-red-100 flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                                        Delete
                                    </button>
                                </>
                            ) : selectedMessage ? (
                                <button
                                    onClick={() => moveToTrash(selectedMessage.id)}
                                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white/90 flex items-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                    Trash
                                </button>
                            ) : null}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {!selectedMessage ? (
                            <div className="h-full flex items-center justify-center text-sm text-white/50">Select a message to read.</div>
                        ) : (
                            <div className="max-w-3xl">
                                <div className="text-2xl font-light text-white">{selectedMessage.subject || '(no subject)'}</div>
                                <div className="mt-3 text-xs text-white/60 flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[16px] text-white/40">person</span>
                                        <span className="truncate">From: {selectedMessage.from}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[16px] text-white/40">mail</span>
                                        <span className="truncate">To: {selectedMessage.to.join(', ') || '(none)'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[16px] text-white/40">schedule</span>
                                        <span>{formatMessageTime(selectedMessage.date)}</span>
                                    </div>
                                </div>
                                <div className="mt-6 text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{selectedMessage.body}</div>
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
                            <div className="text-sm font-medium text-white/90">{compose.draftId ? 'Edit draft' : 'New message'}</div>
                            <button
                                onClick={() => setCompose(null)}
                                className="w-8 h-8 rounded-lg hover:bg-white/10 text-white/70 flex items-center justify-center"
                                title="Close"
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
                                <span className="text-xs text-white/60 w-10">To</span>
                                <input
                                    value={compose.to}
                                    onChange={e => setCompose(prev => (prev ? { ...prev, to: e.target.value } : prev))}
                                    className="flex-1 h-9 px-3 rounded-lg bg-black/30 border border-white/10 text-sm text-white/80 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                                    placeholder="name@example.com"
                                />
                            </label>
                            <label className="flex items-center gap-3">
                                <span className="text-xs text-white/60 w-10">Subject</span>
                                <input
                                    value={compose.subject}
                                    onChange={e => setCompose(prev => (prev ? { ...prev, subject: e.target.value } : prev))}
                                    className="flex-1 h-9 px-3 rounded-lg bg-black/30 border border-white/10 text-sm text-white/80 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                                    placeholder="(no subject)"
                                />
                            </label>
                            <textarea
                                value={compose.body}
                                onChange={e => setCompose(prev => (prev ? { ...prev, body: e.target.value } : prev))}
                                className="h-56 resize-none px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-white/80 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 whitespace-pre-wrap"
                                placeholder="Write your message…"
                            />
                        </div>

                        <div className="px-4 py-3 flex items-center justify-between border-t border-white/10 bg-black/20">
                            <div className="text-[11px] text-white/50">Drafts are saved locally in your browser.</div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={saveDraft}
                                    className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white/90"
                                >
                                    Save draft
                                </button>
                                <button
                                    onClick={sendMessage}
                                    className="px-3 py-2 rounded-lg bg-primary hover:bg-primary/90 text-xs text-white font-medium"
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
