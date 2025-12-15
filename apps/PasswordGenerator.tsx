import React, { useState, useCallback } from 'react';
import { useCopyToClipboard } from '../hooks';
import { Slider } from '../components/ui';

export const PasswordGenerator = () => {
    const [length, setLength] = useState(16);
    const [uppercase, setUppercase] = useState(true);
    const [lowercase, setLowercase] = useState(true);
    const [numbers, setNumbers] = useState(true);
    const [symbols, setSymbols] = useState(true);
    const [password, setPassword] = useState('');
    const { copy, copied } = useCopyToClipboard();

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

    const Checkbox = ({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) => (
        <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={checked} onChange={onChange} className="w-4 h-4 rounded accent-blue-500" />
            <span className="text-white/80">{label}</span>
        </label>
    );

    return (
        <div className="h-full bg-background-dark p-4 flex flex-col gap-4">
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
                    onChange={setLength}
                    rangeLabels={['8', '64']}
                />

                <div className="grid grid-cols-2 gap-3">
                    <Checkbox checked={uppercase} onChange={() => setUppercase(!uppercase)} label="Uppercase (A-Z)" />
                    <Checkbox checked={lowercase} onChange={() => setLowercase(!lowercase)} label="Lowercase (a-z)" />
                    <Checkbox checked={numbers} onChange={() => setNumbers(!numbers)} label="Numbers (0-9)" />
                    <Checkbox checked={symbols} onChange={() => setSymbols(!symbols)} label="Symbols (!@#$)" />
                </div>
            </div>

            <button
                onClick={generatePassword}
                className="bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-400 transition-colors font-medium text-lg"
            >
                Generate Password
            </button>
        </div>
    );
};
