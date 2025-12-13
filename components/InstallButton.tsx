import React, { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Check if app is already installed as PWA
const isStandalone = () => {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as unknown as { standalone?: boolean }).standalone === true;
};

export const InstallButton = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [isAlreadyInstalled, setIsAlreadyInstalled] = useState(false);

    useEffect(() => {
        // Check if already running as installed PWA
        if (isStandalone()) {
            setIsAlreadyInstalled(true);
            return;
        }

        const handleBeforeInstallPrompt = (e: Event) => {
            console.log('[PWA] beforeinstallprompt event fired');
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Store the event so it can be triggered later
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setIsInstallable(true);
        };

        const handleAppInstalled = () => {
            console.log('[PWA] App installed');
            // Clear the deferredPrompt
            setDeferredPrompt(null);
            setIsInstallable(false);
            setIsAlreadyInstalled(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        await deferredPrompt.prompt();
        
        // Wait for the user to respond to the prompt
        const choiceResult = await deferredPrompt.userChoice;
        
        if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }
        
        // Clear the deferredPrompt
        setDeferredPrompt(null);
        setIsInstallable(false);
    };

    const handleOnboardingClick = () => {
        setShowOnboarding(true);
    };

    const closeOnboarding = () => {
        setShowOnboarding(false);
    };

    // Don't show anything if already installed as PWA
    if (isAlreadyInstalled) return null;
    
    // Show if installable OR if onboarding is open
    if (!isInstallable && !showOnboarding) return null;

    return (
        <>
            {/* Install Button */}
            {isInstallable && (
                <div className="fixed bottom-24 right-6 z-[60] animate-fade-in-up">
                    <div className="glass-panel rounded-2xl shadow-2xl ring-1 ring-white/10 p-4 max-w-sm">
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <span className="material-symbols-outlined text-blue-400 text-2xl">download</span>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-white font-semibold text-sm mb-1">
                                    Install Windows 15
                                </h3>
                                <p className="text-white/70 text-xs mb-3">
                                    Install this app for a native desktop experience and offline access.
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleInstallClick}
                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition-colors text-sm font-medium"
                                    >
                                        Install
                                    </button>
                                    <button
                                        onClick={handleOnboardingClick}
                                        className="px-4 py-2 bg-white/10 text-white/70 rounded-lg hover:bg-white/20 transition-colors text-sm"
                                    >
                                        Learn More
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsInstallable(false)}
                                className="flex-shrink-0 text-white/40 hover:text-white/70 transition-colors"
                            >
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Onboarding Modal */}
            {showOnboarding && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in-up">
                    <div className="glass-panel rounded-2xl shadow-2xl ring-1 ring-white/10 p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
                        <div className="flex items-start justify-between mb-4">
                            <h2 className="text-white font-bold text-xl">Welcome to Windows 15</h2>
                            <button
                                onClick={closeOnboarding}
                                className="text-white/40 hover:text-white/70 transition-colors"
                            >
                                <span className="material-symbols-outlined text-2xl">close</span>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h3 className="text-white font-semibold text-base mb-2 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-blue-400">cloud_sync</span>
                                    Bring Your Own Cloud
                                </h3>
                                <p className="text-white/70 text-sm leading-relaxed">
                                    Windows 15 uses Dexie Cloud for sync. You'll need to set up your own Dexie Cloud database URL in Settings → Sync. This gives you full control over your data.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-white font-semibold text-base mb-2 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-emerald-400">offline_bolt</span>
                                    Works Offline
                                </h3>
                                <p className="text-white/70 text-sm leading-relaxed">
                                    All your data is stored locally. Even without internet, you can use notes, bookmarks, todos, and all apps. Changes sync automatically when you're back online.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-white font-semibold text-base mb-2 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-purple-400">devices</span>
                                    Multi-Device Sync
                                </h3>
                                <p className="text-white/70 text-sm leading-relaxed">
                                    Once connected to Dexie Cloud, your data syncs across all devices in real-time. Open the same app on different devices and see changes instantly.
                                </p>
                            </div>

                            <div className="pt-4 border-t border-white/10">
                                <p className="text-white/60 text-xs mb-3">
                                    Ready to get started?
                                </p>
                                <div className="flex gap-2">
                                    {isInstallable && (
                                        <button
                                            onClick={() => {
                                                handleInstallClick();
                                                closeOnboarding();
                                            }}
                                            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition-colors text-sm font-medium"
                                        >
                                            Install App
                                        </button>
                                    )}
                                    <button
                                        onClick={closeOnboarding}
                                        className="flex-1 px-4 py-2 bg-white/10 text-white/70 rounded-lg hover:bg-white/20 transition-colors text-sm"
                                    >
                                        {isInstallable ? 'Maybe Later' : 'Got It'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
