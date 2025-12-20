import React, { useRef } from 'react';
import { useDebounce } from '../../hooks/useDebounce';

export interface SearchInputProps {
    /**
     * Current search value
     */
    value: string;

    /**
     * Callback when value changes (immediate)
     */
    onChange: (value: string) => void;

    /**
     * Optional placeholder text
     */
    placeholder?: string;

    /**
     * Debounce delay in milliseconds (default: 300)
     * Set to 0 to disable debouncing
     */
    debounceMs?: number;

    /**
     * Optional callback for debounced value changes
     * If not provided, onChange is called immediately
     */
    onDebouncedChange?: (value: string) => void;

    /**
     * Whether to show clear button (default: true when value is not empty)
     */
    showClear?: boolean;

    /**
     * Autofocus on mount (default: false)
     */
    autoFocus?: boolean;

    /**
     * Additional CSS class for the container
     */
    className?: string;

    /**
     * Additional CSS class for the input element
     */
    inputClassName?: string;

    /**
     * Aria label for accessibility
     */
    'aria-label'?: string;
}

/**
 * SearchInput - Reusable search input component with icon, clear button, and optional debouncing
 *
 * Features:
 * - Search icon for visual clarity
 * - Clear button (X) when input has value
 * - Escape key to clear
 * - Optional debounced onChange for performance
 * - Focus management and keyboard accessibility
 *
 * @example
 * ```tsx
 * // Basic usage with immediate updates
 * <SearchInput
 *   value={search}
 *   onChange={setSearch}
 *   placeholder="Search notes..."
 * />
 * ```
 *
 * @example
 * ```tsx
 * // With debounced onChange for API calls
 * <SearchInput
 *   value={search}
 *   onChange={setSearch}
 *   onDebouncedChange={performSearch}
 *   debounceMs={500}
 *   placeholder="Search..."
 * />
 * ```
 */
export const SearchInput: React.FC<SearchInputProps> = ({
    value,
    onChange,
    placeholder = 'Search...',
    debounceMs = 300,
    onDebouncedChange,
    showClear = true,
    autoFocus = false,
    className = '',
    inputClassName = '',
    'aria-label': ariaLabel,
}) => {
    const inputRef = useRef<HTMLInputElement>(null);

    // Get debounced value if debouncing is enabled
    const debouncedValue = useDebounce(value, onDebouncedChange && debounceMs > 0 ? debounceMs : 0);

    // Call debounced callback when debounced value changes
    React.useEffect(() => {
        if (onDebouncedChange && debounceMs > 0) {
            onDebouncedChange(debouncedValue);
        }
    }, [debouncedValue, onDebouncedChange, debounceMs]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
    };

    const handleClear = () => {
        onChange('');
        // Restore focus to input after clearing
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            handleClear();
        }
    };

    const showClearButton = showClear && value.length > 0;

    return (
        <div className={`relative ${className}`}>
            {/* Search icon */}
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-white/40 pointer-events-none">
                search
            </span>

            {/* Input */}
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                autoFocus={autoFocus}
                aria-label={ariaLabel || placeholder}
                className={`w-full h-9 pl-9 pr-${showClearButton ? '9' : '3'} rounded-lg bg-black/30 border border-white/10 text-sm text-white/80 placeholder:text-white/40 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors select-text ${inputClassName}`}
            />

            {/* Clear button */}
            {showClearButton && (
                <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md hover:bg-white/10 text-white/50 hover:text-white/80 flex items-center justify-center transition-colors"
                    aria-label="Clear search"
                    title="Clear (Esc)"
                >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
            )}
        </div>
    );
};
