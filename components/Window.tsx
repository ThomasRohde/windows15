import React, { useState, useEffect, useRef, Suspense, memo, cloneElement, isValidElement } from 'react';
import { useOS, useWindowSpace } from '../context/OSContext';
import { WindowState } from '../types';
import { AppLoadingSkeleton } from './AppLoadingSkeleton';
import { ErrorBoundary } from './ErrorBoundary';
import { WINDOW } from '../utils/constants';

interface WindowProps {
    window: WindowState;
    /** Maximum z-index among all windows (for 3D depth calculation) */
    maxZIndex?: number;
}

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null;

/**
 * Custom comparison function for Window memoization.
 * Only re-renders when window properties that affect rendering change.
 */
const areWindowPropsEqual = (prevProps: WindowProps, nextProps: WindowProps): boolean => {
    const prev = prevProps.window;
    const next = nextProps.window;

    return (
        prev.id === next.id &&
        prev.isMaximized === next.isMaximized &&
        prev.isMinimized === next.isMinimized &&
        prev.zIndex === next.zIndex &&
        prev.title === next.title &&
        prev.icon === next.icon &&
        prev.dynamicTitle === next.dynamicTitle &&
        prev.dynamicIcon === next.dynamicIcon &&
        prev.badge === next.badge &&
        prev.position.x === next.position.x &&
        prev.position.y === next.position.y &&
        prev.size.width === next.size.width &&
        prev.size.height === next.size.height &&
        prev.component === next.component &&
        prevProps.maxZIndex === nextProps.maxZIndex
    );
};

/**
 * Window component with dragging, resizing, and window controls.
 * Memoized with custom comparator to prevent unnecessary re-renders.
 * Supports 3D mode with depth transforms (F087) and tilt on drag (F093).
 */
export const Window: React.FC<WindowProps> = memo(function Window({ window, maxZIndex = window.zIndex }) {
    const { closeWindow, minimizeWindow, toggleMaximizeWindow, focusWindow, resizeWindow, updateWindowPosition } =
        useOS();
    const {
        is3DMode,
        getWindowTransform,
        getWindowShadow,
        settings: windowSpaceSettings,
        prefersReducedMotion,
    } = useWindowSpace();
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [resizeDir, setResizeDir] = useState<ResizeDirection>(null);
    const [position, setPosition] = useState(window.position);
    const [size, setSize] = useState(window.size);
    // Tilt state for 3D drag effect (F093)
    const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });

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
    // Refs for tilt velocity calculation (F093)
    const lastPointerRef = useRef({ x: 0, y: 0, time: 0 });
    const velocityRef = useRef({ vx: 0, vy: 0 });
    // Ref for isDragging to use in RAF callbacks without stale closure
    const isDraggingRef = useRef(false);
    // Ref for current tilt to use in RAF callbacks
    const tiltRef = useRef({ rotateX: 0, rotateY: 0 });

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

    // Build the full transform string including 3D effects
    const buildFullTransform = (pos: { x: number; y: number }, tiltState: { rotateX: number; rotateY: number }) => {
        const parts = [`translate3d(${pos.x}px, ${pos.y}px, 0)`];
        // Add 3D depth transform if in 3D mode
        if (is3DMode && !window.isMaximized) {
            const isFocused = window.zIndex === maxZIndex;
            const transform3D = getWindowTransform(window.zIndex, maxZIndex, isFocused);
            if (transform3D) parts.push(transform3D);
        }
        // Add tilt transform when dragging in 3D mode
        const canTilt = is3DMode && windowSpaceSettings.tiltOnDrag && !prefersReducedMotion && !window.isMaximized;
        if (canTilt && isDraggingRef.current && (tiltState.rotateX !== 0 || tiltState.rotateY !== 0)) {
            parts.push(`rotateX(${tiltState.rotateX}deg) rotateY(${tiltState.rotateY}deg)`);
        }
        return parts.join(' ');
    };

    const applyTransform = (
        nextPos: { x: number; y: number },
        nextSize: { width: number; height: number },
        tiltState?: { rotateX: number; rotateY: number }
    ) => {
        positionRef.current = nextPos;
        sizeRef.current = nextSize;
        const el = windowRef.current;
        if (el) {
            el.style.transform = buildFullTransform(nextPos, tiltState ?? { rotateX: 0, rotateY: 0 });
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
            applyTransform(nextPos, nextSize, tiltRef.current);
        });
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if (window.isMaximized) return;
        if (e.button !== 0) return;
        const target = e.target as HTMLElement;
        if (target.closest('button, a, input, textarea, select')) return;
        setIsDragging(true);
        isDraggingRef.current = true;
        const rect = windowRef.current?.getBoundingClientRect();
        if (rect) {
            pointerIdRef.current = e.pointerId;
            dragOffsetRef.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            };
            // Initialize velocity tracking for tilt (F093)
            lastPointerRef.current = { x: e.clientX, y: e.clientY, time: performance.now() };
            velocityRef.current = { vx: 0, vy: 0 };
        }
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch {}
        e.preventDefault();
    };

    // Calculate tilt should be enabled (F093)
    const shouldTilt = is3DMode && windowSpaceSettings.tiltOnDrag && !prefersReducedMotion && !window.isMaximized;

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        if (pointerIdRef.current !== e.pointerId) return;
        pendingPositionRef.current = {
            x: e.clientX - dragOffsetRef.current.x,
            y: e.clientY - dragOffsetRef.current.y,
        };

        // Calculate velocity for tilt effect (F093)
        if (shouldTilt) {
            const now = performance.now();
            const dt = now - lastPointerRef.current.time;
            if (dt > 0) {
                const vx = (e.clientX - lastPointerRef.current.x) / dt;
                const vy = (e.clientY - lastPointerRef.current.y) / dt;
                // Smooth velocity with exponential moving average
                velocityRef.current = {
                    vx: velocityRef.current.vx * 0.7 + vx * 0.3,
                    vy: velocityRef.current.vy * 0.7 + vy * 0.3,
                };
                // Map velocity to rotation (clamped to ±10 degrees)
                const maxRotation = 10;
                const sensitivity = 8; // Higher = less sensitive
                const rotateY = Math.max(-maxRotation, Math.min(maxRotation, velocityRef.current.vx * sensitivity));
                const rotateX = Math.max(-maxRotation, Math.min(maxRotation, -velocityRef.current.vy * sensitivity));
                const newTilt = { rotateX, rotateY };
                tiltRef.current = newTilt;
                setTilt(newTilt);
            }
            lastPointerRef.current = { x: e.clientX, y: e.clientY, time: now };
        }

        scheduleApply();
    };

    const endDrag = (e: React.PointerEvent) => {
        if (!isDragging) return;
        if (pointerIdRef.current !== null && pointerIdRef.current !== e.pointerId) return;

        pointerIdRef.current = null;
        setIsDragging(false);
        isDraggingRef.current = false;

        // Reset tilt with smooth animation (F093)
        if (shouldTilt) {
            tiltRef.current = { rotateX: 0, rotateY: 0 };
            setTilt({ rotateX: 0, rotateY: 0 });
            velocityRef.current = { vx: 0, vy: 0 };
        }

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

        updateWindowPosition(window.id, positionRef.current);

        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {}
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
            posY: positionRef.current.y,
        };

        try {
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
        } catch {}
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
            newWidth = Math.max(WINDOW.MIN_WIDTH, resizeStartRef.current.width + deltaX);
        }
        if (resizeDir.includes('w')) {
            const proposedWidth = resizeStartRef.current.width - deltaX;
            if (proposedWidth >= WINDOW.MIN_WIDTH) {
                newWidth = proposedWidth;
                newX = resizeStartRef.current.posX + deltaX;
            } else {
                newWidth = WINDOW.MIN_WIDTH;
                newX = resizeStartRef.current.posX + resizeStartRef.current.width - WINDOW.MIN_WIDTH;
            }
        }
        if (resizeDir.includes('s')) {
            newHeight = Math.max(WINDOW.MIN_HEIGHT, resizeStartRef.current.height + deltaY);
        }
        if (resizeDir.includes('n')) {
            const proposedHeight = resizeStartRef.current.height - deltaY;
            if (proposedHeight >= WINDOW.MIN_HEIGHT) {
                newHeight = proposedHeight;
                newY = resizeStartRef.current.posY + deltaY;
            } else {
                newHeight = WINDOW.MIN_HEIGHT;
                newY = resizeStartRef.current.posY + resizeStartRef.current.height - WINDOW.MIN_HEIGHT;
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
        } catch {}
    };

    if (window.isMinimized) return null;

    // Calculate if this window is focused (highest z-index)
    const isFocused = window.zIndex === maxZIndex;

    // Get 3D transforms and shadow (F087)
    const transform3D = is3DMode && !window.isMaximized ? getWindowTransform(window.zIndex, maxZIndex, isFocused) : '';
    const shadow3D = is3DMode && !window.isMaximized ? getWindowShadow(window.zIndex, maxZIndex) : '';

    // Build tilt transform string (F093)
    const tiltTransform =
        shouldTilt && isDragging && (tilt.rotateX !== 0 || tilt.rotateY !== 0)
            ? `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`
            : '';

    // Combine all transforms - use ref during drag to avoid state/RAF conflicts
    const buildTransform = () => {
        // During drag/resize, use the ref value which is updated by RAF
        // This prevents the position snapping back to state on re-renders
        const pos = isDragging || isResizing ? positionRef.current : position;
        const parts = [`translate3d(${pos.x}px, ${pos.y}px, 0)`];
        if (transform3D) parts.push(transform3D);
        if (tiltTransform) parts.push(tiltTransform);
        return parts.join(' ');
    };

    const outerStyle: React.CSSProperties = window.isMaximized
        ? {
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              height: `calc(100vh - ${WINDOW.MAXIMIZED_BOTTOM_GAP}px)`,
              transform: 'none',
          }
        : {
              top: 0,
              left: 0,
              // During drag/resize, use ref values to avoid state/RAF conflicts
              width: isResizing ? sizeRef.current.width : size.width,
              height: isResizing ? sizeRef.current.height : size.height,
              transform: buildTransform(),
              willChange: isDragging || isResizing ? 'transform, width, height' : undefined,
              // Smooth transition for tilt return animation (F093)
              transition: !isDragging && shouldTilt ? 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' : undefined,
              // Apply 3D shadow when in 3D mode
              ...(shadow3D ? ({ '--window-shadow': shadow3D } as React.CSSProperties) : {}),
          };

    const chromeStyle: React.CSSProperties | undefined = (() => {
        if (!window.isMaximized && !isDragging && !isResizing && !shadow3D) return undefined;
        return {
            ...(window.isMaximized ? { borderRadius: 0, boxShadow: 'none' } : {}),
            ...(isDragging || isResizing ? { backdropFilter: 'none', WebkitBackdropFilter: 'none' } : {}),
            ...(shadow3D ? { boxShadow: shadow3D } : {}),
        };
    })();

    const resizeHandleClass = 'absolute z-[60]';
    const handleSize = 8;

    const titleId = `window-title-${window.id}`;
    const renderContent = () => {
        if (!isValidElement(window.component)) return window.component;
        if (typeof window.component.type === 'string') return window.component;
        return cloneElement(window.component, { windowId: window.id } as Record<string, unknown>);
    };

    return (
        <div
            ref={windowRef}
            role="dialog"
            aria-labelledby={titleId}
            aria-modal="false"
            data-app-id={window.appId}
            data-window
            className="absolute"
            style={{
                ...outerStyle,
                zIndex: window.zIndex,
            }}
            onPointerDownCapture={() => focusWindow(window.id)}
        >
            <div
                className={`glass-panel flex h-full w-full flex-col overflow-hidden animate-pop-in ${isDragging || isResizing ? 'transition-none opacity-90' : 'transition-all duration-200'} ${window.isMaximized ? '' : 'shadow-2xl rounded-xl border border-white/10'}`}
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
                        <span
                            className="material-symbols-outlined text-white/70 text-[18px] flex-shrink-0"
                            aria-hidden="true"
                        >
                            {window.dynamicIcon ?? window.icon}
                        </span>
                        <span id={titleId} className="text-sm font-medium text-white/80 truncate">
                            {window.dynamicTitle ?? window.title}
                        </span>
                    </div>
                    <div
                        className="flex items-center gap-1 flex-shrink-0 ml-2"
                        role="group"
                        aria-label="Window controls"
                    >
                        <button
                            aria-label="Minimize window"
                            onPointerDown={e => e.stopPropagation()}
                            onClick={e => {
                                e.stopPropagation();
                                minimizeWindow(window.id);
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-white/70 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                                minimize
                            </span>
                        </button>
                        <button
                            aria-label={window.isMaximized ? 'Restore window' : 'Maximize window'}
                            onPointerDown={e => e.stopPropagation()}
                            onClick={e => {
                                e.stopPropagation();
                                toggleMaximizeWindow(window.id);
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-white/70 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                                {window.isMaximized ? 'close_fullscreen' : 'crop_square'}
                            </span>
                        </button>
                        <button
                            aria-label="Close window"
                            onPointerDown={e => e.stopPropagation()}
                            onClick={e => {
                                e.stopPropagation();
                                closeWindow(window.id);
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-500 text-white/70 hover:text-white transition-colors"
                        >
                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                                close
                            </span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto relative z-40 bg-black/20">
                    <ErrorBoundary title={window.title}>
                        <Suspense fallback={<AppLoadingSkeleton title={window.title} />}>{renderContent()}</Suspense>
                    </ErrorBoundary>
                </div>
            </div>

            {/* Resize Handles - only show when not maximized */}
            {!window.isMaximized && (
                <>
                    {/* Edge handles */}
                    <div
                        className={`${resizeHandleClass} top-0 left-[${handleSize}px] right-[${handleSize}px] cursor-n-resize`}
                        style={{ height: handleSize, left: handleSize, right: handleSize }}
                        onPointerDown={e => handleResizeStart(e, 'n')}
                        onPointerMove={handleResizeMove}
                        onPointerUp={handleResizeEnd}
                        onPointerCancel={handleResizeEnd}
                    />
                    <div
                        className={`${resizeHandleClass} bottom-0 left-[${handleSize}px] right-[${handleSize}px] cursor-s-resize`}
                        style={{ height: handleSize, left: handleSize, right: handleSize }}
                        onPointerDown={e => handleResizeStart(e, 's')}
                        onPointerMove={handleResizeMove}
                        onPointerUp={handleResizeEnd}
                        onPointerCancel={handleResizeEnd}
                    />
                    <div
                        className={`${resizeHandleClass} left-0 top-[${handleSize}px] bottom-[${handleSize}px] cursor-w-resize`}
                        style={{ width: handleSize, top: handleSize, bottom: handleSize }}
                        onPointerDown={e => handleResizeStart(e, 'w')}
                        onPointerMove={handleResizeMove}
                        onPointerUp={handleResizeEnd}
                        onPointerCancel={handleResizeEnd}
                    />
                    <div
                        className={`${resizeHandleClass} right-0 top-[${handleSize}px] bottom-[${handleSize}px] cursor-e-resize`}
                        style={{ width: handleSize, top: handleSize, bottom: handleSize }}
                        onPointerDown={e => handleResizeStart(e, 'e')}
                        onPointerMove={handleResizeMove}
                        onPointerUp={handleResizeEnd}
                        onPointerCancel={handleResizeEnd}
                    />

                    {/* Corner handles */}
                    <div
                        className={`${resizeHandleClass} top-0 left-0 cursor-nw-resize`}
                        style={{ width: handleSize, height: handleSize }}
                        onPointerDown={e => handleResizeStart(e, 'nw')}
                        onPointerMove={handleResizeMove}
                        onPointerUp={handleResizeEnd}
                        onPointerCancel={handleResizeEnd}
                    />
                    <div
                        className={`${resizeHandleClass} top-0 right-0 cursor-ne-resize`}
                        style={{ width: handleSize, height: handleSize }}
                        onPointerDown={e => handleResizeStart(e, 'ne')}
                        onPointerMove={handleResizeMove}
                        onPointerUp={handleResizeEnd}
                        onPointerCancel={handleResizeEnd}
                    />
                    <div
                        className={`${resizeHandleClass} bottom-0 left-0 cursor-sw-resize`}
                        style={{ width: handleSize, height: handleSize }}
                        onPointerDown={e => handleResizeStart(e, 'sw')}
                        onPointerMove={handleResizeMove}
                        onPointerUp={handleResizeEnd}
                        onPointerCancel={handleResizeEnd}
                    />
                    <div
                        className={`${resizeHandleClass} bottom-0 right-0 cursor-se-resize`}
                        style={{ width: handleSize, height: handleSize }}
                        onPointerDown={e => handleResizeStart(e, 'se')}
                        onPointerMove={handleResizeMove}
                        onPointerUp={handleResizeEnd}
                        onPointerCancel={handleResizeEnd}
                    />
                </>
            )}
        </div>
    );
}, areWindowPropsEqual);
