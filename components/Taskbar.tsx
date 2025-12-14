import React, { useState, useEffect } from 'react';
import { useOS } from '../context/OSContext';
import { SyncStatus } from './SyncStatus';

export const Taskbar = () => {
    const { toggleStartMenu, isStartMenuOpen, apps, openWindow, windows, minimizeWindow } = useOS();
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const formatDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });

    // Filter pinned apps from registry
    const pinnedApps = ['explorer', 'browser', 'mail', 'calendar', 'notepad', 'calculator', 'settings'];

    return (
        <div data-taskbar className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
            <div className="flex items-center h-16 px-3 glass-panel rounded-full shadow-2xl ring-1 ring-white/10 gap-2 md:gap-4 transition-all">
                {/* Start Button */}
                <button
                    onClick={toggleStartMenu}
                    className={`w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-all active:scale-95 group relative ml-1 ${isStartMenuOpen ? 'bg-white/10' : ''}`}
                >
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <span className="material-symbols-outlined text-primary text-3xl relative z-10" style={{ fontVariationSettings: "'FILL' 1" }}>grid_view</span>
                </button>

                <div className="w-px h-8 bg-white/10 mx-1"></div>

                {/* App Icons (Pinned + Open) */}
                <div className="flex gap-1 md:gap-2">
                    {/* Render Pinned Apps */}
                    {pinnedApps.map(id => {
                        const app = apps.find(a => a.id === id);
                        if (!app) return null;
                        const isOpen = windows.some(w => w.appId === id && !w.isMinimized);
                        const isRunning = windows.some(w => w.appId === id);

                        return (
                            <TaskbarIcon
                                key={id}
                                icon={app.icon}
                                colorClass={app.color.replace('bg-', 'text-')}
                                active={isOpen}
                                running={isRunning}
                                onClick={() => openWindow(id)}
                                filled={true}
                            />
                        );
                    })}
                </div>

                <div className="w-px h-8 bg-white/10 mx-1"></div>

                {/* System Tray */}
                <div className="flex items-center gap-1 md:gap-2 mr-1">
                    <button className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-[18px]">expand_less</span>
                    </button>
                    <div className="flex items-center gap-3 px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer group">
                        <span className="material-symbols-outlined text-[18px] text-white">wifi</span>
                        <span className="material-symbols-outlined text-[18px] text-white">volume_up</span>
                        <span className="material-symbols-outlined text-[18px] text-white">battery_full</span>
                    </div>
                    <SyncStatus />
                    {/* Clock */}
                    <div className="flex flex-col items-end justify-center px-3 py-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer text-right min-w-[80px]">
                        <span className="text-xs font-semibold text-white leading-none mb-0.5">{formatTime(time)}</span>
                        <span className="text-[10px] text-white/60 leading-none">{formatDate(time)}</span>
                    </div>
                    <button
                        className="w-1 h-8 border-l border-white/20 ml-2 hover:bg-white/20"
                        onClick={() => windows.forEach(w => minimizeWindow(w.id))}
                    ></button>
                </div>
            </div>
        </div>
    );
};

interface TaskbarIconProps {
    icon: string;
    active?: boolean;
    running?: boolean;
    onClick?: () => void;
    colorClass?: string;
    filled?: boolean;
}

const TaskbarIcon: React.FC<TaskbarIconProps> = ({ icon, active, running, onClick, colorClass = "text-white", filled }) => {
    return (
        <button
            onClick={onClick}
            className={`relative w-10 h-10 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all hover:-translate-y-1 group ${active ? 'bg-white/10' : ''}`}
        >
            <span
                className={`material-symbols-outlined text-2xl group-hover:text-primary transition-colors ${colorClass}`}
                style={filled ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
                {icon}
            </span>
            {running && <div className="absolute -bottom-1 w-1 h-1 bg-white/80 rounded-full transition-all duration-300" style={{ width: active ? '16px' : '4px', borderRadius: active ? '2px' : '50%' }}></div>}
        </button>
    );
};
