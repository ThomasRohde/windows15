import { useEffect, useState } from 'react';

/**
 * Hook to detect virtual keyboard appearance and calculate offset needed
 * Uses Visual Viewport API to detect when keyboard appears on touch devices
 *
 * @returns object with isKeyboardVisible and keyboardHeight
 */
export function useVirtualKeyboard() {
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
        // Check if Visual Viewport API is supported
        if (!window.visualViewport) {
            return;
        }

        const handleResize = () => {
            const viewport = window.visualViewport;
            if (!viewport) return;

            // Calculate the difference between window height and viewport height
            // When keyboard appears, visualViewport.height < window.innerHeight
            const heightDiff = window.innerHeight - viewport.height;

            // Threshold to detect keyboard (> 150px difference suggests keyboard)
            const isVisible = heightDiff > 150;

            setIsKeyboardVisible(isVisible);
            setKeyboardHeight(isVisible ? heightDiff : 0);
        };

        const viewport = window.visualViewport;
        viewport.addEventListener('resize', handleResize);
        viewport.addEventListener('scroll', handleResize);

        // Initial check
        handleResize();

        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleResize);
                window.visualViewport.removeEventListener('scroll', handleResize);
            }
        };
    }, []);

    return { isKeyboardVisible, keyboardHeight };
}
