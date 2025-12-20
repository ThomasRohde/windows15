import React, { useState } from 'react';
import { useOS } from '../context/OSContext';
import { WALLPAPERS } from '../utils/constants';
import { AppSidebar, type SidebarItem } from '../components/ui';
import { SyncSettings } from './settings/SyncSettings';
import { LocalizationSettings } from './settings/LocalizationSettings';
import { ScreensaverSettings } from './settings/ScreensaverSettings';
import { WindowSpaceSettings } from './settings/WindowSpaceSettings';
import { ProfileSettings } from './settings/ProfileSettings';
import { SoundSettings } from './settings/SoundSettings';
import { NetworkSettings } from './settings/NetworkSettings';
import { DevicesSettings } from './settings/DevicesSettings';
import { useTranslation } from '../hooks/useTranslation';

type SettingsSection =
    | 'account'
    | 'personalization'
    | 'localization'
    | 'sync'
    | 'network'
    | 'devices'
    | 'apps'
    | 'sound'
    | 'screensaver'
    | '3dmode';

export const Settings = () => {
    const { t } = useTranslation('settings');
    const { activeWallpaper, setWallpaper } = useOS();
    const [activeSection, setActiveSection] = useState<SettingsSection>('account');

    const sidebarItems: SidebarItem<SettingsSection>[] = [
        { id: 'account', label: t('general'), icon: 'person' },
        { id: 'personalization', label: t('personalization'), icon: 'wallpaper' },
        { id: 'sound', label: t('sound'), icon: 'volume_up' },
        { id: 'sync', label: t('sync'), icon: 'sync' },
        { id: 'devices', label: 'Devices', icon: 'devices' },
        { id: 'localization', label: t('localization'), icon: 'language' },
        { id: 'network', label: 'Network', icon: 'wifi' },
        { id: 'apps', label: 'Apps', icon: 'apps' },
        { id: 'screensaver', label: 'Screensaver', icon: 'screenshot_monitor' },
        { id: '3dmode', label: '3D Mode', icon: 'view_in_ar' },
    ];

    return (
        <div className="h-full bg-background-dark text-white flex">
            {/* Sidebar */}
            <div className="hidden md:block">
                <AppSidebar
                    title={t('title')}
                    items={sidebarItems}
                    active={activeSection}
                    onChange={setActiveSection}
                />
            </div>

            {/* Content */}
            <div className="flex-1 p-8 overflow-y-auto touch-scroll">
                {activeSection === 'account' && <ProfileSettings />}

                {activeSection === 'personalization' && (
                    <>
                        <h1 className="text-3xl font-light mb-8">{t('personalization')}</h1>
                        <section className="mb-8">
                            <h3 className="text-lg font-medium mb-4">{t('wallpaper')}</h3>
                            <div className="aspect-video w-full max-w-2xl rounded-xl overflow-hidden mb-6 shadow-2xl ring-1 ring-white/10">
                                <img
                                    src={activeWallpaper}
                                    className="w-full h-full object-cover"
                                    alt={t('wallpaper')}
                                />
                            </div>

                            <h4 className="text-sm text-white/60 mb-3">{t('wallpaper')}</h4>
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

                {activeSection === 'sound' && <SoundSettings />}

                {activeSection === 'sync' && <SyncSettings />}

                {activeSection === 'localization' && <LocalizationSettings />}

                {activeSection === 'network' && <NetworkSettings />}

                {activeSection === 'devices' && <DevicesSettings />}

                {activeSection === 'apps' && (
                    <div className="max-w-2xl">
                        <h1 className="text-3xl font-light mb-3">{t('common:labels.name')}</h1>
                        <p className="text-sm text-white/60">App management is not implemented in this demo.</p>
                    </div>
                )}

                {activeSection === 'screensaver' && <ScreensaverSettings />}

                {activeSection === '3dmode' && <WindowSpaceSettings />}
            </div>
        </div>
    );
};
