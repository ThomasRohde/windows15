/**
 * Clipboard content analyzer utility
 * Analyzes clipboard text to determine content type and suggest appropriate file handling.
 * @module utils/clipboardAnalyzer
 */

/**
 * Types of content that can be detected in clipboard
 */
export type ClipboardContentType =
    | 'image-url' // URL ending in image extensions or from known image hosting
    | 'video-url' // URL ending in video extensions
    | 'audio-url' // URL ending in audio extensions
    | 'youtube-url' // YouTube video URLs
    | 'web-url' // General HTTP/HTTPS URLs
    | 'json' // Valid JSON content
    | 'plain-text' // Regular text content
    | 'unknown';

/**
 * Result of analyzing clipboard content
 */
export interface ClipboardAnalysis {
    /** Detected content type */
    type: ClipboardContentType;
    /** The original content */
    content: string;
    /** Suggested filename for creating a file */
    suggestedFileName: string;
    /** Suggested app to open the content */
    suggestedAppId?: string;
}

// Image file extensions
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico', '.avif'];

// Video file extensions
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.ogv'];

// Audio file extensions
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'];

// Known image hosting domains
const IMAGE_HOSTS = [
    'imgur.com',
    'i.imgur.com',
    'images.unsplash.com',
    'unsplash.com',
    'pexels.com',
    'images.pexels.com',
    'picsum.photos',
    'placekitten.com',
    'placehold.co',
    'via.placeholder.com',
    'giphy.com',
    'media.giphy.com',
    'cdn.discordapp.com',
];

/**
 * Check if a string is a valid URL
 */
function isValidUrl(text: string): boolean {
    try {
        const url = new URL(text.trim());
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Check if a URL points to an image
 */
function isImageUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        const pathname = parsed.pathname.toLowerCase();

        // Check file extension
        if (IMAGE_EXTENSIONS.some(ext => pathname.endsWith(ext))) {
            return true;
        }

        // Check known image hosts
        if (IMAGE_HOSTS.some(host => parsed.hostname.includes(host))) {
            return true;
        }

        // Check for common image URL patterns
        if (pathname.includes('/photo') || pathname.includes('/image')) {
            return true;
        }

        return false;
    } catch {
        return false;
    }
}

/**
 * Check if a URL points to a video
 */
function isVideoUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        const pathname = parsed.pathname.toLowerCase();
        return VIDEO_EXTENSIONS.some(ext => pathname.endsWith(ext));
    } catch {
        return false;
    }
}

/**
 * Check if a URL points to audio
 */
function isAudioUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        const pathname = parsed.pathname.toLowerCase();
        return AUDIO_EXTENSIONS.some(ext => pathname.endsWith(ext));
    } catch {
        return false;
    }
}

/**
 * Check if a URL is a YouTube video URL
 * Supports: youtube.com/watch, youtu.be, youtube.com/shorts, youtube.com/embed
 */
function isYoutubeUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        const hostname = parsed.hostname.toLowerCase();
        const pathname = parsed.pathname.toLowerCase();

        // Check for youtube.com domains
        if (hostname === 'www.youtube.com' || hostname === 'youtube.com' || hostname === 'm.youtube.com') {
            // /watch?v=, /shorts/, /embed/
            if (pathname.startsWith('/watch') && parsed.searchParams.has('v')) {
                return true;
            }
            if (pathname.startsWith('/shorts/') || pathname.startsWith('/embed/')) {
                return true;
            }
        }

        // Check for youtu.be short URLs
        if (hostname === 'youtu.be') {
            return pathname.length > 1; // Must have a video ID
        }

        return false;
    } catch {
        return false;
    }
}

/**
 * Fetch YouTube video title using oEmbed API (no API key required)
 * @param url - The YouTube video URL
 * @returns Promise with the video title, or null if it couldn't be fetched
 */
export async function fetchYoutubeVideoTitle(url: string): Promise<string | null> {
    try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
        const response = await fetch(oembedUrl);
        if (!response.ok) return null;
        const data = await response.json();
        return data.title || null;
    } catch {
        return null;
    }
}

/**
 * Extract video ID from a YouTube URL
 */
function extractYoutubeVideoId(url: string): string | null {
    try {
        const parsed = new URL(url);
        const hostname = parsed.hostname.toLowerCase();

        if (hostname.includes('youtube.com')) {
            // /watch?v=VIDEO_ID
            if (parsed.searchParams.has('v')) {
                return parsed.searchParams.get('v');
            }
            // /shorts/VIDEO_ID
            const shortsMatch = parsed.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]+)/);
            if (shortsMatch) return shortsMatch[1] ?? null;
            // /embed/VIDEO_ID
            const embedMatch = parsed.pathname.match(/^\/embed\/([a-zA-Z0-9_-]+)/);
            if (embedMatch) return embedMatch[1] ?? null;
        }

        // youtu.be/VIDEO_ID
        if (hostname === 'youtu.be') {
            return parsed.pathname.slice(1).split('?')[0] || null;
        }

        return null;
    } catch {
        return null;
    }
}

/**
 * Check if text is valid JSON
 */
function isValidJson(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        return false;
    }
    try {
        JSON.parse(trimmed);
        return true;
    } catch {
        return false;
    }
}

/**
 * Generate a filename from a URL
 */
function generateFileNameFromUrl(url: string): string {
    try {
        const parsed = new URL(url);
        const pathParts = parsed.pathname.split('/').filter(Boolean);
        const lastPart = pathParts[pathParts.length - 1] ?? parsed.hostname;

        // Remove query params and clean up
        const cleanName = lastPart.split('?')[0]?.split('#')[0] ?? 'link';

        // If it's too long, truncate
        if (cleanName.length > 30) {
            return cleanName.substring(0, 30);
        }

        return cleanName || 'link';
    } catch {
        return 'link';
    }
}

/**
 * Analyze clipboard content and determine its type
 *
 * @param text - The clipboard text content to analyze
 * @returns Analysis result with type, suggested filename, and app
 *
 * @example
 * ```ts
 * const analysis = analyzeClipboardContent('https://images.unsplash.com/photo-123.jpg');
 * // { type: 'image-url', content: '...', suggestedFileName: 'photo-123.jpg', suggestedAppId: 'imageviewer' }
 * ```
 */
export function analyzeClipboardContent(text: string): ClipboardAnalysis {
    const trimmed = text.trim();

    if (!trimmed) {
        return {
            type: 'unknown',
            content: text,
            suggestedFileName: 'empty',
        };
    }

    // Check if it's a valid URL first
    if (isValidUrl(trimmed)) {
        // Check for specific media types
        if (isImageUrl(trimmed)) {
            return {
                type: 'image-url',
                content: trimmed,
                suggestedFileName: generateFileNameFromUrl(trimmed) + '.link',
                suggestedAppId: 'imageviewer',
            };
        }

        if (isVideoUrl(trimmed)) {
            return {
                type: 'video-url',
                content: trimmed,
                suggestedFileName: generateFileNameFromUrl(trimmed) + '.link',
                suggestedAppId: 'browser',
            };
        }

        if (isAudioUrl(trimmed)) {
            return {
                type: 'audio-url',
                content: trimmed,
                suggestedFileName: generateFileNameFromUrl(trimmed) + '.link',
                suggestedAppId: 'browser',
            };
        }

        // Check for YouTube URLs
        if (isYoutubeUrl(trimmed)) {
            const videoId = extractYoutubeVideoId(trimmed);
            return {
                type: 'youtube-url',
                content: trimmed,
                suggestedFileName: videoId ? `youtube-${videoId}.link` : 'youtube-video.link',
                suggestedAppId: 'youtubeplayer',
            };
        }

        // Generic web URL
        return {
            type: 'web-url',
            content: trimmed,
            suggestedFileName: generateFileNameFromUrl(trimmed) + '.link',
            suggestedAppId: 'browser',
        };
    }

    // Check for JSON
    if (isValidJson(trimmed)) {
        return {
            type: 'json',
            content: trimmed,
            suggestedFileName: 'pasted-data.json',
            suggestedAppId: 'jsonviewer',
        };
    }

    // Default to plain text
    const previewName = trimmed.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '-') || 'pasted';
    return {
        type: 'plain-text',
        content: trimmed,
        suggestedFileName: `${previewName}.txt`,
        suggestedAppId: 'notepad',
    };
}
