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

        const isEditableElement = (element: globalThis.Element | null): boolean => {
            if (!element) return false;
            if (element instanceof HTMLInputElement) return true;
            if (element instanceof HTMLTextAreaElement) return true;
            if (element instanceof HTMLSelectElement) return true;
            return element.getAttribute('contenteditable') === 'true';
        };

        const handleResize = () => {
            const viewport = window.visualViewport;
            if (!viewport) return;

            const layoutHeight = Math.max(window.innerHeight, document.documentElement?.clientHeight ?? 0);
            const viewportBottom = viewport.height + viewport.offsetTop;
            const heightDiff = Math.max(0, layoutHeight - viewportBottom);
            const hasFocus = isEditableElement(document.activeElement);
            const threshold = hasFocus ? 50 : 150;
            const isVisible = heightDiff > threshold;

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
