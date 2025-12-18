/**
 * Hook for clipboard operations (copy and paste) with feedback state
 * @module hooks/useCopyToClipboard
 */

import { useCallback, useState } from 'react';
import { copyTextToClipboard, readTextFromClipboard } from '../utils/clipboard';

/**
 * A hook that provides clipboard copy and paste functionality with visual feedback state.
 *
 * @param timeout - Duration in ms before resetting copied/pasted state (default: 2000)
 * @returns Object containing copy/paste functions and state
 *
 * @example
 * ```tsx
 * const { copy, paste, copied, pasted, isCopied } = useCopyToClipboard();
 *
 * // Copy with feedback
 * <button onClick={() => copy(text)}>
 *   {copied ? 'Copied!' : 'Copy'}
 * </button>
 *
 * // Paste from clipboard
 * <button onClick={async () => {
 *   const text = await paste();
 *   if (text) handlePaste(text);
 * }}>
 *   {pasted ? 'Pasted!' : 'Paste'}
 * </button>
 *
 * // Multiple values with labels
 * <button onClick={() => copy(hexValue, 'hex')}>
 *   {isCopied('hex') ? 'Copied!' : 'Copy HEX'}
 * </button>
 * ```
 */
export function useCopyToClipboard(timeout = 2000) {
    const [copied, setCopied] = useState<string | null>(null);
    const [pasted, setPasted] = useState<string | null>(null);

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

    const paste = useCallback(async (): Promise<string | null> => {
        const text = await readTextFromClipboard();
        if (text) {
            setPasted(text);
            setTimeout(() => setPasted(null), timeout);
        }
        return text;
    }, [timeout]);

    const isCopied = useCallback(
        (label?: string): boolean => {
            if (label === undefined) return copied !== null;
            return copied === label;
        },
        [copied]
    );

    return { copy, paste, copied, pasted, isCopied };
}
