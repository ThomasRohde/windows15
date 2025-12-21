import React, { useState } from 'react';
import { useOS } from '../context/OSContext';
import { WALLPAPERS } from '../utils/constants';
import { AppSidebar, type SidebarItem, Select } from '../components/ui';
import { SyncSettings } from './settings/SyncSettings';
import { LocalizationSettings } from './settings/LocalizationSettings';
import { ScreensaverSettings } from './settings/ScreensaverSettings';
import { WindowSpaceSettings } from './settings/WindowSpaceSettings';
import { ProfileSettings } from './settings/ProfileSettings';
import { SoundSettings } from './settings/SoundSettings';
import { NetworkSettings } from './settings/NetworkSettings';
import { DevicesSettings } from './settings/DevicesSettings';
import { TouchSettings } from './settings/TouchSettings';
import { useTranslation } from '../hooks/useTranslation';

type SettingsSection =
    | 'account'
    | 'personalization'
    | 'localization'
    | 'sync'
    | 'network'
    | 'devices'
    | 'touch'
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
        { id: 'touch', label: 'Touch & Tablet', icon: 'touch_app' },
        { id: 'localization', label: t('localization'), icon: 'language' },
        { id: 'network', label: 'Network', icon: 'wifi' },
        { id: 'apps', label: 'Apps', icon: 'apps' },
        { id: 'screensaver', label: 'Screensaver', icon: 'screenshot_monitor' },
        { id: '3dmode', label: '3D Mode', icon: 'view_in_ar' },
    ];

    return (
        <div className="h-full bg-background-dark text-white flex flex-col md:flex-row">
            {/* Sidebar - hidden on mobile */}
            <div className="hidden md:block">
                <AppSidebar
                    title={t('title')}
                    items={sidebarItems}
                    active={activeSection}
                    onChange={setActiveSection}
                />
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* F231: Mobile dropdown section selector */}
                <div className="md:hidden p-4 border-b border-white/10 bg-[#2d2d2d]">
                    <Select
                        value={activeSection}
                        onChange={val => setActiveSection(val as SettingsSection)}
                        options={sidebarItems.map(item => ({
                            label: item.label,
                            value: item.id,
                        }))}
                        className="w-full min-h-[44px]"
                    />
                </div>

                {/* Scrollable content area */}
                <div className="flex-1 p-4 md:p-8 overflow-y-auto touch-scroll">
                    {activeSection === 'account' && <ProfileSettings />}

                    {activeSection === 'personalization' && (
                        <>
                            <h1 className="text-2xl md:text-3xl font-light mb-6 md:mb-8">{t('personalization')}</h1>
                            <section className="mb-6 md:mb-8">
                                <h3 className="text-base md:text-lg font-medium mb-3 md:mb-4">{t('wallpaper')}</h3>
                                <div className="aspect-video w-full max-w-2xl rounded-xl overflow-hidden mb-4 md:mb-6 shadow-2xl ring-1 ring-white/10">
                                    <img
                                        src={activeWallpaper}
                                        className="w-full h-full object-cover"
                                        alt={t('wallpaper')}
                                    />
                                </div>

                                <h4 className="text-sm text-white/60 mb-3">{t('wallpaper')}</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-2xl">
                                    {WALLPAPERS.map(wp => (
                                        <button
                                            key={wp.id}
                                            onClick={() => setWallpaper(wp.url)}
                                            className={`aspect-video rounded-lg overflow-hidden ring-2 transition-all min-h-[60px] active:scale-95 ${activeWallpaper === wp.url ? 'ring-primary' : 'ring-transparent hover:ring-white/20 active:ring-white/40'}`}
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

                    {activeSection === 'touch' && <TouchSettings />}

                    {activeSection === 'apps' && (
                        <div className="max-w-2xl">
                            <h1 className="text-2xl md:text-3xl font-light mb-3">{t('common:labels.name')}</h1>
                            <p className="text-sm text-white/60">App management is not implemented in this demo.</p>
                        </div>
                    )}

                    {activeSection === 'screensaver' && <ScreensaverSettings />}

                    {activeSection === '3dmode' && <WindowSpaceSettings />}
                </div>
            </div>
        </div>
    );
};
