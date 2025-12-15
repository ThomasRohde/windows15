import React, { useState } from 'react';
import { useOS } from '../context/OSContext';
import { WALLPAPERS } from '../utils/constants';
import { AppSidebar, type SidebarItem } from '../components/ui';
import { SyncSettings } from './settings/SyncSettings';
import { LocalizationSettings } from './settings/LocalizationSettings';
import { ScreensaverSettings } from './settings/ScreensaverSettings';
import { WindowSpaceSettings } from './settings/WindowSpaceSettings';
import { ProfileSettings } from './settings/ProfileSettings';

type SettingsSection =
    | 'account'
    | 'personalization'
    | 'localization'
    | 'sync'
    | 'network'
    | 'apps'
    | 'screensaver'
    | '3dmode';

const sidebarItems: SidebarItem<SettingsSection>[] = [
    { id: 'account', label: 'Account', icon: 'person' },
    { id: 'personalization', label: 'Personalization', icon: 'wallpaper' },
    { id: 'sync', label: 'Sync', icon: 'sync' },
    { id: 'localization', label: 'Time & language', icon: 'language' },
    { id: 'network', label: 'Network', icon: 'wifi' },
    { id: 'apps', label: 'Apps', icon: 'apps' },
    { id: 'screensaver', label: 'Screensaver', icon: 'screenshot_monitor' },
    { id: '3dmode', label: '3D Window Space', icon: 'view_in_ar' },
];

export const Settings = () => {
    const { activeWallpaper, setWallpaper } = useOS();
    const [activeSection, setActiveSection] = useState<SettingsSection>('account');

    return (
        <div className="h-full bg-background-dark text-white flex">
            {/* Sidebar */}
            <div className="hidden md:block">
                <AppSidebar title="Settings" items={sidebarItems} active={activeSection} onChange={setActiveSection} />
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
