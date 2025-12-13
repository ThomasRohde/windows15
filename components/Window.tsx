import React, { useState, useEffect, useRef } from 'react';
import { useOS } from '../context/OSContext';
import { WindowState } from '../types';

interface WindowProps {
    window: WindowState;
}

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null;

const MIN_WIDTH = 200;
const MIN_HEIGHT = 150;

export const Window: React.FC<WindowProps> = ({ window }) => {
    const { closeWindow, minimizeWindow, toggleMaximizeWindow, focusWindow, resizeWindow } = useOS();
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [resizeDir, setResizeDir] = useState<ResizeDirection>(null);
    const [position, setPosition] = useState(window.position);
    const [size, setSize] = useState(window.size);

    const windowRef = useRef<HTMLDivElement>(null);
    const dragOffsetRef = useRef({ x: 0, y: 0 });
    const pointerIdRef = useRef<number | null>(null);
    const positionRef = useRef(window.position);
    const sizeRef = useRef(window.size);
    const restorePositionRef = useRef(window.position);
    const restoreSizeRef = useRef(window.size);
    const pendingPositionRef = useRef<{ x: number; y: number } | null>(null);
    const pendingSizeRef = useRef<{ width: number; height: number } | null>(null);
    const rafIdRef = useRef<number | null>(null);
    const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 });

    useEffect(() => {
        if (window.isMaximized) {
            restorePositionRef.current = positionRef.current;
            restoreSizeRef.current = sizeRef.current;
            return;
        }

        positionRef.current = restorePositionRef.current;
        sizeRef.current = restoreSizeRef.current;
        setPosition(restorePositionRef.current);
        setSize(restoreSizeRef.current);
    }, [window.isMaximized]);

    useEffect(() => {
        return () => {
            if (rafIdRef.current !== null) {
                globalThis.cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
        };
    }, []);

    const applyTransform = (nextPos: { x: number; y: number }, nextSize: { width: number; height: number }) => {
        positionRef.current = nextPos;
        sizeRef.current = nextSize;
        const el = windowRef.current;
        if (el) {
            el.style.transform = `translate3d(${nextPos.x}px, ${nextPos.y}px, 0)`;
            el.style.width = `${nextSize.width}px`;
            el.style.height = `${nextSize.height}px`;
        }
    };

    const scheduleApply = () => {
        if (rafIdRef.current !== null) return;
        rafIdRef.current = globalThis.requestAnimationFrame(() => {
            rafIdRef.current = null;
            const nextPos = pendingPositionRef.current ?? positionRef.current;
            const nextSize = pendingSizeRef.current ?? sizeRef.current;
            pendingPositionRef.current = null;
            pendingSizeRef.current = null;
            applyTransform(nextPos, nextSize);
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
        scheduleApply();
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
            applyTransform(pendingPositionRef.current, sizeRef.current);
            pendingPositionRef.current = null;
        }

        setPosition(positionRef.current);
        restorePositionRef.current = positionRef.current;

        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
        }
    };

    const handleResizeStart = (e: React.PointerEvent, direction: ResizeDirection) => {
        if (window.isMaximized) return;
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();
        
        setIsResizing(true);
        setResizeDir(direction);
        pointerIdRef.current = e.pointerId;
        
        resizeStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            width: sizeRef.current.width,
            height: sizeRef.current.height,
            posX: positionRef.current.x,
            posY: positionRef.current.y
        };

        try {
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
        }
    };

    const handleResizeMove = (e: React.PointerEvent) => {
        if (!isResizing || !resizeDir) return;
        if (pointerIdRef.current !== e.pointerId) return;

        const deltaX = e.clientX - resizeStartRef.current.x;
        const deltaY = e.clientY - resizeStartRef.current.y;
        
        let newWidth = resizeStartRef.current.width;
        let newHeight = resizeStartRef.current.height;
        let newX = resizeStartRef.current.posX;
        let newY = resizeStartRef.current.posY;

        if (resizeDir.includes('e')) {
            newWidth = Math.max(MIN_WIDTH, resizeStartRef.current.width + deltaX);
        }
        if (resizeDir.includes('w')) {
            const proposedWidth = resizeStartRef.current.width - deltaX;
            if (proposedWidth >= MIN_WIDTH) {
                newWidth = proposedWidth;
                newX = resizeStartRef.current.posX + deltaX;
            } else {
                newWidth = MIN_WIDTH;
                newX = resizeStartRef.current.posX + resizeStartRef.current.width - MIN_WIDTH;
            }
        }
        if (resizeDir.includes('s')) {
            newHeight = Math.max(MIN_HEIGHT, resizeStartRef.current.height + deltaY);
        }
        if (resizeDir.includes('n')) {
            const proposedHeight = resizeStartRef.current.height - deltaY;
            if (proposedHeight >= MIN_HEIGHT) {
                newHeight = proposedHeight;
                newY = resizeStartRef.current.posY + deltaY;
            } else {
                newHeight = MIN_HEIGHT;
                newY = resizeStartRef.current.posY + resizeStartRef.current.height - MIN_HEIGHT;
            }
        }

        pendingPositionRef.current = { x: newX, y: newY };
        pendingSizeRef.current = { width: newWidth, height: newHeight };
        scheduleApply();
    };

    const handleResizeEnd = (e: React.PointerEvent) => {
        if (!isResizing) return;
        if (pointerIdRef.current !== null && pointerIdRef.current !== e.pointerId) return;

        pointerIdRef.current = null;
        setIsResizing(false);
        setResizeDir(null);

        if (rafIdRef.current !== null) {
            globalThis.cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }

        const finalPos = pendingPositionRef.current ?? positionRef.current;
        const finalSize = pendingSizeRef.current ?? sizeRef.current;
        pendingPositionRef.current = null;
        pendingSizeRef.current = null;

        applyTransform(finalPos, finalSize);
        setPosition(finalPos);
        setSize(finalSize);
        restorePositionRef.current = finalPos;
        restoreSizeRef.current = finalSize;
        
        resizeWindow(window.id, finalSize, finalPos);

        try {
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
        }
    };

    if (window.isMinimized) return null;

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
        width: size.width,
        height: size.height,
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        willChange: (isDragging || isResizing) ? 'transform, width, height' : undefined,
    };

    const chromeStyle: React.CSSProperties | undefined = (() => {
        if (!window.isMaximized && !isDragging && !isResizing) return undefined;
        return {
            ...(window.isMaximized ? { borderRadius: 0, boxShadow: 'none' } : {}),
            ...((isDragging || isResizing) ? { backdropFilter: 'none', WebkitBackdropFilter: 'none' } : {}),
        };
    })();

    const resizeHandleClass = "absolute z-[60]";
    const handleSize = 8;

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
                className={`glass-panel flex h-full w-full flex-col overflow-hidden animate-pop-in ${(isDragging || isResizing) ? 'transition-none opacity-90' : 'transition-all duration-200'} ${window.isMaximized ? '' : 'shadow-2xl rounded-xl border border-white/10'}`}
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

            {/* Resize Handles - only show when not maximized */}
            {!window.isMaximized && (
                <>
                    {/* Edge handles */}
                    <div 
                        className={`${resizeHandleClass} top-0 left-[${handleSize}px] right-[${handleSize}px] cursor-n-resize`}
                        style={{ height: handleSize, left: handleSize, right: handleSize }}
                        onPointerDown={(e) => handleResizeStart(e, 'n')}
                        onPointerMove={handleResizeMove}
                        onPointerUp={handleResizeEnd}
                        onPointerCancel={handleResizeEnd}
                    />
                    <div 
                        className={`${resizeHandleClass} bottom-0 left-[${handleSize}px] right-[${handleSize}px] cursor-s-resize`}
                        style={{ height: handleSize, left: handleSize, right: handleSize }}
                        onPointerDown={(e) => handleResizeStart(e, 's')}
                        onPointerMove={handleResizeMove}
                        onPointerUp={handleResizeEnd}
                        onPointerCancel={handleResizeEnd}
                    />
                    <div 
                        className={`${resizeHandleClass} left-0 top-[${handleSize}px] bottom-[${handleSize}px] cursor-w-resize`}
                        style={{ width: handleSize, top: handleSize, bottom: handleSize }}
                        onPointerDown={(e) => handleResizeStart(e, 'w')}
                        onPointerMove={handleResizeMove}
                        onPointerUp={handleResizeEnd}
                        onPointerCancel={handleResizeEnd}
                    />
                    <div 
                        className={`${resizeHandleClass} right-0 top-[${handleSize}px] bottom-[${handleSize}px] cursor-e-resize`}
                        style={{ width: handleSize, top: handleSize, bottom: handleSize }}
                        onPointerDown={(e) => handleResizeStart(e, 'e')}
                        onPointerMove={handleResizeMove}
                        onPointerUp={handleResizeEnd}
                        onPointerCancel={handleResizeEnd}
                    />

                    {/* Corner handles */}
                    <div 
                        className={`${resizeHandleClass} top-0 left-0 cursor-nw-resize`}
                        style={{ width: handleSize, height: handleSize }}
                        onPointerDown={(e) => handleResizeStart(e, 'nw')}
                        onPointerMove={handleResizeMove}
                        onPointerUp={handleResizeEnd}
                        onPointerCancel={handleResizeEnd}
                    />
                    <div 
                        className={`${resizeHandleClass} top-0 right-0 cursor-ne-resize`}
                        style={{ width: handleSize, height: handleSize }}
                        onPointerDown={(e) => handleResizeStart(e, 'ne')}
                        onPointerMove={handleResizeMove}
                        onPointerUp={handleResizeEnd}
                        onPointerCancel={handleResizeEnd}
                    />
                    <div 
                        className={`${resizeHandleClass} bottom-0 left-0 cursor-sw-resize`}
                        style={{ width: handleSize, height: handleSize }}
                        onPointerDown={(e) => handleResizeStart(e, 'sw')}
                        onPointerMove={handleResizeMove}
                        onPointerUp={handleResizeEnd}
                        onPointerCancel={handleResizeEnd}
                    />
                    <div 
                        className={`${resizeHandleClass} bottom-0 right-0 cursor-se-resize`}
                        style={{ width: handleSize, height: handleSize }}
                        onPointerDown={(e) => handleResizeStart(e, 'se')}
                        onPointerMove={handleResizeMove}
                        onPointerUp={handleResizeEnd}
                        onPointerCancel={handleResizeEnd}
                    />
                </>
            )}
        </div>
    );
};
