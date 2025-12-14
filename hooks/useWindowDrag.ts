/**
 * useWindowDrag - Handle window dragging with pointer capture
 *
 * Provides smooth, performant window dragging using requestAnimationFrame
 * and pointer capture for reliable tracking even when moving fast.
 *
 * @param options - Configuration options for the drag behavior
 * @returns Drag state and event handlers
 *
 * @example
 * ```tsx
 * const {
 *   isDragging,
 *   position,
 *   handlers: { onPointerDown, onPointerMove, onPointerUp }
 * } = useWindowDrag({
 *   initialPosition: { x: 100, y: 100 },
 *   disabled: isMaximized,
 *   onDragEnd: (pos) => updateWindowPosition(windowId, pos),
 * });
 * ```
 */
import { useState, useRef, useCallback, useEffect } from "react";

export interface Position {
    x: number;
    y: number;
}

export interface UseWindowDragOptions {
    /** Initial position of the window */
    initialPosition: Position;
    /** Whether dragging is disabled (e.g., when maximized) */
    disabled?: boolean;
    /** Callback when drag ends with final position */
    onDragEnd?: (position: Position) => void;
    /** Ref to the window element for direct DOM manipulation */
    windowRef?: React.RefObject<HTMLElement | null>;
}

export interface UseWindowDragResult {
    /** Whether the window is currently being dragged */
    isDragging: boolean;
    /** Current position (reactive state) */
    position: Position;
    /** Set position directly */
    setPosition: (position: Position) => void;
    /** Event handlers to attach to the draggable element */
    handlers: {
        onPointerDown: (e: React.PointerEvent) => void;
        onPointerMove: (e: React.PointerEvent) => void;
        onPointerUp: (e: React.PointerEvent) => void;
        onPointerCancel: (e: React.PointerEvent) => void;
    };
}

export function useWindowDrag({
    initialPosition,
    disabled = false,
    onDragEnd,
    windowRef,
}: UseWindowDragOptions): UseWindowDragResult {
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState<Position>(initialPosition);

    const pointerIdRef = useRef<number | null>(null);
    const dragOffsetRef = useRef<Position>({ x: 0, y: 0 });
    const positionRef = useRef<Position>(initialPosition);
    const pendingPositionRef = useRef<Position | null>(null);
    const rafIdRef = useRef<number | null>(null);

    // Sync position ref with state when position changes externally
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
        (nextPos: Position) => {
            positionRef.current = nextPos;
            if (windowRef?.current) {
                windowRef.current.style.transform = `translate3d(${nextPos.x}px, ${nextPos.y}px, 0)`;
            }
        },
        [windowRef]
    );

    const scheduleApply = useCallback(() => {
        if (rafIdRef.current !== null) return;
        rafIdRef.current = globalThis.requestAnimationFrame(() => {
            rafIdRef.current = null;
            const nextPos = pendingPositionRef.current ?? positionRef.current;
            pendingPositionRef.current = null;
            applyTransform(nextPos);
        });
    }, [applyTransform]);

    const onPointerDown = useCallback(
        (e: React.PointerEvent) => {
            if (disabled) return;
            if (e.button !== 0) return;

            // Don't drag if clicking interactive elements
            const target = e.target as HTMLElement;
            if (target.closest("button, a, input, textarea, select")) return;

            setIsDragging(true);
            pointerIdRef.current = e.pointerId;

            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            dragOffsetRef.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            };

            try {
                e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
                // Pointer capture may fail in some edge cases
            }
            e.preventDefault();
        },
        [disabled]
    );

    const onPointerMove = useCallback(
        (e: React.PointerEvent) => {
            if (!isDragging) return;
            if (pointerIdRef.current !== e.pointerId) return;

            pendingPositionRef.current = {
                x: e.clientX - dragOffsetRef.current.x,
                y: e.clientY - dragOffsetRef.current.y,
            };
            scheduleApply();
        },
        [isDragging, scheduleApply]
    );

    const onPointerUp = useCallback(
        (e: React.PointerEvent) => {
            if (!isDragging) return;
            if (
                pointerIdRef.current !== null &&
                pointerIdRef.current !== e.pointerId
            )
                return;

            pointerIdRef.current = null;
            setIsDragging(false);

            // Cancel any pending RAF
            if (rafIdRef.current !== null) {
                globalThis.cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }

            // Apply final position
            if (pendingPositionRef.current) {
                applyTransform(pendingPositionRef.current);
                pendingPositionRef.current = null;
            }

            const finalPosition = positionRef.current;
            setPosition(finalPosition);
            onDragEnd?.(finalPosition);

            try {
                e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {
                // Release may fail if capture was never acquired
            }
        },
        [isDragging, applyTransform, onDragEnd]
    );

    return {
        isDragging,
        position,
        setPosition,
        handlers: {
            onPointerDown,
            onPointerMove,
            onPointerUp,
            onPointerCancel: onPointerUp,
        },
    };
}
