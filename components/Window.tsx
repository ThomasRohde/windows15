import React, { useState, useEffect, useRef } from 'react';
import { useOS } from '../context/OSContext';
import { WindowState } from '../types';

interface WindowProps {
    window: WindowState;
}

export const Window: React.FC<WindowProps> = ({ window }) => {
    const { closeWindow, minimizeWindow, toggleMaximizeWindow, focusWindow } = useOS();
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState(window.position);

    const windowRef = useRef<HTMLDivElement>(null);
    const dragOffsetRef = useRef({ x: 0, y: 0 });
    const pointerIdRef = useRef<number | null>(null);
    const positionRef = useRef(window.position);
    const restorePositionRef = useRef(window.position);
    const pendingPositionRef = useRef<{ x: number; y: number } | null>(null);
    const rafIdRef = useRef<number | null>(null);

    useEffect(() => {
        if (window.isMaximized) {
            restorePositionRef.current = positionRef.current;
            return;
        }

        positionRef.current = restorePositionRef.current;
        setPosition(restorePositionRef.current);
    }, [window.isMaximized]);

    useEffect(() => {
        return () => {
            if (rafIdRef.current !== null) {
                globalThis.cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
        };
    }, []);

    const applyPosition = (next: { x: number; y: number }) => {
        positionRef.current = next;
        const el = windowRef.current;
        if (el) {
            el.style.transform = `translate3d(${next.x}px, ${next.y}px, 0)`;
        }
    };

    const scheduleApplyPosition = () => {
        if (rafIdRef.current !== null) return;
        rafIdRef.current = globalThis.requestAnimationFrame(() => {
            rafIdRef.current = null;
            const next = pendingPositionRef.current;
            if (!next) return;
            pendingPositionRef.current = null;
            applyPosition(next);
        });
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if (window.isMaximized) return;
        if (e.button !== 0) return;
        const target = e.target as HTMLElement;
        if (target.closest('button, a, input, textarea, select')) return;
        setIsDragging(true);
        const rect = windowRef.current?.getBoundingClientRect();
        if (rect) {
            pointerIdRef.current = e.pointerId;
            dragOffsetRef.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        }
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
            // Ignore; best-effort for smoother dragging.
        }
        e.preventDefault();
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        if (pointerIdRef.current !== e.pointerId) return;
        pendingPositionRef.current = {
            x: e.clientX - dragOffsetRef.current.x,
            y: e.clientY - dragOffsetRef.current.y,
        };
        scheduleApplyPosition();
    };

    const endDrag = (e: React.PointerEvent) => {
        if (!isDragging) return;
        if (pointerIdRef.current !== null && pointerIdRef.current !== e.pointerId) return;

        pointerIdRef.current = null;
        setIsDragging(false);

        if (rafIdRef.current !== null) {
            globalThis.cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }
        if (pendingPositionRef.current) {
            applyPosition(pendingPositionRef.current);
            pendingPositionRef.current = null;
        }

        setPosition(positionRef.current);
        restorePositionRef.current = positionRef.current;

        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
            // Ignore; best-effort cleanup.
        }
    };

    if (window.isMinimized) return null;

    // Taskbar is floating at bottom 24px with height 64px. Total occupied = 88px. 
    // We leave a bit more gap (96px) for aesthetics when maximized.
    const MAXIMIZED_BOTTOM_GAP_PX = 96;
    const outerStyle: React.CSSProperties = window.isMaximized ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: `calc(100vh - ${MAXIMIZED_BOTTOM_GAP_PX}px)`,
        transform: 'none',
    } : {
        top: 0,
        left: 0,
        width: window.size.width,
        height: window.size.height,
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        willChange: isDragging ? 'transform' : undefined,
    };

    const chromeStyle: React.CSSProperties | undefined = (() => {
        if (!window.isMaximized && !isDragging) return undefined;
        return {
            ...(window.isMaximized ? { borderRadius: 0, boxShadow: 'none' } : {}),
            ...(isDragging ? { backdropFilter: 'none', WebkitBackdropFilter: 'none' } : {}),
        };
    })();

    return (
        <div 
            ref={windowRef}
            className="absolute"
            style={{ 
                ...outerStyle, 
                zIndex: window.zIndex 
            }}
            onPointerDown={() => focusWindow(window.id)}
        >
            <div
                className={`glass-panel flex h-full w-full flex-col overflow-hidden animate-pop-in ${isDragging ? 'transition-none opacity-90' : 'transition-all duration-200'} ${window.isMaximized ? '' : 'shadow-2xl rounded-xl border border-white/10'}`}
                style={chromeStyle}
            >
            {/* Title Bar */}
            <div 
                className={`relative z-50 h-10 bg-black/40 border-b border-white/5 flex items-center justify-between px-3 select-none shrink-0 backdrop-blur-md ${window.isMaximized ? 'cursor-default' : 'cursor-move'}`}
                style={{ touchAction: 'none' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onDoubleClick={() => toggleMaximizeWindow(window.id)}
            >
                <div className="flex items-center gap-3 min-w-0 flex-shrink">
                    <span className="material-symbols-outlined text-white/70 text-[18px] flex-shrink-0">{window.icon}</span>
                    <span className="text-sm font-medium text-white/80 truncate">{window.title}</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); minimizeWindow(window.id); }} className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-white/70 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">minimize</span>
                    </button>
                    <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); toggleMaximizeWindow(window.id); }} className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-white/70 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">{window.isMaximized ? 'close_fullscreen' : 'crop_square'}</span>
                    </button>
                    <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); closeWindow(window.id); }} className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-500 text-white/70 hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative bg-black/20">
                {window.component}
            </div>
            </div>
        </div>
    );
};
