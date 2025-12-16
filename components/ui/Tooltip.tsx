/**
 * Tooltip - Windows 15 styled tooltip component
 *
 * Displays contextual information on hover with glassmorphism styling.
 * Supports configurable positioning and hover delay.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Tooltip content="Full file name here">
 *   <span className="truncate">Long file na...</span>
 * </Tooltip>
 *
 * // With custom positioning
 * <Tooltip content="Settings" position="right" delay={300}>
 *   <button>...</button>
 * </Tooltip>
 * ```
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
    /** Tooltip content (text or React node) */
    content: React.ReactNode;
    /** Preferred position of the tooltip */
    position?: TooltipPosition;
    /** Delay in ms before showing tooltip */
    delay?: number;
    /** Maximum width of tooltip */
    maxWidth?: number;
    /** Disable the tooltip */
    disabled?: boolean;
    /** Child element that triggers the tooltip */
    children: React.ReactNode;
    /** Additional CSS classes for the tooltip */
    className?: string;
}

interface TooltipCoords {
    x: number;
    y: number;
    actualPosition: TooltipPosition;
}

const TOOLTIP_OFFSET = 8;
const VIEWPORT_PADDING = 8;

/**
 * Calculate tooltip position, adjusting for viewport boundaries
 */
function calculatePosition(
    // eslint-disable-next-line no-undef
    triggerRect: DOMRect,
    // eslint-disable-next-line no-undef
    tooltipRect: DOMRect,
    preferredPosition: TooltipPosition
): TooltipCoords {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate coordinates for each position
    const positions: Record<TooltipPosition, { x: number; y: number }> = {
        top: {
            x: triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2,
            y: triggerRect.top - tooltipRect.height - TOOLTIP_OFFSET,
        },
        bottom: {
            x: triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2,
            y: triggerRect.bottom + TOOLTIP_OFFSET,
        },
        left: {
            x: triggerRect.left - tooltipRect.width - TOOLTIP_OFFSET,
            y: triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2,
        },
        right: {
            x: triggerRect.right + TOOLTIP_OFFSET,
            y: triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2,
        },
    };

    // Check if position fits within viewport
    const fitsInViewport = (pos: TooltipPosition): boolean => {
        const { x, y } = positions[pos];
        return (
            x >= VIEWPORT_PADDING &&
            x + tooltipRect.width <= viewportWidth - VIEWPORT_PADDING &&
            y >= VIEWPORT_PADDING &&
            y + tooltipRect.height <= viewportHeight - VIEWPORT_PADDING
        );
    };

    // Try preferred position first, then fallback order
    const fallbackOrder: TooltipPosition[] = ['top', 'bottom', 'right', 'left'];
    let actualPosition = preferredPosition;

    if (!fitsInViewport(preferredPosition)) {
        for (const pos of fallbackOrder) {
            if (fitsInViewport(pos)) {
                actualPosition = pos;
                break;
            }
        }
    }

    // Clamp to viewport bounds
    let { x, y } = positions[actualPosition];
    x = Math.max(VIEWPORT_PADDING, Math.min(x, viewportWidth - tooltipRect.width - VIEWPORT_PADDING));
    y = Math.max(VIEWPORT_PADDING, Math.min(y, viewportHeight - tooltipRect.height - VIEWPORT_PADDING));

    return { x, y, actualPosition };
}

export const Tooltip: React.FC<TooltipProps> = ({
    content,
    position = 'top',
    delay = 500,
    maxWidth = 300,
    disabled = false,
    children,
    className = '',
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState<TooltipCoords | null>(null);
    // eslint-disable-next-line no-undef
    const wrapperRef = useRef<HTMLSpanElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<number | null>(null);

    const showTooltip = useCallback(() => {
        if (disabled) return;

        timeoutRef.current = window.setTimeout(() => {
            setIsVisible(true);
        }, delay);
    }, [delay, disabled]);

    const hideTooltip = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setIsVisible(false);
    }, []);

    // Update position when visible
    useEffect(() => {
        if (!isVisible || !wrapperRef.current || !tooltipRef.current) return;

        const updatePosition = () => {
            if (!wrapperRef.current || !tooltipRef.current) return;
            const triggerRect = wrapperRef.current.getBoundingClientRect();
            const tooltipRect = tooltipRef.current.getBoundingClientRect();
            setCoords(calculatePosition(triggerRect, tooltipRect, position));
        };

        // Initial position
        updatePosition();

        // Update on scroll/resize
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);

        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isVisible, position]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    // Arrow direction based on position
    const arrowClasses: Record<TooltipPosition, string> = {
        top: 'bottom-[-4px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-white/20',
        bottom: 'top-[-4px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-white/20',
        left: 'right-[-4px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-white/20',
        right: 'left-[-4px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-white/20',
    };

    const tooltip = isVisible
        ? createPortal(
              <div
                  ref={tooltipRef}
                  role="tooltip"
                  className={`
                      fixed z-[9999] px-3 py-2 
                      bg-black/85 backdrop-blur-xl 
                      border border-white/20 
                      rounded-lg shadow-xl shadow-black/40
                      text-sm text-white/90
                      pointer-events-none
                      whitespace-nowrap
                      ${className}
                  `}
                  style={{
                      left: coords?.x ?? -9999,
                      top: coords?.y ?? -9999,
                      maxWidth,
                      visibility: coords ? 'visible' : 'hidden',
                  }}
              >
                  {content}
                  {/* Arrow indicator */}
                  <div className={`absolute w-0 h-0 border-4 ${arrowClasses[coords?.actualPosition ?? position]}`} />
              </div>,
              document.body
          )
        : null;

    return (
        <>
            <span
                ref={wrapperRef}
                onMouseEnter={showTooltip}
                onMouseLeave={hideTooltip}
                onFocus={showTooltip}
                onBlur={hideTooltip}
                className="inline-flex"
            >
                {children}
            </span>
            {tooltip}
        </>
    );
};
