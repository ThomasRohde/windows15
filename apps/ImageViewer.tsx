import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAsyncAction, useWindowInstance } from '../hooks';
import { TextInput } from '../components/ui';

interface ImageViewerProps {
    initialSrc?: string;
    windowId?: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ initialSrc, windowId }) => {
    const { setTitle } = useWindowInstance(windowId ?? '');
    const [imageSrc, setImageSrc] = useState(
        initialSrc || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80'
    );
    const [urlInput, setUrlInput] = useState('');
    const [zoom, setZoom] = useState(100);
    const containerRef = useRef<HTMLDivElement>(null);
    const { execute, error: loadError } = useAsyncAction();

    // Extract filename from image URL for title
    const imageFileName = useMemo(() => {
        try {
            const url = new URL(imageSrc);
            const pathname = url.pathname;
            const filename = pathname.split('/').pop();
            // Truncate long filenames
            if (filename && filename.length > 40) {
                return filename.substring(0, 37) + '...';
            }
            return filename || 'Image';
        } catch {
            return 'Image';
        }
    }, [imageSrc]);

    // Update window title with filename
    useEffect(() => {
        if (windowId) {
            setTitle(`Image Viewer - ${imageFileName}`);
        }
    }, [windowId, imageFileName, setTitle]);

    const handleZoomIn = () => {
        setZoom(prev => Math.min(prev + 25, 300));
    };

    const handleZoomOut = () => {
        setZoom(prev => Math.max(prev - 25, 25));
    };

    const handleFitToWindow = () => {
        setZoom(100);
    };

    const handleLoadUrl = async () => {
        if (urlInput.trim()) {
            await execute(async () => {
                // Test if image can load before setting
                const img = new window.Image();
                await new Promise<void>((resolve, reject) => {
                    img.onload = () => resolve();
                    img.onerror = () => reject(new Error('Failed to load image'));
                    img.src = urlInput.trim();
                });
                setImageSrc(urlInput.trim());
                setZoom(100);
            });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleLoadUrl();
        }
    };

    return (
        <div className="h-full bg-background-dark flex flex-col">
            <div className="flex items-center gap-2 p-2 bg-black/20 border-b border-white/5">
                <button
                    onClick={handleZoomOut}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Zoom Out"
                >
                    <span className="material-symbols-outlined text-white/80 text-xl">zoom_out</span>
                </button>
                <span className="text-white/60 text-sm min-w-[50px] text-center">{zoom}%</span>
                <button
                    onClick={handleZoomIn}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Zoom In"
                >
                    <span className="material-symbols-outlined text-white/80 text-xl">zoom_in</span>
                </button>
                <div className="w-px h-6 bg-white/10 mx-1" />
                <button
                    onClick={handleFitToWindow}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Fit to Window"
                >
                    <span className="material-symbols-outlined text-white/80 text-xl">fit_screen</span>
                </button>
                <div className="flex-1" />
                <TextInput
                    type="text"
                    placeholder="Enter image URL..."
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 max-w-md bg-black/30 focus:ring-1 focus:ring-blue-500"
                    size="sm"
                />
                <button
                    onClick={handleLoadUrl}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
                >
                    Load
                </button>
            </div>

            <div ref={containerRef} className="flex-1 overflow-auto flex items-center justify-center p-4 bg-[#0d0d0d]">
                {loadError ? (
                    <div className="text-center">
                        <span className="material-symbols-outlined text-6xl text-white/20 mb-4">broken_image</span>
                        <p className="text-white/40 text-sm">{loadError}</p>
                    </div>
                ) : (
                    <img
                        src={imageSrc}
                        alt="Viewer content"
                        style={{
                            maxWidth: zoom === 100 ? '100%' : 'none',
                            maxHeight: zoom === 100 ? '100%' : 'none',
                            width: zoom !== 100 ? `${zoom}%` : 'auto',
                            objectFit: 'contain',
                        }}
                        className="transition-transform duration-200"
                        draggable={false}
                    />
                )}
            </div>

            <div className="flex items-center justify-between px-3 py-1.5 bg-black/30 text-white/60 text-xs">
                <span className="truncate max-w-md">{imageSrc}</span>
                <span>Zoom: {zoom}%</span>
            </div>
        </div>
    );
};
