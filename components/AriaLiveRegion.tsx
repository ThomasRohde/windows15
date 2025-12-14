import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

interface AriaLiveContextType {
    announce: (message: string, priority?: 'polite' | 'assertive') => void;
}

const AriaLiveContext = createContext<AriaLiveContextType | null>(null);

export const useAriaLive = () => {
    const context = useContext(AriaLiveContext);
    if (!context) {
        // Return a no-op if not in provider (for testing)
        return { announce: () => {} };
    }
    return context;
};

interface AriaLiveProviderProps {
    children: React.ReactNode;
}

export const AriaLiveProvider: React.FC<AriaLiveProviderProps> = ({ children }) => {
    const [politeMessage, setPoliteMessage] = useState('');
    const [assertiveMessage, setAssertiveMessage] = useState('');
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
        // Clear after announcement to allow repeated messages
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        if (priority === 'assertive') {
            setAssertiveMessage(message);
        } else {
            setPoliteMessage(message);
        }

        timeoutRef.current = setTimeout(() => {
            setPoliteMessage('');
            setAssertiveMessage('');
        }, 1000);
    }, []);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return (
        <AriaLiveContext.Provider value={{ announce }}>
            {children}
            {/* Screen reader announcement regions */}
            <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
                {politeMessage}
            </div>
            <div role="alert" aria-live="assertive" aria-atomic="true" className="sr-only">
                {assertiveMessage}
            </div>
        </AriaLiveContext.Provider>
    );
};
