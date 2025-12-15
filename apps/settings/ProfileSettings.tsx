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
            <h1 className="text-3xl font-light mb-8">Account</h1>

            {/* Profile Card */}
            <div className="bg-white/5 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-6">
                    {/* Avatar */}
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                        {previewInitials}
                    </div>

                    {/* Name input */}
                    <div className="flex-1">
                        <FormField label="Your name" id="profile-name" required>
                            <div className="flex gap-3">
                                <input
                                    id="profile-name"
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Enter your name"
                                    className="flex-1 h-10 px-4 bg-black/30 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                                />
                                <button
                                    onClick={handleSave}
                                    disabled={!hasChanges || isSaving || !name.trim()}
                                    className="h-10 px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-white/10 disabled:text-white/40 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
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
            <div className="bg-white/5 rounded-xl p-6">
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
