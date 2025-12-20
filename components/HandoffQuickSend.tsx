import React, { useState, useEffect } from 'react';
import { useHandoff, useNotification } from '../hooks';
import { useTranslation } from '../hooks/useTranslation';
import { Button, Select, Icon, TextInput, Checkbox } from './ui';
import { encrypt } from '../utils/crypto';
import { HandoffItem } from '../types';

interface HandoffQuickSendProps {
    isOpen: boolean;
    onClose: () => void;
}

export const HandoffQuickSend: React.FC<HandoffQuickSendProps> = ({ isOpen, onClose }) => {
    const { t } = useTranslation('handoff');
    const { send } = useHandoff();
    const notify = useNotification();
    const [text, setText] = useState('');
    const [targetCategory, setTargetCategory] = useState<'private' | 'work' | 'any'>('any');
    const [isSensitive, setIsSensitive] = useState(false);
    const [passphrase, setPassphrase] = useState('');
    const [showPassphrase, setShowPassphrase] = useState(false);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        if (isOpen) {
            navigator.clipboard
                .readText()
                .then(setText)
                .catch(() => {
                    notify.error('Failed to read clipboard');
                });
        }
    }, [isOpen, notify, t]);

    const handleSend = async () => {
        if (!text.trim() || isSending) return;

        if (isSensitive && !passphrase.trim()) {
            notify.warning(t('composer.passphrasePlaceholder'));
            return;
        }

        setIsSending(true);
        try {
            const trimmedText = text.trim();
            const isUrl = /^https?:\/\//.test(trimmedText);

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
            notify.success(t('notifications.sentTo', { category: targetCategory }));
            onClose();
        } catch {
            notify.error(t('notifications.failedMessage'));
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-[400px] glass-panel rounded-xl shadow-2xl p-6 border border-white/10 animate-scale-in">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
                        <Icon name="sync_alt" className="text-indigo-400" />
                        Quick Send to Handoff
                    </h2>
                    <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                        <Icon name="close" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-bold uppercase text-white/40 mb-1.5 block ml-1">
                            Clipboard Content
                        </label>
                        <div className="p-3 bg-black/20 rounded-lg border border-white/5 text-xs text-white/80 break-all max-h-32 overflow-y-auto">
                            {text || 'Clipboard is empty'}
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold uppercase text-white/40 mb-1.5 block ml-1">
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
                            label={t('composer.sensitive')}
                            checked={isSensitive}
                            onChange={setIsSensitive}
                            className="text-xs"
                        />
                        {isSensitive && (
                            <div className="flex items-center gap-2">
                                <TextInput
                                    type={showPassphrase ? 'text' : 'password'}
                                    value={passphrase}
                                    onChange={e => setPassphrase(e.target.value)}
                                    placeholder={t('composer.passphrasePlaceholder')}
                                    className="flex-1 bg-black/40 border-white/10 text-xs"
                                    autoFocus
                                />
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setShowPassphrase(!showPassphrase)}
                                    className="h-9 px-2"
                                    title={showPassphrase ? 'Hide' : 'Show'}
                                >
                                    <Icon name={showPassphrase ? 'visibility_off' : 'visibility'} size={16} />
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button variant="ghost" onClick={onClose} className="flex-1">
                            {t('common:actions.cancel')}
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleSend}
                            disabled={!text.trim() || isSending}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-500"
                        >
                            {isSending ? t('composer.sending') : t('composer.send')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
