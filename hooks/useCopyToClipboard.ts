/**
 * Hook for copying text to clipboard with feedback state
 * @module hooks/useCopyToClipboard
 */

import { useCallback, useState } from 'react';
import { copyTextToClipboard } from '../utils/clipboard';

/**
 * A hook that provides clipboard copy functionality with visual feedback state.
 *
 * @param timeout - Duration in ms before resetting copied state (default: 2000)
 * @returns Object containing copy function and copied state
 *
 * @example
 * ```tsx
 * const { copy, copied, isCopied } = useCopyToClipboard();
 *
 * // Single value copy
 * <button onClick={() => copy(text)}>
 *   {copied ? 'Copied!' : 'Copy'}
 * </button>
 *
 * // Multiple values with labels
 * <button onClick={() => copy(hexValue, 'hex')}>
 *   {isCopied('hex') ? 'Copied!' : 'Copy HEX'}
 * </button>
 * <button onClick={() => copy(rgbValue, 'rgb')}>
 *   {isCopied('rgb') ? 'Copied!' : 'Copy RGB'}
 * </button>
 * ```
 */
export function useCopyToClipboard(timeout = 2000) {
    const [copied, setCopied] = useState<string | null>(null);

    const copy = useCallback(
        async (text: string, label?: string): Promise<boolean> => {
            const ok = await copyTextToClipboard(text);
            if (!ok) return false;

            setCopied(label ?? text);
            setTimeout(() => setCopied(null), timeout);
            return true;
        },
        [timeout]
    );

    const isCopied = useCallback(
        (label?: string): boolean => {
            if (label === undefined) return copied !== null;
            return copied === label;
        },
        [copied]
    );

    return { copy, copied, isCopied };
}
