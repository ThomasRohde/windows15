/**
 * ProfileSettings - User account/profile settings panel
 */
import React, { useState, useCallback, useEffect } from 'react';
import { useUserProfile } from '../../context/UserProfileContext';
import { FormField } from '../../components/ui';

export const ProfileSettings: React.FC = () => {
    const { profile, setProfile, getInitials } = useUserProfile();
    const [name, setName] = useState(profile?.name || '');
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Sync local state with profile when it changes
    useEffect(() => {
        if (profile?.name) {
            setName(profile.name);
        }
    }, [profile?.name]);

    const handleSave = useCallback(async () => {
        const trimmedName = name.trim();
        if (!trimmedName) return;

        setIsSaving(true);
        try {
            await setProfile({ name: trimmedName });
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
        } finally {
            setIsSaving(false);
        }
    }, [name, setProfile]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter') {
                handleSave();
            }
        },
        [handleSave]
    );

    const previewInitials = name.trim() ? getInitials(name) : profile?.initials || 'U';
    const hasChanges = name.trim() !== (profile?.name || '');

    return (
        <div className="max-w-2xl">
            <h1 className="text-2xl md:text-3xl font-light mb-6 md:mb-8">Account</h1>

            {/* Profile Card */}
            <div className="bg-white/5 rounded-xl p-4 md:p-6 mb-4 md:mb-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
                    {/* Avatar */}
                    <div className="w-16 h-16 md:w-20 md:h-20 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl md:text-3xl font-semibold text-white shadow-xl ring-4 ring-white/10 self-center md:self-auto">
                        {previewInitials}
                    </div>

                    {/* Name input */}
                    <div className="flex-1 min-w-0">
                        <FormField label="Your name" id="profile-name" required>
                            <div className="flex flex-col gap-3 md:flex-row">
                                <input
                                    id="profile-name"
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Enter your name"
                                    className="flex-1 min-w-0 min-h-[44px] px-4 bg-black/30 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent select-text"
                                />
                                <button
                                    onClick={handleSave}
                                    disabled={!hasChanges || isSaving || !name.trim()}
                                    className="min-h-[44px] px-4 shrink-0 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 disabled:bg-white/10 disabled:text-white/40 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    {isSaving ? (
                                        <span className="material-symbols-outlined animate-spin text-lg">
                                            progress_activity
                                        </span>
                                    ) : showSuccess ? (
                                        <>
                                            <span className="material-symbols-outlined text-lg">check</span>
                                            Saved
                                        </>
                                    ) : (
                                        'Save'
                                    )}
                                </button>
                            </div>
                        </FormField>
                    </div>
                </div>
            </div>

            {/* Info section */}
            <div className="bg-white/5 rounded-xl p-4 md:p-6">
                <h3 className="text-sm font-medium text-white/80 mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">info</span>
                    About your account
                </h3>
                <p className="text-sm text-white/60 leading-relaxed">
                    Your name is stored locally in this browser. If you enable cloud sync, your profile will be synced
                    across devices.
                </p>
            </div>
        </div>
    );
};
