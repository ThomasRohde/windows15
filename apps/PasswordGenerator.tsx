import React, { useState, useCallback } from 'react';
import { usePersistedState, useStandardHotkeys, useCopyToClipboard } from '../hooks';
import { useTranslation } from '../hooks/useTranslation';
import { AppContainer, Slider, Checkbox, Button, CopyButton, TextInput } from '../components/ui';

interface PasswordSettings {
    length: number;
    uppercase: boolean;
    lowercase: boolean;
    numbers: boolean;
    symbols: boolean;
}

export const PasswordGenerator = () => {
    const { t } = useTranslation('passwordGenerator');
    const { value: settings, setValue: setSettings } = usePersistedState<PasswordSettings>('passwordgen.settings', {
        length: 16,
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: true,
    });
    const [password, setPassword] = useState('');

    const { length, uppercase, lowercase, numbers, symbols } = settings;

    const generatePassword = useCallback(() => {
        let chars = '';
        if (uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (lowercase) chars += 'abcdefghijklmnopqrstuvwxyz';
        if (numbers) chars += '0123456789';
        if (symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

        if (!chars) {
            setPassword(t('strength'));
            return;
        }

        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setPassword(result);
    }, [length, uppercase, lowercase, numbers, symbols, t]);

    const getStrength = () => {
        if (!password || password === t('strength')) return { label: '', color: '', width: '0%' };

        let score = 0;
        if (password.length >= 12) score++;
        if (password.length >= 16) score++;
        if (password.length >= 24) score++;
        if (uppercase) score++;
        if (lowercase) score++;
        if (numbers) score++;
        if (symbols) score++;

        if (score <= 2) return { label: t('weak'), color: 'bg-red-500', width: '25%' };
        if (score <= 4) return { label: t('fair'), color: 'bg-yellow-500', width: '50%' };
        if (score <= 6) return { label: t('good'), color: 'bg-blue-500', width: '75%' };
        return { label: t('strong'), color: 'bg-green-500', width: '100%' };
    };

    const strength = getStrength();
    const { copy } = useCopyToClipboard();

    // Keyboard shortcuts (F140)
    useStandardHotkeys({
        onCopy: password && password !== t('strength') ? () => void copy(password) : undefined,
    });

    return (
        <AppContainer>
            <div className="bg-black/30 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                    <TextInput
                        type="text"
                        value={password}
                        readOnly
                        placeholder={t('generate')}
                        className="flex-1 bg-transparent text-lg font-mono border-none"
                    />
                    <CopyButton value={password} disabled={!password || password === t('strength')} size="sm" />
                </div>
                {password && password !== t('strength') && (
                    <div className="mt-3">
                        <div className="flex justify-between text-xs text-white/60 mb-1">
                            <span>{t('strength')}</span>
                            <span>{strength.label}</span>
                        </div>
                        <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${strength.color} transition-all duration-300`}
                                style={{ width: strength.width }}
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-black/20 p-4 rounded-lg space-y-4">
                <Slider
                    label={t('length')}
                    value={length}
                    min={8}
                    max={64}
                    onChange={v => setSettings({ ...settings, length: v })}
                    rangeLabels={['8', '64']}
                />

                <div className="grid grid-cols-2 gap-3">
                    <Checkbox
                        checked={uppercase}
                        onChange={v => setSettings({ ...settings, uppercase: v })}
                        label={t('uppercase')}
                        size="sm"
                    />
                    <Checkbox
                        checked={lowercase}
                        onChange={v => setSettings({ ...settings, lowercase: v })}
                        label={t('lowercase')}
                        size="sm"
                    />
                    <Checkbox
                        checked={numbers}
                        onChange={v => setSettings({ ...settings, numbers: v })}
                        label={t('numbers')}
                        size="sm"
                    />
                    <Checkbox
                        checked={symbols}
                        onChange={v => setSettings({ ...settings, symbols: v })}
                        label={t('symbols')}
                        size="sm"
                    />
                </div>
            </div>

            <Button onClick={generatePassword} variant="primary" size="lg" wide>
                {t('generate')}
            </Button>
        </AppContainer>
    );
};
