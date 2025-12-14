import React, { useRef, useCallback } from 'react';
import { useOS } from '../context/OSContext';

export const StartMenu = () => {
    const { isStartMenuOpen, apps, openWindow, toggleStartMenu } = useOS();
    const menuRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Escape') {
                toggleStartMenu();
            }
        },
        [toggleStartMenu]
    );

    if (!isStartMenuOpen) return null;

    return (
        <div
            ref={menuRef}
            data-start-menu
            role="menu"
            aria-label="Start menu"
            onKeyDown={handleKeyDown}
            className="fixed bottom-24 left-1/2 transform -translate-x-1/2 w-[600px] h-[70vh] max-h-[700px] glass-panel rounded-xl shadow-2xl z-40 flex flex-col animate-fade-in-up origin-bottom"
        >
            {/* Search */}
            <div className="p-6 pb-2">
                <div className="bg-black/20 h-10 rounded-lg flex items-center px-4 gap-3 border border-white/5">
                    <span className="material-symbols-outlined text-white/50" aria-hidden="true">search</span>
                    <input
                        ref={searchInputRef}
                        aria-label="Search apps"
                        className="bg-transparent border-none text-white text-sm focus:outline-none w-full placeholder:text-white/30"
                        placeholder="Type here to search..."
                    />
                </div>
            </div>

            {/* Pinned */}
            <div className="flex-1 px-6 py-4 overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-semibold text-white/90">Pinned</span>
                    <button className="bg-white/10 text-white/80 text-xs px-3 py-1 rounded hover:bg-white/20">
                        All apps
                    </button>
                </div>

                <div className="grid grid-cols-6 gap-4" role="group" aria-label="Pinned apps">
                    {apps.map(app => (
                        <button
                            key={app.id}
                            role="menuitem"
                            onClick={() => openWindow(app.id)}
                            className="flex flex-col items-center gap-2 p-2 rounded hover:bg-white/10 group transition-colors"
                        >
                            <div
                                className={`w-10 h-10 rounded-lg flex items-center justify-center ${app.color} bg-opacity-20 text-2xl`}
                                aria-hidden="true"
                            >
                                <span className={`material-symbols-outlined ${app.color.replace('bg-', 'text-')}`}>
                                    {app.icon}
                                </span>
                            </div>
                            <span className="text-xs text-white/80 text-center font-medium">{app.title}</span>
                        </button>
                    ))}
                </div>

                <div className="mt-8">
                    <span className="text-sm font-semibold text-white/90 mb-4 block">Recommended</span>
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3 p-2 rounded hover:bg-white/10 cursor-pointer">
                            <span className="material-symbols-outlined text-blue-400">description</span>
                            <div className="flex flex-col">
                                <span className="text-sm text-white/90">Project Proposal.docx</span>
                                <span className="text-xs text-white/50">Recently opened</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-2 rounded hover:bg-white/10 cursor-pointer">
                            <span className="material-symbols-outlined text-pink-400">image</span>
                            <div className="flex flex-col">
                                <span className="text-sm text-white/90">Design_V2.png</span>
                                <span className="text-xs text-white/50">10 min ago</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="h-16 border-t border-white/10 flex items-center justify-between px-8 bg-black/20">
                <button
                    aria-label="User profile: John Doe"
                    className="flex items-center gap-3 hover:bg-white/10 p-2 rounded-lg cursor-pointer transition-colors"
                >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold" aria-hidden="true">
                        JD
                    </div>
                    <span className="text-sm font-medium text-white/90">John Doe</span>
                </button>
                <button aria-label="Power options" className="p-2 hover:bg-white/10 rounded-full text-white/80">
                    <span className="material-symbols-outlined" aria-hidden="true">power_settings_new</span>
                </button>
            </div>
        </div>
    );
};
