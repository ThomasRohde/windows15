/**
 * Overview Mode (F095, F106)
 *
 * Exposé-style overview displaying all windows in a navigable grid.
 * Features:
 * - Responsive grid layout
 * - Static window cards with app icon and title (F106)
 * - Keyboard navigation (arrow keys, Enter, Esc)
 * - Click to focus window
 * - Subtle 3D depth in 3D mode
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useOS, useWindowSpace } from '../context';
import { WindowState } from '../types';
import { APP_REGISTRY } from '../apps';

interface OverviewModeProps {
    /** Whether overview is visible */
    isOpen: boolean;
    /** Callback to close overview */
    onClose: () => void;
    /** Callback when a window is selected */
    onSelectWindow: (windowId: string) => void;
}

/**
 * Get app info from registry by app ID
 */
const getAppInfo = (appId: string) => {
    const app = APP_REGISTRY.find(a => a.id === appId);
    return app ? { icon: app.icon, name: app.name } : { icon: 'apps', name: 'Application' };
};

/**
 * Window card component for overview grid (F106)
 */
const WindowCard: React.FC<{
    window: WindowState;
    isSelected: boolean;
    is3DMode: boolean;
    index: number;
    onClick: () => void;
    onMouseEnter: () => void;
}> = ({ window, isSelected, is3DMode, index, onClick, onMouseEnter }) => {
    const appInfo = getAppInfo(window.appId);

    return (
        <button
            type="button"
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            className={`
                relative flex flex-col items-center justify-center gap-3 p-6
                rounded-2xl glass-panel border transition-all duration-200
                hover:scale-105 hover:shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                ${isSelected ? 'border-primary ring-2 ring-primary scale-105 shadow-2xl' : 'border-white/10'}
            `}
            style={{
                // Apply subtle 3D depth effect when in 3D mode
                transform: is3DMode ? `translateZ(${-index * 10}px)` : undefined,
                aspectRatio: '16 / 10',
                minWidth: '200px',
                maxWidth: '300px',
            }}
        >
            {/* App Icon */}
            <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-white/10 shadow-lg">
                <span className="material-symbols-outlined text-4xl text-white">{appInfo.icon}</span>
            </div>

            {/* Window Title */}
            <div className="text-center w-full px-2">
                <h3 className="text-white font-medium text-sm truncate">{window.title}</h3>
                <p className="text-white/50 text-xs truncate">{appInfo.name}</p>
            </div>

            {/* Selection indicator */}
            {isSelected && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary shadow-lg" />
            )}
        </button>
    );
};

/**
 * Overview mode overlay component
 */
export const OverviewMode: React.FC<OverviewModeProps> = ({ isOpen, onClose, onSelectWindow }) => {
    const { windows } = useOS();
    const { is3DMode } = useWindowSpace();
    const [selectedIndex, setSelectedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Filter to non-minimized windows only
    const visibleWindows = windows.filter(w => !w.isMinimized);

    // Reset selection when opening
    useEffect(() => {
        if (isOpen) {
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (!isOpen || visibleWindows.length === 0) return;

            switch (e.key) {
                case 'Escape':
                    e.preventDefault();
                    onClose();
                    break;
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    if (visibleWindows[selectedIndex]) {
                        onSelectWindow(visibleWindows[selectedIndex].id);
                        onClose();
                    }
                    break;
                case 'ArrowRight':
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex(prev => (prev + 1) % visibleWindows.length);
                    break;
                case 'ArrowLeft':
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex(prev => (prev - 1 + visibleWindows.length) % visibleWindows.length);
                    break;
                case 'Tab':
                    e.preventDefault();
                    if (e.shiftKey) {
                        setSelectedIndex(prev => (prev - 1 + visibleWindows.length) % visibleWindows.length);
                    } else {
                        setSelectedIndex(prev => (prev + 1) % visibleWindows.length);
                    }
                    break;
            }
        },
        [isOpen, visibleWindows, selectedIndex, onClose, onSelectWindow]
    );

    useEffect(() => {
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, handleKeyDown]);

    // Handle click outside to close
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleWindowSelect = (windowId: string) => {
        onSelectWindow(windowId);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 z-[55] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={handleBackdropClick}
            style={{
                // Apply perspective for 3D mode
                perspective: is3DMode ? '1200px' : undefined,
            }}
        >
            {/* Header */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center">
                <h2 className="text-2xl font-light text-white mb-2">Overview</h2>
                <p className="text-sm text-white/60">
                    {visibleWindows.length === 0
                        ? 'No windows open'
                        : `${visibleWindows.length} window${visibleWindows.length !== 1 ? 's' : ''}`}
                </p>
            </div>

            {/* Window Grid */}
            {visibleWindows.length > 0 ? (
                <div
                    className="grid gap-6 p-8 max-w-5xl"
                    style={{
                        gridTemplateColumns: `repeat(auto-fit, minmax(200px, 1fr))`,
                        transformStyle: is3DMode ? 'preserve-3d' : undefined,
                    }}
                >
                    {visibleWindows.map((win, index) => (
                        <WindowCard
                            key={win.id}
                            window={win}
                            isSelected={index === selectedIndex}
                            is3DMode={is3DMode}
                            index={index}
                            onClick={() => handleWindowSelect(win.id)}
                            onMouseEnter={() => setSelectedIndex(index)}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center p-8">
                    <span className="material-symbols-outlined text-6xl text-white/20 mb-4">select_window</span>
                    <p className="text-white/40">Open some apps to use Overview</p>
                </div>
            )}

            {/* Footer hint */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 text-xs text-white/40">
                <span>
                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded">↑↓←→</kbd> Navigate
                </span>
                <span>
                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded">Enter</kbd> Select
                </span>
                <span>
                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded">Esc</kbd> Close
                </span>
            </div>
        </div>
    );
};

export default OverviewMode;
