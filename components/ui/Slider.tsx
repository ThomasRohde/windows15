import React from 'react';

export interface SliderProps {
    /** Current value of the slider */
    value: number;
    /** Callback when value changes */
    onChange: (value: number) => void;
    /** Minimum value (default: 0) */
    min?: number;
    /** Maximum value (default: 100) */
    max?: number;
    /** Step increment (default: 1) */
    step?: number;
    /** Label displayed above the slider */
    label?: string;
    /** Whether to show the current value next to the label */
    showValue?: boolean;
    /** Custom value formatter function */
    formatValue?: (value: number) => string;
    /** Gradient or solid color for slider track background */
    gradient?: string;
    /** Labels shown below the slider (e.g., ["Min", "Max"]) */
    rangeLabels?: [string, string];
    /** Whether the slider is disabled */
    disabled?: boolean;
    /** Additional CSS classes for the container */
    className?: string;
}

/**
 * Reusable slider component with support for gradients, custom styling, and range labels.
 * Used throughout the app for numeric input with visual feedback.
 */
export const Slider: React.FC<SliderProps> = ({
    value,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    label,
    showValue = true,
    formatValue,
    gradient,
    rangeLabels,
    disabled = false,
    className = '',
}) => {
    const displayValue = formatValue ? formatValue(value) : value.toString();
    const percentage = ((value - min) / (max - min)) * 100;

    return (
        <div className={className}>
            {label && (
                <div className="flex justify-between text-white/70 text-sm mb-1">
                    <span>{label}</span>
                    {showValue && <span>{displayValue}</span>}
                </div>
            )}
            <div
                className={`relative h-3 rounded-full ${disabled ? 'opacity-50' : ''}`}
                style={{ background: gradient || 'rgba(255, 255, 255, 0.1)' }}
            >
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={e => onChange(Number(e.target.value))}
                    disabled={disabled}
                    className={`absolute inset-0 w-full h-full opacity-0 ${
                        disabled ? 'cursor-not-allowed' : 'cursor-pointer'
                    }`}
                />
                <div
                    className={`absolute w-4 h-4 bg-white rounded-full shadow-md border-2 border-gray-300 -top-0.5 pointer-events-none ${
                        disabled ? 'opacity-50' : ''
                    }`}
                    style={{ left: `calc(${percentage}% - 8px)` }}
                />
            </div>
            {rangeLabels && (
                <div className="flex justify-between text-xs text-white/40 mt-1">
                    <span>{rangeLabels[0]}</span>
                    <span>{rangeLabels[1]}</span>
                </div>
            )}
        </div>
    );
};
