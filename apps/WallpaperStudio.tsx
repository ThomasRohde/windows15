/**
 * Wallpaper Studio App (F088, F091)
 *
 * Gallery-style app for browsing and selecting wallpapers.
 * Features:
 * - Grid view with preview thumbnails
 * - Category/tag filtering
 * - Set as wallpaper action
 * - Built-in wallpaper packs
 * - Settings panel with FPS cap, quality, intensity controls (F091)
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useWallpaper, useDb } from '../context';
import { WallpaperManifest, WallpaperSettings, DEFAULT_WALLPAPER_SETTINGS } from '../types/wallpaper';

/**
 * Built-in wallpaper packs
 * Includes both shader-based live wallpapers and static images
 */
const BUILT_IN_WALLPAPERS: WallpaperManifest[] = [
    // Shader-based live wallpapers (WebGPU/WebGL)
    {
        id: 'gradient-flow',
        name: 'Gradient Flow',
        type: 'shader',
        entry: '/wallpapers/gradient-flow/shader.wgsl',
        fallback: '/wallpapers/gradient-flow/shader.glsl',
        preview:
            'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"%3E%3Cdefs%3E%3ClinearGradient id="g1" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:rgb(255,100,150);stop-opacity:1" /%3E%3Cstop offset="50%25" style="stop-color:rgb(100,150,255);stop-opacity:1" /%3E%3Cstop offset="100%25" style="stop-color:rgb(150,255,100);stop-opacity:1" /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="800" height="600" fill="url(%23g1)"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="24" fill="white" opacity="0.8"%3EAnimated Gradient%3C/text%3E%3C/svg%3E',
        tags: ['gradient', 'animated', 'minimal', 'live'],
    },
    {
        id: 'particle-field',
        name: 'Particle Field',
        type: 'shader',
        entry: '/wallpapers/particle-field/shader.wgsl',
        fallback: '/wallpapers/particle-field/shader.glsl',
        preview:
            'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"%3E%3Crect width="800" height="600" fill="%23000033"/%3E%3Ccircle cx="100" cy="100" r="3" fill="%23ffffff" opacity="0.8"/%3E%3Ccircle cx="300" cy="200" r="2" fill="%23ffffff" opacity="0.6"/%3E%3Ccircle cx="500" cy="150" r="3" fill="%23ffffff" opacity="0.9"/%3E%3Ccircle cx="700" cy="400" r="2" fill="%23ffffff" opacity="0.7"/%3E%3Ccircle cx="200" cy="500" r="3" fill="%23ffffff" opacity="0.8"/%3E%3Ccircle cx="600" cy="300" r="2" fill="%23ffffff" opacity="0.6"/%3E%3Ccircle cx="400" cy="450" r="3" fill="%23ffffff" opacity="0.9"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="24" fill="white" opacity="0.6"%3EParticle Field%3C/text%3E%3C/svg%3E',
        tags: ['particles', 'space', 'animated', 'live'],
    },
    // Static image wallpapers
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
    const db = useDb();
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [selectedWallpaper, setSelectedWallpaper] = useState<WallpaperManifest | null>(null);
    const [isApplying, setIsApplying] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [wallpaperSettings, setWallpaperSettings] = useState<WallpaperSettings>(DEFAULT_WALLPAPER_SETTINGS);

    // Load wallpaper settings from database
    useEffect(() => {
        const loadSettings = async () => {
            if (!db) return;
            try {
                const record = await db.kv.get('wallpaperSettings');
                if (record) {
                    const saved = JSON.parse(record.valueJson) as Partial<WallpaperSettings>;
                    setWallpaperSettings(prev => ({ ...prev, ...saved }));
                }
            } catch (error) {
                console.error('[WallpaperStudio] Failed to load settings:', error);
            }
        };
        void loadSettings();
    }, [db]);

    // Save settings to database
    const saveSettings = useCallback(
        async (newSettings: WallpaperSettings) => {
            if (!db) return;
            try {
                await db.kv.put({
                    key: 'wallpaperSettings',
                    valueJson: JSON.stringify(newSettings),
                });
            } catch (error) {
                console.error('[WallpaperStudio] Failed to save settings:', error);
            }
        },
        [db]
    );

    // Update a specific setting
    const updateSetting = useCallback(
        <K extends keyof WallpaperSettings>(key: K, value: WallpaperSettings[K]) => {
            setWallpaperSettings(prev => {
                const newSettings = { ...prev, [key]: value };
                void saveSettings(newSettings);
                return newSettings;
            });
        },
        [saveSettings]
    );

    // Filter wallpapers by tag
    const filteredWallpapers = useMemo(() => {
        if (!selectedTag) return BUILT_IN_WALLPAPERS;
        return BUILT_IN_WALLPAPERS.filter(w => w.tags?.includes(selectedTag));
    }, [selectedTag]);

    // Apply wallpaper
    const handleApplyWallpaper = useCallback(
        async (wallpaper: WallpaperManifest) => {
            setIsApplying(true);
            try {
                if (wallpaper.type === 'shader') {
                    // For shader wallpapers, pass the entire manifest to the context
                    // The WallpaperHost will handle loading and rendering
                    await setWallpaper(wallpaper);
                } else if (wallpaper.preview) {
                    // For image type wallpapers, we set the preview URL as the wallpaper
                    await setWallpaper(wallpaper.preview);
                }
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

                {/* Settings button */}
                <div className="p-2 border-t border-white/10">
                    <button
                        type="button"
                        onClick={() => setShowSettings(!showSettings)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            showSettings
                                ? 'bg-primary/20 text-primary'
                                : 'text-white/70 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                        <span className="material-symbols-outlined text-base align-middle mr-2">tune</span>
                        Settings
                    </button>
                </div>

                {/* Stats */}
                <div className="p-4 border-t border-white/10 text-xs text-white/40">
                    {filteredWallpapers.length} wallpapers
                </div>
            </div>

            {/* Main content - Gallery or Settings */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {showSettings ? (
                    /* Settings Panel (F091) */
                    <div className="flex-1 overflow-y-auto p-6">
                        <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined">tune</span>
                            Wallpaper Settings
                        </h3>

                        <div className="space-y-6 max-w-md">
                            {/* FPS Cap */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-white/80">FPS Cap</label>
                                <p className="text-xs text-white/40 mb-2">
                                    Lower FPS reduces CPU/GPU usage for live wallpapers
                                </p>
                                <div className="flex gap-2">
                                    {([15, 30, 60] as const).map(fps => (
                                        <button
                                            key={fps}
                                            type="button"
                                            onClick={() => updateSetting('fpsCap', fps)}
                                            className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                                                wallpaperSettings.fpsCap === fps
                                                    ? 'bg-primary text-white'
                                                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                                            }`}
                                        >
                                            {fps} FPS
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Quality */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-white/80">Quality</label>
                                <p className="text-xs text-white/40 mb-2">Higher quality uses more GPU resources</p>
                                <div className="flex gap-2">
                                    {(['low', 'med', 'high'] as const).map(quality => (
                                        <button
                                            key={quality}
                                            type="button"
                                            onClick={() => updateSetting('quality', quality)}
                                            className={`flex-1 py-2 rounded-lg font-medium text-sm capitalize transition-colors ${
                                                wallpaperSettings.quality === quality
                                                    ? 'bg-primary text-white'
                                                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                                            }`}
                                        >
                                            {quality === 'med' ? 'Medium' : quality}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Intensity */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-white/80">
                                    Intensity: {Math.round(wallpaperSettings.intensity * 100)}%
                                </label>
                                <p className="text-xs text-white/40 mb-2">
                                    Controls brightness/effect intensity for live wallpapers
                                </p>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={Math.round(wallpaperSettings.intensity * 100)}
                                    onChange={e => updateSetting('intensity', parseInt(e.target.value) / 100)}
                                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                                <div className="flex justify-between text-xs text-white/40">
                                    <span>Subtle</span>
                                    <span>Vibrant</span>
                                </div>
                            </div>

                            {/* Audio Reactive */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="block text-sm font-medium text-white/80">
                                            Audio Reactive
                                        </label>
                                        <p className="text-xs text-white/40">Wallpaper responds to microphone input</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => updateSetting('audioReactive', !wallpaperSettings.audioReactive)}
                                        className={`w-12 h-6 rounded-full transition-colors ${
                                            wallpaperSettings.audioReactive ? 'bg-primary' : 'bg-white/20'
                                        }`}
                                    >
                                        <div
                                            className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                                                wallpaperSettings.audioReactive ? 'translate-x-6' : 'translate-x-0.5'
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>

                            {/* Mic Sensitivity (only when audio reactive) */}
                            {wallpaperSettings.audioReactive && (
                                <div className="space-y-2 pl-4 border-l-2 border-primary/30">
                                    <label className="block text-sm font-medium text-white/80">
                                        Mic Sensitivity: {Math.round(wallpaperSettings.micSensitivity * 100)}%
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={Math.round(wallpaperSettings.micSensitivity * 100)}
                                        onChange={e => updateSetting('micSensitivity', parseInt(e.target.value) / 100)}
                                        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                </div>
                            )}

                            {/* Info */}
                            <div className="mt-8 p-4 bg-white/5 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-primary">info</span>
                                    <div className="text-sm text-white/60">
                                        <p className="mb-2">
                                            These settings apply to live wallpapers (shaders and scenes).
                                        </p>
                                        <p>Static image wallpapers are not affected by performance settings.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
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
                    </>
                )}
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
        live: 'play_circle',
        animated: 'motion_photos_on',
        particles: 'scatter_plot',
    };
    return icons[tag] ?? 'tag';
}

export default WallpaperStudio;
