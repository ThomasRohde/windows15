/**
 * StartMenuContext - Handles start menu state
 */
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface StartMenuContextType {
    isStartMenuOpen: boolean;
    toggleStartMenu: () => void;
    closeStartMenu: () => void;
    openStartMenu: () => void;
}

const StartMenuContext = createContext<StartMenuContextType | undefined>(undefined);

/**
 * Hook to access start menu state
 */
export const useStartMenu = () => {
    const context = useContext(StartMenuContext);
    if (!context) {
        throw new Error('useStartMenu must be used within a StartMenuProvider');
    }
    return context;
};

interface StartMenuProviderProps {
    children: ReactNode;
}

/**
 * Provider for start menu state management
 */
export const StartMenuProvider: React.FC<StartMenuProviderProps> = ({ children }) => {
    const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);

    const toggleStartMenu = useCallback(() => setIsStartMenuOpen(prev => !prev), []);
    const closeStartMenu = useCallback(() => setIsStartMenuOpen(false), []);
    const openStartMenu = useCallback(() => setIsStartMenuOpen(true), []);

    return (
        <StartMenuContext.Provider value={{ isStartMenuOpen, toggleStartMenu, closeStartMenu, openStartMenu }}>
            {children}
        </StartMenuContext.Provider>
    );
};
