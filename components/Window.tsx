import React, { useState, useEffect, useRef } from 'react';
import { useOS } from '../context/OSContext';
import { WindowState } from '../types';

interface WindowProps {
    window: WindowState;
}

export const Window: React.FC<WindowProps> = ({ window }) => {
    const { closeWindow, minimizeWindow, toggleMaximizeWindow, focusWindow } = useOS();
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [position, setPosition] = useState(window.position);

    const windowRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!window.isMaximized) {
            setPosition(window.position);
        }
    }, [window.position, window.isMaximized]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (window.isMaximized) return;
        focusWindow(window.id);
        setIsDragging(true);
        const rect = windowRef.current?.getBoundingClientRect();
        if (rect) {
            setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
        }
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            setPosition({
                x: e.clientX - dragOffset.x,
                y: e.clientY - dragOffset.y
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset]);

    if (window.isMinimized) return null;

    // Taskbar is floating at bottom 24px with height 64px. Total occupied = 88px. 
    // We leave a bit more gap (96px) for aesthetics when maximized.
    const style = window.isMaximized ? {
        top: 0,
        left: 0,
        width: '100%',
        height: 'calc(100% - 96px)', 
        transform: 'none',
        borderRadius: 0
    } : {
        top: position.y,
        left: position.x,
        width: window.size.width,
        height: window.size.height,
    };

    return (
        <div 
            ref={windowRef}
            className={`absolute glass-panel flex flex-col shadow-2xl overflow-hidden transition-all duration-200 ${window.isMaximized ? '' : 'rounded-xl border border-white/10'} ${isDragging ? 'opacity-90 scale-[1.01]' : 'animate-pop-in'}`}
            style={{ 
                ...style, 
                zIndex: window.zIndex 
            }}
            onMouseDown={() => focusWindow(window.id)}
        >
            {/* Title Bar */}
            <div 
                className="relative z-50 h-10 bg-black/40 border-b border-white/5 flex items-center justify-between px-3 select-none shrink-0 backdrop-blur-md"
                onMouseDown={handleMouseDown}
                onDoubleClick={() => toggleMaximizeWindow(window.id)}
            >
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-white/70 text-[18px]">{window.icon}</span>
                    <span className="text-sm font-medium text-white/80">{window.title}</span>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); minimizeWindow(window.id); }} className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-white/70 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">minimize</span>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); toggleMaximizeWindow(window.id); }} className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-white/70 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">{window.isMaximized ? 'close_fullscreen' : 'crop_square'}</span>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); closeWindow(window.id); }} className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-500 text-white/70 hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative bg-black/20">
                {window.component}
            </div>
        </div>
    );
};