import React, { useState, useEffect } from 'react';
import { INITIAL_FILES } from '../utils/constants';
import { FileSystemItem } from '../types';
import { useOS } from '../context/OSContext';

export const FileExplorer = () => {
    const [currentPath, setCurrentPath] = useState<string[]>(['root']);
    const [currentFolder, setCurrentFolder] = useState<FileSystemItem>(INITIAL_FILES[0]);
    const { openWindow } = useOS();

    useEffect(() => {
        // Resolve path to folder object
        let folder = INITIAL_FILES[0];
        for (let i = 1; i < currentPath.length; i++) {
            const next = folder.children?.find(c => c.id === currentPath[i]);
            if (next) folder = next;
        }
        setCurrentFolder(folder);
    }, [currentPath]);

    const navigateUp = () => {
        if (currentPath.length > 1) {
            setCurrentPath(prev => prev.slice(0, -1));
        }
    };

    const navigateTo = (folderId: string) => {
        const target = currentFolder.children?.find(c => c.id === folderId);
        if (target && target.type === 'folder') {
            setCurrentPath(prev => [...prev, folderId]);
        } else if (target) {
            // Open file logic
            if (target.type === 'document' && target.name.endsWith('.txt')) {
                openWindow('notepad', { initialContent: target.content });
            } else if (target.type === 'image') {
                // Could implement photo viewer
                window.open(target.src, '_blank');
            }
        }
    };

    const QuickAccessItem = ({ icon, color, label, path }: any) => (
        <button 
            onClick={() => {
                if (path) setCurrentPath(['root', path]);
            }}
            className="flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors text-white/60 hover:text-white hover:bg-white/5 w-full text-left"
        >
            <span className={`material-symbols-outlined text-[20px] ${color}`}>{icon}</span>
            {label}
        </button>
    );

    return (
        <div className="flex h-full w-full bg-transparent">
             {/* Sidebar */}
             <div className="w-48 hidden md:flex flex-col gap-1 p-3 border-r border-white/5 bg-black/10">
                <div className="text-xs font-bold text-white/40 uppercase px-3 py-2">Favorites</div>
                <QuickAccessItem icon="home" color="text-blue-400" label="Home" />
                <QuickAccessItem icon="star" color="text-yellow-400" label="Desktop" path="desktop" />
                <QuickAccessItem icon="image" color="text-pink-400" label="Pictures" path="pictures" />
                <QuickAccessItem icon="description" color="text-orange-400" label="Documents" path="documents" />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Toolbar */}
                <div className="h-12 border-b border-white/5 flex items-center px-4 gap-4">
                    <div className="flex gap-2 text-white/50">
                        <button onClick={navigateUp} disabled={currentPath.length <= 1} className="hover:text-white disabled:opacity-30">
                            <span className="material-symbols-outlined">arrow_upward</span>
                        </button>
                    </div>
                    {/* Breadcrumbs */}
                    <div className="flex-1 flex items-center bg-black/20 rounded px-3 h-8 text-sm text-white/70">
                         {currentPath.map((p, i) => (
                             <React.Fragment key={i}>
                                <span className="hover:bg-white/10 px-1 rounded cursor-pointer">
                                    {p === 'root' ? 'This PC' : 
                                     p === 'desktop' ? 'Desktop' : 
                                     p.charAt(0).toUpperCase() + p.slice(1)}
                                </span>
                                {i < currentPath.length - 1 && <span className="material-symbols-outlined text-xs mx-1">chevron_right</span>}
                             </React.Fragment>
                         ))}
                    </div>
                </div>

                {/* File Grid */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-4">
                        {currentFolder.children?.map(item => (
                            <div 
                                key={item.id}
                                onDoubleClick={() => navigateTo(item.id)}
                                className="group flex flex-col items-center gap-2 p-2 rounded hover:bg-white/10 cursor-pointer transition-colors"
                            >
                                {item.type === 'folder' ? (
                                    <span className="material-symbols-outlined text-5xl text-yellow-400 drop-shadow-lg">folder</span>
                                ) : item.type === 'image' && item.src ? (
                                    <div className="w-16 h-12 bg-cover bg-center rounded border border-white/20" style={{ backgroundImage: `url(${item.src})` }}></div>
                                ) : (
                                    <span className={`material-symbols-outlined text-5xl drop-shadow-lg
                                        ${item.type === 'document' ? 'text-blue-400' : 
                                          item.type === 'audio' ? 'text-purple-400' : 'text-gray-400'}
                                    `}>
                                        {item.type === 'document' ? 'description' : 
                                         item.type === 'audio' ? 'music_note' : 'draft'}
                                    </span>
                                )}
                                <span className="text-xs text-white/80 text-center font-medium truncate w-full px-1">{item.name}</span>
                            </div>
                        ))}
                        {(!currentFolder.children || currentFolder.children.length === 0) && (
                            <div className="col-span-full text-center text-white/30 text-sm mt-10">Folder is empty</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};