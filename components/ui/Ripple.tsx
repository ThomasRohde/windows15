import React, { useState, useRef } from 'react';

interface RippleAnimation {
    key: number;
    x: number;
    y: number;
}

interface RippleProps {
    /**
     * Color of the ripple effect (default: white with transparency)
     */
    color?: string;
    /**
     * Duration of the ripple animation in milliseconds (default: 600ms)
     */
    duration?: number;
    /**
     * Children elements that will have ripple effect
     */
    children: React.ReactNode;
    /**
     * Additional className for the container
     */
    className?: string;
}

/**
 * Ripple component that adds Material Design-inspired touch feedback
 * to interactive elements (F218).
 *
 * Usage:
 * ```tsx
 * <Ripple>
 *   <button>Click me</button>
 * </Ripple>
 * ```
 *
 * @module components/ui/Ripple
 */
export const Ripple: React.FC<RippleProps> = ({
    children,
    color = 'rgba(255, 255, 255, 0.3)',
    duration = 600,
    className = '',
}) => {
    const [ripples, setRipples] = useState<RippleAnimation[]>(() => []);
    const containerRef = useRef<HTMLDivElement>(null);
    const rippleCountRef = useRef(0);

    const addRipple = (event: React.MouseEvent | React.TouchEvent) => {
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();

        // Get touch/click position
        let x: number, y: number;
        if ('touches' in event) {
            const touch = event.touches[0];
            x = touch.clientX - rect.left;
            y = touch.clientY - rect.top;
        } else {
            x = event.clientX - rect.left;
            y = event.clientY - rect.top;
        }

        const newRipple: RippleAnimation = {
            key: rippleCountRef.current++,
            x,
            y,
        };

        setRipples(prev => [...prev, newRipple]);

        // Remove ripple after animation completes
        setTimeout(() => {
            setRipples(prev => prev.filter(r => r.key !== newRipple.key));
        }, duration);
    };

    return (
        <div
            ref={containerRef}
            className={`relative overflow-hidden ${className}`}
            onPointerDown={addRipple}
            style={{ WebkitTapHighlightColor: 'transparent' }}
        >
            {children}

            {/* Ripple animations */}
            {ripples.map(ripple => (
                <span
                    key={ripple.key}
                    className="absolute rounded-full pointer-events-none animate-ripple"
                    style={{
                        left: ripple.x,
                        top: ripple.y,
                        width: 0,
                        height: 0,
                        backgroundColor: color,
                        transform: 'translate(-50%, -50%)',
                        animation: `ripple-expand ${duration}ms ease-out`,
                    }}
                />
            ))}
        </div>
    );
};
