import React, { useState, useCallback } from 'react';
import { useCopyToClipboard, usePersistedState } from '../hooks';
import { AppContainer, Slider, Checkbox } from '../components/ui';

interface PasswordSettings {
    length: number;
    uppercase: boolean;
    lowercase: boolean;
    numbers: boolean;
    symbols: boolean;
}

export const PasswordGenerator = () => {
    const { value: settings, setValue: setSettings } = usePersistedState<PasswordSettings>('passwordgen.settings', {
        length: 16,
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: true,
    });
    const [password, setPassword] = useState('');
    const { copy, copied } = useCopyToClipboard();

    const { length, uppercase, lowercase, numbers, symbols } = settings;

    const generatePassword = useCallback(() => {
        let chars = '';
        if (uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (lowercase) chars += 'abcdefghijklmnopqrstuvwxyz';
        if (numbers) chars += '0123456789';
        if (symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

        if (!chars) {
            setPassword('Select at least one option');
            return;
        }

        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setPassword(result);
    }, [length, uppercase, lowercase, numbers, symbols]);

    const handleCopy = async () => {
        if (!password || password === 'Select at least one option') return;
        await copy(password);
    };

    const getStrength = () => {
        if (!password || password === 'Select at least one option') return { label: '', color: '', width: '0%' };

        let score = 0;
        if (password.length >= 12) score++;
        if (password.length >= 16) score++;
        if (password.length >= 24) score++;
        if (uppercase) score++;
        if (lowercase) score++;
        if (numbers) score++;
        if (symbols) score++;

        if (score <= 2) return { label: 'Weak', color: 'bg-red-500', width: '25%' };
        if (score <= 4) return { label: 'Fair', color: 'bg-yellow-500', width: '50%' };
        if (score <= 6) return { label: 'Good', color: 'bg-blue-500', width: '75%' };
        return { label: 'Strong', color: 'bg-green-500', width: '100%' };
    };

    const strength = getStrength();

    return (
        <AppContainer>
            <div className="bg-black/30 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={password}
                        readOnly
                        placeholder="Click Generate"
                        className="flex-1 bg-transparent text-white text-lg font-mono focus:outline-none"
                    />
                    <button
                        onClick={handleCopy}
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                            copied ? 'bg-green-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }`}
                    >
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                </div>
                {password && password !== 'Select at least one option' && (
                    <div className="mt-3">
                        <div className="flex justify-between text-xs text-white/60 mb-1">
                            <span>Strength</span>
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
                    label="Password Length"
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
                        label="Uppercase (A-Z)"
                        size="sm"
                    />
                    <Checkbox
                        checked={lowercase}
                        onChange={v => setSettings({ ...settings, lowercase: v })}
                        label="Lowercase (a-z)"
                        size="sm"
                    />
                    <Checkbox
                        checked={numbers}
                        onChange={v => setSettings({ ...settings, numbers: v })}
                        label="Numbers (0-9)"
                        size="sm"
                    />
                    <Checkbox
                        checked={symbols}
                        onChange={v => setSettings({ ...settings, symbols: v })}
                        label="Symbols (!@#$)"
                        size="sm"
                    />
                </div>
            </div>

            <button
                onClick={generatePassword}
                className="bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-400 transition-colors font-medium text-lg"
            >
                Generate Password
            </button>
        </AppContainer>
    );
};
