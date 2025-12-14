/**
 * OSContext - Composition wrapper that provides unified access to all OS contexts
 * 
 * This context maintains backward compatibility by re-exporting all the
 * functionality from the split contexts through a single useOS hook.
 */
import React, { createContext, useContext, ReactNode } from 'react';
import { AppRegistryProvider, useAppRegistry } from './AppRegistryContext';
import { WallpaperProvider, useWallpaper } from './WallpaperContext';
import { StartMenuProvider, useStartMenu } from './StartMenuContext';
import { WindowProvider, useWindowManager } from './WindowContext';

/**
 * Combined interface for backward compatibility
 */
interface OSContextType {
    // Window management
    windows: ReturnType<typeof useWindowManager>['windows'];
    openWindow: ReturnType<typeof useWindowManager>['openWindow'];
    closeWindow: ReturnType<typeof useWindowManager>['closeWindow'];
    minimizeWindow: ReturnType<typeof useWindowManager>['minimizeWindow'];
    toggleMaximizeWindow: ReturnType<typeof useWindowManager>['toggleMaximizeWindow'];
    focusWindow: ReturnType<typeof useWindowManager>['focusWindow'];
    resizeWindow: ReturnType<typeof useWindowManager>['resizeWindow'];
    updateWindowPosition: ReturnType<typeof useWindowManager>['updateWindowPosition'];
    // App registry
    registerApp: ReturnType<typeof useAppRegistry>['registerApp'];
    apps: ReturnType<typeof useAppRegistry>['apps'];
    // Wallpaper
    activeWallpaper: ReturnType<typeof useWallpaper>['activeWallpaper'];
    setWallpaper: ReturnType<typeof useWallpaper>['setWallpaper'];
    // Start menu
    isStartMenuOpen: ReturnType<typeof useStartMenu>['isStartMenuOpen'];
    toggleStartMenu: ReturnType<typeof useStartMenu>['toggleStartMenu'];
    closeStartMenu: ReturnType<typeof useStartMenu>['closeStartMenu'];
}

const OSContext = createContext<OSContextType | undefined>(undefined);

/**
 * Hook to access all OS functionality (backward compatible)
 */
export const useOS = () => {
    const context = useContext(OSContext);
    if (!context) throw new Error('useOS must be used within an OSProvider');
    return context;
};

/**
 * Internal component that combines all contexts into OSContext
 */
const OSContextBridge: React.FC<{ children: ReactNode }> = ({ children }) => {
    const windowManager = useWindowManager();
    const appRegistry = useAppRegistry();
    const wallpaper = useWallpaper();
    const startMenu = useStartMenu();

    const value: OSContextType = {
        // Window management
        windows: windowManager.windows,
        openWindow: windowManager.openWindow,
        closeWindow: windowManager.closeWindow,
        minimizeWindow: windowManager.minimizeWindow,
        toggleMaximizeWindow: windowManager.toggleMaximizeWindow,
        focusWindow: windowManager.focusWindow,
        resizeWindow: windowManager.resizeWindow,
        updateWindowPosition: windowManager.updateWindowPosition,
        // App registry
        registerApp: appRegistry.registerApp,
        apps: appRegistry.apps,
        // Wallpaper
        activeWallpaper: wallpaper.activeWallpaper,
        setWallpaper: wallpaper.setWallpaper,
        // Start menu
        isStartMenuOpen: startMenu.isStartMenuOpen,
        toggleStartMenu: startMenu.toggleStartMenu,
        closeStartMenu: startMenu.closeStartMenu,
    };

    return (
        <OSContext.Provider value={value}>
            {children}
        </OSContext.Provider>
    );
};

/**
 * Main OS provider that composes all context providers
 */
export const OSProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <AppRegistryProvider>
            <StartMenuProvider>
                <WallpaperProvider>
                    <WindowProvider>
                        <OSContextBridge>
                            {children}
                        </OSContextBridge>
                    </WindowProvider>
                </WallpaperProvider>
            </StartMenuProvider>
        </AppRegistryProvider>
    );
};

// Re-export individual hooks for direct access
export { useAppRegistry } from './AppRegistryContext';
export { useWallpaper } from './WallpaperContext';
export { useStartMenu } from './StartMenuContext';
export { useWindowManager } from './WindowContext';
