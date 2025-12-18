/**
 * TabSwitcher component for mode/category selection
 * @module components/ui/TabSwitcher
 */

import React from 'react';

export interface TabOption<T extends string> {
    value: T;
    label: string;
    icon?: string;
}

export interface TabSwitcherProps<T extends string> {
    options: TabOption<T>[];
    value: T;
    onChange: (value: T) => void;
    /** Visual style variant */
    variant?: 'primary' | 'secondary';
    /** Size variant */
    size?: 'sm' | 'md';
    /** Allow wrapping on smaller screens */
    wrap?: boolean;
}

/**
 * A horizontal tab switcher for selecting between modes or categories.
 * Used for mode toggles (stopwatch/countdown, encode/decode) and category selection.
 *
 * @example
 * ```tsx
 * const [mode, setMode] = useState<'stopwatch' | 'countdown'>('stopwatch');
 *
 * <TabSwitcher
 *   options={[
 *     { value: 'stopwatch', label: 'Stopwatch' },
 *     { value: 'countdown', label: 'Countdown' },
 *   ]}
 *   value={mode}
 *   onChange={setMode}
 * />
 * ```
 */
export function TabSwitcher<T extends string>({
    options,
    value,
    onChange,
    variant = 'primary',
    size = 'md',
    wrap = false,
}: TabSwitcherProps<T>) {
    const activeClass = variant === 'primary' ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white';
    const inactiveClass = 'bg-white/10 text-white hover:bg-white/20';
    const sizeClass = size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2';

    return (
        <div className={`flex gap-2 justify-center ${wrap ? 'flex-wrap' : ''}`}>
            {options.map(opt => (
                <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange(opt.value)}
                    className={`${sizeClass} rounded-lg transition-all ${value === opt.value ? activeClass : inactiveClass}`}
                >
                    {opt.icon && (
                        <span className="material-symbols-outlined text-sm mr-1.5" aria-hidden>
                            {opt.icon}
                        </span>
                    )}
                    {opt.label}
                </button>
            ))}
        </div>
    );
}
