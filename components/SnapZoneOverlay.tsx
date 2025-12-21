import React from 'react';
import { getWindowMaxRect } from '../utils';

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

    const { x, y, width, height } = getWindowMaxRect();
    const halfWidth = width / 2;

    const getZoneStyles = (): React.CSSProperties => {
        switch (zone) {
            case 'left':
                return {
                    left: x,
                    top: y,
                    width: halfWidth,
                    height,
                };
            case 'right':
                return {
                    left: x + halfWidth,
                    top: y,
                    width: halfWidth,
                    height,
                };
            case 'top':
                return {
                    left: x,
                    top: y,
                    width,
                    height,
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
