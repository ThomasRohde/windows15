import React, { useState, useEffect } from 'react';
import { useAppState } from '../hooks';
import { TextInput } from '../components/ui';

interface YoutubePlayerProps {
    initialUrl?: string;
}

/**
 * Extract video ID from various YouTube URL formats
 */
function extractVideoId(url: string): string | null {
    try {
        const parsed = new URL(url);
        const hostname = parsed.hostname.toLowerCase();

        // youtube.com/watch?v=VIDEO_ID
        if (hostname.includes('youtube.com') && parsed.pathname === '/watch') {
            return parsed.searchParams.get('v');
        }

        // youtube.com/shorts/VIDEO_ID or youtube.com/embed/VIDEO_ID
        if (hostname.includes('youtube.com')) {
            const shortsMatch = parsed.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]+)/);
            if (shortsMatch) return shortsMatch[1] ?? null;

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

interface YoutubePlayerState {
    urlInput: string;
    recentVideos: { url: string; videoId: string; timestamp: number }[];
}

export const YoutubePlayer = ({ initialUrl }: YoutubePlayerProps) => {
    const [state, setState] = useAppState<YoutubePlayerState>('youtubePlayer', {
        urlInput: initialUrl || '',
        recentVideos: [],
    });
    const { urlInput, recentVideos } = state;
    const [videoId, setVideoId] = useState<string | null>(() => (initialUrl ? extractVideoId(initialUrl) : null));
    const [error, setError] = useState<string | null>(null);

    // Update video ID when initialUrl prop changes
    useEffect(() => {
        if (initialUrl) {
            void setState(prev => ({ ...prev, urlInput: initialUrl }));
            const id = extractVideoId(initialUrl);
            if (id) {
                setVideoId(id);
                setError(null);
            }
        }
    }, [initialUrl, setState]);

    const handleLoadVideo = () => {
        const trimmed = urlInput.trim();
        if (!trimmed) {
            setError('Please enter a YouTube URL');
            return;
        }

        const id = extractVideoId(trimmed);
        if (id) {
            setVideoId(id);
            setError(null);

            // Add to recent videos, limit to last 20
            const newRecent = [
                { url: trimmed, videoId: id, timestamp: Date.now() },
                ...recentVideos.filter(v => v.videoId !== id),
            ].slice(0, 20);
            void setState(prev => ({ ...prev, recentVideos: newRecent }));
        } else {
            setError('Invalid YouTube URL. Please enter a valid YouTube video link.');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleLoadVideo();
        }
    };

    return (
        <div className="h-full bg-[#0f0f0f] flex flex-col">
            {/* URL Input Bar */}
            <div className="flex items-center gap-2 p-3 bg-black/40 border-b border-white/10">
                <span className="material-symbols-outlined text-red-500 text-xl">smart_display</span>
                <TextInput
                    type="text"
                    placeholder="Paste YouTube video URL..."
                    value={urlInput}
                    onChange={e => void setState(prev => ({ ...prev, urlInput: e.target.value }))}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-black/30 focus:ring-1 focus:ring-red-500"
                    size="sm"
                />
                <button
                    onClick={handleLoadVideo}
                    className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                    Load
                </button>
            </div>

            {/* Video Player Area */}
            <div className="flex-1 flex items-center justify-center bg-black p-4">
                {error ? (
                    <div className="text-center">
                        <span className="material-symbols-outlined text-6xl text-white/20 mb-4">error</span>
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                ) : videoId ? (
                    <div className="w-full h-full max-w-[1280px] max-h-[720px]">
                        <iframe
                            className="w-full h-full rounded-lg"
                            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                            title="YouTube video player"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                        />
                    </div>
                ) : (
                    <div className="text-center">
                        <span className="material-symbols-outlined text-8xl text-white/10 mb-4">play_circle</span>
                        <p className="text-white/40 text-sm">Paste a YouTube URL above to watch</p>
                        <p className="text-white/20 text-xs mt-2">Supports youtube.com, youtu.be, and YouTube Shorts</p>
                    </div>
                )}
            </div>

            {/* Status Bar */}
            {videoId && (
                <div className="flex items-center px-3 py-1.5 bg-black/30 text-white/50 text-xs border-t border-white/5">
                    <span className="material-symbols-outlined text-sm mr-1">link</span>
                    <span className="truncate">{urlInput}</span>
                    <div className="flex-1" />
                    <span className="text-red-400">▶ Playing</span>
                </div>
            )}
        </div>
    );
};
