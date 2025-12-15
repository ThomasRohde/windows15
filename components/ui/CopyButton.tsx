import React from 'react';
import { useCopyToClipboard } from '../../hooks';
import { Button } from './Button';
import type { ButtonSize, ButtonVariant } from './Button';

interface CopyButtonProps {
    /** The value to copy to clipboard */
    value: string;
    /** Optional label for tracking which value was copied (used with isCopied) */
    label?: string;
    /** Button size variant */
    size?: ButtonSize;
    /** Button variant (defaults to secondary, changes to primary when copied) */
    variant?: ButtonVariant;
    /** Custom text when not copied */
    text?: string;
    /** Custom text when copied */
    copiedText?: string;
    /** Additional CSS classes */
    className?: string;
    /** Disabled state */
    disabled?: boolean;
}

/**
 * A reusable button component that copies a value to clipboard and shows feedback.
 * Wraps useCopyToClipboard hook with Button component for consistent copy UX.
 */
export const CopyButton: React.FC<CopyButtonProps> = ({
    value,
    label,
    size = 'sm',
    variant,
    text = 'Copy',
    copiedText = 'Copied!',
    className,
    disabled,
}) => {
    const { copy, isCopied } = useCopyToClipboard();

    const handleCopy = () => {
        if (!value) return;
        copy(value, label);
    };

    const copied = label ? isCopied(label) : isCopied();
    const effectiveVariant = variant ?? (copied ? 'primary' : 'secondary');

    return (
        <Button
            onClick={handleCopy}
            variant={effectiveVariant}
            size={size}
            className={className}
            disabled={disabled || !value}
        >
            {copied ? copiedText : text}
        </Button>
    );
};
