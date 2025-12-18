/**
 * LoginScreen - Windows-style welcome/login screen shown on first launch
 */
import React, { useState, useCallback, useEffect } from 'react';
import { useUserProfile } from '../context/UserProfileContext';

export const LoginScreen: React.FC = () => {
    const { isLoading, isFirstLaunch, setProfile, getInitials } = useUserProfile();
    const [name, setName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showInput, setShowInput] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update time every minute
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Animate in the input after a brief delay
    useEffect(() => {
        if (isFirstLaunch && !isLoading) {
            const timer = setTimeout(() => setShowInput(true), 500);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [isFirstLaunch, isLoading]);

    const handleSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            const trimmedName = name.trim();
            if (!trimmedName) return;

            setIsSubmitting(true);
            try {
                await setProfile({ name: trimmedName });
            } finally {
                setIsSubmitting(false);
            }
        },
        [name, setProfile]
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter') {
                handleSubmit(e);
            }
        },
        [handleSubmit]
    );

    // Don't render if loading or not first launch
    if (isLoading || !isFirstLaunch) return null;

    const formattedTime = currentTime.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
    });
    const formattedDate = currentTime.toLocaleDateString([], {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    });

    const previewInitials = name.trim() ? getInitials(name) : 'U';

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 animate-fade-in">
            {/* Background blur effect */}
            <div className="absolute inset-0 backdrop-blur-sm bg-black/20" />

            {/* Time display - top center */}
            <div className="absolute top-16 text-center text-white/90 z-10">
                <div className="text-7xl font-light tracking-tight">{formattedTime}</div>
                <div className="text-xl mt-2 font-light">{formattedDate}</div>
            </div>

            {/* Login card - center */}
            <div
                className={`relative z-10 flex flex-col items-center transition-all duration-700 ${
                    showInput ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
            >
                {/* User avatar */}
                <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white text-4xl font-semibold shadow-2xl ring-4 ring-white/20 mb-6">
                    {previewInitials}
                </div>

                {/* Welcome text */}
                <h1 className="text-2xl text-white font-light mb-8">Welcome! What's your name?</h1>

                {/* Name input */}
                <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Enter your name"
                            autoFocus
                            disabled={isSubmitting}
                            className="w-72 h-12 px-4 bg-white/10 border border-white/20 rounded-lg text-white text-center text-lg placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm transition-all disabled:opacity-50"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!name.trim() || isSubmitting}
                        className="w-32 h-10 bg-blue-500 hover:bg-blue-600 disabled:bg-white/10 disabled:text-white/40 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                        ) : (
                            <>
                                <span>Continue</span>
                                <span className="material-symbols-outlined text-lg">arrow_forward</span>
                            </>
                        )}
                    </button>
                </form>

                {/* Hint text */}
                <p className="text-white/50 text-sm mt-6">Press Enter to continue</p>
            </div>

            {/* Bottom hint */}
            <div className="absolute bottom-8 text-white/40 text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">info</span>
                <span>You can change your name later in Settings</span>
            </div>
        </div>
    );
};
