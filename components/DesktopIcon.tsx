import React, { useState } from 'react';
import { DesktopIconProps } from '../types';
import { useOS } from '../context/OSContext';

interface DraggableDesktopIconProps extends DesktopIconProps {
    id: string;
    position: { x: number; y: number };
    onPositionChange?: (id: string, position: { x: number; y: number }) => void;
}

export const DesktopIcon: React.FC<DraggableDesktopIconProps> = ({
    id,
    label,
    icon,
    colorClass = 'text-blue-300',
    appId,
    onClick,
    position,
    onPositionChange,
}) => {
    const { openWindow } = useOS();
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const handleClick = () => {
        if (onClick) onClick();
        if (appId) openWindow(appId);
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0) return; // Only left click
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        });
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        const newPosition = {
            x: e.clientX - dragOffset.x,
            y: e.clientY - dragOffset.y,
        };
        onPositionChange?.(id, newPosition);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (isDragging) {
            setIsDragging(false);
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        }
    };

    return (
        <button
            onDoubleClick={handleClick}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={{
                position: 'absolute',
                left: `${position.x}px`,
                top: `${position.y}px`,
                cursor: isDragging ? 'grabbing' : 'default',
            }}
            className="group flex flex-col items-center gap-2 p-2 rounded hover:bg-white/10 transition-colors w-24 focus:outline-none focus:bg-white/10"
        >
            <div
                className={`w-12 h-12 bg-opacity-20 rounded-lg flex items-center justify-center ring-1 ring-white/10 group-hover:scale-105 transition-transform duration-300 ${colorClass.replace('text-', 'bg-').replace('300', '500')}/20 ${colorClass}`}
            >
                <span className="material-symbols-outlined text-3xl">{icon}</span>
            </div>
            <span className="text-xs font-medium text-center text-white/90 drop-shadow-md shadow-black">{label}</span>
        </button>
    );
};
