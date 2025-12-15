import React, { useState } from 'react';
import { useOS } from '../context/OSContext';
import { WALLPAPERS } from '../utils/constants';
import { SyncSettings } from './settings/SyncSettings';
import { LocalizationSettings } from './settings/LocalizationSettings';
import { ScreensaverSettings } from './settings/ScreensaverSettings';
import { WindowSpaceSettings } from './settings/WindowSpaceSettings';
import { ProfileSettings } from './settings/ProfileSettings';

export const Settings = () => {
    const { activeWallpaper, setWallpaper } = useOS();
    const [activeSection, setActiveSection] = useState<
        'account' | 'personalization' | 'localization' | 'sync' | 'network' | 'apps' | 'screensaver' | '3dmode'
    >('account');

    return (
        <div className="h-full bg-background-dark text-white flex">
            {/* Sidebar */}
            <div className="w-60 bg-black/20 p-4 border-r border-white/5 hidden md:block">
                <h2 className="text-xl font-semibold mb-6 px-2">Settings</h2>
                <div className="flex flex-col gap-1">
                    <button
                        type="button"
                        onClick={() => setActiveSection('account')}
                        className={`p-2 rounded flex items-center gap-3 text-left ${activeSection === 'account' ? 'bg-white/10' : 'hover:bg-white/5 text-white/70'}`}
                    >
                        <span
                            className={`material-symbols-outlined ${activeSection === 'account' ? 'text-primary' : ''}`}
                        >
                            person
                        </span>
                        <span className="text-sm font-medium">Account</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveSection('personalization')}
                        className={`p-2 rounded flex items-center gap-3 text-left ${activeSection === 'personalization' ? 'bg-white/10' : 'hover:bg-white/5 text-white/70'}`}
                    >
                        <span
                            className={`material-symbols-outlined ${activeSection === 'personalization' ? 'text-primary' : ''}`}
                        >
                            wallpaper
                        </span>
                        <span className="text-sm font-medium">Personalization</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveSection('sync')}
                        className={`p-2 rounded flex items-center gap-3 text-left ${activeSection === 'sync' ? 'bg-white/10' : 'hover:bg-white/5 text-white/70'}`}
                    >
                        <span className={`material-symbols-outlined ${activeSection === 'sync' ? 'text-primary' : ''}`}>
                            sync
                        </span>
                        <span className="text-sm font-medium">Sync</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveSection('localization')}
                        className={`p-2 rounded flex items-center gap-3 text-left ${activeSection === 'localization' ? 'bg-white/10' : 'hover:bg-white/5 text-white/70'}`}
                    >
                        <span
                            className={`material-symbols-outlined ${activeSection === 'localization' ? 'text-primary' : ''}`}
                        >
                            language
                        </span>
                        <span className="text-sm font-medium">Time &amp; language</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveSection('network')}
                        className={`p-2 rounded flex items-center gap-3 text-left ${activeSection === 'network' ? 'bg-white/10' : 'hover:bg-white/5 text-white/70'}`}
                    >
                        <span
                            className={`material-symbols-outlined ${activeSection === 'network' ? 'text-primary' : ''}`}
                        >
                            wifi
                        </span>
                        <span className="text-sm font-medium">Network</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveSection('apps')}
                        className={`p-2 rounded flex items-center gap-3 text-left ${activeSection === 'apps' ? 'bg-white/10' : 'hover:bg-white/5 text-white/70'}`}
                    >
                        <span className={`material-symbols-outlined ${activeSection === 'apps' ? 'text-primary' : ''}`}>
                            apps
                        </span>
                        <span className="text-sm font-medium">Apps</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveSection('screensaver')}
                        className={`p-2 rounded flex items-center gap-3 text-left ${activeSection === 'screensaver' ? 'bg-white/10' : 'hover:bg-white/5 text-white/70'}`}
                    >
                        <span
                            className={`material-symbols-outlined ${activeSection === 'screensaver' ? 'text-primary' : ''}`}
                        >
                            screenshot_monitor
                        </span>
                        <span className="text-sm font-medium">Screensaver</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveSection('3dmode')}
                        className={`p-2 rounded flex items-center gap-3 text-left ${activeSection === '3dmode' ? 'bg-white/10' : 'hover:bg-white/5 text-white/70'}`}
                    >
                        <span
                            className={`material-symbols-outlined ${activeSection === '3dmode' ? 'text-primary' : ''}`}
                        >
                            view_in_ar
                        </span>
                        <span className="text-sm font-medium">3D Window Space</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-8 overflow-y-auto">
                {activeSection === 'account' && <ProfileSettings />}

                {activeSection === 'personalization' && (
                    <>
                        <h1 className="text-3xl font-light mb-8">Personalization</h1>
                        <section className="mb-8">
                            <h3 className="text-lg font-medium mb-4">Background</h3>
                            <div className="aspect-video w-full max-w-2xl rounded-xl overflow-hidden mb-6 shadow-2xl ring-1 ring-white/10">
                                <img
                                    src={activeWallpaper}
                                    className="w-full h-full object-cover"
                                    alt="Current Wallpaper"
                                />
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
                    </>
                )}

                {activeSection === 'sync' && <SyncSettings />}

                {activeSection === 'localization' && <LocalizationSettings />}

                {activeSection === 'network' && (
                    <div className="max-w-2xl">
                        <h1 className="text-3xl font-light mb-3">Network</h1>
                        <p className="text-sm text-white/60">Network settings are not implemented in this demo.</p>
                    </div>
                )}

                {activeSection === 'apps' && (
                    <div className="max-w-2xl">
                        <h1 className="text-3xl font-light mb-3">Apps</h1>
                        <p className="text-sm text-white/60">App management is not implemented in this demo.</p>
                    </div>
                )}

                {activeSection === 'screensaver' && <ScreensaverSettings />}

                {activeSection === '3dmode' && <WindowSpaceSettings />}
            </div>
        </div>
    );
};
