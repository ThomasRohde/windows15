import React from 'react';
import { useOS } from '../context/OSContext';
import { WALLPAPERS } from '../utils/constants';

export const Settings = () => {
    const { activeWallpaper, setWallpaper } = useOS();

    return (
        <div className="h-full bg-background-dark text-white flex">
            {/* Sidebar */}
            <div className="w-60 bg-black/20 p-4 border-r border-white/5 hidden md:block">
                <h2 className="text-xl font-semibold mb-6 px-2">Settings</h2>
                <div className="flex flex-col gap-1">
                    <div className="p-2 rounded bg-white/10 flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary">wallpaper</span>
                        <span className="text-sm font-medium">Personalization</span>
                    </div>
                    <div className="p-2 rounded hover:bg-white/5 flex items-center gap-3 text-white/60 cursor-pointer">
                        <span className="material-symbols-outlined">wifi</span>
                        <span className="text-sm font-medium">Network</span>
                    </div>
                    <div className="p-2 rounded hover:bg-white/5 flex items-center gap-3 text-white/60 cursor-pointer">
                        <span className="material-symbols-outlined">apps</span>
                        <span className="text-sm font-medium">Apps</span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-8 overflow-y-auto">
                <h1 className="text-3xl font-light mb-8">Personalization</h1>
                
                <section className="mb-8">
                    <h3 className="text-lg font-medium mb-4">Background</h3>
                    <div className="aspect-video w-full max-w-2xl rounded-xl overflow-hidden mb-6 shadow-2xl ring-1 ring-white/10">
                        <img src={activeWallpaper} className="w-full h-full object-cover" alt="Current Wallpaper" />
                    </div>
                    
                    <h4 className="text-sm text-white/60 mb-3">Choose your background</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl">
                        {WALLPAPERS.map(wp => (
                            <button 
                                key={wp.id}
                                onClick={() => setWallpaper(wp.url)}
                                className={`aspect-video rounded-lg overflow-hidden ring-2 transition-all ${activeWallpaper === wp.url ? 'ring-primary' : 'ring-transparent hover:ring-white/20'}`}
                            >
                                <img src={wp.url} className="w-full h-full object-cover" alt={wp.name} />
                            </button>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};