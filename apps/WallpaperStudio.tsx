/**
 * Wallpaper Studio App (F088)
 *
 * Gallery-style app for browsing and selecting wallpapers.
 * Features:
 * - Grid view with preview thumbnails
 * - Category/tag filtering
 * - Set as wallpaper action
 * - Built-in wallpaper packs
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useWallpaper } from '../context';
import { WallpaperManifest } from '../types/wallpaper';

/**
 * Built-in wallpaper packs
 * These are high-quality images from Unsplash
 */
const BUILT_IN_WALLPAPERS: WallpaperManifest[] = [
    {
        id: 'abstract-gradient',
        name: 'Abstract Gradient',
        type: 'image',
        preview: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=800&q=80',
        tags: ['abstract', 'gradient', 'colorful'],
    },
    {
        id: 'purple-waves',
        name: 'Purple Waves',
        type: 'image',
        preview: 'https://images.unsplash.com/photo-1550684376-efcbd6e3f031?auto=format&fit=crop&w=800&q=80',
        tags: ['abstract', 'waves', 'purple'],
    },
    {
        id: 'ocean-sunset',
        name: 'Ocean Sunset',
        type: 'image',
        preview: 'https://images.unsplash.com/photo-1507400492013-162706c8c05e?auto=format&fit=crop&w=800&q=80',
        tags: ['nature', 'ocean', 'sunset'],
    },
    {
        id: 'mountain-lake',
        name: 'Mountain Lake',
        type: 'image',
        preview: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80',
        tags: ['nature', 'mountain', 'lake'],
    },
    {
        id: 'northern-lights',
        name: 'Northern Lights',
        type: 'image',
        preview: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=800&q=80',
        tags: ['nature', 'aurora', 'night'],
    },
    {
        id: 'neon-city',
        name: 'Neon City',
        type: 'image',
        preview: 'https://images.unsplash.com/photo-1545486332-9e0999c535b2?auto=format&fit=crop&w=800&q=80',
        tags: ['urban', 'neon', 'night'],
    },
    {
        id: 'space-nebula',
        name: 'Space Nebula',
        type: 'image',
        preview: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=800&q=80',
        tags: ['space', 'nebula', 'stars'],
    },
    {
        id: 'forest-mist',
        name: 'Forest Mist',
        type: 'image',
        preview: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80',
        tags: ['nature', 'forest', 'mist'],
    },
    {
        id: 'geometric-dark',
        name: 'Geometric Dark',
        type: 'image',
        preview: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?auto=format&fit=crop&w=800&q=80',
        tags: ['abstract', 'geometric', 'dark'],
    },
    {
        id: 'pink-clouds',
        name: 'Pink Clouds',
        type: 'image',
        preview: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=800&q=80',
        tags: ['nature', 'clouds', 'pink'],
    },
    {
        id: 'blue-waves-abstract',
        name: 'Blue Waves',
        type: 'image',
        preview: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=800&q=80',
        tags: ['abstract', 'waves', 'blue'],
    },
    {
        id: 'desert-dunes',
        name: 'Desert Dunes',
        type: 'image',
        preview: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=800&q=80',
        tags: ['nature', 'desert', 'minimal'],
    },
];

/**
 * All unique tags from wallpapers
 */
const ALL_TAGS = Array.from(new Set(BUILT_IN_WALLPAPERS.flatMap(w => w.tags ?? []))).sort();

export const WallpaperStudio: React.FC = () => {
    const { setWallpaper, activeWallpaper } = useWallpaper();
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [selectedWallpaper, setSelectedWallpaper] = useState<WallpaperManifest | null>(null);
    const [isApplying, setIsApplying] = useState(false);

    // Filter wallpapers by tag
    const filteredWallpapers = useMemo(() => {
        if (!selectedTag) return BUILT_IN_WALLPAPERS;
        return BUILT_IN_WALLPAPERS.filter(w => w.tags?.includes(selectedTag));
    }, [selectedTag]);

    // Apply wallpaper
    const handleApplyWallpaper = useCallback(
        async (wallpaper: WallpaperManifest) => {
            if (!wallpaper.preview) return;

            setIsApplying(true);
            try {
                // For image type wallpapers, we set the preview URL as the wallpaper
                await setWallpaper(wallpaper.preview);
                setSelectedWallpaper(null);
            } catch (error) {
                console.error('[WallpaperStudio] Failed to set wallpaper:', error);
            } finally {
                setIsApplying(false);
            }
        },
        [setWallpaper]
    );

    // Check if a wallpaper is currently active
    const isActive = (wallpaper: WallpaperManifest) => {
        return activeWallpaper === wallpaper.preview;
    };

    return (
        <div className="flex h-full bg-neutral-900/95">
            {/* Sidebar with tags */}
            <div className="w-56 bg-black/20 border-r border-white/10 flex flex-col">
                <div className="p-4 border-b border-white/10">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">wallpaper</span>
                        Wallpaper Studio
                    </h2>
                </div>

                {/* Categories */}
                <nav className="flex-1 overflow-y-auto p-2">
                    <button
                        type="button"
                        onClick={() => setSelectedTag(null)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            selectedTag === null
                                ? 'bg-primary/20 text-primary'
                                : 'text-white/70 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                        <span className="material-symbols-outlined text-base align-middle mr-2">grid_view</span>
                        All Wallpapers
                    </button>

                    <div className="mt-4 mb-2 px-3 text-xs text-white/40 uppercase tracking-wider">Categories</div>

                    {ALL_TAGS.map(tag => (
                        <button
                            key={tag}
                            type="button"
                            onClick={() => setSelectedTag(tag)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm capitalize transition-colors ${
                                selectedTag === tag
                                    ? 'bg-primary/20 text-primary'
                                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <span className="material-symbols-outlined text-base align-middle mr-2">
                                {getCategoryIcon(tag)}
                            </span>
                            {tag}
                        </button>
                    ))}
                </nav>

                {/* Stats */}
                <div className="p-4 border-t border-white/10 text-xs text-white/40">
                    {filteredWallpapers.length} wallpapers
                </div>
            </div>

            {/* Main content - Gallery */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Gallery header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-white font-medium capitalize">{selectedTag ?? 'All Wallpapers'}</h3>
                    <span className="text-white/40 text-sm">Click to preview, double-click to apply</span>
                </div>

                {/* Gallery grid */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredWallpapers.map(wallpaper => (
                            <WallpaperCard
                                key={wallpaper.id}
                                wallpaper={wallpaper}
                                isSelected={selectedWallpaper?.id === wallpaper.id}
                                isActive={isActive(wallpaper)}
                                onClick={() => setSelectedWallpaper(wallpaper)}
                                onDoubleClick={() => handleApplyWallpaper(wallpaper)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Preview panel (when wallpaper selected) */}
            {selectedWallpaper && (
                <div className="w-80 bg-black/30 border-l border-white/10 flex flex-col">
                    {/* Preview image */}
                    <div className="aspect-video relative overflow-hidden">
                        <img
                            src={selectedWallpaper.preview}
                            alt={selectedWallpaper.name}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>

                    {/* Info */}
                    <div className="p-4 flex-1">
                        <h3 className="text-lg font-semibold text-white mb-2">{selectedWallpaper.name}</h3>

                        <div className="flex flex-wrap gap-1 mb-4">
                            {selectedWallpaper.tags?.map(tag => (
                                <span
                                    key={tag}
                                    className="px-2 py-0.5 bg-white/10 rounded-full text-xs text-white/70 capitalize"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>

                        <div className="text-sm text-white/50 mb-4">
                            Type: {selectedWallpaper.type === 'image' ? 'Static Image' : 'Live Wallpaper'}
                        </div>

                        {/* Actions */}
                        <button
                            type="button"
                            onClick={() => handleApplyWallpaper(selectedWallpaper)}
                            disabled={isApplying || isActive(selectedWallpaper)}
                            className={`w-full py-2.5 rounded-lg font-medium transition-colors ${
                                isActive(selectedWallpaper)
                                    ? 'bg-green-500/20 text-green-400 cursor-default'
                                    : 'bg-primary hover:bg-primary/80 text-white'
                            } disabled:opacity-50`}
                        >
                            {isApplying ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="animate-spin material-symbols-outlined text-sm">
                                        progress_activity
                                    </span>
                                    Applying...
                                </span>
                            ) : isActive(selectedWallpaper) ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-sm">check</span>
                                    Currently Active
                                </span>
                            ) : (
                                'Set as Wallpaper'
                            )}
                        </button>
                    </div>

                    {/* Close button */}
                    <button
                        type="button"
                        onClick={() => setSelectedWallpaper(null)}
                        className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-colors"
                    >
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>
            )}
        </div>
    );
};

/**
 * Wallpaper card component
 */
interface WallpaperCardProps {
    wallpaper: WallpaperManifest;
    isSelected: boolean;
    isActive: boolean;
    onClick: () => void;
    onDoubleClick: () => void;
}

const WallpaperCard: React.FC<WallpaperCardProps> = ({ wallpaper, isSelected, isActive, onClick, onDoubleClick }) => {
    return (
        <button
            type="button"
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            className={`group relative aspect-video rounded-xl overflow-hidden transition-all ${
                isSelected
                    ? 'ring-2 ring-primary ring-offset-2 ring-offset-neutral-900 scale-[1.02]'
                    : 'hover:ring-1 hover:ring-white/30'
            }`}
        >
            <img
                src={wallpaper.preview}
                alt={wallpaper.name}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
            />

            {/* Overlay with name */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div className="text-white text-sm font-medium truncate">{wallpaper.name}</div>
                    <div className="text-white/50 text-xs flex items-center gap-1">
                        {wallpaper.type === 'shader' && (
                            <>
                                <span className="material-symbols-outlined text-xs">auto_awesome</span>
                                Live
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Active indicator */}
            {isActive && (
                <div className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-green-500 text-white shadow-lg">
                    <span className="material-symbols-outlined text-sm">check</span>
                </div>
            )}
        </button>
    );
};

/**
 * Get icon for category
 */
function getCategoryIcon(tag: string): string {
    const icons: Record<string, string> = {
        abstract: 'auto_awesome',
        nature: 'nature',
        space: 'rocket',
        urban: 'location_city',
        gradient: 'gradient',
        waves: 'waves',
        colorful: 'palette',
        purple: 'filter_vintage',
        ocean: 'water',
        sunset: 'wb_twilight',
        mountain: 'landscape',
        lake: 'water_drop',
        aurora: 'north',
        night: 'nights_stay',
        neon: 'flash_on',
        nebula: 'stars',
        stars: 'star',
        forest: 'forest',
        mist: 'foggy',
        geometric: 'hexagon',
        dark: 'dark_mode',
        clouds: 'cloud',
        pink: 'favorite',
        blue: 'water',
        desert: 'landscape',
        minimal: 'crop_square',
    };
    return icons[tag] ?? 'tag';
}

export default WallpaperStudio;
