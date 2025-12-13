import React, { useEffect } from 'react';
import { DesktopIcon } from './components/DesktopIcon';
import { Widgets } from './components/Widgets';
import { Taskbar } from './components/Taskbar';
import { Window } from './components/Window';
import { StartMenu } from './components/StartMenu';
import { OSProvider, useOS } from './context/OSContext';

// Apps
import { FileExplorer } from './components/FileExplorer';
import { Browser } from './apps/Browser';
import { Calculator } from './apps/Calculator';
import { Notepad } from './apps/Notepad';
import { Settings } from './apps/Settings';

const Desktop = () => {
    const { windows, registerApp, activeWallpaper, isStartMenuOpen, closeStartMenu } = useOS();

    // Register Applications on boot
    useEffect(() => {
        registerApp({ id: 'explorer', title: 'File Explorer', icon: 'folder', color: 'bg-yellow-400', component: FileExplorer });
        registerApp({ id: 'browser', title: 'Chrome', icon: 'public', color: 'bg-blue-400', component: Browser });
        registerApp({ id: 'calculator', title: 'Calculator', icon: 'calculate', color: 'bg-orange-400', component: Calculator, defaultWidth: 320, defaultHeight: 480 });
        registerApp({ id: 'notepad', title: 'Notepad', icon: 'description', color: 'bg-blue-300', component: Notepad });
        registerApp({ id: 'settings', title: 'Settings', icon: 'settings', color: 'bg-gray-400', component: Settings });
    }, []);

    return (
        <div 
            className="relative h-screen w-screen overflow-hidden select-none"
            onPointerDown={(e) => {
                if (!isStartMenuOpen) return;
                const target = e.target as HTMLElement;
                if (target.closest('[data-start-menu]')) return;
                if (target.closest('[data-taskbar]')) return;
                closeStartMenu();
            }}
        >
            {/* Wallpaper */}
            <div 
                className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-700 ease-in-out transform scale-105" 
                style={{ backgroundImage: `url('${activeWallpaper}')` }}
            >
                <div className="absolute inset-0 bg-black/10 backdrop-blur-[0px]"></div>
            </div>

            {/* Desktop Icons */}
            <div className="relative z-0 flex flex-col gap-4 p-4 pt-6 w-min h-[calc(100vh-80px)] flex-wrap content-start">
                <DesktopIcon icon="computer" label="This PC" colorClass="text-blue-300" appId="explorer" />
                <DesktopIcon icon="folder_open" label="Documents" colorClass="text-yellow-300" appId="explorer" />
                <DesktopIcon icon="public" label="Browser" colorClass="text-green-300" appId="browser" />
                <DesktopIcon icon="delete" label="Recycle Bin" colorClass="text-gray-300" />
            </div>

            {/* Window Manager Layer */}
            <div className="absolute inset-0 z-10 pointer-events-none">
                {windows.map(window => (
                    <div key={window.id} className="pointer-events-auto">
                        <Window window={window} />
                    </div>
                ))}
            </div>

            {/* UI Overlays */}
            <Widgets />
            <StartMenu />
            <Taskbar />
        </div>
    );
};

const App: React.FC = () => {
  return (
    <OSProvider>
        <Desktop />
    </OSProvider>
  );
};

export default App;
