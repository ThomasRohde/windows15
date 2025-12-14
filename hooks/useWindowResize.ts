/**
 * useWindowResize - Handle window resizing with pointer capture
 *
 * Provides smooth, performant window resizing using requestAnimationFrame
 * and pointer capture. Supports all 8 resize directions (edges and corners).
 *
 * @param options - Configuration options for the resize behavior
 * @returns Resize state and event handlers
 *
 * @example
 * ```tsx
 * const {
 *   isResizing,
 *   size,
 *   position,
 *   handleResizeStart,
 *   handleResizeMove,
 *   handleResizeEnd,
 * } = useWindowResize({
 *   initialSize: { width: 800, height: 600 },
 *   initialPosition: { x: 100, y: 100 },
 *   minWidth: 200,
 *   minHeight: 150,
 *   disabled: isMaximized,
 *   onResizeEnd: (size, pos) => resizeWindow(windowId, size, pos),
 * });
 * ```
 */
import { useState, useRef, useCallback, useEffect } from "react";

export type ResizeDirection =
    | "n"
    | "s"
    | "e"
    | "w"
    | "ne"
    | "nw"
    | "se"
    | "sw"
    | null;

export interface Size {
    width: number;
    height: number;
}

export interface Position {
    x: number;
    y: number;
}

export interface UseWindowResizeOptions {
    /** Initial size of the window */
    initialSize: Size;
    /** Initial position of the window */
    initialPosition: Position;
    /** Minimum window width */
    minWidth?: number;
    /** Minimum window height */
    minHeight?: number;
    /** Whether resizing is disabled (e.g., when maximized) */
    disabled?: boolean;
    /** Callback when resize ends with final size and position */
    onResizeEnd?: (size: Size, position: Position) => void;
    /** Ref to the window element for direct DOM manipulation */
    windowRef?: React.RefObject<HTMLElement | null>;
}

export interface UseWindowResizeResult {
    /** Whether the window is currently being resized */
    isResizing: boolean;
    /** Current resize direction */
    resizeDir: ResizeDirection;
    /** Current size (reactive state) */
    size: Size;
    /** Current position (reactive state) */
    position: Position;
    /** Set size directly */
    setSize: (size: Size) => void;
    /** Set position directly */
    setPosition: (position: Position) => void;
    /** Start resize handler - attach to resize handle's onPointerDown */
    handleResizeStart: (
        e: React.PointerEvent,
        direction: ResizeDirection
    ) => void;
    /** Move handler - attach to resize handle's onPointerMove */
    handleResizeMove: (e: React.PointerEvent) => void;
    /** End handler - attach to resize handle's onPointerUp and onPointerCancel */
    handleResizeEnd: (e: React.PointerEvent) => void;
}

const DEFAULT_MIN_WIDTH = 200;
const DEFAULT_MIN_HEIGHT = 150;

export function useWindowResize({
    initialSize,
    initialPosition,
    minWidth = DEFAULT_MIN_WIDTH,
    minHeight = DEFAULT_MIN_HEIGHT,
    disabled = false,
    onResizeEnd,
    windowRef,
}: UseWindowResizeOptions): UseWindowResizeResult {
    const [isResizing, setIsResizing] = useState(false);
    const [resizeDir, setResizeDir] = useState<ResizeDirection>(null);
    const [size, setSize] = useState<Size>(initialSize);
    const [position, setPosition] = useState<Position>(initialPosition);

    const pointerIdRef = useRef<number | null>(null);
    const sizeRef = useRef<Size>(initialSize);
    const positionRef = useRef<Position>(initialPosition);
    const pendingSizeRef = useRef<Size | null>(null);
    const pendingPositionRef = useRef<Position | null>(null);
    const rafIdRef = useRef<number | null>(null);
    const resizeStartRef = useRef({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        posX: 0,
        posY: 0,
    });

    // Sync refs with state when values change externally
    useEffect(() => {
        sizeRef.current = size;
    }, [size]);

    useEffect(() => {
        positionRef.current = position;
    }, [position]);

    // Cleanup RAF on unmount
    useEffect(() => {
        return () => {
            if (rafIdRef.current !== null) {
                globalThis.cancelAnimationFrame(rafIdRef.current);
            }
        };
    }, []);

    const applyTransform = useCallback(
        (nextPos: Position, nextSize: Size) => {
            positionRef.current = nextPos;
            sizeRef.current = nextSize;
            if (windowRef?.current) {
                windowRef.current.style.transform = `translate3d(${nextPos.x}px, ${nextPos.y}px, 0)`;
                windowRef.current.style.width = `${nextSize.width}px`;
                windowRef.current.style.height = `${nextSize.height}px`;
            }
        },
        [windowRef]
    );

    const scheduleApply = useCallback(() => {
        if (rafIdRef.current !== null) return;
        rafIdRef.current = globalThis.requestAnimationFrame(() => {
            rafIdRef.current = null;
            const nextPos = pendingPositionRef.current ?? positionRef.current;
            const nextSize = pendingSizeRef.current ?? sizeRef.current;
            pendingPositionRef.current = null;
            pendingSizeRef.current = null;
            applyTransform(nextPos, nextSize);
        });
    }, [applyTransform]);

    const handleResizeStart = useCallback(
        (e: React.PointerEvent, direction: ResizeDirection) => {
            if (disabled) return;
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
            } catch {
                // Pointer capture may fail
            }
        },
        [disabled]
    );

    const handleResizeMove = useCallback(
        (e: React.PointerEvent) => {
            if (!isResizing || !resizeDir) return;
            if (pointerIdRef.current !== e.pointerId) return;

            const deltaX = e.clientX - resizeStartRef.current.x;
            const deltaY = e.clientY - resizeStartRef.current.y;

            let newWidth = resizeStartRef.current.width;
            let newHeight = resizeStartRef.current.height;
            let newX = resizeStartRef.current.posX;
            let newY = resizeStartRef.current.posY;

            // East edge
            if (resizeDir.includes("e")) {
                newWidth = Math.max(
                    minWidth,
                    resizeStartRef.current.width + deltaX
                );
            }
            // West edge
            if (resizeDir.includes("w")) {
                const proposedWidth = resizeStartRef.current.width - deltaX;
                if (proposedWidth >= minWidth) {
                    newWidth = proposedWidth;
                    newX = resizeStartRef.current.posX + deltaX;
                } else {
                    newWidth = minWidth;
                    newX =
                        resizeStartRef.current.posX +
                        resizeStartRef.current.width -
                        minWidth;
                }
            }
            // South edge
            if (resizeDir.includes("s")) {
                newHeight = Math.max(
                    minHeight,
                    resizeStartRef.current.height + deltaY
                );
            }
            // North edge
            if (resizeDir.includes("n")) {
                const proposedHeight = resizeStartRef.current.height - deltaY;
                if (proposedHeight >= minHeight) {
                    newHeight = proposedHeight;
                    newY = resizeStartRef.current.posY + deltaY;
                } else {
                    newHeight = minHeight;
                    newY =
                        resizeStartRef.current.posY +
                        resizeStartRef.current.height -
                        minHeight;
                }
            }

            pendingPositionRef.current = { x: newX, y: newY };
            pendingSizeRef.current = { width: newWidth, height: newHeight };
            scheduleApply();
        },
        [isResizing, resizeDir, minWidth, minHeight, scheduleApply]
    );

    const handleResizeEnd = useCallback(
        (e: React.PointerEvent) => {
            if (!isResizing) return;
            if (
                pointerIdRef.current !== null &&
                pointerIdRef.current !== e.pointerId
            )
                return;

            pointerIdRef.current = null;
            setIsResizing(false);
            setResizeDir(null);

            // Cancel any pending RAF
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

            onResizeEnd?.(finalSize, finalPos);

            try {
                (e.target as HTMLElement).releasePointerCapture(e.pointerId);
            } catch {
                // Release may fail
            }
        },
        [isResizing, applyTransform, onResizeEnd]
    );

    return {
        isResizing,
        resizeDir,
        size,
        position,
        setSize,
        setPosition,
        handleResizeStart,
        handleResizeMove,
        handleResizeEnd,
    };
}
