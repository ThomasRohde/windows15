import React, { useState, memo } from 'react';
import { DesktopIconProps } from '../types';
import { useOS } from '../context/OSContext';
import { useStartMenu } from '../context/StartMenuContext';
import { useContextMenu } from '../hooks';
import { ContextMenu } from './ContextMenu';

interface DraggableDesktopIconProps extends DesktopIconProps {
    id: string;
    position: { x: number; y: number };
    onPositionChange?: (id: string, position: { x: number; y: number }) => void;
}

interface DesktopIconContextData {
    iconId: string;
    appId?: string;
}

/**
 * Desktop icon component with drag support and context menu.
 * Memoized to prevent re-renders when other icons or windows change.
 */
export const DesktopIcon: React.FC<DraggableDesktopIconProps> = memo(function DesktopIcon({
    id,
    label,
    icon,
    colorClass = 'text-blue-300',
    appId,
    onClick,
    position,
    onPositionChange,
}) {
    const { openWindow } = useOS();
    const { isPinned, pinApp, unpinApp } = useStartMenu();
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const {
        menu,
        open: openContextMenu,
        close: closeContextMenu,
        menuProps,
        menuRef,
    } = useContextMenu<DesktopIconContextData>();

    const handleClick = () => {
        if (onClick) onClick();
        if (appId) openWindow(appId);
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        openContextMenu(e, { iconId: id, appId });
    };

    const handleOpen = () => {
        handleClick();
        closeContextMenu();
    };

    const handlePinToggle = async () => {
        if (!menu?.data.appId) return;
        if (isPinned(menu.data.appId)) {
            await unpinApp(menu.data.appId);
        } else {
            await pinApp(menu.data.appId);
        }
        closeContextMenu();
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
        <>
            <button
                data-desktop-icon={appId || id}
                aria-label={`${label} - double-click to open`}
                aria-grabbed={isDragging}
                onDoubleClick={handleClick}
                onContextMenu={handleContextMenu}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                style={{
                    position: 'absolute',
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    cursor: isDragging ? 'grabbing' : 'default',
                }}
                className="group flex flex-col items-center gap-2 p-2 rounded hover:bg-white/10 transition-colors w-24 focus:outline-none focus:bg-white/10 focus:ring-2 focus:ring-blue-400/50"
            >
                <div
                    className={`w-12 h-12 bg-opacity-20 rounded-lg flex items-center justify-center ring-1 ring-white/10 group-hover:scale-105 transition-transform duration-300 ${colorClass.replace('text-', 'bg-').replace('300', '500')}/20 ${colorClass}`}
                    aria-hidden="true"
                >
                    <span className="material-symbols-outlined text-3xl">{icon}</span>
                </div>
                <span className="text-xs font-medium text-center text-white/90 drop-shadow-md shadow-black">
                    {label}
                </span>
            </button>

            {menu && (
                <ContextMenu ref={menuRef} position={menu.position} onClose={closeContextMenu} {...menuProps}>
                    <ContextMenu.Item icon="open_in_new" onClick={handleOpen}>
                        Open
                    </ContextMenu.Item>
                    {menu.data.appId && (
                        <>
                            <ContextMenu.Separator />
                            <ContextMenu.Item icon="push_pin" onClick={handlePinToggle}>
                                {isPinned(menu.data.appId) ? 'Unpin from Start' : 'Pin to Start'}
                            </ContextMenu.Item>
                        </>
                    )}
                </ContextMenu>
            )}
        </>
    );
});
