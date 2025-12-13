import React, { useEffect } from 'react';
import { DesktopIcon } from './components/DesktopIcon';
import { Widgets } from './components/Widgets';
import { Taskbar } from './components/Taskbar';
import { Window } from './components/Window';
import { StartMenu } from './components/StartMenu';
import { OSProvider, useOS } from './context/OSContext';
import { DbProvider } from './context/DbContext';

// Apps
import { FileExplorer } from './components/FileExplorer';
import { Browser } from './apps/Browser';
import { Calculator } from './apps/Calculator';
import { Calendar } from './apps/Calendar';
import { Mail } from './apps/Mail';
import { Notepad } from './apps/Notepad';
import { Settings } from './apps/Settings';
import { Terminal } from './apps/Terminal';
import { SystemInfo } from './apps/SystemInfo';
import { ImageViewer } from './apps/ImageViewer';
import { Timer } from './apps/Timer';
import { Clock } from './apps/Clock';
import { UnitConverter } from './apps/UnitConverter';
import { Weather } from './apps/Weather';
import { JsonViewer } from './apps/JsonViewer';
import { WordCounter } from './apps/WordCounter';
import { Base64Tool } from './apps/Base64Tool';
import { HashGenerator } from './apps/HashGenerator';
import { TodoList } from './apps/TodoList';
import { PasswordGenerator } from './apps/PasswordGenerator';
import { ColorPicker } from './apps/ColorPicker';
import { QrGenerator } from './apps/QrGenerator';
import { RecycleBin } from './apps/RecycleBin';

const Desktop = () => {
    const { windows, registerApp, activeWallpaper, isStartMenuOpen, closeStartMenu } = useOS();

    // Register Applications on boot
    useEffect(() => {
        registerApp({ id: 'explorer', title: 'File Explorer', icon: 'folder', color: 'bg-yellow-400', component: FileExplorer });
        registerApp({ id: 'browser', title: 'Chrome', icon: 'public', color: 'bg-blue-400', component: Browser });
        registerApp({ id: 'mail', title: 'Mail', icon: 'mail', color: 'bg-sky-400', component: Mail, defaultWidth: 1000, defaultHeight: 680 });
        registerApp({ id: 'calendar', title: 'Calendar', icon: 'calendar_month', color: 'bg-purple-400', component: Calendar, defaultWidth: 980, defaultHeight: 720 });
        registerApp({ id: 'calculator', title: 'Calculator', icon: 'calculate', color: 'bg-orange-400', component: Calculator, defaultWidth: 320, defaultHeight: 480 });
        registerApp({ id: 'notepad', title: 'Notepad', icon: 'description', color: 'bg-blue-300', component: Notepad });
        registerApp({ id: 'settings', title: 'Settings', icon: 'settings', color: 'bg-gray-400', component: Settings });
        registerApp({ id: 'terminal', title: 'Terminal', icon: 'terminal', color: 'bg-green-600', component: Terminal, defaultWidth: 700, defaultHeight: 450 });
        registerApp({ id: 'systeminfo', title: 'System Info', icon: 'info', color: 'bg-blue-500', component: SystemInfo, defaultWidth: 600, defaultHeight: 650 });
        registerApp({ id: 'imageviewer', title: 'Image Viewer', icon: 'image', color: 'bg-green-500', component: ImageViewer, defaultWidth: 800, defaultHeight: 600 });
        registerApp({ id: 'timer', title: 'Timer', icon: 'timer', color: 'bg-red-400', component: Timer, defaultWidth: 400, defaultHeight: 500 });
        registerApp({ id: 'clock', title: 'World Clock', icon: 'schedule', color: 'bg-indigo-400', component: Clock, defaultWidth: 450, defaultHeight: 550 });
        registerApp({ id: 'unitconverter', title: 'Unit Converter', icon: 'swap_horiz', color: 'bg-teal-400', component: UnitConverter, defaultWidth: 400, defaultHeight: 480 });
        registerApp({ id: 'weather', title: 'Weather', icon: 'wb_sunny', color: 'bg-sky-400', component: Weather, defaultWidth: 420, defaultHeight: 580 });
        registerApp({ id: 'jsonviewer', title: 'JSON Viewer', icon: 'data_object', color: 'bg-amber-400', component: JsonViewer, defaultWidth: 700, defaultHeight: 550 });
        registerApp({ id: 'wordcounter', title: 'Word Counter', icon: 'format_size', color: 'bg-pink-400', component: WordCounter, defaultWidth: 550, defaultHeight: 500 });
        registerApp({ id: 'base64tool', title: 'Base64 Tool', icon: 'code', color: 'bg-cyan-400', component: Base64Tool, defaultWidth: 600, defaultHeight: 500 });
        registerApp({ id: 'hashgenerator', title: 'Hash Generator', icon: 'tag', color: 'bg-violet-400', component: HashGenerator, defaultWidth: 550, defaultHeight: 550 });
        registerApp({ id: 'todolist', title: 'Todo List', icon: 'checklist', color: 'bg-lime-400', component: TodoList, defaultWidth: 450, defaultHeight: 550 });
        registerApp({ id: 'passwordgenerator', title: 'Password Generator', icon: 'key', color: 'bg-rose-400', component: PasswordGenerator, defaultWidth: 450, defaultHeight: 480 });
        registerApp({ id: 'colorpicker', title: 'Color Picker', icon: 'palette', color: 'bg-fuchsia-400', component: ColorPicker, defaultWidth: 400, defaultHeight: 550 });
        registerApp({ id: 'qrgenerator', title: 'QR Generator', icon: 'qr_code', color: 'bg-emerald-400', component: QrGenerator, defaultWidth: 450, defaultHeight: 550 });
        registerApp({ id: 'recyclebin', title: 'Recycle Bin', icon: 'delete', color: 'bg-gray-400', component: RecycleBin, defaultWidth: 700, defaultHeight: 500 });
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
                <DesktopIcon icon="terminal" label="Terminal" colorClass="text-green-400" appId="terminal" />
                <DesktopIcon icon="timer" label="Timer" colorClass="text-red-300" appId="timer" />
                <DesktopIcon icon="data_object" label="JSON Viewer" colorClass="text-amber-300" appId="jsonviewer" />
                <DesktopIcon icon="checklist" label="Todo List" colorClass="text-lime-300" appId="todolist" />
                <DesktopIcon icon="delete" label="Recycle Bin" colorClass="text-gray-300" appId="recyclebin" />
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
    <DbProvider>
      <OSProvider>
          <Desktop />
      </OSProvider>
    </DbProvider>
  );
};

export default App;
