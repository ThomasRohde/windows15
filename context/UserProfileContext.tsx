/**
 * UserProfileContext - Handles user profile state and login screen
 */
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useDb } from './DbContext';
import { useDexieLiveQuery } from '../utils/storage/react';

export interface UserProfile {
    name: string;
    initials?: string;
}

interface UserProfileContextType {
    profile: UserProfile | null;
    isLoading: boolean;
    isFirstLaunch: boolean;
    setProfile: (profile: UserProfile) => Promise<void>;
    getInitials: (name: string) => string;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

/**
 * Hook to access user profile state
 */
export const useUserProfile = () => {
    const context = useContext(UserProfileContext);
    if (!context) {
        throw new Error('useUserProfile must be used within a UserProfileProvider');
    }
    return context;
};

interface UserProfileProviderProps {
    children: ReactNode;
}

/**
 * Generate initials from a name
 */
const generateInitials = (name: string): string => {
    const parts = name
        .trim()
        .split(/\s+/)
        .filter(p => p.length > 0);
    if (parts.length === 0) return 'U';
    const first = parts[0] ?? '';
    const last = parts[parts.length - 1] ?? '';
    if (parts.length === 1) return first.charAt(0).toUpperCase();
    return (first.charAt(0) + last.charAt(0)).toUpperCase();
};

/**
 * Provider for user profile state management
 */
export const UserProfileProvider: React.FC<UserProfileProviderProps> = ({ children }) => {
    const db = useDb();
    const [isFirstLaunch, setIsFirstLaunch] = useState(true);

    // Load profile from DB reactively
    const { value: profileRecord, isLoading } = useDexieLiveQuery(() => db.kv.get('userProfile'), [db]);

    const profile: UserProfile | null = profileRecord?.valueJson ? JSON.parse(profileRecord.valueJson) : null;

    // Determine if this is first launch (no profile exists)
    useEffect(() => {
        if (!isLoading) {
            setIsFirstLaunch(!profile);
        }
    }, [isLoading, profile]);

    const setProfile = useCallback(
        async (newProfile: UserProfile) => {
            const initials = newProfile.initials || generateInitials(newProfile.name);
            const profileWithInitials = { ...newProfile, initials };

            await db.kv.put({
                key: 'userProfile',
                valueJson: JSON.stringify(profileWithInitials),
                updatedAt: Date.now(),
            });
            setIsFirstLaunch(false);
        },
        [db]
    );

    const getInitials = useCallback((name: string) => generateInitials(name), []);

    return (
        <UserProfileContext.Provider
            value={{
                profile,
                isLoading,
                isFirstLaunch,
                setProfile,
                getInitials,
            }}
        >
            {children}
        </UserProfileContext.Provider>
    );
};
