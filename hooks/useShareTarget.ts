/**
 * useShareTarget - Hook for handling Web Share Target API (F232)
 *
 * Processes shared content from the device share sheet when the PWA
 * is selected as a share target. Extracts title, text, and URL from
 * query parameters and provides them to the consuming component.
 */
import { useEffect, useState } from 'react';

export interface SharedContent {
    title?: string;
    text?: string;
    url?: string;
}

/**
 * Parse shared content from URL query parameters.
 * The PWA manifest defines share_target with GET method, so shared
 * content arrives as query parameters.
 */
function parseSharedContent(): SharedContent | null {
    const params = new URLSearchParams(window.location.search);
    const isShareIntent = params.get('share') === 'true';

    if (!isShareIntent) {
        return null;
    }

    const title = params.get('title') || undefined;
    const text = params.get('text') || undefined;
    const url = params.get('url') || undefined;

    // Only return if we have some content
    if (!title && !text && !url) {
        return null;
    }

    return { title, text, url };
}

/**
 * Clean up the URL by removing share query parameters.
 * This prevents re-processing the same share on page refresh.
 */
function cleanShareParams(): void {
    const params = new URLSearchParams(window.location.search);
    params.delete('share');
    params.delete('title');
    params.delete('text');
    params.delete('url');

    const newSearch = params.toString();
    const newUrl = newSearch ? `${window.location.pathname}?${newSearch}` : window.location.pathname;

    // Use replaceState to avoid adding to history
    window.history.replaceState(null, '', newUrl);
}

/**
 * Combine shared content into a single text string suitable for Handoff.
 * Prioritizes URL if present, otherwise combines title and text.
 */
export function formatSharedContent(content: SharedContent): string {
    const parts: string[] = [];

    // If URL is present, it's usually the main content
    if (content.url) {
        return content.url;
    }

    // Otherwise combine title and text
    if (content.title) {
        parts.push(content.title);
    }
    if (content.text) {
        parts.push(content.text);
    }

    return parts.join('\n\n');
}

/**
 * Hook to handle Web Share Target API.
 *
 * Returns the shared content if the app was opened via share intent,
 * or null otherwise. Automatically cleans up URL parameters after
 * content is consumed.
 *
 * @param onShare - Optional callback when share content is received
 * @returns The shared content or null
 */
export function useShareTarget(onShare?: (content: SharedContent) => void): SharedContent | null {
    const [sharedContent, setSharedContent] = useState<SharedContent | null>(null);

    useEffect(() => {
        const content = parseSharedContent();

        if (content) {
            setSharedContent(content);

            // Invoke callback if provided
            if (onShare) {
                onShare(content);
            }

            // Clean up URL to prevent re-processing
            cleanShareParams();
        }
    }, [onShare]);

    return sharedContent;
}

/**
 * Clear the current shared content.
 * Call this after the content has been processed by Handoff.
 */
export function useShareTargetWithClear(): [SharedContent | null, () => void] {
    const [sharedContent, setSharedContent] = useState<SharedContent | null>(null);

    useEffect(() => {
        const content = parseSharedContent();

        if (content) {
            setSharedContent(content);
            cleanShareParams();
        }
    }, []);

    const clearSharedContent = () => {
        setSharedContent(null);
    };

    return [sharedContent, clearSharedContent];
}
