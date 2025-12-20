import React from 'react';

export type SnapZone = 'left' | 'right' | 'top' | 'none';

interface SnapZoneOverlayProps {
    /** Which snap zone is currently active */
    zone: SnapZone;
}

/**
 * Visual overlay that appears when dragging a window near screen edges
 * to indicate snap zones for window tiling (F212).
 *
 * Shows a semi-transparent blue overlay in the area where the window will snap to.
 */
export const SnapZoneOverlay: React.FC<SnapZoneOverlayProps> = ({ zone }) => {
    if (zone === 'none') return null;

    const getZoneStyles = (): React.CSSProperties => {
        switch (zone) {
            case 'left':
                return {
                    left: 0,
                    top: 0,
                    width: '50%',
                    height: '100%',
                };
            case 'right':
                return {
                    right: 0,
                    top: 0,
                    width: '50%',
                    height: '100%',
                };
            case 'top':
                return {
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                };
            default:
                return {};
        }
    };

    return (
        <div
            className="fixed z-[9999] pointer-events-none bg-blue-500/30 border-4 border-blue-400 rounded-lg animate-fade-in"
            style={getZoneStyles()}
            aria-hidden="true"
        />
    );
};
