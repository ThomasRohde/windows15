import { useEffect, useRef } from 'react';
import { useHandoff } from '../hooks/useHandoff';
import { useNotification } from '../hooks/useNotification';
import { useOS } from '../context/OSContext';

/**
 * ShareReceiver - Component for receiving iOS Share Sheet deep links (F255-F258)
 *
 * Parses and processes deep link URLs from iOS Shortcuts that enable one-tap
 * sharing into Windows15 Handoff from the iOS Share Sheet.
 *
 * Deep link format:
 * ?handoff=1&nonce=...&kind=url|text&target=...&text=...&targetCategory=work|private|any&open=handoff
 *
 * @see HANDOFF.md PRD for full specification
 */
export function ShareReceiver() {
    const { send, isLoading: isHandoffLoading } = useHandoff();
    const { notify } = useNotification();
    const { openApp } = useOS();
    const processedRef = useRef(false);

    useEffect(() => {
        // Only process once per mount
        if (processedRef.current || isHandoffLoading) return;

        const params = new URLSearchParams(window.location.search);

        // Check if this is a handoff share import link (F255)
        if (params.get('handoff') !== '1') {
            return; // Not a share link, no error needed (F258)
        }

        // Mark as processed to prevent re-processing on re-renders
        processedRef.current = true;

        // Parse and validate parameters (F255)
        const parsed = parseShareLink(params);

        if (!parsed) {
            // Invalid link (F258)
            try {
                notify({ message: 'Nothing to send', variant: 'error' });
            } catch {
                console.warn('[ShareReceiver] Could not show error notification');
            }
            cleanupURL();
            return;
        }

        // Check for duplicate via nonce (F256)
        if (isNonceDuplicate(parsed.nonce)) {
            // Silent ignore for duplicates (F258)
            cleanupURL();
            return;
        }

        // Store nonce to prevent future duplicates (F256)
        recordNonce(parsed.nonce);

        // Send to Handoff (F257)
        send({
            kind: parsed.kind,
            target: parsed.target,
            text: parsed.text,
            targetCategory: parsed.targetCategory || 'any',
            title: parsed.title,
        })
            .then(() => {
                // Success notification (F257)
                const source = parsed.source ? ` from ${parsed.source}` : '';
                notify({
                    message: `Sent to Handoff${source}`,
                    variant: 'success',
                });

                // Open Handoff app if requested (F257)
                if (parsed.openHandoff) {
                    // Small delay to ensure the item is visible
                    setTimeout(() => openApp('handoff'), 100);
                }
            })
            .catch(error => {
                console.error('[ShareReceiver] Failed to send to Handoff:', error);
                try {
                    notify({
                        message: 'Failed to send to Handoff',
                        variant: 'error',
                    });
                } catch {
                    console.warn('[ShareReceiver] Could not show error notification');
                }
            })
            .finally(() => {
                // Clean URL after processing (F257)
                cleanupURL();
            });
    }, [send, notify, openApp, isHandoffLoading]);

    // This component renders nothing
    return null;
}

/**
 * Interface for parsed share link parameters
 */
interface ParsedShareLink {
    nonce: string;
    kind: 'url' | 'text';
    target: string;
    text: string;
    targetCategory?: 'work' | 'private' | 'any';
    source?: string;
    title?: string;
    openHandoff?: boolean;
}

/**
 * Parse and validate share link parameters (F255)
 *
 * @param params - URLSearchParams from window.location.search
 * @returns Parsed data or null if invalid
 */
function parseShareLink(params: URLSearchParams): ParsedShareLink | null {
    // Required: nonce (6-128 chars)
    const nonce = params.get('nonce');
    if (!nonce || nonce.length < 6 || nonce.length > 128) {
        console.warn('[ShareReceiver] Invalid nonce length:', nonce?.length);
        return null;
    }

    // Get kind (optional, can be inferred)
    let kind = params.get('kind') as 'url' | 'text' | null;
    const target = params.get('target') || '';
    const text = params.get('text') || '';

    // Infer kind if not provided (F255)
    if (!kind) {
        kind = target ? 'url' : 'text';
    }

    // Validate kind
    if (kind !== 'url' && kind !== 'text') {
        console.warn('[ShareReceiver] Invalid kind:', kind);
        return null;
    }

    // Validate for url kind
    if (kind === 'url') {
        if (!target) {
            console.warn('[ShareReceiver] Missing target for url kind');
            return null;
        }
        // Best-effort URL validation
        if (!isValidURL(target)) {
            console.warn('[ShareReceiver] Invalid URL in target:', target);
            return null;
        }
        // Length check
        if (target.length > 4096) {
            console.warn('[ShareReceiver] Target URL too long:', target.length);
            return null;
        }
    }

    // Validate for text kind
    if (kind === 'text' && !text) {
        console.warn('[ShareReceiver] Missing text for text kind');
        return null;
    }

    // Length check for text
    if (text && text.length > 20000) {
        console.warn('[ShareReceiver] Text too long:', text.length);
        return null;
    }

    // Parse optional parameters
    const targetCategory = params.get('targetCategory') as 'work' | 'private' | 'any' | null;
    const source = params.get('source') || undefined;
    const title = params.get('title') || undefined;
    const openHandoff = params.get('open') === 'handoff';

    // Validate targetCategory if provided
    if (targetCategory && !['work', 'private', 'any'].includes(targetCategory)) {
        console.warn('[ShareReceiver] Invalid targetCategory:', targetCategory);
        return null;
    }

    return {
        nonce,
        kind,
        target,
        text,
        targetCategory: targetCategory || undefined,
        source,
        title,
        openHandoff,
    };
}

/**
 * Best-effort URL validation
 */
function isValidURL(str: string): boolean {
    try {
        const url = new URL(str);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Check if a nonce has been processed before (F256)
 *
 * Uses localStorage ring buffer to store last 50 nonces.
 */
function isNonceDuplicate(nonce: string): boolean {
    try {
        const stored = localStorage.getItem('windows15_share_nonces');
        if (!stored) return false;

        const nonces = JSON.parse(stored) as string[];
        return nonces.includes(nonce);
    } catch (error) {
        console.error('[ShareReceiver] Error checking nonce:', error);
        // If we can't check, assume not duplicate to allow the share
        return false;
    }
}

/**
 * Record a nonce to prevent duplicate processing (F256)
 *
 * Maintains a ring buffer of 50 most recent nonces in localStorage.
 */
function recordNonce(nonce: string): void {
    try {
        const stored = localStorage.getItem('windows15_share_nonces');
        let nonces: string[] = stored ? JSON.parse(stored) : [];

        // Add new nonce
        nonces.push(nonce);

        // Keep only last 50 (ring buffer)
        if (nonces.length > 50) {
            nonces = nonces.slice(-50);
        }

        localStorage.setItem('windows15_share_nonces', JSON.stringify(nonces));
    } catch (error) {
        console.error('[ShareReceiver] Error recording nonce:', error);
        // Fail silently - we'll just risk a duplicate in this edge case
    }
}

/**
 * Clean up URL query parameters after processing (F257)
 *
 * Uses history.replaceState to remove share-related params without triggering navigation.
 */
function cleanupURL(): void {
    try {
        const url = new URL(window.location.href);
        // Remove all share-related params
        url.searchParams.delete('handoff');
        url.searchParams.delete('nonce');
        url.searchParams.delete('kind');
        url.searchParams.delete('target');
        url.searchParams.delete('text');
        url.searchParams.delete('targetCategory');
        url.searchParams.delete('source');
        url.searchParams.delete('title');
        url.searchParams.delete('open');

        // Replace state without adding to history
        window.history.replaceState({}, '', url.toString());
    } catch (error) {
        console.error('[ShareReceiver] Error cleaning URL:', error);
        // Fail silently - not critical
    }
}
