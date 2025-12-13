import React from 'react';
import { useOS } from '../context/OSContext';

export const StartMenu = () => {
    const { isStartMenuOpen, toggleStartMenu, apps, openWindow } = useOS();

    if (!isStartMenuOpen) return null;

    return (
        <div data-start-menu className="fixed bottom-24 left-1/2 transform -translate-x-1/2 w-[600px] h-[70vh] max-h-[700px] glass-panel rounded-xl shadow-2xl z-40 flex flex-col animate-fade-in-up origin-bottom">
            {/* Search */}
            <div className="p-6 pb-2">
                <div className="bg-black/20 h-10 rounded-lg flex items-center px-4 gap-3 border border-white/5">
                    <span className="material-symbols-outlined text-white/50">search</span>
                    <input className="bg-transparent border-none text-white text-sm focus:outline-none w-full placeholder:text-white/30" placeholder="Type here to search..." />
                </div>
            </div>

            {/* Pinned */}
            <div className="flex-1 px-6 py-4 overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-semibold text-white/90">Pinned</span>
                    <button className="bg-white/10 text-white/80 text-xs px-3 py-1 rounded hover:bg-white/20">All apps</button>
                </div>
                
                <div className="grid grid-cols-6 gap-4">
                    {apps.map(app => (
                        <button 
                            key={app.id}
                            onClick={() => openWindow(app.id)}
                            className="flex flex-col items-center gap-2 p-2 rounded hover:bg-white/10 group transition-colors"
                        >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${app.color} bg-opacity-20 text-2xl`}>
                                <span className={`material-symbols-outlined ${app.color.replace('bg-', 'text-')}`}>{app.icon}</span>
                            </div>
                            <span className="text-xs text-white/80 text-center font-medium">{app.title}</span>
                        </button>
                    ))}
                    {/* Dummy Pinned Apps */}
                    <button className="flex flex-col items-center gap-2 p-2 rounded hover:bg-white/10 group opacity-50">
                         <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-white">mail</span>
                         </div>
                         <span className="text-xs text-white/80">Mail</span>
                    </button>
                    <button className="flex flex-col items-center gap-2 p-2 rounded hover:bg-white/10 group opacity-50">
                         <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-white">calendar_month</span>
                         </div>
                         <span className="text-xs text-white/80">Calendar</span>
                    </button>
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
                <div className="flex items-center gap-3 hover:bg-white/10 p-2 rounded-lg cursor-pointer transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold">JD</div>
                    <span className="text-sm font-medium text-white/90">John Doe</span>
                </div>
                <button className="p-2 hover:bg-white/10 rounded-full text-white/80">
                    <span className="material-symbols-outlined">power_settings_new</span>
                </button>
            </div>
        </div>
    );
};
